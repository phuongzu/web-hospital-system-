// src/App.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RealTimeDataProvider } from './context/RealTimeDataContext';
import { SocketProvider } from './context/SocketProvider'; // Import SocketProvider mới
import CssBaseline from '@mui/material/CssBaseline';
import DoctorLoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import ConsultationList from './pages/ConsultationList';
import ConsultationDetail from './pages/ConsultationDetail';
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Drugs from './pages/Drugs';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

// Component để xử lý token và socket initialization
const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Kiểm tra token khi component mount
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
    
    // Lắng nghe thay đổi storage
    const handleStorageChange = () => {
      const newToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
      setIsAuthenticated(!!newToken);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <RealTimeDataProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<DoctorLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/admin-login" 
            element={
              <AdminLogin 
                onLoginSuccess={() => { 
                  window.location.href = '/admin'; 
                }} 
              />
            } 
          />

          {/* Protected Routes cho Admin */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Routes cho User thông thường */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Dashboard />} />
            <Route path="patients" element={<PatientList />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="consultations" element={<ConsultationList />} />
            <Route path="drugs" element={<Drugs />} />
            <Route path="consultations/:id" element={<ConsultationDetail />} />
            <Route path="messages" element={<Messages />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Redirect mặc định */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </RealTimeDataProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Bọc AppContent với SocketProvider */}
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;