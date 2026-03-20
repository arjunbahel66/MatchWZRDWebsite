import React from 'react';
import { Container, Typography, Paper, Grid, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InsightsIcon from '@mui/icons-material/Insights';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

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
      description: 'Run the matching algorithm, view final outputs, and export results to Excel.',
      icon: AssessmentIcon,
      path: '/results',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#4facfe'
    },
    {
      title: 'Analytics',
      description: 'Explore matching insights, school fill rates, and preference distributions.',
      icon: InsightsIcon,
      path: '/analytics',
      gradient: 'linear-gradient(135deg, #f5a623 0%, #f7c948 100%)',
      color: '#f5a623'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Box 
          sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            mb: 3,
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 36, color: 'white' }} />
        </Box>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ fontWeight: 800, color: '#2c3e50', letterSpacing: '-0.5px' }}
        >
          Welcome to MatchWZRD
        </Typography>
        <Typography 
          variant="h6" 
          paragraph 
          sx={{ color: '#78909c', fontWeight: 400, maxWidth: '600px', mx: 'auto' }}
        >
          MBA Candidate Matching System — match prospective candidates with Admission Directors based on preferences.
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {cards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={card.path}>
              <Paper 
                component={Link} 
                to={card.path} 
                elevation={2} 
                sx={{ 
                  p: 3.5,
                  height: '260px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '20px',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  '&:hover': {
                    transform: 'translateY(-10px) scale(1.02)',
                    boxShadow: `0 20px 40px ${card.color}25`,
                    border: `1px solid ${card.color}40`,
                    '& .icon-box': {
                      transform: 'scale(1.1) rotate(5deg)',
                      background: card.gradient,
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      }
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
                    width: '68px',
                    height: '68px',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2.5,
                    background: `linear-gradient(135deg, ${card.color}18 0%, ${card.color}0A 100%)`,
                    transition: 'all 0.4s ease',
                  }}
                >
                  <IconComponent sx={{ fontSize: 32, color: card.color, transition: 'color 0.4s ease' }} />
                </Box>
                
                <Typography 
                  className="card-title"
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700,
                    color: '#2c3e50',
                    transition: 'color 0.3s ease',
                    mb: 1
                  }}
                >
                  {card.title}
                </Typography>
                
                <Typography 
                  align="center" 
                  sx={{ 
                    color: '#90a4ae',
                    fontSize: '0.85rem',
                    lineHeight: 1.5
                  }}
                >
                  {card.description}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default HomePage;