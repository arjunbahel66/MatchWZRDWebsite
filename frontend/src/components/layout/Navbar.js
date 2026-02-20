import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import SchoolIcon from '@mui/icons-material/School';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Configuration', path: '/config' },
    { name: 'Preferences', path: '/preferences' },
    { name: 'Results', path: '/results' },
    { name: 'Analytics', path: '/analytics' },
  ];

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <Container maxWidth="lg">
        <Toolbar sx={{ py: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mr: 2,
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              px: 1.5,
              py: 0.5
            }}
          >
            <SchoolIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              sx={{
                fontWeight: 700,
                color: 'white',
                textDecoration: 'none',
                letterSpacing: '0.5px'
              }}
            >
              MatchWZRD
            </Typography>
          </Box>
          
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, gap: 0.5 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.name}
                  component={RouterLink}
                  to={item.path}
                  sx={{ 
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.95rem',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    backdropFilter: isActive ? 'blur(10px)' : 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  {item.name}
                </Button>
              );
            })}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;