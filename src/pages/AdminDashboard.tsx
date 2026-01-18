import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  InputAdornment,
  CardHeader,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  Dashboard,
  People,
  MedicalServices,
  LockOpen,
  ExitToApp,
  Person,
  Warning,
  CheckCircle,
  Cancel,
  Add,
  BarChart,
  Lock,
  Notifications,
  Search,
  CalendarToday,
  MonetizationOn,
  Group,
  PersonAdd,
  TrendingUp,
  HealthAndSafety,
  AdminPanelSettings,
  Settings,
  Storage,
  Analytics,
  Report,
  Download,
  ViewList,
  Edit,
  Delete,
  Refresh,
  Backup,
  Email,
  Phone,
  Palette,
  Vaccines,
  Healing,
  Category
} from '@mui/icons-material';

// Interfaces
interface SystemStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAdmins: number;
  totalSpecialties: number;
  activeUsers: number;
  lockedUsers: number;
  totalAppointments: number;
  activeAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  totalMedicalRecords: number;
  activeConsultations: number;
  pendingUnlockRequests: number;
  lockedDoctors: number;
  pendingRegistrations: number;
  monthlyRevenue: number;
  specialtiesCount: number;
  systemUptime: number;
  averageResponseTime: number;
  errorRate: number;
  databaseSize: number;
  activeConnections: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  phoneNumber?: string;
  isActive: boolean;
  isLocked: boolean;
  lastLogin?: string;
  createdAt: string;
  status?: 'working' | 'busy' | 'not working';
  loginAttempts?: number;
  lockedAt?: string;
}

interface Doctor extends User {
  doctorDetails?: {
    specialty_id: {
      name: string;
      _id: string;
    };
    license_number: string;
    years_of_experience: number;
    consultation_fee: number;
    isAvailable: boolean;
  };
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  isAvailable?: boolean;
}


interface Patient extends User {
  appointmentCount: number;
  medicalRecordCount: number;
  lastAppointment?: string;
  patientStatus?: 'active' | 'moderate' | 'inactive' | 'new';
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

interface Appointment {
  _id: string;
  user_id: {
    name: string;
    email: string;
  };
  doctor_id: {
    name: string;
    email: string;
  };
  specialty_id: {
    name: string;
  };
  appointment_date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  reason: string;
  created_at: string;
}

interface MedicalRecord {
  _id: string;
  user_id: {
    name: string;
    email: string;
  };
  doctor_id: {
    name: string;
    email: string;
  };
  diagnosis: string;
  status: 'active' | 'resolved' | 'follow_up' | 'chronic';
  consultation_status: 'in-progress' | 'completed' | 'cancelled';
  created_at: string;
  treatment_plan: any[];
}

interface UnlockRequest {
  _id: string;
  doctor_id: {
    name: string;
    email: string;
    phoneNumber?: string;
    lockedAt?: string;
    loginAttempts?: number;
  };
  doctor_name: string;
  doctor_email: string;
  request_reason?: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface DoctorRegistrationRequest {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  specialty_id: {
    name: string;
  };
  license_number: string;
  years_of_experience: number;
  consultation_fee: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
}

interface SystemLog {
  _id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  user?: string;
  action: string;
  ipAddress?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Specialty {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  doctorCount?: number;
  created_at: string;
  updated_at: string;
}

interface DrugCategory {
  _id: string;
  name: string;
  description?: string;
}

interface Drug {
  _id: string;
  name: string;
  brand: string;
  generic_name: string;
  description?: string;
  form: string; // tablet, syrup, injection, etc.
  strength: string; // 500mg, 10ml
  unit: string; // tablet, bottle, packet
  category_id: string | DrugCategory; // Reference to drug_category
  manufacturer: string;
  expiry_date: string;
  stock_quantity?: number;
  price: number | string;
}


const AdminDashboard: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<DoctorRegistrationRequest[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  
  // Drug Management State
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [drugCategories, setDrugCategories] = useState<DrugCategory[]>([]);
  const [openDrugDialog, setOpenDrugDialog] = useState(false);
  const [currentDrug, setCurrentDrug] = useState<Partial<Drug>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Specialties Dialog State
  const [openSpecialtyDialog, setOpenSpecialtyDialog] = useState(false);
  const [currentSpecialty, setCurrentSpecialty] = useState<Partial<Specialty>>({});

  // Fetch data based on active tab
  useEffect(() => {
    fetchSystemData();
  }, [activeTab]);

const fetchSystemData = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }

    const endpoints: { [key: string]: string } = {
      'dashboard': 'http://localhost:3000/api/admin/dashboard',
      'users': 'http://localhost:3000/api/admin/users',
      'doctors': 'http://localhost:3000/api/admin/doctors',
      'patients': 'http://localhost:3000/api/admin/patients', 
      'appointments': 'http://localhost:3000/api/admin/appointments',
      'medical-records': 'http://localhost:3000/api/admin/medical-records',
      'unlock-requests': 'http://localhost:3000/api/admin/unlock-requests',
      'doctor-registrations': 'http://localhost:3000/api/admin/doctor-registrations',
      'system-logs': 'http://localhost:3000/api/admin/system-logs',
      'specialties': 'http://localhost:3000/api/specialties',
      'drugs': 'http://localhost:3000/api/admin/drugs'
    };

