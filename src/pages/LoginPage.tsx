import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Checkbox,
  FormControlLabel,
  Grid,
  InputAdornment,
  IconButton,
  Modal,
  Fade,
  Slide,
  alpha,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  LocalHospital,
  HealthAndSafety,
  Close,
  LockOpen,
  PersonAdd,
  Person,
  MonitorHeart
} from '@mui/icons-material';
import { API_BASE_URL } from '../utils/api';

// Hospital Logo Component
const HospitalLogo: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        borderRadius: '20px',
        boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
        mr: 2
      }}
    >
      <LocalHospital
        sx={{
          fontSize: 40,
          color: 'white',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -4,
          right: -4,
          width: 24,
          height: 24,
          background: '#4caf50',
          borderRadius: '50%',
          border: '3px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
          ✓
        </Typography>
      </Box>
    </Box>
    <Box>
      <Typography
        variant="h4"
        component="h1"
        fontWeight="bold"
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #4caf50 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        MedPro
      </Typography>
      <Typography
        variant="subtitle1"
        color="text.secondary"
        sx={{ fontWeight: 500 }}
      >
        Healthcare System
      </Typography>
    </Box>
  </Box>
);

// Animated Medical Icons Background
const AnimatedBackground: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.03,
      background: `
        url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 20 L60 40 L80 40 L65 55 L75 80 L50 65 L25 80 L35 55 L20 40 L40 40 Z' fill='%231976d2'/%3E%3C/svg%3E"),
        url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='35' fill='none' stroke='%2342a5f5' stroke-width='2'/%3E%3Cpath d='M30 40 L50 40 M40 30 L40 50' stroke='%2342a5f5' stroke-width='2'/%3E%3C/svg%3E"),
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10 L40 25 L55 25 L45 40 L50 55 L30 45 L10 55 L15 40 L5 25 L20 25 Z' fill='%234caf50'/%3E%3C/svg%3E")
      `,
      backgroundSize: '200px 200px, 150px 150px, 120px 120px',
      animation: 'float 20s ease-in-out infinite',
      '@keyframes float': {
        '0%, 100%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-20px)' },
      }
    }}
  />
);

// Feature Item Component
const FeatureItem: React.FC<{ icon: React.ReactNode; text: string; delay: number }> = ({
  icon,
  text,
  delay
}) => (
  <Slide in timeout={800} style={{ transitionDelay: `${delay}ms` }} direction="up">
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, p: 1.5, borderRadius: 3, bgcolor: alpha('#1976d2', 0.02) }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          borderRadius: '12px',
          mr: 2,
          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)'
        }}
      >
        <Typography sx={{ color: 'white', fontSize: '1.2rem' }}>{icon}</Typography>
      </Box>
      <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
        {text}
      </Typography>
    </Box>
  </Slide>
);

// Toggle Switch for Login/Register
const AuthToggle: React.FC<{
  currentPage: 'login' | 'register';
  onNavigate: (page: 'login' | 'register') => void
}> = ({
  currentPage,
  onNavigate
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            background: alpha(theme.palette.primary.main, 0.1),
            borderRadius: '50px',
            p: 1,
            position: 'relative',
            minWidth: isMobile ? 280 : 320
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: currentPage === 'login' ? 8 : '50%',
              right: currentPage === 'login' ? '50%' : 8,
              top: 8,
              bottom: 8,
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              borderRadius: '40px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)'
            }}
          />
          <Button
            onClick={() => onNavigate('login')}
            sx={{
              flex: 1,
              position: 'relative',
              zIndex: 1,
              color: currentPage === 'login' ? 'white' : 'text.primary',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: isMobile ? '0.9rem' : '1rem',
              minHeight: 48,
              borderRadius: '40px',
              transition: 'all 0.3s ease'
            }}
          >
            <Person sx={{ mr: 1, fontSize: 20 }} />
            Sign In
          </Button>
          <Button
            onClick={() => onNavigate('register')}
            sx={{
              flex: 1,
              position: 'relative',
              zIndex: 1,
              color: currentPage === 'register' ? 'white' : 'text.primary',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: isMobile ? '0.9rem' : '1rem',
              minHeight: 48,
              borderRadius: '40px',
              transition: 'all 0.3s ease'
            }}
          >
            <PersonAdd sx={{ mr: 1, fontSize: 20 }} />
            Register
          </Button>
        </Box>
      </Box>
    );
  };

// Unlock Request Modal Component
const UnlockRequestModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/unlock-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          reason: formData.reason
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Unlock request submitted successfully! Check your email for confirmation. Our admin team will unlock your account within 24 hours.');
        setFormData({ email: '', reason: '' });

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 5000);
      } else {
        setError(data.message || 'Failed to submit unlock request. Please try again.');
      }
    } catch (err: any) {
      console.error('Unlock request error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', reason: '' });
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} disableEscapeKeyDown={loading}>
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 500 },
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            outline: 'none'
          }}
        >
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.2),
              overflow: 'hidden'
            }}
          >
            <CardContent sx={{ p: isMobile ? 3 : 4, position: 'relative' }}>
              <IconButton
                onClick={handleClose}
                disabled={loading}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                  color: 'text.secondary',
                  bgcolor: alpha('#000', 0.05),
                  '&:hover': {
                    bgcolor: alpha('#000', 0.1)
                  }
                }}
              >
                <Close />
              </IconButton>

              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    borderRadius: '50%',
                    mb: 3,
                    boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)'
                  }}
                >
                  <LockOpen sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom color="primary">
                  Request Account Unlock
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Submit a request to unlock your account. Our admin team will review it within 24 hours.
                </Typography>
              </Box>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 2
                  }}
                >
                  {error}
                </Alert>
              )}

              {success && (
                <Alert
                  severity="success"
                  sx={{
                    mb: 3,
                    borderRadius: 2
                  }}
                >
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Your Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                  placeholder="Enter the email associated with your locked account"
                />

                <TextField
                  fullWidth
                  label="Reason for Unlock Request (Optional)"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  disabled={loading}
                  multiline
                  rows={4}
                  placeholder="Please explain why you need your account unlocked. This will help us process your request faster..."
                  sx={{
                    mb: 4,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} /> : <LockOpen />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                    },
                    '&:disabled': {
                      background: '#e0e0e0',
                    }
                  }}
                >
                  {loading ? 'Submitting Request...' : 'Submit Unlock Request'}
                </Button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 2,
                    textAlign: 'center',
                    lineHeight: 1.6
                  }}
                >
                  You will receive email confirmation immediately and another email when your account is unlocked.
                  For urgent issues, contact: admin@medpro.com
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Fade>
    </Modal>
  );
};

// Main Login Page Component
const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: localStorage.getItem('rememberMe') === 'true' ? localStorage.getItem('savedEmail') || '' : '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [formData.email, formData.password]);

  // Handle navigation between login and register
  const handleNavigation = (page: 'login' | 'register') => {
    if (page === 'login') {
      navigate('/doctor-login');
    } else {
      navigate('/register');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleTogglePassword = () => {
    setShowPassword(prev => !prev);
  };

  const validateForm = (): boolean => {
    setError('');

    const { email, password } = formData;

    if (!email.trim()) {
      setError('Please enter your email address');
      return false;
    }

    if (!password) {
      setError('Please enter your password');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address)');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          role: 'doctor'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const userData = data.data;
        const userId = userData._id;

        localStorage.setItem('token', userData.accessToken);
        localStorage.setItem('doctorId', userId);
        localStorage.setItem('userId', userId);
        localStorage.setItem('doctorName', userData.name || userData.fullName || 'Doctor');

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('savedEmail');
        }

        navigate('/home', { replace: true });
      } else {
        let errorMessage = data.message || 'Login failed. Please try again.';
        if (response.status === 423) {
          setUnlockModalOpen(true);
          errorMessage = ''; // không hiển thị lỗi, mở modal unlock
        }
        if (errorMessage) setError(errorMessage);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockSuccess = () => {
    console.log('Unlock request submitted successfully');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e8f5e8 50%, #e3f2fd 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground />

      {/* Floating Medical Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          animation: 'float 6s ease-in-out infinite',
          opacity: 0.1,
          fontSize: '4rem'
        }}
      >
        <LocalHospital />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '7%',
          animation: 'float 8s ease-in-out infinite',
          opacity: 0.1,
          fontSize: '3.5rem'
        }}
      >
        <MonitorHeart />
      </Box>

      <Container component="main" maxWidth="lg">
        <Grid container spacing={4} alignItems="center" justifyContent="center">
          {/* Left Side - Welcome Content */}
          {!isMobile && (
            <Grid item xs={12} md={6}>
              <Fade in timeout={800}>
                <Box sx={{ textAlign: 'left', pr: 4 }}>
                  <HospitalLogo />

                  <Typography
                    variant="h3"
                    component="h2"
                    fontWeight="600"
                    color="primary.main"
                    gutterBottom
                    sx={{ mb: 3 }}
                  >
                    Welcome Back, Doctor
                  </Typography>

                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ mb: 4, lineHeight: 1.6 }}
                  >
                    Access your medical dashboard, manage patient records, and provide exceptional healthcare services with our secure platform.
                  </Typography>

                  {/* Features List */}
                  <Box sx={{ mb: 4 }}>
                    {[
                      { icon: '🏥', text: 'Patient Management System' },
                      { icon: '📊', text: 'Medical Analytics & Reports' },
                      { icon: '🔒', text: 'HIPAA Compliant Security' },
                      { icon: '💊', text: 'Electronic Prescriptions' }
                    ].map((feature, index) => (
                      <FeatureItem
                        key={index}
                        icon={feature.icon}
                        text={feature.text}
                        delay={index * 200}
                      />
                    ))}
                  </Box>
                </Box>
              </Fade>
            </Grid>
          )}

          {/* Right Side - Auth Form */}
          <Grid item xs={12} md={6}>
            <Slide in timeout={500} direction={isMobile ? "up" : "left"}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #1976d2, #42a5f5, #4caf50)',
                  }
                }}
              >
                <CardContent sx={{ p: isMobile ? 3 : 5 }}>
                  {isMobile && (
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <HospitalLogo />
                    </Box>
                  )}

                  {/* Navigation Toggle */}
                  <AuthToggle
                    currentPage="login"
                    onNavigate={handleNavigation}
                  />

                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 80,
                        height: 80,
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        borderRadius: '25px',
                        mb: 3,
                        boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)'
                      }}
                    >
                      <HealthAndSafety sx={{ fontSize: 40, color: 'white' }} />
                    </Box>
                    <Typography
                      variant="h4"
                      component="h1"
                      fontWeight="bold"
                      color="primary.main"
                      gutterBottom
                    >
                      Sign In
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Sign in to your medical dashboard
                    </Typography>
                  </Box>

                  <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                    {error && (
                      <Alert
                        severity="error"
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'error.light'
                        }}
                      >
                        {error}
                      </Alert>
                    )}

                    <TextField
                      fullWidth
                      id="email"
                      label="Professional Email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      name="password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleTogglePassword}
                              edge="end"
                              color="primary"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />

                    <Grid container alignItems="center" sx={{ mb: 4 }}>
                      <Grid item xs>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              color="primary"
                            />
                          }
                          label="Remember Me"
                        />
                      </Grid>
                      <Grid item>
                        <Typography
                          variant="body2"
                          color="primary.main"
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 500,
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                          onClick={() => navigate('/forgot-password')}
                        >
                          Forgot Password?
                        </Typography>
                      </Grid>
                    </Grid>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      size="large"
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                          background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                        },
                        '&:disabled': {
                          transform: 'none',
                          boxShadow: 'none',
                          background: '#e0e0e0',
                        }
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} sx={{ color: 'white' }} />
                      ) : (
                        'Access Medical Dashboard'
                      )}
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Don't have an account?{' '}
                        <Typography
                          component="span"
                          variant="body2"
                          color="primary.main"
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 600,
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                          onClick={() => handleNavigation('register')}
                        >
                          Register Here
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Slide>
          </Grid>
        </Grid>

        {/* Footer */}
        <Fade in timeout={1000}>
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Typography variant="body2" color="text.secondary">
              © 2025 MedPro Healthcare Systems. Secure • HIPAA Compliant • Professional
            </Typography>
          </Box>
        </Fade>
      </Container>

      {/* Unlock Request Modal */}
      <UnlockRequestModal
        open={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onSuccess={handleUnlockSuccess}
      />
    </Box>
  );
};

export default LoginPage;