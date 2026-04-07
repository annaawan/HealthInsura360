import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  MedicalServices,
} from '@mui/icons-material';

const Header = ({ showSignIn = true }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = ['Plans', 'Features', 'About', 'Contact'];

  return (
    <>
      <AppBar 
        position="sticky" 
        sx={{ 
          bgcolor: 'white', 
          color: '#0a2540',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          py: 1
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Logo */}
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1.5}
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <MedicalServices sx={{ fontSize: 32, color: '#0cc0df' }} />
            <Typography variant="h5" fontWeight="bold" color="#0a2540">
              HealthInsura360
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {menuItems.map((item) => (
                <Typography 
                  key={item}
                  sx={{ 
                    color: '#425466',
                    fontWeight: 500,
                    '&:hover': { 
                      color: '#0cc0df',
                      cursor: 'pointer'
                    },
                    transition: 'color 0.2s'
                  }}
                >
                  {item}
                </Typography>
              ))}
              
              {showSignIn && (
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  sx={{ 
                    borderColor: '#0cc0df', 
                    color: '#0cc0df',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#0aa9c4',
                      bgcolor: '#f0faff'
                    },
                    borderRadius: '8px',
                    px: 3
                  }}
                >
                  Sign In
                </Button>
              )}
              
              <Button 
                variant="contained"
                sx={{ 
                  bgcolor: '#0cc0df',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#0aa9c4' },
                  borderRadius: '8px',
                  px: 3,
                  boxShadow: '0 4px 12px rgba(12, 192, 223, 0.3)'
                }}
              >
                Get a Quote
              </Button>
            </Box>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton onClick={() => setIsMenuOpen(true)}>
              <MenuIcon sx={{ color: '#0a2540' }} />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      >
        <Box sx={{ width: 280, p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <MedicalServices sx={{ fontSize: 28, color: '#0cc0df' }} />
              <Typography variant="h6" fontWeight="bold" color="#0a2540">
                HealthInsura360
              </Typography>
            </Box>
            <IconButton onClick={() => setIsMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <List>
            {menuItems.map((text) => (
              <ListItem 
                button 
                key={text}
                sx={{ 
                  borderRadius: '6px',
                  mb: 1,
                  '&:hover': { bgcolor: '#f0faff' }
                }}
              >
                <ListItemText 
                  primary={text} 
                  primaryTypographyProps={{ 
                    fontWeight: 500,
                    color: '#425466'
                  }}
                />
              </ListItem>
            ))}
            
            {showSignIn && (
              <ListItem>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                  sx={{ 
                    borderColor: '#0cc0df', 
                    color: '#0cc0df',
                    fontWeight: 600,
                    borderRadius: '8px'
                  }}
                >
                  Sign In
                </Button>
              </ListItem>
            )}
            
            <ListItem>
              <Button
                fullWidth
                variant="contained"
                sx={{ 
                  bgcolor: '#0cc0df',
                  fontWeight: 600,
                  borderRadius: '8px'
                }}
              >
                Get a Quote
              </Button>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;