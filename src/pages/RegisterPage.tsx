import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  useMediaQuery
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
  CalendarToday,
  Badge,
  LocalHospital,
  HealthAndSafety,
  WorkHistory,
  PersonAdd,
  MonitorHeart
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

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

// Toggle Switch for Login/Register - ĐÃ SỬA ĐỂ HOẠT ĐỘNG ĐÚNG
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

interface RegisterFormData {
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
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
  password?: string;
  confirmPassword?: string;
  gender?: string;
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: string;
  consultationFee?: string;
}

interface Specialty {
  _id: string;
  name: string;
  description?: string;
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    gender: '',
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    consultationFee: ''
  });
  
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch specialties from API
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/specialties`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setSpecialties(data.data);
        } else {
          console.error('Failed to fetch specialties:', data.message);
          // Fallback to default specialties
          setSpecialties([
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
          ]);
        }
      } catch (error) {
        console.error('Error fetching specialties:', error);
        // Fallback to default specialties
        setSpecialties([
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
        ]);
      } finally {
        setLoadingSpecialties(false);
      }
    };

    fetchSpecialties();
  }, []);

  // Handle navigation between login and register
  const handleNavigation = (page: 'login' | 'register') => {
    if (page === 'login') {
      navigate('/doctor-login');
    } else {
      navigate('/register');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    if (error) setError('');
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    if (error) setError('');
  };

  const handleTogglePassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(prev => !prev);
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Full Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters long';
        return '';
      
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email address';
        return '';
      
      case 'phoneNumber':
        if (!value.trim()) return 'Phone Number is required';
        if (!/^\d{10,15}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid phone number';
        return '';
      
      case 'dateOfBirth':
        if (!value) return 'Date of Birth is required';
        const birthDate = new Date(value);
        const today = new Date();
        if (birthDate >= today) return 'Date of Birth must be in the past';
        if (today.getFullYear() - birthDate.getFullYear() < 25) return 'Must be at least 25 years old';
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters long';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return 'Password must contain uppercase, lowercase and numbers';
        return '';
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      
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
      
      case 'yearsOfExperience':
        if (!value) return 'Years of experience is required';
        const years = parseInt(value);
        if (isNaN(years) || years < 0) return 'Experience cannot be negative';
        if (years > 60) return 'Please enter valid experience years';
        return '';
      
      case 'consultationFee':
        if (!value) return 'Consultation fee is required';
        const fee = parseFloat(value);
        if (isNaN(fee) || fee < 0) return 'Consultation fee cannot be negative';
        if (fee > 10000) return 'Please enter a reasonable consultation fee';
        return '';
      
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof RegisterFormData]);
      if (error) {
        newErrors[key as keyof FormErrors] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('🔄 Submitting doctor registration request...');

      // Prepare the request data according to new API structure
      const requestData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        password: formData.password,
        gender: formData.gender,
        role: 'doctor',
        doctorProfile: {
          specialty_id: formData.specialty, // This should be the specialty ID
          license_number: formData.licenseNumber.trim(),
          years_of_experience: parseInt(formData.yearsOfExperience),
          consultation_fee: parseFloat(formData.consultationFee)
        }
      };

      console.log('📦 Request data:', requestData);

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log('📨 Registration response:', data);

      if (response.ok && data.success) {
        // Success - registration request submitted for approval
        alert('✅ Registration submitted successfully! Your application is pending admin approval. You will receive an email once approved.');
        
        navigate('/doctor-login', { 
          replace: true,
          state: { 
            message: 'Registration submitted for approval. Please wait for admin approval.',
            requestId: data.data?.requestId
          }
        });
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          if (data.message.includes('email')) {
            setError('❌ This email is already registered or has a pending registration request.');
          } else if (data.message.includes('license')) {
            setError('❌ This license number is already registered or has a pending registration request.');
          } else {
            setError(data.message || '❌ Registration failed. This email or license number may already exist.');
          }
        } else if (response.status === 400) {
          setError(data.message || '❌ Please check your information and try again.');
        } else {
          setError(data.message || '❌ Registration failed. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      setError(
        err.message === 'Failed to fetch' 
          ? '🌐 Unable to connect to server. Please check your internet connection.'
          : '❌ An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
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
                    Join Our Medical Team
                  </Typography>
                  
                  <Typography 
                    variant="h6" 
                    color="text.secondary"
                    sx={{ mb: 4, lineHeight: 1.6 }}
                  >
                    Register to join our network of healthcare professionals and start providing quality care to patients with our comprehensive healthcare platform.
                  </Typography>

                  {/* Features List */}
                  <Box sx={{ mb: 4 }}>
                    {[
                      { icon: '👨‍⚕️', text: 'Complete Patient Management' },
                      { icon: '📊', text: 'Advanced Medical Analytics' },
                      { icon: '🔒', text: 'HIPAA Compliant Security' },
                      { icon: '💊', text: 'Electronic Prescriptions' },
                      { icon: '🤝', text: 'Medical Team Collaboration' },
                      { icon: '📱', text: 'Mobile & Desktop Access' }
                    ].map((feature, index) => (
                      <FeatureItem 
                        key={index}
                        icon={feature.icon}
                        text={feature.text}
                        delay={index * 200}
                      />
                    ))}
                  </Box>

                  {/* Approval Process Info */}
                  <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 3, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2) }}>
                    <Typography variant="subtitle1" fontWeight="600" color="primary.main" gutterBottom>
                      🏥 Approval Process
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Submit your registration with valid credentials<br/>
                      • Admin reviews your medical license and details<br/>
                      • Approval typically within 24-48 hours<br/>
                      • You'll receive login credentials via email
                    </Typography>
                  </Box>
                </Box>
              </Fade>
            </Grid>
          )}

          {/* Right Side - Registration Form */}
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

                  {/* Navigation Toggle - GIỐNG NHƯ TRANG LOGIN */}
                  <AuthToggle 
                    currentPage="register" 
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
                      <PersonAdd sx={{ fontSize: 40, color: 'white' }} />
                    </Box>
                    <Typography 
                      variant="h4" 
                      component="h1" 
                      fontWeight="bold" 
                      color="primary.main"
                      gutterBottom
                    >
                      Create Account
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Register as a healthcare professional
                    </Typography>
                  </Box>

                  <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
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

                    <Grid container spacing={2}>
                      {/* Personal Information */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" fontWeight="600" color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          👤 Personal Information
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          required
                          fullWidth
                          id="name"
                          name="name"
                          label="Full Name"
                          value={formData.name}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.name}
                          helperText={errors.name}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          id="email"
                          name="email"
                          label="Professional Email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.email}
                          helperText={errors.email}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          id="phoneNumber"
                          name="phoneNumber"
                          label="Phone Number"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.phoneNumber}
                          helperText={errors.phoneNumber}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Phone color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          id="dateOfBirth"
                          name="dateOfBirth"
                          label="Date of Birth"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.dateOfBirth}
                          helperText={errors.dateOfBirth}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <CalendarToday color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth error={!!errors.gender} disabled={loading}>
                          <InputLabel>Gender</InputLabel>
                          <Select
                            name="gender"
                            value={formData.gender}
                            onChange={handleSelectChange}
                            label="Gender"
                            sx={{
                              borderRadius: 2,
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                            }}
                          >
                            <MenuItem value="male">Male</MenuItem>
                            <MenuItem value="female">Female</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                          </Select>
                          {errors.gender && (
                            <Typography variant="caption" color="error">
                              {errors.gender}
                            </Typography>
                          )}
                        </FormControl>
                      </Grid>

                      {/* Professional Information */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" fontWeight="600" color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                          🩺 Professional Information
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth error={!!errors.specialty} disabled={loadingSpecialties || loading}>
                          <InputLabel>Medical Specialty</InputLabel>
                          <Select
                            name="specialty"
                            value={formData.specialty}
                            onChange={handleSelectChange}
                            label="Medical Specialty"
                            sx={{
                              borderRadius: 2,
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                            }}
                          >
                            {loadingSpecialties ? (
                              <MenuItem value="">Loading specialties...</MenuItem>
                            ) : (
                              specialties.map(specialty => (
                                <MenuItem key={specialty._id} value={specialty._id}>
                                  {specialty.name}
                                </MenuItem>
                              ))
                            )}
                          </Select>
                          {errors.specialty && (
                            <Typography variant="caption" color="error">
                              {errors.specialty}
                            </Typography>
                          )}
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          id="licenseNumber"
                          name="licenseNumber"
                          label="Medical License Number"
                          value={formData.licenseNumber}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.licenseNumber}
                          helperText={errors.licenseNumber}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Badge color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          id="yearsOfExperience"
                          name="yearsOfExperience"
                          label="Years of Experience"
                          type="number"
                          value={formData.yearsOfExperience}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.yearsOfExperience}
                          helperText={errors.yearsOfExperience}
                          inputProps={{ min: 0, max: 60 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <WorkHistory color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          id="consultationFee"
                          name="consultationFee"
                          label="Consultation Fee ($)"
                          type="number"
                          value={formData.consultationFee}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.consultationFee}
                          helperText={errors.consultationFee}
                          inputProps={{ min: 0, max: 10000, step: 10 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography color="primary.main">$</Typography>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      {/* Security Information */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" fontWeight="600" color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                          🔒 Security Information
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          name="password"
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.password}
                          helperText={errors.password}
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
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          name="confirmPassword"
                          label="Confirm Password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          disabled={loading}
                          error={!!errors.confirmPassword}
                          helperText={errors.confirmPassword}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock color="primary" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={handleToggleConfirmPassword}
                                  edge="end"
                                  color="primary"
                                >
                                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading || loadingSpecialties}
                      size="large"
                      sx={{
                        mt: 4,
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
                        'Submit Registration Request'
                      )}
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Already have an account?{' '}
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
                          onClick={() => handleNavigation('login')}
                        >
                          Sign In Here
                        </Typography>
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Note: Your registration requires admin approval. You will receive an email with login credentials once approved.
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
    </Box>
  );
};

export default RegisterPage;