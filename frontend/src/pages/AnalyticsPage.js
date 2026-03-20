import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        
        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          setError(data.error || 'Failed to fetch analytics data');
        }
      } catch (err) {
        setError('Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress sx={{ color: '#f5a623' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
      </Container>
    );
  }

  if (!analytics || !analytics.top_choices || !analytics.school_stats || !analytics.session_stats) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          No analytics data available. Please process preferences first.
        </Alert>
      </Container>
    );
  }

  const schoolData = Object.values(analytics.school_stats)
    .map(school => ({
      name: school.name,
      fillRate: school.fill_rate || 0,
      averageScore: school.average_preference_score || 0,
      top3Applications: school.top_3_applications || 0,
      totalCapacity: school.total_capacity || 0,
      totalMatches: school.total_matches || 0,
    }))
    .sort((a, b) => b.averageScore - a.averageScore); // Sort by average score

  const sessionData = Object.entries(analytics.session_stats)
    .map(([key, stats]) => ({
      name: key.replace('session_', 'Session '),
      averageScore: stats.average_preference_score || 0,
      totalMatches: stats.total_matches || 0,
    }))
    .sort((a, b) => parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]));

  const statCards = [
    { label: 'Total Matches', value: analytics.overall_stats.total_matches, icon: PeopleIcon, color: '#f5a623' },
    { label: 'Avg Preference Score', value: analytics.overall_stats.average_preference_score?.toFixed(2) || 0, icon: EmojiEventsIcon, color: '#f093fb' },
    { label: 'Top 3 Match Rate', value: analytics.top_choices.total_students > 0 ? `${((analytics.top_choices.students_with_at_least_one_top_3 / analytics.top_choices.total_students) * 100).toFixed(1)}%` : '0%', icon: SchoolIcon, color: '#4facfe' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #ffffff 0%, #fffaf3 100%)',
          border: '1px solid rgba(245, 166, 35, 0.1)'
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
            Matching Analytics
          </Typography>
          <Typography variant="body1" sx={{ color: '#78909c' }}>
            Insights and statistics from the matching results
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Grid item xs={12} md={4} key={card.label}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }
                  }}
                >
                  <Box sx={{ width: 56, height: 56, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${card.color}18`, flexShrink: 0 }}>
                    <IconComponent sx={{ fontSize: 28, color: card.color }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50' }}>{card.value}</Typography>
                    <Typography variant="body2" sx={{ color: '#78909c' }}>{card.label}</Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Top Choice Distribution */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#2c3e50', mb: 3 }}>
            Top Choice Distribution
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ height: 400, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: '1st Choice', value: analytics.top_choices.first_choice },
                      { name: '2nd Choice', value: analytics.top_choices.second_choice },
                      { name: '3rd Choice', value: analytics.top_choices.third_choice },
                      { name: 'Other', value: analytics.top_choices.other_choice }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fill: '#546e7a', fontSize: 13 }} />
                    <YAxis tick={{ fill: '#546e7a', fontSize: 13 }} />
                    <Tooltip 
                      formatter={(value) => [`${value} students`, 'Count']}
                      contentStyle={{ borderRadius: '10px', border: '1px solid #eee' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      fill="#f5a623" 
                      name="Number of Students"
                      radius={[6, 6, 0, 0]}
                      label={{ position: 'top', fill: '#546e7a', fontWeight: 600, fontSize: 13 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700, color: '#2c3e50' }}>
                  Match Distribution Summary
                </Typography>
                <Typography variant="body2" paragraph sx={{ color: '#78909c' }}>
                  This chart shows how many students received their best possible match:
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={<Typography variant="body2"><Box component="span" sx={{ fontWeight: 700, color: '#f5a623' }}>{analytics.top_choices.first_choice}</Box> students ({((analytics.top_choices.first_choice / analytics.top_choices.total_students) * 100).toFixed(1)}%)</Typography>}
                      secondary="received their first choice in at least one session"
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={<Typography variant="body2"><Box component="span" sx={{ fontWeight: 700, color: '#f5a623' }}>{analytics.top_choices.second_choice}</Box> students ({((analytics.top_choices.second_choice / analytics.top_choices.total_students) * 100).toFixed(1)}%)</Typography>}
                      secondary="received their second choice (but not first) in at least one session"
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={<Typography variant="body2"><Box component="span" sx={{ fontWeight: 700, color: '#f5a623' }}>{analytics.top_choices.third_choice}</Box> students ({((analytics.top_choices.third_choice / analytics.top_choices.total_students) * 100).toFixed(1)}%)</Typography>}
                      secondary="received their third choice (but not first or second) in at least one session"
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={<Typography variant="body2"><Box component="span" sx={{ fontWeight: 700, color: '#78909c' }}>{analytics.top_choices.other_choice}</Box> students ({((analytics.top_choices.other_choice / analytics.top_choices.total_students) * 100).toFixed(1)}%)</Typography>}
                      secondary="did not receive any of their top 3 choices"
                    />
                  </ListItem>
                </List>
                <Box sx={{ mt: 2, p: 2, borderRadius: '12px', background: 'rgba(245, 166, 35, 0.08)' }}>
                  <Typography variant="body2" sx={{ color: '#546e7a' }}>
                    In total, <strong>{analytics.top_choices.students_with_at_least_one_top_3}</strong> out of <strong>{analytics.top_choices.total_students}</strong> students ({((analytics.top_choices.students_with_at_least_one_top_3 / analytics.top_choices.total_students) * 100).toFixed(1)}%) received at least one of their top 3 choices.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* School Statistics */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#2c3e50', mb: 2 }}>
            School Statistics
          </Typography>
          <TableContainer sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(245, 166, 35, 0.1)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#fffaf3' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #f5a623' }}>School</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #f5a623' }}>Fill Rate</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #f5a623' }}>Capacity</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #f5a623' }}>Matches</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #f5a623' }}>Avg Score</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', borderBottom: '2px solid #f5a623' }}>Top 3 Apps</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schoolData.map((school) => (
                  <TableRow 
                    key={school.name}
                    sx={{ '&:hover': { backgroundColor: 'rgba(245, 166, 35, 0.04)' }, '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ color: '#546e7a', fontWeight: 600 }}>{school.name}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ 
                        display: 'inline-block', px: 1.5, py: 0.25, borderRadius: '6px',
                        background: school.fillRate >= 80 ? 'rgba(76, 175, 80, 0.1)' : school.fillRate >= 50 ? 'rgba(245, 166, 35, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: school.fillRate >= 80 ? '#4caf50' : school.fillRate >= 50 ? '#f5a623' : '#f44336',
                        fontWeight: 600
                      }}>
                        {school.fillRate.toFixed(1)}%
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#546e7a' }}>{school.totalCapacity}</TableCell>
                    <TableCell align="right" sx={{ color: '#546e7a' }}>{school.totalMatches}</TableCell>
                    <TableCell align="right" sx={{ color: '#546e7a' }}>{school.averageScore.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#546e7a' }}>{school.top3Applications}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Session Statistics */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: '16px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#2c3e50', mb: 2 }}>
            Session Statistics
          </Typography>
          <Box height={350}>
            <ResponsiveContainer>
              <BarChart data={sessionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: '#546e7a', fontSize: 13 }} />
                <YAxis yAxisId="left" orientation="left" stroke="#f5a623" tick={{ fill: '#546e7a', fontSize: 13 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#4facfe" tick={{ fill: '#546e7a', fontSize: 13 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #eee' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="averageScore" fill="#f5a623" name="Average Score" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="totalMatches" fill="#4facfe" name="Total Matches" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Paper>
    </Container>
  );
};

export default AnalyticsPage;