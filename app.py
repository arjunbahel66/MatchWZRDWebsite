import os
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from pulp import *
import io
from werkzeug.utils import secure_filename
import json
import chardet
from io import BytesIO

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder='frontend/build')
CORS(app)

# Configure database
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'matchWZRD.db')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', f'sqlite:///{db_path}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Import models from database.py
from database import db, School, Student, Preference, MatchingResult, init_db

# Initialize the database
init_db(app)

def import_preferences_from_excel(file):
    try:
        # Get file extension
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        # Read the file based on extension
        if file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(file)
        elif file_ext == 'csv':
            # Try different encodings and delimiters
            encodings = ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']
            delimiters = [',', ';', '\t']
            df = None
            
            for encoding in encodings:
                for delimiter in delimiters:
                    try:
                        file.seek(0)
                        df = pd.read_csv(file, encoding=encoding, sep=delimiter)
                        if len(df.columns) > 1:
                            break
                    except Exception:
                        continue
                if df is not None and len(df.columns) > 1:
                    break
            
            if df is None or len(df.columns) <= 1:
                return {'error': 'Could not read the CSV file. Please ensure it is properly formatted with multiple columns and uses a supported encoding (UTF-8, Latin-1, ISO-8859-1, or Windows-1252).'}
        else:
            return {'error': 'Unsupported file format'}
        
        # Replace NaN values with None (which becomes null in JSON)
        df = df.replace({np.nan: None})
        
        # Add an id field to each row
        df['id'] = range(1, len(df) + 1)
        
        # Convert DataFrame to list of dictionaries for frontend preview
        preview_data = df.to_dict('records')
        
        return {
            'data': preview_data,
            'message': 'File processed successfully'
        }
    except Exception as e:
        return {
            'error': f'Error processing file: {str(e)}'
        }

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

def clean_school_name(name):
    """
    Clean a school name by removing leading/trailing spaces and special characters.
    Also handles common variations in school names.
    """
    if not isinstance(name, str):
        return name
    
    # Remove special characters and normalize spaces
    cleaned = ''.join(c for c in name if c.isprintable())
    cleaned = ' '.join(cleaned.split())
    
    # Handle specific cases
    if 'Northwestern' in cleaned:
        return 'Northwestern University (Kellogg)'
    elif 'Stanford' in cleaned:
        return 'Stanford (GSB)'
    elif 'University of Michigan' in cleaned:
        return 'University of Michigan (Ross)'
    elif 'New York University' in cleaned:
        return 'New York University (Stern)'
    elif 'Carnegie Mellon' in cleaned:
        return 'Carnegie Mellon University (Tepper)'
    elif 'Vanderbilt' in cleaned:
        return 'Vanderbilt University (Owen)'
    elif 'University of Chicago' in cleaned:
        return 'University of Chicago (Booth)'
    elif 'UCLA' in cleaned:
        return 'UCLA (Anderson)'
    elif 'UNC' in cleaned:
        return 'UNC (Kenan-Flagler)'
    elif 'University of Pennsylvania' in cleaned:
        return 'University of Pennsylvania (Wharton)'
    elif 'Duke' in cleaned:
        return 'Duke University (Fuqua)'
    elif 'Yale' in cleaned:
        return 'Yale University (SOM)'
    elif 'Cornell' in cleaned:
        return 'Cornell University (Johnson)'
    elif 'Emory' in cleaned:
        return 'Emory University (Goizueta)'
    elif 'Harvard' in cleaned:
        return 'Harvard University (HBS)'
    elif 'UC Berkeley' in cleaned:
        return 'UC Berkeley (Haas)'
    elif 'UT Austin' in cleaned:
        return 'UT Austin (McCombs)'
    elif 'London Business School' in cleaned:
        return 'London Business School'
    elif 'MIT' in cleaned:
        return 'MIT (Sloan)'
    elif 'Columbia' in cleaned:
        return 'Columbia University (CBS)'
    elif 'Dartmouth' in cleaned:
        return 'Dartmouth University (Tuck)'
    elif 'University of Virginia' in cleaned:
        return 'University of Virginia (Darden)'
    elif 'Georgetown' in cleaned:
        return 'Georgetown (McDonough)'
    
    return cleaned

