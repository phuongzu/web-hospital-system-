import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Grid,
  InputAdornment,
  IconButton,
  Paper,
  alpha,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Email,
  Lock,
  LocalHospital,
  HealthAndSafety,
  ArrowBack,
  CheckCircle,
  Security
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const ForgotPassword: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const steps = [
    'Enter your email',
    'Verify identity',
    'Reset password'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'verificationCode') {
      // Only allow numbers and limit to 6 digits
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (error) setError('');
  };

  // Countdown timer for verification code
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSendCode = async () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email.trim().toLowerCase() 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailSent(true);
        setCountdown(600); // 10 minutes
        setActiveStep(1);
        setSuccess('Verification code has been sent to your email');
      } else {
        // For security, still show success message even if email doesn't exist
        setEmailSent(true);
        setCountdown(600);
        setActiveStep(1);
        setSuccess('If the email exists, a verification code has been sent');
      }
    } catch (err: any) {
      setError(
        err.message === 'Failed to fetch' 
          ? 'Unable to connect to server. Please check your internet connection.'
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email.trim().toLowerCase() 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(600);
        setSuccess('New verification code sent to your email');
      } else {
        setError(data.message || 'Failed to resend code');
      }
    } catch (err: any) {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    // Validation
    if (!formData.verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    if (formData.verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    if (!formData.newPassword) {
      setError('Please enter your new password');
      return;
    }

    if (!validatePassword(formData.newPassword)) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          code: formData.verificationCode,
          newPassword: formData.newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActiveStep(2);
        setSuccess('Password reset successfully! You can now login with your new password.');
        
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            replace: true,
            state: { message: 'Password reset successfully! Please login with your new password.' }
          });
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(
        err.message === 'Failed to fetch' 
          ? 'Unable to connect to server. Please check your internet connection.'
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Enter your professional email address and we'll send you a verification code to reset your password.
            </Typography>
            
            <TextField
              fullWidth
              label="Professional Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: '#4a90e2' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#4a90e2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4a90e2',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#4a90e2',
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleSendCode}
              disabled={loading || !formData.email}
              size="large"
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #4a90e2 0%, #63b3ed 100%)',
                boxShadow: '0 4px 15px rgba(74, 144, 226, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #3a80d2 0%, #53a3dd 100%)',
                  boxShadow: '0 6px 20px rgba(74, 144, 226, 0.4)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Send Verification Code'}
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We sent a 6-digit verification code to <strong>{formData.email}</strong>. 
              Enter the code below to verify your identity.
            </Typography>

            <TextField
              fullWidth
              label="Verification Code"
              name="verificationCode"
              value={formData.verificationCode}
              onChange={handleChange}
              disabled={loading}
              inputProps={{
                maxLength: 6,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Security sx={{ color: '#4a90e2' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#4a90e2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4a90e2',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#4a90e2',
                },
              }}
            />

            {countdown > 0 && (
              <Typography variant="body2" color="warning.main" sx={{ mb: 2, textAlign: 'center' }}>
                ⏰ Code expires in {formatTime(countdown)}
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleResendCode}
                  disabled={loading || countdown > 0}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: '#4a90e2',
                    color: '#4a90e2',
                    '&:hover': {
                      borderColor: '#3a80d2',
                      background: 'rgba(74, 144, 226, 0.04)',
                    },
                  }}
                >
                  Resend Code
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                  disabled={loading || formData.verificationCode.length !== 6}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #4a90e2 0%, #63b3ed 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #3a80d2 0%, #53a3dd 100%)',
                    },
                  }}
                >
                  Verify Code
                </Button>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create a new secure password for your account. Make sure it's at least 6 characters long.
            </Typography>

            <TextField
              fullWidth
              label="New Password"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#4a90e2' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#4a90e2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4a90e2',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#4a90e2',
                },
              }}
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#4a90e2' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#4a90e2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4a90e2',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#4a90e2',
                },
              }}
            />

            {/* Password Requirements */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                background: alpha('#4a90e2', 0.04),
                border: `1px solid ${alpha('#4a90e2', 0.1)}`,
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" color="#4a90e2" gutterBottom>
                Password Requirements:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle
                  sx={{
                    fontSize: 16,
                    mr: 1,
                    color: formData.newPassword.length >= 6 ? '#10B981' : '#94A3B8'
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: formData.newPassword.length >= 6 ? '#10B981' : '#64748B'
                  }}
                >
                  At least 6 characters long
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle
                  sx={{
                    fontSize: 16,
                    mr: 1,
                    color: formData.newPassword && formData.newPassword === formData.confirmPassword ? '#10B981' : '#94A3B8'
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: formData.newPassword && formData.newPassword === formData.confirmPassword ? '#10B981' : '#64748B'
                  }}
                >
                  Passwords match
                </Typography>
              </Box>
            </Paper>

            <Button
              fullWidth
              variant="contained"
              onClick={handleVerifyAndReset}
              disabled={loading || !formData.newPassword || !formData.confirmPassword || formData.newPassword.length < 6}
              size="large"
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0DA271 0%, #2BB67B 100%)',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Reset Password'}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(74, 144, 226, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(99, 179, 237, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(116, 180, 155, 0.1) 0%, transparent 50%)
          `,
        }
      }}
    >
      {/* Medical Icons Background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          background: `
            url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 20 L60 40 L80 40 L65 55 L75 80 L50 65 L25 80 L35 55 L20 40 L40 40 Z' fill='%234a90e2'/%3E%3C/svg%3E"),
            url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='35' fill='none' stroke='%2363b3ed' stroke-width='2'/%3E%3Cpath d='M30 40 L50 40 M40 30 L40 50' stroke='%2363b3ed' stroke-width='2'/%3E%3C/svg%3E")
          `,
          backgroundSize: '200px 200px, 150px 150px',
        }}
      />

      <Container component="main" maxWidth="md">
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8} lg={6}>
            <Card 
              elevation={0}
              sx={{
                borderRadius: 4,
                background: 'white',
                border: '1px solid',
                borderColor: 'grey.200',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #4a90e2, #63b3ed, #74b49b)',
                }
              }}
            >
              <CardContent sx={{ p: 5 }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <LocalHospital 
                      sx={{ 
                        fontSize: 40, 
                        color: '#4a90e2',
                        mr: 2
                      }} 
                    />
                    <Typography 
                      variant="h4" 
                      component="h1" 
                      fontWeight="bold"
                      color="#2d3748"
                    >
                      MedPro
                    </Typography>
                  </Box>
                  
                  <HealthAndSafety 
                    sx={{ 
                      fontSize: 48, 
                      color: '#4a90e2',
                      mb: 2
                    }} 
                  />
                  
                  <Typography 
                    variant="h4" 
                    component="h2" 
                    fontWeight="bold" 
                    color="#2d3748"
                    gutterBottom
                  >
                    Reset Your Password
                  </Typography>
                  
                  <Typography variant="body1" color="#718096">
                    Secure access to your medical dashboard
                  </Typography>
                </Box>

                {/* Back Button */}
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/login')}
                  sx={{
                    mb: 3,
                    color: '#4a90e2',
                    fontWeight: '500',
                    '&:hover': {
                      background: 'rgba(74, 144, 226, 0.04)',
                    }
                  }}
                >
                  Back to Login
                </Button>

                {/* Success/Error Messages */}
                {success && (
                  <Alert 
                    severity="success" 
                    sx={{ 
                      mb: 3,
                      borderRadius: 2,
                    }}
                  >
                    {success}
                  </Alert>
                )}

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      borderRadius: 2,
                    }}
                  >
                    {error}
                  </Alert>
                )}

                {/* Progress Stepper */}
                <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
                  {steps.map((label, index) => (
                    <Step key={label}>
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontWeight: '600',
                            color: index === activeStep ? '#4a90e2' : '#64748B',
                          },
                        }}
                      >
                        {label}
                      </StepLabel>
                      <StepContent>
                        {renderStepContent(index)}
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>

                {/* Final Success Step */}
                {activeStep === 2 && success && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircle 
                      sx={{ 
                        fontSize: 64, 
                        color: '#10B981',
                        mb: 2
                      }} 
                    />
                    <Typography variant="h6" fontWeight="bold" color="#10B981" gutterBottom>
                      Password Reset Successful!
                    </Typography>
                    <Typography variant="body2" color="#64748B">
                      Redirecting to login page...
                    </Typography>
                  </Box>
                )}

                {/* Security Notice */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mt: 3,
                    borderRadius: 2,
                    background: alpha('#4a90e2', 0.04),
                    border: `1px solid ${alpha('#4a90e2', 0.1)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Security sx={{ color: '#4a90e2', mr: 1.5, mt: 0.5, fontSize: 20 }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" color="#4a90e2" gutterBottom>
                        Security Notice
                      </Typography>
                      <Typography variant="body2" color="#64748B">
                        For your security, verification codes expire after 10 minutes. 
                        Make sure to use the code promptly and never share it with anyone.
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </CardContent>
            </Card>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body2" color="#718096">
                © 2025 MedPro Healthcare Systems. Secure • Compliant • Professional
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ForgotPassword;