import React from 'react';
import { Container, Typography, Paper, Grid, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssessmentIcon from '@mui/icons-material/Assessment';

const HomePage = () => {
  const cards = [
    {
      title: 'Configuration',
      description: 'Set up event parameters including participants per session, schools attending, and more.',
      icon: SettingsIcon,
      path: '/config',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#667eea'
    },
    {
      title: 'Preferences',
      description: 'Import Excel sheets with student preference data and manage school preferences.',
      icon: FavoriteIcon,
      path: '/preferences',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#f093fb'
    },
    {
      title: 'Results',
      description: 'View and export final match outputs after running the matching algorithm.',
      icon: AssessmentIcon,
      path: '/results',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#4facfe'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4, background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)' }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Welcome to MatchWZRD
        </Typography>
        <Typography variant="h5" paragraph align="center" sx={{ color: '#546e7a', fontWeight: 300 }}>
          MBA Candidate Matching System
        </Typography>
        <Typography paragraph align="center" sx={{ color: '#78909c', maxWidth: '700px', mx: 'auto', mb: 4 }}>
          MatchWZRD helps match prospective MBA candidates with Admission Directors from their desired schools based on preferences.
        </Typography>
        
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Grid item xs={12} sm={6} md={4} key={card.path}>
                <Paper 
                  component={Link} 
                  to={card.path} 
                  elevation={3} 
                  sx={{ 
                    p: 4,
                    height: '280px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    background: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    '&:hover': {
                      transform: 'translateY(-12px) scale(1.02)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                      border: `1px solid ${card.color}`,
                      '& .icon-box': {
                        transform: 'scale(1.1) rotate(5deg)',
                        background: card.gradient,
                      },
                      '& .card-title': {
                        color: card.color,
                      }
                    }
                  }}
                >
                  <Box 
                    className="icon-box"
                    sx={{ 
                      width: '80px',
                      height: '80px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                      background: `linear-gradient(135deg, ${card.color}22 0%, ${card.color}11 100%)`,
                      transition: 'all 0.4s ease',
                    }}
                  >
                    <IconComponent sx={{ fontSize: 40, color: card.color }} />
                  </Box>
                  
                  <Typography 
                    className="card-title"
                    variant="h5" 
                    gutterBottom 
                    sx={{ 
                      fontWeight: 700,
                      color: '#2c3e50',
                      transition: 'color 0.3s ease',
                      mb: 2
                    }}
                  >
                    {card.title}
                  </Typography>
                  
                  <Typography 
                    align="center" 
                    sx={{ 
                      color: '#78909c',
                      fontSize: '0.95rem',
                      lineHeight: 1.6
                    }}
                  >
                    {card.description}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Container>
  );
};

export default HomePage;