import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ReplayIcon from '@mui/icons-material/Replay';
import AssessmentIcon from '@mui/icons-material/Assessment';

const ResultsPage = () => {
  const [matches, setMatches] = useState([]);
  const [hasConfig, setHasConfig] = useState(false);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkData = async () => {
      try {
        const [configRes, preferencesRes] = await Promise.all([
          fetch('/api/config/check'),
          fetch('/api/preferences/check')
        ]);
        
        const configData = await configRes.json();
        const preferencesData = await preferencesRes.json();
        
        setHasConfig(configData.exists);
        setHasPreferences(preferencesData.exists);
      } catch (error) {
        console.error('Error checking data:', error);
      }
    };
    
    checkData();
  }, []);

  useEffect(() => {
    const checkAndLoadResults = async () => {
      try {
        const checkResponse = await fetch('/api/results/check');
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          const response = await fetch('/api/results');
          const data = await response.json();
          if (data.success && data.matches && data.matches.length > 0) {
            setMatches(data.matches);
            setShowResults(true);
          } else {
            setShowResults(false);
          }
        } else {
          setShowResults(false);
        }
      } catch (error) {
        console.error('Error checking/loading results:', error);
        setShowResults(false);
      }
    };

    checkAndLoadResults();
  }, []);

  const handleProcessPreferences = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/preferences/process', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.matches);
        setShowResults(true);
        setSuccessMessage(`Matching complete — ${data.matches.length} matches generated.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        console.error('Error processing preferences:', data.error);
        alert(`Error processing preferences: ${data.error}`);
      }
    } catch (error) {
      console.error('Error processing preferences:', error);
      alert(`Error processing preferences: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/results/export');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export results');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'matching_results.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert(`Error exporting results: ${error.message}`);
    }
  };

  const renderMissingDataAlert = () => (
    <Alert 
      severity="info" 
      sx={{ 
        mb: 4,
        borderRadius: '12px',
        '& .MuiAlert-icon': { fontSize: '24px' }
      }}
    >
      <Typography sx={{ mb: 1, fontWeight: 600 }}>
        Please complete the following steps before viewing results:
      </Typography>
      <Box component="ul" sx={{ mt: 1, pl: 2 }}>
        {!hasConfig && (
          <li>
            <Button 
              variant="text" 
              onClick={() => navigate('/config')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#667eea',
                '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.08)' }
              }}
            >
              Upload Configuration
            </Button>
          </li>
        )}
        {!hasPreferences && (
          <li>
            <Button 
              variant="text" 
              onClick={() => navigate('/preferences')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#f093fb',
                '&:hover': { backgroundColor: 'rgba(240, 147, 251, 0.08)' }
              }}
            >
              Upload Preferences
            </Button>
          </li>
        )}
      </Box>
    </Alert>
  );

  const renderEmptyState = () => (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Box 
        sx={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.12) 0%, rgba(0, 242, 254, 0.08) 100%)',
          mb: 3,
        }}
      >
        <AssessmentIcon sx={{ fontSize: 40, color: '#4facfe' }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
        No results yet
      </Typography>
      <Typography variant="body1" sx={{ color: '#78909c', mb: 4, maxWidth: 400, mx: 'auto' }}>
        Run the matching algorithm to generate student-school assignments based on preferences and capacity.
      </Typography>
      <Button
        variant="contained"
        onClick={handleProcessPreferences}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <PlayArrowIcon />}
        sx={{
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          px: 4,
          py: 1.5,
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #3a9bef 0%, #00d9ef 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 16px rgba(79, 172, 254, 0.4)'
          },
          '&:disabled': { background: '#e0e0e0', color: '#9e9e9e' },
          transition: 'all 0.3s ease'
        }}
      >
        {isLoading ? 'Processing...' : 'Process Preferences'}
      </Button>
    </Box>
  );

  const renderResultsToolbar = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="body1" sx={{ color: '#546e7a', fontWeight: 600 }}>
        Showing {matches.length} matches
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={handleProcessPreferences}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={18} sx={{ color: '#4facfe' }} /> : <ReplayIcon />}
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            borderColor: '#4facfe',
            color: '#4facfe',
            borderWidth: '2px',
            '&:hover': {
              borderColor: '#4facfe',
              backgroundColor: 'rgba(79, 172, 254, 0.08)',
              borderWidth: '2px',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(79, 172, 254, 0.2)'
            },
            '&:disabled': { borderColor: '#e0e0e0', color: '#9e9e9e' },
            transition: 'all 0.3s ease'
          }}
        >
          {isLoading ? 'Processing...' : 'Re-run Matching'}
        </Button>
        <Button 
          variant="contained"
          onClick={handleExport}
          startIcon={<FileDownloadIcon />}
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #3a9bef 0%, #00d9ef 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(79, 172, 254, 0.4)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          Export Results
        </Button>
      </Box>
    </Box>
  );

  const renderResultsTable = () => (
    <TableContainer 
      component={Paper} 
      elevation={2}
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(79, 172, 254, 0.1)'
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f8fdff' }}>
            <TableCell sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #4facfe' }}>Student</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #4facfe' }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #4facfe' }}>School</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #4facfe' }}>Session</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #4facfe' }}>Match Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matches.map((match) => (
            <TableRow 
              key={match.id}
              sx={{
                '&:hover': { backgroundColor: 'rgba(79, 172, 254, 0.04)' },
                '&:last-child td': { borderBottom: 0 }
              }}
            >
              <TableCell sx={{ color: '#546e7a' }}>{match.student_name}</TableCell>
              <TableCell sx={{ color: '#546e7a' }}>{match.student_email}</TableCell>
              <TableCell sx={{ color: '#546e7a' }}>{match.school_name}</TableCell>
              <TableCell sx={{ color: '#546e7a' }}>Session {match.session_number}</TableCell>
              <TableCell>
                <Box 
                  sx={{ 
                    display: 'inline-block',
                    px: 2,
                    py: 0.5,
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%)',
                    color: '#4facfe',
                    fontWeight: 600
                  }}
                >
                  {typeof match.preference_score === 'object' ? match.preference_score.points : match.preference_score}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fdff 100%)',
          border: '1px solid rgba(79, 172, 254, 0.1)'
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}
          >
            Results Management
          </Typography>
          <Typography variant="body1" sx={{ color: '#78909c' }}>
            Process student preferences and view matching results
          </Typography>
        </Box>

        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ mb: 3, borderRadius: '12px' }}
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}
        
        {(!hasConfig || !hasPreferences) ? (
          renderMissingDataAlert()
        ) : showResults && matches.length > 0 ? (
          <>
            {renderResultsToolbar()}
            {renderResultsTable()}
          </>
        ) : (
          renderEmptyState()
        )}
      </Paper>
    </Container>
  );
};

export default ResultsPage;