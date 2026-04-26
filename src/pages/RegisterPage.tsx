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
  Grid,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Fade,
  Slide,
  alpha,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
  Chip
} from '@mui/material';
import {
  Email,
  Person,
  Phone,
  CalendarToday,
  Badge,
  LocalHospital,
  PersonAdd,
  MonitorHeart,
  WorkHistory,
  CheckCircleOutline,
  MarkEmailRead,
  HowToReg
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// ─── Sub-components ──────────────────────────────────────────────────────────

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
      <LocalHospital sx={{ fontSize: 40, color: 'white' }} />
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
      <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
        Healthcare System
      </Typography>
    </Box>
  </Box>
);

const AnimatedBackground: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      opacity: 0.03,
      background: `
        url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 20 L60 40 L80 40 L65 55 L75 80 L50 65 L25 80 L35 55 L20 40 L40 40 Z' fill='%231976d2'/%3E%3C/svg%3E"),
        url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='35' fill='none' stroke='%2342a5f5' stroke-width='2'/%3E%3Cpath d='M30 40 L50 40 M40 30 L40 50' stroke='%2342a5f5' stroke-width='2'/%3E%3C/svg%3E")
      `,
      backgroundSize: '200px 200px, 150px 150px',
      animation: 'float 20s ease-in-out infinite',
      '@keyframes float': {
        '0%, 100%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-20px)' },
      }
    }}
  />
);

// Auth toggle (Sign In / Register)
const AuthToggle: React.FC<{
  currentPage: 'login' | 'register';
  onNavigate: (page: 'login' | 'register') => void;
}> = ({ currentPage, onNavigate }) => {
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
            top: 8, bottom: 8,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            borderRadius: '40px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)'
          }}
        />
        <Button
          onClick={() => onNavigate('login')}
          sx={{
            flex: 1, position: 'relative', zIndex: 1,
            color: currentPage === 'login' ? 'white' : 'text.primary',
            fontWeight: 600, textTransform: 'none',
            fontSize: isMobile ? '0.9rem' : '1rem',
            minHeight: 48, borderRadius: '40px', transition: 'all 0.3s ease'
          }}
        >
          <Person sx={{ mr: 1, fontSize: 20 }} />
          Sign In
        </Button>
        <Button
          onClick={() => onNavigate('register')}
          sx={{
            flex: 1, position: 'relative', zIndex: 1,
            color: currentPage === 'register' ? 'white' : 'text.primary',
            fontWeight: 600, textTransform: 'none',
            fontSize: isMobile ? '0.9rem' : '1rem',
            minHeight: 48, borderRadius: '40px', transition: 'all 0.3s ease'
          }}
        >
          <PersonAdd sx={{ mr: 1, fontSize: 20 }} />
          Register
        </Button>
      </Box>
    </Box>
  );
};

// ─── Success screen ───────────────────────────────────────────────────────────

const SuccessScreen: React.FC<{ name: string; email: string; onGoLogin: () => void }> = ({
  name,
  email,
  onGoLogin
}) => (
  <Fade in timeout={600}>
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 100,
          height: 100,
          background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
          borderRadius: '50%',
          mb: 3,
          boxShadow: '0 8px 30px rgba(76, 175, 80, 0.35)'
        }}
      >
        <CheckCircleOutline sx={{ fontSize: 52, color: 'white' }} />
      </Box>

      <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
        Request Submitted!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 380, mx: 'auto', lineHeight: 1.7 }}>
        Hi <strong>{name}</strong>, your registration request has been received.
        Our admin team will review your credentials and send your login password to:
      </Typography>

      <Chip
        icon={<MarkEmailRead />}
        label={email}
        color="primary"
        variant="outlined"
        sx={{ fontSize: '0.95rem', py: 2.5, px: 1, mb: 4, fontWeight: 600 }}
      />

      {/* Approval steps */}
      <Box
        sx={{
          bgcolor: alpha('#1976d2', 0.05),
          border: '1px solid',
          borderColor: alpha('#1976d2', 0.2),
          borderRadius: 3,
          p: 3,
          mb: 4,
          textAlign: 'left'
        }}
      >
        <Typography variant="subtitle2" fontWeight="700" color="primary.main" gutterBottom>
          What happens next?
        </Typography>
        {[
          { icon: '📋', text: 'Admin reviews your medical license & credentials' },
          { icon: '✅', text: 'Account approved within 24–48 hours' },
          { icon: '📧', text: 'Login password sent to your email' },
          { icon: '🔑', text: 'Sign in and change your password on first login' },
        ].map((step, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: i < 3 ? 1.5 : 0 }}>
            <Typography sx={{ mr: 1.5, fontSize: '1.1rem' }}>{step.icon}</Typography>
            <Typography variant="body2" color="text.secondary">{step.text}</Typography>
          </Box>
        ))}
      </Box>

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={onGoLogin}
        sx={{
          py: 1.5,
          borderRadius: 2,
          fontSize: '1rem',
          fontWeight: 'bold',
          textTransform: 'none',
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
            boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
          }
        }}
      >
        Back to Sign In
      </Button>
    </Box>
  </Fade>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterFormData {
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  specialty: string;
  licenseNumber: string;
  yearsOfExperience: string;
  consultationFee: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: string;
  consultationFee?: string;
}