# Configuration endpoints
@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'POST':
        data = request.json
        # Process configuration data
        # This would update system settings like max participants per session
        return jsonify({'message': 'Configuration updated successfully'})
    else:
        # Return current configuration
        return jsonify({
            'max_participants_per_session': 13,
            'number_of_sessions': 6,
            'total_schools': 25
        })

@app.route('/api/config/import', methods=['POST'])
def import_config_from_excel():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ['.xlsx', '.xls', '.csv']:
        return jsonify({'error': 'Invalid file format. Please upload an Excel or CSV file.'}), 400
    
    try:
        # Save the file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join('uploads', filename)
        os.makedirs('uploads', exist_ok=True)
        file.save(file_path)
        
        # Read the file
        print(f"Processing file: {filename} with extension: {file_ext}")
        
        # For Excel files, use pandas directly
        if file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
            print(f"Successfully read Excel file with {len(df.columns)} columns")
        else:
            # For CSV files, try a simpler approach with the most common encodings
            encodings = ['utf-8-sig', 'utf-8', 'latin1', 'iso-8859-1', 'cp1252']
            delimiters = [',', ';', '\t']
            
            df = None
            for encoding in encodings:
                for delimiter in delimiters:
                    try:
                        print(f"Trying to read with encoding: {encoding}, delimiter: {delimiter}")
                        df = pd.read_csv(file_path, encoding=encoding, delimiter=delimiter, on_bad_lines='skip')
                        print(f"Successfully read with {len(df.columns)} columns")
                        
                        # Check if the DataFrame has the expected columns or similar ones
                        has_school_name = any('school name' in col.lower() for col in df.columns)
                        has_capacity = any('capacity' in col.lower() for col in df.columns)
                        
                        if has_school_name and has_capacity:
                            print(f"Found valid format with {len(df.columns)} columns")
                            break
                    except UnicodeDecodeError as e:
                        print(f"UnicodeDecodeError with {encoding}: {str(e)}")
                        continue
                    except Exception as e:
                        print(f"Error with encoding {encoding}, delimiter {delimiter}: {str(e)}")
                        continue
                
                if df is not None and has_school_name and has_capacity:
                    break
            
            if df is None:
                # Try one more approach - read the file as text and parse manually
                try:
                    print("Trying to read file as text and parse manually")
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                    
                    if len(lines) > 0:
                        # Try to determine the delimiter
                        first_line = lines[0]
                        if ',' in first_line:
                            delimiter = ','
                        elif ';' in first_line:
                            delimiter = ';'
                        elif '\t' in first_line:
                            delimiter = '\t'
                        else:
                            delimiter = ','
                        
                        # Parse the header
                        header = [col.strip() for col in first_line.split(delimiter)]
                        
                        # Parse the data
                        data = []
                        for line in lines[1:]:
                            values = [val.strip() for val in line.split(delimiter)]
                            if len(values) == len(header):
                                row = dict(zip(header, values))
                                data.append(row)
                        
                        # Convert to DataFrame
                        df = pd.DataFrame(data)
                        print(f"Manually parsed file with {len(df.columns)} columns")
                        
                        # Check if the DataFrame has the expected columns or similar ones
                        has_school_name = any('school name' in col.lower() for col in df.columns)
                        has_capacity = any('capacity' in col.lower() for col in df.columns)
                        
                        if has_school_name and has_capacity:
                            print(f"Found valid format with {len(df.columns)} columns")
                        else:
                            df = None
                except Exception as e:
                    print(f"Error parsing file manually: {str(e)}")
            
            if df is None:
                return jsonify({'error': 'Could not read the file. Please check the format and encoding.'}), 400
        
        # Store the original column order
        original_columns = df.columns.tolist()
        print(f"Original columns: {original_columns}")
        
        # Find the actual column names for School Name and Capacity columns
        school_name_col = next((col for col in df.columns if 'school name' in col.lower()), None)
        
        # Find all capacity columns
        capacity_cols = [col for col in df.columns if 'capacity' in col.lower()]
        
        if not school_name_col or len(capacity_cols) < 1:
            return jsonify({'error': 'Could not find required columns (School Name and at least one Capacity column) in the file.'}), 400
        
        # Clean school names
        df[school_name_col] = df[school_name_col].apply(clean_school_name)
        
        # Convert to JSON
        data = df.to_dict(orient='records')
        
        # Add an ID field to each row for DataGrid compatibility
        for i, row in enumerate(data):
            row['id'] = i + 1
        
        # Return the original column order
        return jsonify({
            'success': True,
            'data': data,
            'columnOrder': original_columns
        })
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

