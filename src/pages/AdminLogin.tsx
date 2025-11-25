// src/pages/AdminLogin.tsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Link,
  Avatar,
  Divider
} from '@mui/material';
import {
  LocalHospital,
  Email,
  Lock,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
}


const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.data.role !== 'admin') {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }
        const accessToken = data.data.accessToken || data.data.token;
        if (!accessToken) {
          setError('No access token received from server');
          setLoading(false);
          return;
        }
        localStorage.setItem('adminToken', accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(data.data));
        localStorage.setItem('adminUser', JSON.stringify(data.data));
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate('/admin/dashboard');
        }
      } else {
        if (response.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else if (response.status === 403) {
          setError('Account is deactivated. Please contact support.');
        } else if (response.status === 423) {
          setError('Account is locked. Please contact administrator.');
        } else {
          setError(data.message || 'Login failed. Please try again.');
        }
      }
    } catch (err: any) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #e3f2fd 0%, #b2dfdb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ borderRadius: 4, p: 4, background: '#fff', boxShadow: '0 8px 32px rgba(44, 62, 80, 0.10)' }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: '#26a69a', width: 64, height: 64, mx: 'auto', mb: 1 }}>
              <LocalHospital sx={{ fontSize: 38, color: '#fff' }} />
            </Avatar>
            <Typography variant="h5" fontWeight={700} color="#1976d2" gutterBottom>
              MedPro Hospital Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Welcome! Please sign in to continue.
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: '#26a69a' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2, background: '#f5f5f5', borderRadius: 2 }}
              placeholder="Enter your email"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#26a69a' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ minWidth: 'auto', p: 1, color: '#1976d2', borderRadius: 2 }}
                      disabled={loading}
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2, background: '#f5f5f5', borderRadius: 2 }}
              placeholder="Enter your password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="large"
              sx={{
                mt: 2,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '1rem',
                background: 'linear-gradient(90deg, #26a69a 0%, #1976d2 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(44, 62, 80, 0.10)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1976d2 0%, #26a69a 100%)',
                },
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
          <Box sx={{ textAlign: 'right', mt: 2 }}>
            <Link
              component={RouterLink}
              to="/forgot-password"
              sx={{ color: '#1976d2', fontWeight: 500, fontSize: '0.95rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Forgot password?
            </Link>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              🔒 Authorized hospital staff only. All access is monitored.
            </Typography>
          </Box>
        </Paper>
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" color="#1976d2" sx={{ fontSize: '0.8rem' }}>
            &copy; 2025 MedPro Hospital. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminLogin;