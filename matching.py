import pandas as pd
import numpy as np
from database import Student, School, Preference, MatchingResult
from app import db
import random
from pulp import LpProblem, LpMaximize, LpVariable, LpBinary, lpSum, LpStatus

def run_matching_algorithm():
    """
    Improved matching algorithm that:
    1. Creates a sorted list of all bids with random tiebreakers
    2. Includes ALL student preferences (not just top 6)
    3. Processes bids in order, assigning students to sessions based on capacity
    4. Ensures every student gets exactly 6 sessions
    """
    # Get all data from database
    students = Student.query.all()
    schools = School.query.all()
    preferences = Preference.query.all()
    
    # Create a dictionary to store student preferences for each school
    student_preferences = {}
    for pref in preferences:
        if pref.student_id not in student_preferences:
            student_preferences[pref.student_id] = {}
        student_preferences[pref.student_id][pref.school_id] = pref.points
    
    # Create a dictionary to map school IDs to their session capacities
    school_capacities = {}
    for school in schools:
        school_capacities[school.id] = {
            1: school.session1_capacity,
            2: school.session2_capacity,
            3: school.session3_capacity,
            4: school.session4_capacity,
            5: school.session5_capacity,
            6: school.session6_capacity
        }
    
    # Step 1: Create a list of ALL bids with random tiebreakers
    all_bids = []
    for student in students:
        for school in schools:
            points = student_preferences.get(student.id, {}).get(school.id, 0)
            if points > 0:  # Only include non-zero bids
                # Add random tiebreaker between 0 and 1
                all_bids.append({
                    'student_id': student.id,
                    'student_name': f"{student.first_name} {student.last_name}",
                    'school_id': school.id,
                    'school_name': school.school_name,
                    'points': points,
                    'tiebreaker': random.random()
                })
    
    # Sort bids by points (descending) and then by tiebreaker (ascending)
    all_bids.sort(key=lambda x: (-x['points'], x['tiebreaker']))
    
    # Step 2: Process ALL bids in order and assign to sessions
    matches = []
    session_assignments = {}  # Track which students are assigned to which sessions
    
    for bid in all_bids:
        student_id = bid['student_id']
        school_id = bid['school_id']
        
        # Skip if student already has 6 sessions assigned
        if student_id in session_assignments and len(session_assignments[student_id]) >= 6:
            continue
        
        # Try to assign to each session in order
        for session_num in range(1, 7):
            # Skip if student already has this session assigned
            if student_id in session_assignments and session_num in session_assignments[student_id]:
                continue
            
            # Check if school has capacity in this session
            if school_capacities[school_id][session_num] > 0:
                # Create match
                match = {
                    'student_id': student_id,
                    'student_name': bid['student_name'],
                    'school_id': school_id,
                    'school_name': bid['school_name'],
                    'session_number': session_num,
                    'preference_score': bid['points']
                }
                matches.append(match)
                
                # Update capacities and assignments
                school_capacities[school_id][session_num] -= 1
                if student_id not in session_assignments:
                    session_assignments[student_id] = set()
                session_assignments[student_id].add(session_num)
                
                # Create Match object in database
                db_match = MatchingResult(
                    student_id=student_id,
                    school_id=school_id,
                    session_number=session_num,
                    algorithm_used='improved_matching'
                )
                db.session.add(db_match)
                break
    
    # Step 3: Ensure every student has exactly 6 sessions
    for student in students:
        student_id = student.id
        student_sessions = session_assignments.get(student_id, set())
        
        # If student doesn't have 6 sessions, fill remaining slots
        while len(student_sessions) < 6:
            # Find the next available session number
            for session_num in range(1, 7):
                if session_num not in student_sessions:
                    # Find any school with capacity in this session
                    assigned = False
                    for school in schools:
                        if school_capacities[school.id][session_num] > 0:
                            # Create fallback match
                            match = {
                                'student_id': student_id,
                                'student_name': f"{student.first_name} {student.last_name}",
                                'school_id': school.id,
                                'school_name': school.school_name,
                                'session_number': session_num,
                                'preference_score': 0  # Fallback assignment
                            }
                            matches.append(match)
                            
                            # Update capacities and assignments
                            school_capacities[school.id][session_num] -= 1
                            student_sessions.add(session_num)
                            
                            # Create Match object in database
                            db_match = MatchingResult(
                                student_id=student_id,
                                school_id=school.id,
                                session_number=session_num,
                                algorithm_used='improved_matching_fallback'
                            )
                            db.session.add(db_match)
                            assigned = True
                            break
                    
                    if assigned:
                        break
                    else:
                        # If no school has capacity in this session, we have a problem
                        print(f"WARNING: No capacity available for student {student_id} in session {session_num}")
                        # Continue to next session number
                        continue
    
    # Commit changes to database
    db.session.commit()
    
    # Calculate statistics
    total_students = len(students)
    matched_students = len(session_assignments)
    unmatched_students = total_students - matched_students
    
    # Calculate average preference score
    if matches:
        avg_preference = sum(match['preference_score'] for match in matches) / len(matches)
    else:
        avg_preference = 0
    
    # Calculate fill rates for each school
    school_fill_rates = []
    for school in schools:
        total_capacity = sum(school_capacities[school.id][session_num] for session_num in range(1, 7))
        filled_slots = sum(1 for match in matches if match['school_id'] == school.id)
        fill_rate = filled_slots / total_capacity if total_capacity > 0 else 0
        school_fill_rates.append({
            'school_id': school.id,
            'school_name': school.school_name,
            'fill_rate': fill_rate
        })
    
    return {
        'matches': matches,
        'statistics': {
            'total_students': total_students,
            'matched_students': matched_students,
            'unmatched_students': unmatched_students,
            'average_preference_score': avg_preference,
            'school_fill_rates': school_fill_rates
        }
    }