# School management endpoints
@app.route('/api/schools', methods=['GET', 'POST'])
def handle_schools():
    if request.method == 'POST':
        data = request.json
        # Add new school
        new_school = School(name=data['name'])
        db.session.add(new_school)
        db.session.commit()
        return jsonify({'message': 'School added successfully', 'id': new_school.id})
    else:
        # Get all schools
        schools = School.query.all()
        return jsonify([{'id': school.id, 'name': school.name} for school in schools])

# Student preference import endpoint
@app.route('/api/preferences/import', methods=['POST'])
def import_preferences_from_excel():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ['.xlsx', '.xls', '.csv']:
        return jsonify({'error': 'Invalid file format. Please upload an Excel or CSV file.'}), 400
    
    try:
        # Save the file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join('uploads', filename)
        os.makedirs('uploads', exist_ok=True)
        file.save(file_path)
        
        # Read the file
        print(f"Processing file: {filename} with extension: {file_ext}")
        
        # For Excel files, use pandas directly
        if file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
            print(f"Successfully read Excel file with {len(df.columns)} columns")
        else:
            # For CSV files, try a simpler approach with the most common encodings
            encodings = ['utf-8-sig', 'utf-8', 'latin1', 'iso-8859-1', 'cp1252']
            delimiters = [',', ';', '\t']
            
            df = None
            for encoding in encodings:
                for delimiter in delimiters:
                    try:
                        print(f"Trying to read with encoding: {encoding}, delimiter: {delimiter}")
                        df = pd.read_csv(file_path, encoding=encoding, delimiter=delimiter, on_bad_lines='skip')
                        print(f"Successfully read with {len(df.columns)} columns")
                        
                        # Check if the DataFrame has the expected columns or similar ones
                        has_first_name = any('first name' in col.lower() for col in df.columns)
                        has_last_name = any('last name' in col.lower() for col in df.columns)
                        has_email = any('email' in col.lower() for col in df.columns)
                        
                        if has_first_name and has_last_name and has_email:
                            print(f"Found valid format with {len(df.columns)} columns")
                            break
                    except UnicodeDecodeError as e:
                        print(f"UnicodeDecodeError with {encoding}: {str(e)}")
                        continue
                    except Exception as e:
                        print(f"Error with encoding {encoding}, delimiter {delimiter}: {str(e)}")
                        continue
                
                if df is not None and has_first_name and has_last_name and has_email:
                    break
            
            if df is None:
                # Try one more approach - read the file as text and parse manually
                try:
                    print("Trying to read file as text and parse manually")
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                    
                    if len(lines) > 0:
                        # Try to determine the delimiter
                        first_line = lines[0]
                        if ',' in first_line:
                            delimiter = ','
                        elif ';' in first_line:
                            delimiter = ';'
                        elif '\t' in first_line:
                            delimiter = '\t'
                        else:
                            delimiter = ','
                        
                        # Parse the header
                        header = [col.strip() for col in first_line.split(delimiter)]
                        
                        # Parse the data
                        data = []
                        for line in lines[1:]:
                            values = [val.strip() for val in line.split(delimiter)]
                            if len(values) == len(header):
                                row = dict(zip(header, values))
                                data.append(row)
                        
                        # Convert to DataFrame
                        df = pd.DataFrame(data)
                        print(f"Manually parsed file with {len(df.columns)} columns")
                        
                        # Check if the DataFrame has the expected columns or similar ones
                        has_first_name = any('first name' in col.lower() for col in df.columns)
                        has_last_name = any('last name' in col.lower() for col in df.columns)
                        has_email = any('email' in col.lower() for col in df.columns)
                        
                        if has_first_name and has_last_name and has_email:
                            print(f"Found valid format with {len(df.columns)} columns")
                        else:
                            df = None
                except Exception as e:
                    print(f"Error parsing file manually: {str(e)}")
            
            if df is None:
                return jsonify({'error': 'Could not read the file. Please check the format and encoding.'}), 400
        
        # Store the original column order
        original_columns = df.columns.tolist()
        print(f"Original columns: {original_columns}")
        
        # Find the actual column names for First Name, Last Name, and Email
        first_name_col = next((col for col in df.columns if 'first name' in col.lower()), None)
        last_name_col = next((col for col in df.columns if 'last name' in col.lower()), None)
        email_col = next((col for col in df.columns if 'email' in col.lower()), None)
        
        if not first_name_col or not last_name_col or not email_col:
            return jsonify({'error': 'Could not find required columns (First Name, Last Name, Email) in the file.'}), 400
        
        # Clean school names in the columns
        for col in df.columns:
            if col not in [first_name_col, last_name_col, email_col, 'Total']:
                df[col] = df[col].apply(clean_school_name)
        
        # Convert to JSON
        data = df.to_dict(orient='records')
        
        # Add an ID field to each row for DataGrid compatibility
        for i, row in enumerate(data):
            row['id'] = i + 1
        
        # Return the original column order
        return jsonify({
            'success': True,
            'data': data,
            'columnOrder': original_columns
        })
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

# Matching algorithm endpoint
@app.route('/api/match', methods=['POST'])
def generate_matches():
    # This would run the matching algorithm based on preferences and constraints
    # For now, return a placeholder response
    return jsonify({'message': 'Matching algorithm executed successfully'})

# Results endpoint
@app.route('/api/results/check', methods=['GET'])
def check_results():
    try:
        result = MatchingResult.query.first()
        return jsonify({'exists': result is not None})
    except Exception as e:
        return jsonify({'exists': False, 'error': str(e)})

@app.route('/api/results', methods=['GET'])
def get_results():
    try:
        results = MatchingResult.query.all()
        
        matches = []
        for result in results:
            pref = Preference.query.filter_by(
                student_id=result.student_id,
                school_id=result.school_id
            ).first()
            
            match = {
                'id': result.id,
                'student_id': result.student_id,
                'student_name': f"{result.student.first_name} {result.student.last_name}",
                'student_email': result.student.email,
                'school_id': result.school_id,
                'school_name': result.school.school_name,
                'session_number': result.session_number,
                'preference_score': pref.points if pref else 0
            }
            matches.append(match)
        
        return jsonify({
            'success': True,
            'matches': matches
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error retrieving results: {str(e)}'
        }), 500

# Analytics endpoint
@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    try:
        # Get all matches
        matches = MatchingResult.query.all()
        
        # Initialize analytics data
        analytics = {
            'top_choices': {
                'first_choice': 0,
                'second_choice': 0,
                'third_choice': 0,
                'other_choice': 0,
                'total_students': 0,
                'students_with_at_least_one_top_3': 0
            },
            'school_stats': {},
            'session_stats': {},
            'overall_stats': {
                'total_matches': len(matches),
                'average_preference_score': 0,
                'students_with_top_3': 0
            }
        }
        
        # Get unique student IDs
        unique_student_ids = set(match.student_id for match in matches)
        analytics['top_choices']['total_students'] = len(unique_student_ids)
        
        # Calculate best match for each student
        for student_id in unique_student_ids:
            # Get all matches for this student
            student_matches = [m for m in matches if m.student_id == student_id]
            
            # Get student's preferences ordered by points
            preferences = Preference.query.filter_by(student_id=student_id)\
                .order_by(Preference.points.desc()).all()
            
            # Find the best rank they got across all their matches
            best_rank = float('inf')
            for match in student_matches:
                for i, pref in enumerate(preferences, 1):
                    if pref.school_id == match.school_id:
                        best_rank = min(best_rank, i)
                        break
            
            # Update top choice statistics based on best rank
            if best_rank == 1:
                analytics['top_choices']['first_choice'] += 1
                analytics['top_choices']['students_with_at_least_one_top_3'] += 1
            elif best_rank == 2:
                analytics['top_choices']['second_choice'] += 1
                analytics['top_choices']['students_with_at_least_one_top_3'] += 1
            elif best_rank == 3:
                analytics['top_choices']['third_choice'] += 1
                analytics['top_choices']['students_with_at_least_one_top_3'] += 1
            else:
                analytics['top_choices']['other_choice'] += 1
            
            # Update school and session statistics
            for match in student_matches:
                school_id = match.school_id
                if school_id not in analytics['school_stats']:
                    school = School.query.get(school_id)
                    # Calculate total capacity from all sessions
                    total_capacity = (
                        school.session1_capacity +
                        school.session2_capacity +
                        school.session3_capacity +
                        school.session4_capacity +
                        school.session5_capacity +
                        school.session6_capacity
                    )
                    analytics['school_stats'][school_id] = {
                        'name': school.school_name,
                        'total_matches': 0,
                        'total_capacity': total_capacity,
                        'average_preference_score': 0,
                        'top_3_applications': 0
                    }
                
                school_stats = analytics['school_stats'][school_id]
                school_stats['total_matches'] += 1
                preference_score = Preference.query.filter_by(
                    student_id=match.student_id,
                    school_id=match.school_id
                ).first().points
                school_stats['average_preference_score'] += preference_score
                
                # Count students who ranked this school in top 3
                top_3_schools = [p.school_id for p in preferences[:3]]
                if school_id in top_3_schools:
                    school_stats['top_3_applications'] += 1
                
                # Update session statistics
                session_key = f"session_{match.session_number}"
                if session_key not in analytics['session_stats']:
                    analytics['session_stats'][session_key] = {
                        'total_matches': 0,
                        'average_preference_score': 0
                    }
                
                session_stats = analytics['session_stats'][session_key]
                session_stats['total_matches'] += 1
                session_stats['average_preference_score'] += preference_score
                
                # Update overall statistics
                analytics['overall_stats']['average_preference_score'] += preference_score
        
        # Calculate averages and percentages
        if len(matches) > 0:
            analytics['overall_stats']['average_preference_score'] /= len(matches)
            analytics['overall_stats']['students_with_top_3'] = analytics['top_choices']['students_with_at_least_one_top_3']
            
            # Calculate school averages
            for school_id, stats in analytics['school_stats'].items():
                if stats['total_matches'] > 0:
                    stats['average_preference_score'] /= stats['total_matches']
                    stats['fill_rate'] = (stats['total_matches'] / stats['total_capacity']) * 100 if stats['total_capacity'] > 0 else 0
            
            # Calculate session averages
            for session_key, stats in analytics['session_stats'].items():
                if stats['total_matches'] > 0:
                    stats['average_preference_score'] /= stats['total_matches']
        
        return jsonify({
            'success': True,
            'analytics': analytics
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error calculating analytics: {str(e)}'
        }), 500

# New endpoint to save configuration data
@app.route('/api/config/save', methods=['POST'])
def save_config():
    try:
        data = request.json
        print("Received save config request with data:", data)
        
        if not data or 'data' not in data:
            return jsonify({'error': 'No data provided'}), 400
        
        config_data = data['data']
        print(f"Processing {len(config_data)} schools")
        
        # Clear existing schools
        School.query.delete()
        db.session.commit()
        print("Cleared existing schools")
        
        # Add new schools
        for item in config_data:
            print(f"Adding school: {item['School Name']} with capacities: {item['Capacity Breakout Session 1']}, {item['Capacity Breakout Session 2']}, {item['Capacity Breakout Session 3']}, {item['Capacity Breakout Session 4']}, {item['Capacity Breakout Session 5']}, {item['Capacity Breakout Session 6']}")
            school = School(
                school_name=item['School Name'],
                session1_capacity=item['Capacity Breakout Session 1'],
                session2_capacity=item['Capacity Breakout Session 2'],
                session3_capacity=item['Capacity Breakout Session 3'],
                session4_capacity=item['Capacity Breakout Session 4'],
                session5_capacity=item['Capacity Breakout Session 5'],
                session6_capacity=item['Capacity Breakout Session 6']
            )
            db.session.add(school)
        
        db.session.commit()
        print("Successfully committed changes to database")
        
        return jsonify({
            'success': True,
            'message': f'Successfully saved {len(config_data)} schools to the database.'
        })
    
    except Exception as e:
        db.session.rollback()
        print(f"Error saving configuration: {str(e)}")
        return jsonify({'error': f'Error saving configuration: {str(e)}'}), 500