    const endpoint = endpoints[activeTab] || endpoints['dashboard'];
    console.log(`📡 Fetching from: ${endpoint}`);

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Special handling for drugs tab to ensure categories are loaded
    if (activeTab === 'drugs') {
       fetch('http://localhost:3000/api/admin/drug-categories', {
          headers: { 'Authorization': `Bearer ${token}` }
       })
       .then(res => res.json())
       .then(data => {
          if (data.success) {
            setDrugCategories(data.data);
          } else {
            // Fallback mock categories if backend not ready
            setDrugCategories([
                { _id: '1', name: 'Antibiotics' },
                { _id: '2', name: 'Analgesics' },
                { _id: '3', name: 'Antipyretics' },
                { _id: '4', name: 'Antiseptics' },
                { _id: '5', name: 'Vitamins' }
            ]);
          }
       }).catch(e => console.error("Error fetching categories", e));
    }

    if (response.status === 401) {
      setError('Session expired. Please login again.');
      handleLogout();
      return;
    }

    if (response.status === 403) {
      setError('Access denied. Admin privileges required.');
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<any> = await response.json();

    if (data.success) {
      switch (activeTab) {
        case 'dashboard':
          setSystemStats(data.data.stats || data.data);
          break;
        case 'users':
          setUsers(data.data.users || data.data || []);
          break;
        case 'doctors':
          setDoctors(data.data.doctors || data.data || []);
          break;
        case 'patients':
          setPatients(data.data.patients || data.data || []);
          break;
        case 'appointments':
          setAppointments(data.data.appointments || data.data || []);
          break;
        case 'medical-records':
          setMedicalRecords(data.data.medicalRecords || data.data || []);
          break;
        case 'unlock-requests':
          setUnlockRequests(data.data.requests || data.data || []);
          break;
        case 'doctor-registrations':
          setRegistrationRequests(data.data.requests || data.data || []);
          break;
        case 'system-logs':
          setSystemLogs(data.data.logs || data.data || []);
          break;
        case 'specialties':
          setSpecialties(data.data.specialties || data.data || []);
          break;
        case 'drugs':
          setDrugs(data.data.drugs || data.data || []);
          break;
        default:
          console.warn('Unknown tab:', activeTab);
      }
    } else {
      setError(data.message || 'Failed to fetch data from server');
    }
  } catch (err: any) {
    console.error('❌ Fetch error:', err);
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      setError('Cannot connect to server. Please check if backend is running.');
    } else {
      setError(err.message || 'Network error occurred');
    }
  } finally {
    setLoading(false);
  }
};

const testAPIEndpoints = async () => {
  const token = localStorage.getItem('adminToken');
  const endpoints = [
    'http://localhost:3000/api/admin/doctors',
    'http://localhost:3000/api/admin/appointments',
    'http://localhost:3000/api/admin/medical-records',
    'http://localhost:3000/api/admin/unlock-requests',
    'http://localhost:3000/api/admin/doctor-registrations',
    'http://localhost:3000/api/admin/system-logs'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`🔍 ${endpoint}: ${response.status}`);
    } catch (error) {
      console.error(`❌ ${endpoint}:`, error);
    }
  }
};

useEffect(() => {
  testAPIEndpoints();
}, []);

// --- Drug Handlers ---

const handleOpenDrugDialog = (drug?: Drug) => {
    if (drug) {
        // Need to flatten category_id if it's an object for the Select component
        const flatDrug = {
            ...drug,
            category_id: typeof drug.category_id === 'object' && drug.category_id !== null 
                ? (drug.category_id as any)._id 
                : drug.category_id,
            // Ensure date is formatted for input type="date"
            expiry_date: drug.expiry_date ? new Date(drug.expiry_date).toISOString().split('T')[0] : ''
        };
        setCurrentDrug(flatDrug);
    } else {
        setCurrentDrug({
            name: '',
            brand: '',
            generic_name: '',
            description: '',
            form: 'Tablet',
            strength: '',
            unit: 'tablet',
            category_id: '',
            manufacturer: '',
            expiry_date: '',
            stock_quantity: 0
        });
    }
    setOpenDrugDialog(true);
};

const handleSaveDrug = async () => {
    try {
        const token = localStorage.getItem('adminToken');
        const isEdit = !!currentDrug._id;
        const url = isEdit 
            ? `http://localhost:3000/api/admin/drugs/${currentDrug._id}`
            : 'http://localhost:3000/api/admin/drugs';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentDrug)
        });

        const data = await response.json();
        if (data.success) {
            setSuccess(`Drug ${isEdit ? 'updated' : 'added'} successfully`);
            setOpenDrugDialog(false);
            fetchSystemData();
        } else {
            setError(data.message || 'Operation failed');
        }
    } catch (err: any) {
        setError(err.message);
    }
};

const handleDeleteDrug = async (id: string) => {
    if(!window.confirm('Are you sure you want to delete this drug record?')) return;
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`http://localhost:3000/api/admin/drugs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if(data.success) {
            setSuccess('Drug deleted successfully');
            fetchSystemData();
        } else {
            setError(data.message);
        }
    } catch(err: any) {
        setError(err.message);
    }
};


// --- Specialty Handlers ---

const handleOpenSpecialtyDialog = (specialty?: Specialty) => {
  if (specialty) {
    setCurrentSpecialty(specialty);
  } else {
    setCurrentSpecialty({
      name: '',
      description: '',
      color: '#07b9d5',
      icon: 'local_hospital',
      isActive: true
    });
  }
  setOpenSpecialtyDialog(true);
};

const handleSaveSpecialty = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    const isEdit = !!currentSpecialty._id;
    const url = isEdit 
      ? `http://localhost:3000/api/specialties/${currentSpecialty._id}`
      : 'http://localhost:3000/api/specialties/create';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(currentSpecialty)
    });

    const data = await response.json();
    if (data.success) {
      setSuccess(`Specialty ${isEdit ? 'updated' : 'created'} successfully`);
      setOpenSpecialtyDialog(false);
      fetchSystemData();
    } else {
      setError(data.message || 'Operation failed');
    }
  } catch (err: any) {
    setError(err.message);
  }
};