def run_pulp_matching():
    """
    Optimal matching algorithm using PuLP linear programming.
    Maximizes total preference score across all assignments while respecting:
    - Each student gets exactly 1 school per session (6 sessions)
    - Each school per-session capacity is not exceeded
    - No student visits the same school in multiple sessions
    """
    students = Student.query.all()
    schools = School.query.all()
    preferences = Preference.query.all()

    if not students or not schools:
        return {'error': 'No students or schools found in database'}

    student_ids = [s.id for s in students]
    school_ids = [s.id for s in schools]
    sessions = list(range(1, 7))

    # Build preference lookup: pref_points[student_id][school_id] = points
    pref_points = {}
    for pref in preferences:
        if pref.student_id not in pref_points:
            pref_points[pref.student_id] = {}
        pref_points[pref.student_id][pref.school_id] = pref.points

    # Build capacity lookup: capacity[school_id][session] = max students
    capacity = {}
    for school in schools:
        capacity[school.id] = {
            1: school.session1_capacity,
            2: school.session2_capacity,
            3: school.session3_capacity,
            4: school.session4_capacity,
            5: school.session5_capacity,
            6: school.session6_capacity
        }

    # Create the LP problem
    prob = LpProblem("MatchWZRD_Optimal", LpMaximize)

    # Decision variables: x[s][k][t] = 1 if student s is assigned to school k in session t
    x = {}
    for s in student_ids:
        x[s] = {}
        for k in school_ids:
            x[s][k] = {}
            for t in sessions:
                x[s][k][t] = LpVariable(f"x_{s}_{k}_{t}", cat=LpBinary)

    # Objective: maximize total preference score
    prob += lpSum(
        pref_points.get(s, {}).get(k, 0) * x[s][k][t]
        for s in student_ids
        for k in school_ids
        for t in sessions
    ), "Total_Preference_Score"

    # Constraint 1: Each student gets exactly 1 school per session
    for s in student_ids:
        for t in sessions:
            prob += (
                lpSum(x[s][k][t] for k in school_ids) == 1,
                f"one_school_per_session_{s}_{t}"
            )

    # Constraint 2: Each school per-session capacity is respected
    for k in school_ids:
        for t in sessions:
            prob += (
                lpSum(x[s][k][t] for s in student_ids) <= capacity[k][t],
                f"capacity_{k}_{t}"
            )

    # Constraint 3: No student visits the same school in multiple sessions
    for s in student_ids:
        for k in school_ids:
            prob += (
                lpSum(x[s][k][t] for t in sessions) <= 1,
                f"no_repeat_{s}_{k}"
            )

    # Solve
    print("Solving PuLP optimization problem...")
    print(f"  Students: {len(student_ids)}, Schools: {len(school_ids)}, Sessions: {len(sessions)}")
    print(f"  Variables: {len(student_ids) * len(school_ids) * len(sessions)}")

    prob.solve()

    status = LpStatus[prob.status]
    print(f"  Solver status: {status}")

    if status != "Optimal":
        return {'error': f'Solver could not find optimal solution. Status: {status}'}

    # Extract results
    matches = []
    student_lookup = {s.id: s for s in students}
    school_lookup = {s.id: s for s in schools}

    for s in student_ids:
        for k in school_ids:
            for t in sessions:
                if x[s][k][t].varValue and x[s][k][t].varValue > 0.5:
                    student = student_lookup[s]
                    school = school_lookup[k]
                    score = pref_points.get(s, {}).get(k, 0)

                    matches.append({
                        'student_id': s,
                        'student_name': f"{student.first_name} {student.last_name}",
                        'school_id': k,
                        'school_name': school.school_name,
                        'session_number': t,
                        'preference_score': score
                    })

                    db_match = MatchingResult(
                        student_id=s,
                        school_id=k,
                        session_number=t,
                        algorithm_used='pulp_optimal'
                    )
                    db.session.add(db_match)

    db.session.commit()

    # Statistics
    total_students = len(student_ids)
    total_score = sum(m['preference_score'] for m in matches)
    avg_score = total_score / len(matches) if matches else 0

    print(f"  Total matches: {len(matches)}")
    print(f"  Total preference score: {total_score}")
    print(f"  Average preference score: {avg_score:.2f}")

    return {
        'matches': matches,
        'statistics': {
            'total_students': total_students,
            'matched_students': total_students,
            'unmatched_students': 0,
            'average_preference_score': avg_score,
            'total_preference_score': total_score,
            'solver_status': status
        }
    }