interface Specialty {
  _id: string;
  name: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    consultationFee: ''
  });

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ── Fetch specialties ──
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/specialties`);
        const data = await response.json();
        if (response.ok && data.success) {
          setSpecialties(data.data);
        } else {
          setSpecialties(getFallbackSpecialties());
        }
      } catch {
        setSpecialties(getFallbackSpecialties());
      } finally {
        setLoadingSpecialties(false);
      }
    };
    fetchSpecialties();
  }, []);

  const getFallbackSpecialties = (): Specialty[] => [
    { _id: '1', name: 'Cardiology' },
    { _id: '2', name: 'Dermatology' },
    { _id: '3', name: 'Neurology' },
    { _id: '4', name: 'Ophthalmology' },
    { _id: '5', name: 'Orthopedics' },
    { _id: '6', name: 'Pediatrics' },
    { _id: '7', name: 'Psychiatry' },
    { _id: '8', name: 'Gynecology' },
    { _id: '9', name: 'Dentistry' },
    { _id: '10', name: 'Endocrinology' },
    { _id: '11', name: 'Gastroenterology' },
    { _id: '12', name: 'Surgery' }
  ];

  // ── Handlers ──
  const handleNavigation = (page: 'login' | 'register') => {
    navigate(page === 'login' ? '/doctor-login' : '/register');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (error) setError('');
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (error) setError('');
  };

  // ── Validation ──
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'phoneNumber':
        if (!value.trim()) return 'Phone number is required';
        if (!/^\d{10,15}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid phone number';
        return '';
      case 'dateOfBirth': {
        if (!value) return 'Date of birth is required';
        const birth = new Date(value);
        const today = new Date();
        if (birth >= today) return 'Date of birth must be in the past';
        if (today.getFullYear() - birth.getFullYear() < 25) return 'Must be at least 25 years old';
        return '';
      }
      case 'gender':
        if (!value) return 'Please select gender';
        return '';
      case 'specialty':
        if (!value) return 'Please select your medical specialty';
        return '';
      case 'licenseNumber':
        if (!value.trim()) return 'Medical license number is required';
        if (value.length < 5) return 'License number must be at least 5 characters';
        return '';
      case 'yearsOfExperience': {
        if (!value) return 'Years of experience is required';
        const y = parseInt(value);
        if (isNaN(y) || y < 0) return 'Experience cannot be negative';
        if (y > 60) return 'Please enter valid experience years';
        return '';
      }
      case 'consultationFee': {
        if (!value) return 'Consultation fee is required';
        const f = parseFloat(value);
        if (isNaN(f) || f < 0) return 'Consultation fee cannot be negative';
        if (f > 10000) return 'Please enter a reasonable consultation fee';
        return '';
      }
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    (Object.keys(formData) as (keyof RegisterFormData)[]).forEach(key => {
      const msg = validateField(key, formData[key]);
      if (msg) newErrors[key] = msg;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Please fix the errors in the form before submitting.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const requestData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        role: 'doctor',
        doctorProfile: {
          specialty_id: formData.specialty,
          license_number: formData.licenseNumber.trim(),
          years_of_experience: parseInt(formData.yearsOfExperience),
          consultation_fee: parseFloat(formData.consultationFee)
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
      } else {
        if (response.status === 409) {
          setError(
            data.message.includes('email')
              ? 'This email is already registered or has a pending request.'
              : data.message.includes('license')
                ? 'This license number is already registered or pending.'
                : data.message
          );
        } else {
          setError(data.message || 'Registration failed. Please try again.');
        }
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

  // ── Common TextField sx ──
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      '&:hover fieldset': { borderColor: 'primary.main' },
    },
  };

  // ── Render ──
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

      {/* Floating icons */}
      <Box sx={{ position: 'absolute', top: '10%', left: '5%', opacity: 0.1, fontSize: '4rem' }}>
        <LocalHospital />
      </Box>
      <Box sx={{ position: 'absolute', bottom: '15%', right: '7%', opacity: 0.1, fontSize: '3.5rem' }}>
        <MonitorHeart />
      </Box>

      <Container component="main" maxWidth="lg">
        <Grid container spacing={4} alignItems="center" justifyContent="center">

          {/* Left panel */}
          {!isMobile && (
            <Grid item xs={12} md={6}>
              <Fade in timeout={800}>
                <Box sx={{ textAlign: 'left', pr: 4 }}>
                  <HospitalLogo />

                  <Typography variant="h3" component="h2" fontWeight="600" color="primary.main" gutterBottom sx={{ mb: 2 }}>
                    Join Our Medical Team
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
                    Register to join our network of healthcare professionals. Fill in your credentials — no password needed at this stage.
                  </Typography>

                  {/* How it works */}
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                      mb: 3
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="700" color="primary.main" gutterBottom>
                      🔐 How does the password work?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      You don't need to create a password now. Once an admin approves your registration,
                      a <strong>secure temporary password</strong> will be automatically generated and
                      sent to your email address. You can change it after your first login.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 3, bgcolor: alpha('#4caf50', 0.05), borderRadius: 3, border: '1px solid', borderColor: alpha('#4caf50', 0.2) }}>
                    <Typography variant="subtitle1" fontWeight="700" color="success.main" gutterBottom>
                      🏥 Approval Process
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2 }}>
                      • Submit registration with your valid medical credentials<br />
                      • Admin verifies your license and specialty<br />
                      • Approval typically within 24–48 hours<br />
                      • Login credentials sent to your email automatically
                    </Typography>
                  </Box>
                </Box>
              </Fade>
            </Grid>
          )}

          {/* Right panel — form */}
          <Grid item xs={12} md={6}>
            <Slide in timeout={500} direction={isMobile ? 'up' : 'left'}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
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

                  {submitted ? (
                    <SuccessScreen
                      name={formData.name}
                      email={formData.email}
                      onGoLogin={() => navigate('/doctor-login', { replace: true })}
                    />
                  ) : (
                    <>
                      <AuthToggle currentPage="register" onNavigate={handleNavigation} />

                      {/* Header */}
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
                          <HowToReg sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                        <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main" gutterBottom>
                          Create Account
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Register as a healthcare professional
                        </Typography>
                      </Box>

                      {/* Password notice banner */}
                      <Alert
                        severity="info"
                        icon={<MarkEmailRead />}
                        sx={{ mb: 3, borderRadius: 2, bgcolor: alpha('#1976d2', 0.06), border: '1px solid', borderColor: alpha('#1976d2', 0.2) }}
                      >
                        <Typography variant="body2">
                          <strong>No password required.</strong> After admin approval, your login password will be sent to your email automatically.
                        </Typography>
                      </Alert>

                      <Box component="form" onSubmit={handleRegister}>
                        {error && (
                          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                            {error}
                          </Alert>
                        )}

                        <Grid container spacing={2}>

                          {/* ── Personal Information ── */}
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight="700" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              👤 Personal Information
                            </Typography>
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              required fullWidth
                              name="name" label="Full Name"
                              value={formData.name}
                              onChange={handleInputChange}
                              disabled={loading}
                              error={!!errors.name} helperText={errors.name}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Person color="primary" />
                                  </InputAdornment>
                                )
                              }}
                              sx={fieldSx}
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              required fullWidth
                              name="email" label="Professional Email" type="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              disabled={loading}
                              error={!!errors.email} helperText={errors.email}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Email color="primary" />
                                  </InputAdornment>
                                )
                              }}
                              sx={fieldSx}
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              required fullWidth
                              name="phoneNumber" label="Phone Number"
                              value={formData.phoneNumber}
                              onChange={handleInputChange}
                              disabled={loading}
                              error={!!errors.phoneNumber} helperText={errors.phoneNumber}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Phone color="primary" />
                                  </InputAdornment>
                                )
                              }}
                              sx={fieldSx}
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              required fullWidth
                              name="dateOfBirth" label="Date of Birth" type="date"
                              InputLabelProps={{ shrink: true }}
                              value={formData.dateOfBirth}
                              onChange={handleInputChange}
                              disabled={loading}
                              error={!!errors.dateOfBirth} helperText={errors.dateOfBirth}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CalendarToday color="primary" />
                                  </InputAdornment>
                                )
                              }}
                              sx={fieldSx}
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.gender} disabled={loading}>
                              <InputLabel>Gender</InputLabel>
                              <Select
                                name="gender" value={formData.gender}
                                onChange={handleSelectChange} label="Gender"
                                sx={{ borderRadius: 2 }}
                              >
                                <MenuItem value="male">Male</MenuItem>
                                <MenuItem value="female">Female</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                              </Select>
                              {errors.gender && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                                  {errors.gender}
                                </Typography>
                              )}
                            </FormControl>
                          </Grid>

                          {/* ── Professional Information ── */}
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight="700" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                              🩺 Professional Information
                            </Typography>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.specialty} disabled={loadingSpecialties || loading}>
                              <InputLabel>Medical Specialty</InputLabel>
                              <Select
                                name="specialty" value={formData.specialty}
                                onChange={handleSelectChange} label="Medical Specialty"
                                sx={{ borderRadius: 2 }}
                              >
                                {loadingSpecialties
                                  ? <MenuItem value="">Loading...</MenuItem>
                                  : specialties.map(s => (
                                    <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                                  ))
                                }
                              </Select>
                              {errors.specialty && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                                  {errors.specialty}
                                </Typography>
                              )}
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              required fullWidth
                              name="licenseNumber" label="Medical License Number"
                              value={formData.licenseNumber}
                              onChange={handleInputChange}
                              disabled={loading}
                              error={!!errors.licenseNumber} helperText={errors.licenseNumber}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Badge color="primary" />
                                  </InputAdornment>
                                )
                              }}
                              sx={fieldSx}
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              required fullWidth
                              name="yearsOfExperience" label="Years of Experience" type="number"
                              inputProps={{ min: 0, max: 60 }}
                              value={formData.yearsOfExperience}
                              onChange={handleInputChange}
                              disabled={loading}
                              error={!!errors.yearsOfExperience} helperText={errors.yearsOfExperience}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <WorkHistory color="primary" />
                                  </InputAdornment>
                                )
                              }}
                              sx={fieldSx}
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              required fullWidth
                              name="consultationFee" label="Consultation Fee ($)" type="number"
                              inputProps={{ min: 0, max: 10000, step: 10 }}
                              value={formData.consultationFee}
                              onChange={handleInputChange}
                              disabled={loading}
                              error={!!errors.consultationFee} helperText={errors.consultationFee}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Typography color="primary.main" fontWeight="bold">$</Typography>
                                  </InputAdornment>
                                )
                              }}
                              sx={fieldSx}
                            />
                          </Grid>

                        </Grid>

                        {/* Submit */}
                        <Button
                          type="submit"
                          fullWidth
                          variant="contained"
                          disabled={loading || loadingSpecialties}
                          size="large"
                          sx={{
                            mt: 4, py: 1.5,
                            borderRadius: 2,
                            fontSize: '1.05rem',
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
                            '&:disabled': { transform: 'none', boxShadow: 'none', background: '#e0e0e0' }
                          }}
                        >
                          {loading
                            ? <CircularProgress size={24} sx={{ color: 'white' }} />
                            : 'Submit Registration Request'
                          }
                        </Button>

                        <Box sx={{ textAlign: 'center', mt: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            Already have an account?{' '}
                            <Typography
                              component="span"
                              variant="body2"
                              color="primary.main"
                              sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                              onClick={() => handleNavigation('login')}
                            >
                              Sign In Here
                            </Typography>
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Slide>
          </Grid>
        </Grid>

        <Fade in timeout={1000}>
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Typography variant="body2" color="text.secondary">
              © 2025 MedPro Healthcare Systems. Secure • HIPAA Compliant • Professional
            </Typography>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default RegisterPage;