const handleDeleteSpecialty = async (id: string) => {
    if(!window.confirm('Are you sure you want to delete this specialty?')) return;
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`http://localhost:3000/api/specialties/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if(data.success) {
            setSuccess('Specialty deleted successfully');
            fetchSystemData();
        } else {
            setError(data.message);
        }
    } catch(err: any) {
        setError(err.message);
    }
};

// --- Existing Action Handlers ---

const handleLockUser = async (userId: string) => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/lock`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Locked by administrator' })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      setSuccess('User locked successfully');
      fetchSystemData();
    } else {
      setError(data.message || 'Failed to lock user');
    }
  } catch (err: any) {
    console.error('Lock user error:', err);
    setError(err.message || 'Network error. Please try again.');
  }
};

const handleUnlockUser = async (userId: string) => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/unlock`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      setSuccess('User unlocked successfully');
      fetchSystemData();
    } else {
      setError(data.message || 'Failed to unlock user');
    }
  } catch (err: any) {
    console.error('Unlock user error:', err);
    setError(err.message || 'Network error. Please try again.');
  }
};

const handleApproveRegistration = async (requestId: string) => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:3000/api/admin/doctor-registrations/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      setSuccess('Doctor registration approved successfully');
      fetchSystemData();
    } else {
      setError(data.message || 'Failed to approve registration');
    }
  } catch (err: any) {
    setError(`Error: ${err.message}`);
  }
};

const handleApproveUnlockRequest = async (requestId: string) => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:3000/api/admin/unlock-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      setSuccess('Unlock request approved successfully');
      fetchSystemData();
    } else {
      setError(data.message || 'Failed to approve unlock request');
    }
  } catch (err: any) {
    setError(`Error: ${err.message}`);
  }
};

const handleRejectRegistration = async (requestId: string) => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:3000/api/admin/doctor-registrations/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ admin_notes: 'Registration rejected by administrator' })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      setSuccess('Doctor registration rejected successfully');
      fetchSystemData();
    } else {
      setError(data.message || 'Failed to reject registration');
    }
  } catch (err: any) {
    setError('Network error. Please try again.');
  }
};

const handleRejectUnlockRequest = async (requestId: string) => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:3000/api/admin/unlock-requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ admin_notes: 'Unlock request rejected by administrator' })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      setSuccess('Unlock request rejected successfully');
      fetchSystemData();
    } else {
      setError(data.message || 'Failed to reject unlock request');
    }
  } catch (err: any) {
    setError('Network error. Please try again.');
  }
};

const handleUpdateUserStatus = async (userId: string, isActive: boolean) => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      setSuccess(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchSystemData();
    } else {
      setError(data.message || 'Failed to update user status');
    }
  } catch (err: any) {
    console.error('Update user status error:', err);
    setError(err.message || 'Network error. Please try again.');
  }
};

const handleLogout = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/admin-login';
};

// --- Helper Functions ---

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'active': return '#10b981';
    case 'moderate': return '#f59e0b';
    case 'inactive': return '#6b7280';
    case 'new': return '#3b82f6';
    default: return '#6b7280';
  }
};

const getStatusChipColor = (status?: string): "success" | "warning" | "default" | "info" => {
  switch (status) {
    case 'active': return 'success';
    case 'moderate': return 'warning';
    case 'inactive': return 'default';
    case 'new': return 'info';
    default: return 'default';
  }
};

const getStatusLabel = (status?: string): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'moderate': return 'Moderate';
    case 'inactive': return 'Inactive';
    case 'new': return 'New Patient';
    default: return 'Unknown';
  }
};

const getStatusDescription = (status?: string): string => {
  switch (status) {
    case 'active': return 'Recent activity within 7 days';
    case 'moderate': return 'Activity within 30 days';
    case 'inactive': return 'No recent activity';
    case 'new': return 'New registration';
    default: return 'Status not available';
  }
};

const exportPatientData = () => {
  if (patients.length === 0) {
    setError('No patient data to export');
    return;
  }
  try {
    const csvData = patients.map(patient => ({
      Name: patient.name,
      Email: patient.email,
      Phone: patient.phoneNumber || '',
      Status: getStatusLabel(patient.patientStatus),
      'Appointment Count': patient.appointmentCount,
      'Medical Record Count': patient.medicalRecordCount,
      'Last Appointment': patient.lastAppointment ? 
        new Date(patient.lastAppointment).toLocaleDateString() : 'None',
      'Last Login': patient.lastLogin ? 
        new Date(patient.lastLogin).toLocaleDateString() : 'Never',
      'Account Active': patient.isActive ? 'Yes' : 'No'
    }));
    const csvHeaders = Object.keys(csvData[0]).join(',');
    const csvRows = csvData.map(row => 
      Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    );
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `patients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setSuccess('Patient data exported successfully');
  } catch (err) {
    console.error('Export error:', err);
    setError('Failed to export patient data');
  }
};

// --- Filters ---
const filteredUsers = users.filter(user =>
  user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
  user.role.toLowerCase().includes(searchTerm.toLowerCase())
);

const filteredDoctors = doctors.filter(doctor =>
  doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
  doctor.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
);

const filteredDrugs = drugs.filter(drug => 
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.generic_name.toLowerCase().includes(searchTerm.toLowerCase())
);