def import_preferences_from_excel(file_path):
    """
    Import student preferences from an Excel file
    Expected format: Student Name, Email, School1, School2, ..., School25
    Where each school column contains the points allocated (out of 1000)
    """
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Validate the data structure
        required_columns = ['Name', 'Email']
        if not all(col in df.columns for col in required_columns):
            return {"error": "Excel file must contain 'Name' and 'Email' columns"}
        
        # Get all schools from database
        schools = School.query.all()
        school_names = [school.name for school in schools]
        
        # Check if all schools in the Excel file exist in the database
        school_columns = [col for col in df.columns if col not in required_columns]
        unknown_schools = [col for col in school_columns if col not in school_names]
        
        if unknown_schools:
            # Add new schools to the database
            for school_name in unknown_schools:
                new_school = School(name=school_name)
                db.session.add(new_school)
                db.session.flush()  # Get ID without committing
                
                # Create 6 sessions for this school
                for i in range(1, 7):
                    session = Session(
                        school_id=new_school.id,
                        session_number=i,
                        max_participants=13  # Default value
                    )
                    db.session.add(session)
        
        # Process each student
        for _, row in df.iterrows():
            # Check if student exists, create if not
            student = Student.query.filter_by(email=row['Email']).first()
            if not student:
                student = Student(name=row['Name'], email=row['Email'])
                db.session.add(student)
                db.session.flush()  # Get ID without committing
            
            # Process preferences for each school
            total_points = 0
            preferences = []
            
            for school_name in school_columns:
                points = row.get(school_name, 0)
                if pd.notna(points) and points > 0:
                    # Find school by name
                    school = School.query.filter_by(name=school_name).first()
                    if school:
                        total_points += points
                        preferences.append((school.id, points))
            
            # Validate total points
            if total_points > 0:
                # Normalize to 1000 points if necessary
                if total_points != 1000:
                    preferences = [(school_id, int(points * 1000 / total_points)) for school_id, points in preferences]
                
                # Save preferences
                for school_id, points in preferences:
                    # Check if preference exists, update if it does
                    pref = Preference.query.filter_by(student_id=student.id, school_id=school_id).first()
                    if pref:
                        pref.points = points
                    else:
                        pref = Preference(student_id=student.id, school_id=school_id, points=points)
                        db.session.add(pref)
        
        # Commit all changes
        db.session.commit()
        
        return {"success": True, "message": "Preferences imported successfully"}
    
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}

