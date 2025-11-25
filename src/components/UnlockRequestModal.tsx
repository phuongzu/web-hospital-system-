import React, { useState } from 'react';
import {
  Box,
  Modal,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Close, LockOpen, Email } from '@mui/icons-material';

interface UnlockRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const UnlockRequestModal: React.FC<UnlockRequestModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    email: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔄 Submitting unlock request for:', formData.email);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/unlock-request`, {
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
      
      console.log('🔓 Unlock request response:', {
        status: response.status,
        success: data.success,
        message: data.message
      });

      if (response.ok && data.success) {
        setSuccess('Unlock request submitted successfully! Check your email for confirmation. Our admin team will unlock your account within 24 hours.');
        setFormData({ email: '', reason: '' });
        
        // Auto close after 5 seconds
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 5000);
      } else {
        setError(data.message || 'Failed to submit unlock request. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ Unlock request error:', err);
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
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 500 },
          maxWidth: '95vw',
          outline: 'none'
        }}
      >
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
            border: '2px solid',
            borderColor: 'primary.main'
          }}
        >
          <CardContent sx={{ p: 4, position: 'relative' }}>
            <IconButton
              onClick={handleClose}
              disabled={loading}
              sx={{
                position: 'absolute',
                right: 16,
                top: 16,
                color: 'text.secondary'
              }}
            >
              <Close />
            </IconButton>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <LockOpen
                sx={{
                  fontSize: 48,
                  color: 'primary.main',
                  mb: 2
                }}
              />
              <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
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
                  background: 'linear-gradient(135deg, #4a90e2 0%, #63b3ed 100%)',
                  boxShadow: '0 4px 15px rgba(74, 144, 226, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #3a80d2 0%, #53a3dd 100%)',
                    boxShadow: '0 6px 20px rgba(74, 144, 226, 0.4)',
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
    </Modal>
  );
};

export default UnlockRequestModal;