# New endpoint to save preferences data
@app.route('/api/preferences/save', methods=['POST'])
def save_preferences():
    try:
        data = request.json
        
        if not data or 'data' not in data:
            return jsonify({'error': 'No data provided'}), 400
        
        preferences_data = data['data']
        
        # Get all schools from the database
        schools = School.query.all()
        school_map = {clean_school_name(school.school_name): school.id for school in schools}
        
        # Process each student's preferences
        for item in preferences_data:
            # Find by email (unique), or create student
            student = Student.query.filter_by(email=item['Email']).first()
            
            if not student:
                student = Student(
                    first_name=item['First Name'],
                    last_name=item['Last Name'],
                    email=item['Email']
                )
                db.session.add(student)
                db.session.flush()
            
            # Build a lookup from cleaned item keys to their values
            skip_keys = {'id', 'First Name', 'Last Name', 'Email', 'Total'}
            item_cleaned = {}
            for key, val in item.items():
                if key not in skip_keys:
                    item_cleaned[clean_school_name(key)] = val
            
            # Update preferences for each school
            for school_name, school_id in school_map.items():
                # Skip non-school columns
                if school_name in ['First Name', 'Last Name', 'Email', 'Total']:
                    continue
                
                # Get points for this school - try cleaned name match
                points = item_cleaned.get(school_name, item.get(school_name, 0))
                
                # Find existing preference or create new one
                preference = Preference.query.filter_by(
                    student_id=student.id,
                    school_id=school_id
                ).first()
                
                if preference:
                    preference.points = points
                else:
                    preference = Preference(
                        student_id=student.id,
                        school_id=school_id,
                        points=points
                    )
                    db.session.add(preference)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Preferences saved successfully.'
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error saving preferences: {str(e)}'}), 500

# New endpoint to load configuration data
@app.route('/api/config/load', methods=['GET'])
def load_config():
    try:
        schools = School.query.all()
        
        if not schools:
            return jsonify({
                'success': True,
                'data': [],
                'message': 'No configuration data found in the database.'
            })
        
        # Convert to the format expected by the frontend
        data = []
        for school in schools:
            data.append({
                'id': school.id,
                'School Name': school.school_name,
                'Capacity Breakout Session 1': school.session1_capacity,
                'Capacity Breakout Session 2': school.session2_capacity,
                'Capacity Breakout Session 3': school.session3_capacity,
                'Capacity Breakout Session 4': school.session4_capacity,
                'Capacity Breakout Session 5': school.session5_capacity,
                'Capacity Breakout Session 6': school.session6_capacity
            })
        
        # Define the column order
        column_order = [
            'School Name', 
            'Capacity Breakout Session 1', 
            'Capacity Breakout Session 2', 
            'Capacity Breakout Session 3', 
            'Capacity Breakout Session 4', 
            'Capacity Breakout Session 5', 
            'Capacity Breakout Session 6'
        ]
        
        return jsonify({
            'success': True,
            'data': data,
            'columnOrder': column_order
        })
    
    except Exception as e:
        print(f"Error loading configuration: {str(e)}")
        return jsonify({'error': f'Error loading configuration: {str(e)}'}), 500

# New endpoint to load preferences data
@app.route('/api/preferences/load', methods=['GET'])
def load_preferences():
    try:
        students = Student.query.all()
        
        if not students:
            return jsonify({
                'success': True,
                'data': [],
                'message': 'No preferences data found in the database.'
            })
        
        # Get all schools
        schools = School.query.all()
        school_map = {school.id: clean_school_name(school.school_name) for school in schools}
        
        # Convert to the format expected by the frontend
        data = []
        column_order = ['First Name', 'Last Name', 'Email']
        
        for student in students:
            # Start with student info
            student_data = {
                'id': student.id,
                'First Name': student.first_name,
                'Last Name': student.last_name,
                'Email': student.email
            }
            
            # Add preferences for each school
            for preference in student.preferences:
                school_name = school_map.get(preference.school_id)
                if school_name:
                    student_data[school_name] = preference.points
                    if school_name not in column_order:
                        column_order.append(school_name)
            
            # Add total points
            total_points = sum(pref.points for pref in student.preferences)
            student_data['Total'] = total_points
            
            data.append(student_data)
        
        # Add Total to column order if not already there
        if 'Total' not in column_order:
            column_order.append('Total')
        
        return jsonify({
            'success': True,
            'data': data,
            'columnOrder': column_order
        })
    
    except Exception as e:
        return jsonify({'error': f'Error loading preferences: {str(e)}'}), 500

# New endpoint to clear configuration data
@app.route('/api/config/clear', methods=['POST'])
def clear_config():
    try:
        # Clear all schools from the database
        School.query.delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Configuration data cleared successfully.'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# New endpoint to clear preferences data
@app.route('/api/preferences/clear', methods=['POST'])
def clear_preferences():
    try:
        # Clear all preferences, students, and matching results from the database
        Preference.query.delete()
        Student.query.delete()
        MatchingResult.query.delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Preferences data cleared successfully.'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Process preferences endpoint
@app.route('/api/preferences/process', methods=['POST'])
def process_preferences():
    try:
        print("Starting to process preferences...")
        
        # Clear any existing matching results
        print("Clearing existing matching results...")
        MatchingResult.query.delete()
        db.session.commit()
        
        # Import and run the matching algorithm
        print("Running matching algorithm...")
        from matching import run_pulp_matching, get_students_without_top_3_picks
        result = run_pulp_matching()
        
        if "error" in result:
            print(f"Error in matching algorithm: {result['error']}")
            return jsonify({
                'success': False,
                'error': result["error"]
            }), 500
        
        # Get the matches from the database
        print("Fetching matches from database...")
        matches = MatchingResult.query.all()
        print(f"Found {len(matches)} matches")
        
        matches_data = []
        for match in matches:
            # Get the preference score using a query
            preference = Preference.query.filter_by(
                student_id=match.student_id,
                school_id=match.school_id
            ).first()
            
            match_data = {
                'id': match.id,
                'student_id': match.student_id,
                'student_name': f"{match.student.first_name} {match.student.last_name}",
                'student_email': match.student.email,  # Add email to the response
                'school_id': match.school_id,
                'school_name': match.school.school_name,
                'session_number': match.session_number,
                'preference_score': preference.points if preference else 0
            }
            matches_data.append(match_data)
            print(f"Added match: {match_data['student_name']} -> {match_data['school_name']}")
        
        response = {
            'success': True,
            'message': 'Matching algorithm executed successfully',
            'statistics': result.get("statistics", {}),
            'matches': matches_data
        }
        print(f"Returning response with {len(matches_data)} matches")
        return jsonify(response)
    
    except Exception as e:
        print(f"Error in process_preferences: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Error processing preferences: {str(e)}'
        }), 500

# New endpoint to check for the existence of config data
@app.route('/api/config/check', methods=['GET'])
def check_config():
    try:
        # Check if any schools exist in the database
        schools = School.query.first()
        return jsonify({'exists': schools is not None})
    except Exception as e:
        return jsonify({'exists': False, 'error': str(e)})

# New endpoint to check for the existence of preferences data
@app.route('/api/preferences/check', methods=['GET'])
def check_preferences():
    try:
        # Check if any preferences exist in the database
        preferences = Preference.query.first()
        return jsonify({'exists': preferences is not None})
    except Exception as e:
        return jsonify({'exists': False, 'error': str(e)})

# Export results endpoint
@app.route('/api/results/export', methods=['GET'])
def export_results():
    try:
        import pandas as pd
        from io import BytesIO
        
        # Get all matching results from the database
        results = MatchingResult.query.all()
        
        # Convert to a list of dictionaries for pandas
        data = []
        for result in results:
            # Get preference score using a query
            preference = Preference.query.filter_by(
                student_id=result.student_id,
                school_id=result.school_id
            ).first()
            
            data.append({
                'Student Name': f"{result.student.first_name} {result.student.last_name}",
                'Email': result.student.email,
                'School': result.school.school_name,
                'Session': result.session_number,
                'Match Score': preference.points if preference else 0
            })
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Matching Results')
        
        # Prepare the response
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='matching_results.xlsx'
        )
        
    except Exception as e:
        return jsonify({
            'error': f'Error exporting results: {str(e)}'
        }), 500

# Serve React frontend in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)