const pendingRegistrations = registrationRequests.filter(req => req.status === 'pending');
const pendingUnlocks = unlockRequests.filter(req => req.status === 'pending');

// --- Render Functions ---

const renderDashboard = () => (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          System Overview 🚀
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete overview of the MedCare healthcare system
        </Typography>
      </Box>

      {/* Main Statistics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #3b82f6' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="overline">
                Total Users
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {systemStats?.totalUsers || 0}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="success.main">
                  Doctors: {systemStats?.totalDoctors || 0}
                </Typography>
                <Typography variant="body2" color="info.main">
                  Patients: {systemStats?.totalPatients || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #10b981' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="overline">
                Appointments
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {systemStats?.totalAppointments || 0}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="warning.main">
                  Active: {systemStats?.activeAppointments || 0}
                </Typography>
                <Typography variant="body2" color="success.main">
                  Completed: {systemStats?.completedAppointments || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #f59e0b' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="overline">
                System Health
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {systemStats?.systemUptime || 0}%
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2">
                  Response: {systemStats?.averageResponseTime || 0}ms
                </Typography>
                <Typography variant="body2" color="success.main">
                  Active: {systemStats?.activeConnections || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #ef4444' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="overline">
                Monthly Revenue
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                ${systemStats?.monthlyRevenue || 0}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="success.main">
                  +12.5%
                </Typography>
                <TrendingUp color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { title: 'Active Consultations', value: systemStats?.activeConsultations || 0, icon: <HealthAndSafety />, color: '#8b5cf6' },
          { title: 'Pending Registrations', value: systemStats?.pendingRegistrations || 0, icon: <PersonAdd />, color: '#f59e0b' },
          { title: 'Locked Accounts', value: systemStats?.lockedDoctors || 0, icon: <Lock />, color: '#ef4444' },
          { title: 'Medical Records', value: systemStats?.totalMedicalRecords || 0, icon: <Storage />, color: '#10b981' },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: stat.color, mb: 1, fontSize: '2rem' }}>
                  {stat.icon}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* System Alerts and Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="System Alerts" 
              avatar={<Warning color="warning" />}
              action={<Button size="small" onClick={fetchSystemData}>Refresh</Button>}
            />
            <CardContent>
              {systemStats && systemStats.pendingRegistrations > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {systemStats.pendingRegistrations} doctor registration requests pending review
                </Alert>
              )}
              {systemStats && systemStats.pendingUnlockRequests > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {systemStats.pendingUnlockRequests} account unlock requests need attention
                </Alert>
              )}
              {systemStats && systemStats.lockedDoctors > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {systemStats.lockedDoctors} doctor accounts are currently locked
                </Alert>
              )}
              {systemStats && systemStats.errorRate > 5 && (
                <Alert severity="error">
                  High error rate detected: {systemStats.errorRate}%
                </Alert>
              )}
              {(!systemStats || (systemStats.pendingRegistrations === 0 && systemStats.pendingUnlockRequests === 0 && systemStats.errorRate <= 5)) && (
                <Alert severity="success">
                  All systems are running smoothly
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Quick Actions" avatar={<Settings />} />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    startIcon={<Refresh />}
                    onClick={fetchSystemData}
                  >
                    Refresh Data
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<ViewList />}
                    onClick={() => setActiveTab('system-logs')}
                  >
                    View Logs
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<PersonAdd />}
                    onClick={() => setActiveTab('doctor-registrations')}
                  >
                    Review Registrations
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<LockOpen />}
                    onClick={() => setActiveTab('unlock-requests')}
                  >
                    Unlock Requests
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );

  const renderUsers = () => (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
            User Management 👥
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all system users ({users.length} total)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchSystemData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No users found
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar>{user.name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {user.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                            {user.phoneNumber && (
                              <Typography variant="body2" color="text.secondary">
                                <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                                {user.phoneNumber}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role} 
                          color={
                            user.role === 'admin' ? 'error' : 
                            user.role === 'doctor' ? 'primary' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Chip
                            label={user.isActive ? 'Active' : 'Inactive'}
                            color={user.isActive ? 'success' : 'default'}
                            size="small"
                          />
                          {user.isLocked && (
                            <Chip
                              label="Locked"
                              color="error"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Tooltip title={user.isLocked ? "Account is locked" : "Lock Account"}>
                            <IconButton 
                              color="error" 
                              disabled={user.isLocked} 
                              onClick={() => handleLockUser(user._id)}
                              size="small"
                            >
                              <Lock />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={!user.isLocked ? "Account is not locked" : "Unlock Account"}>
                            <IconButton 
                              color="success" 
                              disabled={!user.isLocked} 
                              onClick={() => handleUnlockUser(user._id)}
                              size="small"
                            >
                              <LockOpen />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.isActive ? "Deactivate User" : "Activate User"}>
                            <IconButton 
                              color={user.isActive ? "warning" : "success"}
                              onClick={() => handleUpdateUserStatus(user._id, !user.isActive)}
                              size="small"
                            >
                              {user.isActive ? <Cancel /> : <CheckCircle />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );

const renderDoctors = () => (
  <Container maxWidth="xl">
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Doctor Management 🩺
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all doctors in the system ({doctors.length} total)
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          placeholder="Search doctors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
          sx={{ minWidth: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchSystemData}
        >
          Refresh
        </Button>
      </Box>
    </Box>
    <Card>
      <CardContent>
        {filteredDoctors.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <MedicalServices sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No doctors found</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Specialty</TableCell>
                  <TableCell>License</TableCell>
                  <TableCell>Experience</TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell> {/* Đã thêm cột này */}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDoctors.map((doctor) => (
                  <TableRow key={doctor._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar>{doctor.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{doctor.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{doctor.email}</Typography>
                          {doctor.phoneNumber && (
                            <Typography variant="body2" color="text.secondary">
                              <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                              {doctor.phoneNumber}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{doctor.specialty || '-'}</TableCell>
                    <TableCell>{doctor.licenseNumber || '-'}</TableCell>
                    <TableCell>{doctor.yearsOfExperience || 0} years</TableCell>
                    <TableCell>${doctor.consultationFee || 0}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip 
                          label={doctor.status || 'N/A'} 
                          color={
                            doctor.status === 'working' ? 'success' : 
                            doctor.status === 'busy' ? 'warning' : 'default'
                          } 
                          size="small" 
                        />
                        {doctor.isLocked && (
                          <Chip label="Locked" color="error" size="small" variant="outlined" />
                        )}
                        <Chip
                          label={doctor.isActive ? 'Active' : 'Inactive'}
                          color={doctor.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {doctor.isLocked ? (
                          <Tooltip title="Unlock Account">
                            <IconButton 
                              color="success" 
                              onClick={() => handleUnlockUser(doctor._id)}
                              size="small"
                            >
                              <LockOpen />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Lock Account">
                            <IconButton 
                              color="error" 
                              onClick={() => handleLockUser(doctor._id)}
                              size="small"
                            >
                              <Lock />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={doctor.isActive ? "Deactivate User" : "Activate User"}>
                          <IconButton 
                            color={doctor.isActive ? "warning" : "success"}
                            onClick={() => handleUpdateUserStatus(doctor._id, !doctor.isActive)}
                            size="small"
                          >
                            {doctor.isActive ? <Cancel /> : <CheckCircle />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  </Container>
);


const renderPatients = () => (
  <Container maxWidth="xl">
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Patient Management 🧑‍🤝‍🧑
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all patients in the system ({patients.length} total)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`Active: ${patients.filter(p => p.patientStatus === 'active').length}`} 
            color="success" 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label={`Moderate: ${patients.filter(p => p.patientStatus === 'moderate').length}`} 
            color="warning" 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label={`Inactive: ${patients.filter(p => p.patientStatus === 'inactive').length}`} 
            color="default" 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label={`New: ${patients.filter(p => p.patientStatus === 'new').length}`} 
            color="info" 
            size="small" 
            variant="outlined"
          />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          placeholder="Search patients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
          sx={{ minWidth: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchSystemData}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={exportPatientData}
          disabled={patients.length === 0}
        >
          Export
        </Button>
      </Box>
    </Box>
    
<Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
  <Button 
    variant={searchTerm === '' ? "contained" : "outlined"}
    onClick={() => setSearchTerm('')}
    size="small"
  >
    All Patients
  </Button>
  <Button 
    variant={searchTerm === 'active' ? "contained" : "outlined"}
    onClick={() => setSearchTerm('active')}
    color="success"
    size="small"
  >
    Active
  </Button>
  <Button 
    variant={searchTerm === 'moderate' ? "contained" : "outlined"}
    onClick={() => setSearchTerm('moderate')}
    color="warning"
    size="small"
  >
    Moderate
  </Button>
  <Button 
    variant={searchTerm === 'inactive' ? "contained" : "outlined"}
    onClick={() => setSearchTerm('inactive')}
    color="inherit"
    size="small"
  >
    Inactive
  </Button>
</Box>

    <Card>
      <CardContent>
        {patients.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Group sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No patients found</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient Info</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Appointments</TableCell>
                  <TableCell>Medical Records</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell>Account Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients
                  .filter(patient => {
                    if (!searchTerm) return true;
                    if (searchTerm === 'active') return patient.patientStatus === 'active';
                    if (searchTerm === 'moderate') return patient.patientStatus === 'moderate';
                    if (searchTerm === 'inactive') return patient.patientStatus === 'inactive';
                    
                    return (
                      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (patient.phoneNumber && patient.phoneNumber.includes(searchTerm))
                    );
                  })
                  .map((patient) => (
                  <TableRow key={patient._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: getStatusColor(patient.patientStatus) }}>
                          {patient.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {patient.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {patient.email}
                          </Typography>
                          {patient.dateOfBirth && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                            </Typography>
                          )}
                          {patient.gender && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Gender: {patient.gender}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {patient.phoneNumber && (
                        <Typography variant="body2">
                          <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                          {patient.phoneNumber}
                        </Typography>
                      )}
                      {patient.address && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                          {patient.address}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={getStatusLabel(patient.patientStatus)}
                          color={getStatusChipColor(patient.patientStatus)}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {getStatusDescription(patient.patientStatus)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {patient.appointmentCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          appointments
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {patient.medicalRecordCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          records
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {patient.lastAppointment ? (
                            <>
                              Last Appt: {new Date(patient.lastAppointment).toLocaleDateString()}
                            </>
                          ) : (
                            'No appointments'
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {patient.lastLogin ? (
                            `Last login: ${new Date(patient.lastLogin).toLocaleDateString()}`
                          ) : (
                            'Never logged in'
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={patient.isActive ? 'Active' : 'Inactive'}
                        color={patient.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  </Container>
);

  const renderAppointments = () => (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Appointments 📅
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all appointments ({appointments.length} total)
        </Typography>
      </Box>
      <Card>
        <CardContent>
          {appointments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CalendarToday sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No appointments found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Specialty</TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{appt.user_id.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{appt.user_id.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{appt.doctor_id.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{appt.doctor_id.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{appt.specialty_id.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(appt.appointment_date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {appt.time_slot}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={appt.status} 
                          color={
                            appt.status === 'completed' ? 'success' : 
                            appt.status === 'pending' ? 'warning' : 
                            appt.status === 'cancelled' ? 'error' : 'default'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{appt.reason}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(appt.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );

  const renderMedicalRecords = () => (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Medical Records 🗂️
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all medical records ({medicalRecords.length} total)
        </Typography>
      </Box>
      <Card>
        <CardContent>
          {medicalRecords.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Storage sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No medical records found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Diagnosis</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Consultation</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {medicalRecords.map((rec) => (
                    <TableRow key={rec._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{rec.user_id.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{rec.user_id.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{rec.doctor_id.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{rec.doctor_id.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{rec.diagnosis}</TableCell>
                      <TableCell>
                        <Chip 
                          label={rec.status} 
                          color={
                            rec.status === 'active' ? 'success' : 
                            rec.status === 'resolved' ? 'info' : 
                            rec.status === 'chronic' ? 'warning' : 'default'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rec.consultation_status} 
                          color={
                            rec.consultation_status === 'completed' ? 'success' : 
                            rec.consultation_status === 'in-progress' ? 'warning' : 'default'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{new Date(rec.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );

  const renderUnlockRequests = () => (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Unlock Requests 🔓
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve unlock requests ({unlockRequests.length} total, {pendingUnlocks.length} pending)
        </Typography>
      </Box>
      <Card>
        <CardContent>
          {unlockRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <LockOpen sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No unlock requests found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Lock Details</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unlockRequests.map((req) => (
                    <TableRow key={req._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{req.doctor_name}</Typography>
                          <Typography variant="body2" color="text.secondary">{req.doctor_email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {req.doctor_id.phoneNumber && (
                          <Typography variant="body2">
                            <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                            {req.doctor_id.phoneNumber}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{req.request_reason || 'No reason provided'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          Locked: {req.doctor_id.lockedAt ? new Date(req.doctor_id.lockedAt).toLocaleDateString() : 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Attempts: {req.doctor_id.loginAttempts || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(req.submitted_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={req.status} 
                          color={
                            req.status === 'pending' ? 'warning' : 
                            req.status === 'approved' ? 'success' : 'error'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              variant="contained" 
                              color="success" 
                              size="small" 
                              startIcon={<CheckCircle />}
                              onClick={() => handleApproveUnlockRequest(req._id)}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="outlined" 
                              color="error" 
                              size="small" 
                              startIcon={<Cancel />}
                              onClick={() => handleRejectUnlockRequest(req._id)}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );

  const renderDoctorRegistrations = () => (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Doctor Registration Requests 📝
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve doctor registrations ({registrationRequests.length} total, {pendingRegistrations.length} pending)
        </Typography>
      </Box>
      <Card>
        <CardContent>
          {registrationRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <PersonAdd sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No registration requests found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Specialty</TableCell>
                    <TableCell>License</TableCell>
                    <TableCell>Experience</TableCell>
                    <TableCell>Fee</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrationRequests.map((req) => (
                    <TableRow key={req._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{req.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{req.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                          {req.phoneNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{req.specialty_id.name}</TableCell>
                      <TableCell>{req.license_number}</TableCell>
                      <TableCell>{req.years_of_experience} years</TableCell>
                      <TableCell>${req.consultation_fee}</TableCell>
                      <TableCell>{new Date(req.submitted_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={req.status} 
                          color={
                            req.status === 'pending' ? 'warning' : 
                            req.status === 'approved' ? 'success' : 'error'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              variant="contained" 
                              color="success" 
                              size="small" 
                              startIcon={<CheckCircle />}
                              onClick={() => handleApproveRegistration(req._id)}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="outlined" 
                              color="error" 
                              size="small" 
                              startIcon={<Cancel />}
                              onClick={() => handleRejectRegistration(req._id)}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );

  const renderSystemLogs = () => (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          System Logs 📝
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View system logs and activities ({systemLogs.length} total)
        </Typography>
      </Box>
      <Card>
        <CardContent>
          {systemLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ViewList sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No logs found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Level</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {systemLogs.map((log) => (
                    <TableRow key={log._id} hover>
                      <TableCell>
                        <Chip 
                          label={log.level} 
                          color={
                            log.level === 'error' ? 'error' : 
                            log.level === 'warning' ? 'warning' : 'info'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{log.message}</TableCell>
                      <TableCell>{log.user || '-'}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.ipAddress || '-'}</TableCell>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );

  const renderSpecialties = () => (
    <Container maxWidth="xl">
        {/* Header with Search and Add Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                    Specialty Management 🏷️
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage medical specialties and departments ({specialties.length} total)
                </Typography>
            </Box>
            <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenSpecialtyDialog()}
            >
                Add Specialty
            </Button>
        </Box>

        <Grid container spacing={3}>
            {specialties.map((specialty) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={specialty._id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${specialty.color || '#ccc'}` }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                <Avatar sx={{ bgcolor: specialty.color ? `${specialty.color}20` : 'action.hover', color: specialty.color || 'inherit' }}>
                                    <span className="material-symbols-outlined">{specialty.icon || 'local_hospital'}</span>
                                </Avatar>
                                <Chip 
                                    label={specialty.isActive ? 'Active' : 'Inactive'} 
                                    color={specialty.isActive ? 'success' : 'default'} 
                                    size="small" 
                                />
                            </Box>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                {specialty.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {specialty.description || 'No description provided.'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                                <People fontSize="small" />
                                <span>{specialty.doctorCount || 0} Doctors</span>
                            </Box>
                        </CardContent>
                        <Divider />
                        <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <IconButton size="small" color="primary" onClick={() => handleOpenSpecialtyDialog(specialty)}>
                                <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteSpecialty(specialty._id)}>
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>
                    </Card>
                </Grid>
            ))}
        </Grid>
    </Container>
  );

const renderDrugs = () => (
  <Container maxWidth="xl">
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Pharmacy Inventory 💊
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage drug inventory, expiry dates, and categories ({drugs.length} total)
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          placeholder="Search drugs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
          sx={{ minWidth: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDrugDialog()}
        >
          Add Drug
        </Button>
      </Box>
    </Box>

    <Card>
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name / Brand</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Form & Strength</TableCell>
                <TableCell>Stock & Unit</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>Price</TableCell> {/* Đã thêm cột Price */}
                <TableCell>Expiry Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDrugs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}> {/* Sửa colSpan từ 7 thành 8 */}
                    No drugs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrugs.map((drug) => {
                  const expiry = new Date(drug.expiry_date);
                  const today = new Date();
                  const monthsUntilExpiry = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
                  let statusColor: "success" | "error" | "warning" = "success";
                  let statusLabel = "Valid";

                  if (expiry < today) {
                    statusColor = "error";
                    statusLabel = "Expired";
                  } else if (monthsUntilExpiry < 3) {
                    statusColor = "warning";
                    statusLabel = "Expiring Soon";
                  }

                  return (
                    <TableRow key={drug._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">{drug.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{drug.brand}</Typography>
                          <Typography variant="caption" display="block" color="text.secondary">Gen: {drug.generic_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={typeof drug.category_id === 'object' && drug.category_id ? (drug.category_id as any).name : 'Unknown'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{drug.form}</Typography>
                        <Typography variant="caption" color="text.secondary">{drug.strength}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {drug.stock_quantity || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{drug.unit}(s)</Typography>
                      </TableCell>
                      <TableCell>{drug.manufacturer}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          ${drug.price || 0}
                        </Typography>
                      </TableCell>
                      <TableCell> {/* Đã chuyển expiry status sang đúng cột */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Chip label={statusLabel} color={statusColor} size="small" />
                          <Typography variant="caption" color="text.secondary">
                            {expiry.toLocaleDateString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          <IconButton size="small" color="primary" onClick={() => handleOpenDrugDialog(drug)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteDrug(drug._id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  </Container>
);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'users': return renderUsers();
      case 'doctors': return renderDoctors();
      case 'patients': return renderPatients();
      case 'appointments': return renderAppointments();
      case 'medical-records': return renderMedicalRecords();
      case 'unlock-requests': return renderUnlockRequests();
      case 'doctor-registrations': return renderDoctorRegistrations();
      case 'system-logs': return renderSystemLogs();
      case 'specialties': return renderSpecialties();
      case 'drugs': return renderDrugs();
      default: return renderDashboard();
    }
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1e293b' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            🏥 MediCare System Admin
          </Typography>
          
          <IconButton color="inherit" onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
            <AdminPanelSettings />
          </IconButton>
        </Toolbar>
      </AppBar>


      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setUserMenuAnchor(null); fetchSystemData(); }}>
          <Refresh sx={{ mr: 1 }} /> Refresh Data
        </MenuItem>
        <Divider /> 
        <MenuItem onClick={handleLogout}>
          <ExitToApp sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

      {/* Sidebar Navigation */}
      <Drawer
        variant="permanent"
        sx={{
          width: 280,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: 280, 
            boxSizing: 'border-box',
            bgcolor: '#0f172a',
            color: 'white'
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 2 }}>
          <Typography variant="h6" sx={{ p: 2, color: '#94a3b8', fontWeight: 'bold' }}>
            System Management
          </Typography>
          
          <List>
            <ListItem 
              button 
              selected={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><Dashboard /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>

            <ListItem 
              button 
              selected={activeTab === 'doctors'}
              onClick={() => setActiveTab('doctors')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><MedicalServices /></ListItemIcon>
              <ListItemText primary="Doctors" />
              <Chip label={systemStats?.totalDoctors || 0} size="small" color="secondary" />
            </ListItem>

            <ListItem 
              button 
              selected={activeTab === 'patients'}
              onClick={() => setActiveTab('patients')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><Group /></ListItemIcon>
              <ListItemText primary="Patients" />
              <Chip label={systemStats?.totalPatients || 0} size="small" color="info" />
            </ListItem>

            <ListItem
              button 
              selected={activeTab === 'specialties'}
              onClick={() => setActiveTab('specialties')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><People /></ListItemIcon>
              <ListItemText primary="Departments" />
              <Chip label={systemStats?.totalSpecialties || 0} size="small" color="primary" />
            </ListItem>

            <ListItem
              button 
              selected={activeTab === 'drugs'}
              onClick={() => setActiveTab('drugs')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><Vaccines /></ListItemIcon>
              <ListItemText primary="Pharmacy" />
            </ListItem>


            <ListItem 
              button 
              selected={activeTab === 'appointments'}
              onClick={() => setActiveTab('appointments')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><CalendarToday /></ListItemIcon>
              <ListItemText primary="Appointments" />
              <Chip label={systemStats?.totalAppointments || 0} size="small" color="warning" />
            </ListItem>

            <ListItem 
              button 
              selected={activeTab === 'medical-records'}
              onClick={() => setActiveTab('medical-records')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><HealthAndSafety /></ListItemIcon>
              <ListItemText primary="Medical Records" />
              <Chip label={systemStats?.totalMedicalRecords || 0} size="small" color="success" />
            </ListItem>

            <Divider sx={{ my: 2, bgcolor: '#334155' }} />

            <ListItem 
              button 
              selected={activeTab === 'doctor-registrations'}
              onClick={() => setActiveTab('doctor-registrations')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><PersonAdd /></ListItemIcon>
              <ListItemText primary="Registrations" />
              {(() => {
                const regCount = systemStats && typeof systemStats.pendingRegistrations === 'number' ? systemStats.pendingRegistrations : 0;
                const regColor = regCount > 0 ? "warning" : "default";
                return <Chip label={regCount} size="small" color={regColor} sx={{ ml: 1 }} />;
              })()}
            </ListItem>

            <ListItem 
              button 
              selected={activeTab === 'unlock-requests'}
              onClick={() => setActiveTab('unlock-requests')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><LockOpen /></ListItemIcon>
              <ListItemText primary="Unlock Requests" />
              {(() => {
                const unlockCount = systemStats && typeof systemStats.pendingUnlockRequests === 'number' ? systemStats.pendingUnlockRequests : 0;
                const unlockColor = unlockCount > 0 ? "error" : "default";
                return <Chip label={unlockCount} size="small" color={unlockColor} sx={{ ml: 1 }} />;
              })()}
            </ListItem>

            <ListItem 
              button 
              selected={activeTab === 'system-logs'}
              onClick={() => setActiveTab('system-logs')}
              sx={{
                mb: 1,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#334155' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><ViewList /></ListItemIcon>
              <ListItemText primary="System Logs" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        
        {/* Notifications */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {renderContent()}

        {/* Specialty Dialog */}
        <Dialog open={openSpecialtyDialog} onClose={() => setOpenSpecialtyDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{currentSpecialty._id ? 'Edit Specialty' : 'Add New Specialty'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Specialty Name"
                        fullWidth
                        value={currentSpecialty.name || ''}
                        onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, name: e.target.value })}
                        required
                    />
                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={currentSpecialty.description || ''}
                        onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, description: e.target.value })}
                    />
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                label="Icon (Material Symbol)"
                                fullWidth
                                value={currentSpecialty.icon || ''}
                                onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, icon: e.target.value })}
                                helperText="e.g. heart_check, medical_services"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Color"
                                fullWidth
                                type="color"
                                value={currentSpecialty.color || '#07b9d5'}
                                onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, color: e.target.value })}
                                sx={{ input: { height: 50, padding: 0 } }}
                            />
                        </Grid>
                    </Grid>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={currentSpecialty.isActive ?? true}
                                onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, isActive: e.target.checked })}
                                color="success"
                            />
                        }
                        label="Active Status"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenSpecialtyDialog(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveSpecialty} disabled={!currentSpecialty.name}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>

        {/* Drug Dialog */}
        <Dialog open={openDrugDialog} onClose={() => setOpenDrugDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>{currentDrug._id ? 'Edit Drug' : 'Add New Drug'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Drug Name"
                                fullWidth
                                value={currentDrug.name || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, name: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Brand Name"
                                fullWidth
                                value={currentDrug.brand || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, brand: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Generic Name"
                                fullWidth
                                value={currentDrug.generic_name || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, generic_name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                             <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={2}
                                value={currentDrug.description || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, description: e.target.value })}
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                             <FormControl fullWidth>
                                <InputLabel>Form</InputLabel>
                                <Select
                                    value={currentDrug.form || 'Tablet'}
                                    label="Form"
                                    onChange={(e) => setCurrentDrug({ ...currentDrug, form: e.target.value })}
                                >
                                    {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Gel', 'Cream', 'Drops', 'Inhaler', 'Powder'].map(f => (
                                        <MenuItem key={f} value={f}>{f}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Strength"
                                fullWidth
                                placeholder="e.g. 500mg"
                                value={currentDrug.strength || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, strength: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                             <FormControl fullWidth>
                                <InputLabel>Unit</InputLabel>
                                <Select
                                    value={currentDrug.unit || 'tablet'}
                                    label="Unit"
                                    onChange={(e) => setCurrentDrug({ ...currentDrug, unit: e.target.value })}
                                >
                                    {['tablet', 'bottle', 'packet', 'ml', 'strip', 'tube', 'vial'].map(u => (
                                        <MenuItem key={u} value={u}>{u}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                         <Grid item xs={12} sm={6}>
                             <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={currentDrug.category_id as string || ''}
                                    label="Category"
                                    onChange={(e) => setCurrentDrug({ ...currentDrug, category_id: e.target.value })}
                                >
                                    {drugCategories.map(cat => (
                                        <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Manufacturer"
                                fullWidth
                                value={currentDrug.manufacturer || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, manufacturer: e.target.value })}
                            />
                        </Grid>

                         <Grid item xs={12} sm={6}>
                            <TextField
                                label="Price"
                                fullWidth
                                value={currentDrug.price || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, price: e.target.value })}
                            />
                        </Grid>
                        
                         <Grid item xs={12} sm={6}>
                            <TextField
                                label="Expiry Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={currentDrug.expiry_date || ''}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, expiry_date: e.target.value })}
                            />
                        </Grid>
                         <Grid item xs={12} sm={6}>
                            <TextField
                                label="Stock Quantity"
                                type="number"
                                fullWidth
                                value={currentDrug.stock_quantity || 0}
                                onChange={(e) => setCurrentDrug({ ...currentDrug, stock_quantity: Number(e.target.value) })}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenDrugDialog(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveDrug} disabled={!currentDrug.name}>
                    Save Drug
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
    </Box>
  );
};


export default AdminDashboard;