def run_simple_matching_algorithm():
    """
    Simple matching algorithm that:
    1. Creates a sorted list of all bids with random tiebreakers
    2. For each student, only considers their top 6 bids
    3. Processes bids in order, assigning students to sessions based on capacity
    """
    # Get all data from database
    students = Student.query.all()
    schools = School.query.all()
    preferences = Preference.query.all()
    
    # Create a dictionary to store student preferences for each school
    student_preferences = {}
    for pref in preferences:
        if pref.student_id not in student_preferences:
            student_preferences[pref.student_id] = {}
        student_preferences[pref.student_id][pref.school_id] = pref.points
    
    # Create a dictionary to map school IDs to their session capacities
    school_capacities = {}
    for school in schools:
        school_capacities[school.id] = {
            1: school.session1_capacity,
            2: school.session2_capacity,
            3: school.session3_capacity,
            4: school.session4_capacity,
            5: school.session5_capacity,
            6: school.session6_capacity
        }
    
    # Step 1: Create a list of all bids with random tiebreakers
    all_bids = []
    for student in students:
        for school in schools:
            points = student_preferences.get(student.id, {}).get(school.id, 0)
            if points > 0:  # Only include non-zero bids
                # Add random tiebreaker between 0 and 1
                all_bids.append({
                    'student_id': student.id,
                    'student_name': f"{student.first_name} {student.last_name}",
                    'school_id': school.id,
                    'school_name': school.school_name,
                    'points': points,
                    'tiebreaker': random.random()
                })
    
    # Sort bids by points (descending) and then by tiebreaker (ascending)
    all_bids.sort(key=lambda x: (-x['points'], x['tiebreaker']))
    
    # Step 2: For each student, keep only their top 6 bids
    student_bid_counts = {}
    filtered_bids = []
    for bid in all_bids:
        student_id = bid['student_id']
        if student_id not in student_bid_counts:
            student_bid_counts[student_id] = 0
        
        if student_bid_counts[student_id] < 6:
            filtered_bids.append(bid)
            student_bid_counts[student_id] += 1
    
    # Step 3: Process bids in order and assign to sessions
    matches = []
    session_assignments = {}  # Track which students are assigned to which sessions
    
    for bid in filtered_bids:
        student_id = bid['student_id']
        school_id = bid['school_id']
        
        # Skip if student already has 6 sessions assigned
        if student_id in session_assignments and len(session_assignments[student_id]) >= 6:
            continue
        
        # Try to assign to each session in order
        for session_num in range(1, 7):
            # Skip if student already has this session assigned
            if student_id in session_assignments and session_num in session_assignments[student_id]:
                continue
            
            # Check if school has capacity in this session
            if school_capacities[school_id][session_num] > 0:
                # Create match
                match = {
                    'student_id': student_id,
                    'student_name': bid['student_name'],
                    'school_id': school_id,
                    'school_name': bid['school_name'],
                    'session_number': session_num,
                    'preference_score': bid['points']
                }
                matches.append(match)
                
                # Update capacities and assignments
                school_capacities[school_id][session_num] -= 1
                if student_id not in session_assignments:
                    session_assignments[student_id] = set()
                session_assignments[student_id].add(session_num)
                
                # Create Match object in database
                db_match = MatchingResult(
                    student_id=student_id,
                    school_id=school_id,
                    session_number=session_num,
                    algorithm_used='simple_matching'
                )
                db.session.add(db_match)
                break
    
    # Commit changes to database
    db.session.commit()
    
    # Calculate statistics
    total_students = len(students)
    matched_students = len(session_assignments)
    unmatched_students = total_students - matched_students
    
    # Calculate average preference score
    if matches:
        avg_preference = sum(match['preference_score'] for match in matches) / len(matches)
    else:
        avg_preference = 0
    
    # Calculate fill rates for each school
    school_fill_rates = []
    for school in schools:
        total_capacity = sum(school_capacities[school.id][session_num] for session_num in range(1, 7))
        filled_slots = sum(1 for match in matches if match['school_id'] == school.id)
        fill_rate = filled_slots / total_capacity if total_capacity > 0 else 0
        school_fill_rates.append({
            'school_id': school.id,
            'school_name': school.school_name,
            'fill_rate': fill_rate
        })
    
    return {
        'matches': matches,
        'statistics': {
            'total_students': total_students,
            'matched_students': matched_students,
            'unmatched_students': unmatched_students,
            'average_preference_score': avg_preference,
            'school_fill_rates': school_fill_rates
        }
    }

def get_students_without_top_3_picks():
    """
    Identify students who didn't get any of their top 3 school preferences
    """
    from database import Student, Preference, MatchingResult
    
    students = Student.query.all()
    students_without_top_3 = []
    
    for student in students:
        # Get student's top 3 school preferences
        top_3_preferences = Preference.query.filter_by(student_id=student.id)\
            .order_by(Preference.points.desc()).limit(3).all()
        
        top_3_school_ids = [pref.school_id for pref in top_3_preferences]
        
        # Get student's actual assignments
        student_matches = MatchingResult.query.filter_by(student_id=student.id).all()
        assigned_school_ids = [match.school_id for match in student_matches]
        
        # Check if student got any of their top 3
        got_top_3 = any(school_id in assigned_school_ids for school_id in top_3_school_ids)
        
        if not got_top_3:
            students_without_top_3.append({
                'student_id': student.id,
                'student_name': f"{student.first_name} {student.last_name}",
                'top_3_schools': [pref.school.school_name for pref in top_3_preferences],
                'assigned_schools': [match.school.school_name for match in student_matches]
            })
    
    return students_without_top_3