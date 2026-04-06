import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dashboard,
  People,
  MedicalServices,
  LockOpen,
  ExitToApp,
  Warning,
  CheckCircle,
  Cancel,
  Add,
  Lock,
  Search,
  CalendarToday,
  Group,
  PersonAdd,
  TrendingUp,
  HealthAndSafety,
  AdminPanelSettings,
  Settings,
  Storage,
  Download,
  ViewList,
  Edit,
  Delete,
  Refresh,
  Phone,
  Vaccines,
  Close,
  Menu as MenuIcon
} from '@mui/icons-material';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// --- Interfaces (Kept intact) ---
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
  specialty?: string | { _id: string; name: string };
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
    _id?: string;
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
    _id?: string;
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

// --- Custom Reusable Components (Refined for Enterprise UI) ---

const Badge: React.FC<{ children?: React.ReactNode; colorClass: string }> = ({ children, colorClass }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide border ${colorClass}`}>
      {children}
    </span>
  );
};

const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}>
    {children}
  </div>
);

const TableHeader = ({ cols }: { cols: string[] }) => (
  <thead className="bg-slate-50 border-b border-slate-200">
    <tr>
      {cols.map((col, idx) => (
        <th key={idx} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          {col}
        </th>
      ))}
    </tr>
  </thead>
);

const ActionButton = ({ onClick, icon: Icon, color = 'blue', title }: any) => {
  const colors: {[key: string]: string} = {
    blue: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
    red: 'text-red-600 hover:bg-red-50 hover:text-red-700',
    green: 'text-green-600 hover:bg-green-50 hover:text-green-700',
    yellow: 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700',
  };
  return (
    <button 
      onClick={onClick} 
      title={title}
      className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${colors[color] || colors.blue}`}
    >
      <Icon fontSize="small" />
    </button>
  );
};

// --- Modal Wrapper (Enhanced) ---
const Modal = ({ isOpen, onClose, title, children, actions }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.3s_ease-out]" 
          aria-hidden="true" 
          onClick={onClose}
        ></div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-[pop_0.3s_ease-out]">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl leading-6 font-bold text-slate-800" id="modal-title">
                {title}
              </h3>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1 transition-colors"
              >
                <Close fontSize="small" />
              </button>
            </div>
            <div className="mt-2 space-y-4">
              {children}
            </div>
          </div>
          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Helper Functions ---
const getStatusStyles = (status?: string): string => {
  const s = status?.toLowerCase() || '';
  
  // Success / Active / Approved / Completed / Valid
  if (['active', 'approved', 'confirmed', 'completed', 'valid', 'working', 'resolved'].includes(s)) {
    return 'bg-green-100 text-green-700 border-green-200';
  }
  
  // Warning / Pending / In-progress / Moderate / Busy
  if (['pending', 'in-progress', 'moderate', 'busy', 'follow_up', 'warning'].includes(s)) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }
  
  // Error / Rejected / Cancelled / Failed / Expired / Locked
  if (['rejected', 'cancelled', 'error', 'expired', 'locked', 'chronic', 'critical', 'failed'].includes(s)) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  
  // Info / New / Draft / Scheduled
  if (['new', 'info', 'draft', 'scheduled'].includes(s)) {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
  
  // Inactive / Disabled / Archived / Not Working
  if (['inactive', 'disabled', 'not working', 'archived', 'not_working'].includes(s)) {
    return 'bg-gray-100 text-gray-600 border-gray-200';
  }

  // Fallback for role or other text
  if (s === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (s === 'doctor') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'patient') return 'bg-gray-100 text-gray-600 border-gray-200';

  return 'bg-gray-100 text-gray-600 border-gray-200';
};

// --- Main Component ---

const AdminDashboard: React.FC = () => {
  // --- State (Kept intact) ---
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
  const navigate = useNavigate();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null); 
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Tailwind dropdown
  
  // Specialties Dialog State
  const [openSpecialtyDialog, setOpenSpecialtyDialog] = useState(false);
  const [currentSpecialty, setCurrentSpecialty] = useState<Partial<Specialty>>({});

  // --- Logic & Effects (Kept intact) ---
  const fetchSystemData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const endpoints: { [key: string]: string } = {
        'dashboard': `${API_BASE}/api/admin/dashboard`,
        'users': `${API_BASE}/api/admin/users`,
        'doctors': `${API_BASE}/api/admin/doctors`,
        'patients': `${API_BASE}/api/admin/patients`, 
        'appointments': `${API_BASE}/api/admin/appointments`,
        'medical-records': `${API_BASE}/api/admin/medical-records`,
        'unlock-requests': `${API_BASE}/api/admin/unlock-requests`,
        'doctor-registrations': `${API_BASE}/api/admin/doctor-registrations`,
        'system-logs': `${API_BASE}/api/admin/system-logs`,
        'specialties': `${API_BASE}/api/specialties`,
        'drugs': `${API_BASE}/api/admin/drugs`
      };

      const endpoint = endpoints[activeTab] || endpoints['dashboard'];
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (activeTab === 'drugs') {
         try {
           const catRes = await fetch(`${API_BASE}/api/admin/drug-categories`, {
              headers: { 'Authorization': `Bearer ${token}` }
           });
           const catData = await catRes.json();
           if (catData.success) {
             setDrugCategories(catData.data);
           } else {
             throw new Error('Failed to fetch categories');
           }
         } catch (e) {
            console.error("Error fetching categories", e);
            setDrugCategories([
                { _id: '1', name: 'Antibiotics' },
                { _id: '2', name: 'Analgesics' },
                { _id: '3', name: 'Antipyretics' },
                { _id: '4', name: 'Antiseptics' },
                { _id: '5', name: 'Vitamins' }
            ]);
         }
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
  }, [activeTab]);

  useEffect(() => {
    fetchSystemData();
  }, [fetchSystemData]);


  // --- Handlers (Kept intact) ---
  const handleOpenDrugDialog = (drug?: Drug) => {
    if (drug) {
        const flatDrug = {
            ...drug,
            category_id: typeof drug.category_id === 'object' && drug.category_id !== null 
                ? (drug.category_id as any)._id 
                : drug.category_id,
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
            ? `${API_BASE}/api/admin/drugs/${currentDrug._id}`
            : `${API_BASE}/api/admin/drugs`;
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
        const response = await fetch(`${API_BASE}/api/admin/drugs/${id}`, {
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

  const handleOpenSpecialtyDialog = (specialty?: Specialty) => {
    if (specialty) {
      setCurrentSpecialty(specialty);
    } else {
      setCurrentSpecialty({
        name: '',
        description: '',
        color: '#06b6d4',
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
        ? `${API_BASE}/api/specialties/${currentSpecialty._id}`
        : `${API_BASE}/api/specialties/create`;
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
        const response = await fetch(`${API_BASE}/api/specialties/${id}`, {
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

  const handleLockUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/lock`, {
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
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/unlock`, {
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
      const response = await fetch(`${API_BASE}/api/admin/doctor-registrations/${requestId}/approve`, {
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
      const response = await fetch(`${API_BASE}/api/admin/unlock-requests/${requestId}/approve`, {
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
      const response = await fetch(`${API_BASE}/api/admin/doctor-registrations/${requestId}/reject`, {
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
      const response = await fetch(`${API_BASE}/api/admin/unlock-requests/${requestId}/reject`, {
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
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
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
    navigate('/admin-login');
  };

  // --- Helpers ---
  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'active': return 'Active';
      case 'moderate': return 'Moderate';
      case 'inactive': return 'Inactive';
      case 'new': return 'New Patient';
      default: return status || 'Unknown';
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

  const filteredDoctors = doctors.filter(doctor => {
    const searchLow = searchTerm.toLowerCase();
    const specialtyName = typeof doctor.specialty === 'object' && doctor.specialty !== null
      ? (doctor.specialty as any).name
      : doctor.specialty || '';
    
    return (
      doctor.name.toLowerCase().includes(searchLow) ||
      doctor.email.toLowerCase().includes(searchLow) ||
      specialtyName.toLowerCase().includes(searchLow)
    );
  });

  const filteredDrugs = drugs.filter(drug => 
      drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drug.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drug.generic_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRegistrations = registrationRequests.filter(req => req.status === 'pending');
  const pendingUnlocks = unlockRequests.filter(req => req.status === 'pending');

  // --- Render Functions (Styling Updates) ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-[slideIn_0.4s_ease-out]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">System Overview</h1>
        <p className="text-slate-500 mt-1">Real-time insights and performance metrics</p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Users', 
            value: systemStats?.totalUsers || 0, 
            sub1: `Doc: ${systemStats?.totalDoctors || 0}`, 
            sub2: `Pat: ${systemStats?.totalPatients || 0}`,
            borderColor: 'border-l-4 border-blue-500',
            bgIcon: <Group className="absolute -right-4 -bottom-4 text-blue-50 opacity-20 text-9xl" style={{fontSize: 100}} />
          },
          { 
            label: 'Total Appointments', 
            value: systemStats?.totalAppointments || 0, 
            sub1: `Act: ${systemStats?.activeAppointments || 0}`, 
            sub2: `Done: ${systemStats?.completedAppointments || 0}`,
            borderColor: 'border-l-4 border-emerald-500',
            bgIcon: <CalendarToday className="absolute -right-4 -bottom-4 text-emerald-50 opacity-20 text-9xl" style={{fontSize: 100}} />
          },
          { 
            label: 'System Health', 
            value: `${systemStats?.systemUptime || 0}%`, 
            sub1: `${systemStats?.averageResponseTime || 0}ms`, 
            sub2: `Conn: ${systemStats?.activeConnections || 0}`,
            borderColor: 'border-l-4 border-cyan-500',
            bgIcon: <Storage className="absolute -right-4 -bottom-4 text-cyan-50 opacity-20 text-9xl" style={{fontSize: 100}} />
          },
          { 
            label: 'Monthly Revenue', 
            value: `$${systemStats?.monthlyRevenue || 0}`, 
            sub1: '+12.5% vs last month', 
            icon: TrendingUp,
            borderColor: 'border-l-4 border-indigo-500',
            bgIcon: <TrendingUp className="absolute -right-4 -bottom-4 text-indigo-50 opacity-20 text-9xl" style={{fontSize: 100}} />
          },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-white relative overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 ${stat.borderColor}`}>
             {/* Background Pattern */}
             {stat.bgIcon}
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <h2 className="text-4xl font-extrabold text-slate-800 mb-4">{stat.value}</h2>
              <div className="flex justify-between items-end text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  {stat.sub1} 
                  {stat.icon && <stat.icon fontSize="inherit" className="text-emerald-500" />}
                </span>
                {stat.sub2 && <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{stat.sub2}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Active Consultations', value: systemStats?.activeConsultations || 0, icon: HealthAndSafety, color: 'text-purple-600', bg: 'bg-purple-50' },
          { title: 'Pending Registrations', value: systemStats?.pendingRegistrations || 0, icon: PersonAdd, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Locked Accounts', value: systemStats?.lockedDoctors || 0, icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50' },
          { title: 'Medical Records', value: systemStats?.totalMedicalRecords || 0, icon: Storage, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-6 flex flex-col items-center justify-center text-center group cursor-default">
            <div className={`p-4 rounded-full ${stat.bg} mb-4 transition-transform group-hover:scale-110 duration-300`}>
              <stat.icon className={`${stat.color}`} style={{ fontSize: '2rem' }} />
            </div>
            <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{stat.title}</p>
          </Card>
        ))}
      </div>

      {/* System Status & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <h3 className="font-bold text-slate-700">System Alerts & Notifications</h3>
            </div>
            <button onClick={fetchSystemData} className="text-blue-600 text-xs font-semibold hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition">REFRESH</button>
          </div>
          <div className="p-6 space-y-4">
             {systemStats && systemStats.pendingRegistrations > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
                  <Warning fontSize="small" className="mt-0.5" />
                  <div>
                    <span className="font-bold block">Action Required</span>
                    {systemStats.pendingRegistrations} doctor registration requests pending review
                  </div>
                </div>
              )}
              {systemStats && systemStats.pendingUnlockRequests > 0 && (
                <div className="bg-rose-50/80 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
                  <Lock fontSize="small" className="mt-0.5" />
                  <div>
                    <span className="font-bold block">Security Alert</span>
                    {systemStats.pendingUnlockRequests} account unlock requests need attention
                  </div>
                </div>
              )}
              {systemStats && systemStats.lockedDoctors > 0 && (
                <div className="bg-blue-50/80 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
                  <Lock fontSize="small" className="mt-0.5" />
                   <div>
                    <span className="font-bold block">Account Status</span>
                    {systemStats.lockedDoctors} doctor accounts are currently locked
                  </div>
                </div>
              )}
              {(!systemStats || (systemStats.pendingRegistrations === 0 && systemStats.pendingUnlockRequests === 0)) && (
                 <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-800 px-4 py-4 rounded-lg text-sm flex items-center gap-3">
                    <CheckCircle fontSize="medium" /> 
                    <div>
                      <span className="font-bold block text-emerald-900">All Systems Operational</span>
                      <span className="text-emerald-700">No pending alerts at this time.</span>
                    </div>
                 </div>
              )}
          </div>
        </Card>

        <Card className="h-full">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
             <Settings className="text-slate-400" />
             <h3 className="font-bold text-slate-700">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
             <button onClick={fetchSystemData} className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300">
                <Refresh fontSize="medium" /> 
                <span className="font-semibold text-sm">Refresh Data</span>
             </button>
             <button onClick={() => setActiveTab('system-logs')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 hover:-translate-y-1 transition-all duration-300">
                <ViewList fontSize="medium" /> 
                <span className="font-semibold text-sm">View Logs</span>
             </button>
             <button onClick={() => setActiveTab('doctor-registrations')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 hover:-translate-y-1 transition-all duration-300">
                <PersonAdd fontSize="medium" /> 
                <span className="font-semibold text-sm">Registrations</span>
             </button>
             <button onClick={() => setActiveTab('unlock-requests')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 hover:-translate-y-1 transition-all duration-300">
                <LockOpen fontSize="medium" /> 
                <span className="font-semibold text-sm">Unlock Requests</span>
             </button>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6 animate-[slideIn_0.4s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">User Management <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{users.length}</span></h1>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 group">
            <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fontSize="small" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all"
            />
          </div>
          <button onClick={fetchSystemData} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center gap-2 font-medium shadow-sm">
            <Refresh fontSize="small" /> 
          </button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <TableHeader cols={['User Identity', 'Role Access', 'Status', 'Last Activity', 'Joined Date', 'Actions']} />
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                 <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No users matching your criteria</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold shadow-inner">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                          {user?.phoneNumber && <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone style={{fontSize: 10}}/> {user.phoneNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge colorClass={getStatusStyles(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge colorClass={user.isActive ? getStatusStyles('active') : getStatusStyles('inactive')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {user.isLocked && <Badge colorClass={getStatusStyles('locked')}>Locked</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : <span className="text-slate-400">Never</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.isLocked ? (
                          <ActionButton title="Unlock" onClick={() => handleUnlockUser(user._id)} icon={LockOpen} color="green" />
                        ) : (
                          <ActionButton title="Lock" onClick={() => handleLockUser(user._id)} icon={Lock} color="red" />
                        )}
                        <ActionButton 
                          title={user.isActive ? "Deactivate" : "Activate"} 
                          onClick={() => handleUpdateUserStatus(user._id, !user.isActive)} 
                          icon={user.isActive ? Cancel : CheckCircle} 
                          color={user.isActive ? "yellow" : "green"} 
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderDoctors = () => (
    <div className="space-y-6 animate-[slideIn_0.4s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">Medical Staff <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{doctors.length}</span></h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 group">
             <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500" fontSize="small" />
             <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-10 pr-4 py-2 w-full sm:w-64 border border-slate-200 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
          </div>
          <button onClick={fetchSystemData} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 shadow-sm"><Refresh fontSize="small"/></button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <TableHeader cols={['Doctor', 'Specialty', 'License Info', 'Experience', 'Consultation Fee', 'Status', 'Actions']} />
            <tbody className="divide-y divide-slate-100">
              {filteredDoctors.length === 0 ? (
                 <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No doctors found</td></tr>
              ) : (
                filteredDoctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold ring-2 ring-blue-100">{doc.name.charAt(0)}</div>
                         <div>
                            <p className="font-bold text-slate-800">{doc.name}</p>
                            <p className="text-xs text-slate-500">{doc.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {typeof doc.specialty === 'object' && doc.specialty !== null
                        ? (doc.specialty as any).name
                        : doc.specialty || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono tracking-wide">{doc.licenseNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{doc?.yearsOfExperience || 0} yrs</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">${doc?.consultationFee || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                         <Badge colorClass={getStatusStyles(doc.status)}>
                            {doc.status || 'N/A'}
                         </Badge>
                         {doc.isLocked && <Badge colorClass={getStatusStyles('locked')}>Locked</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex gap-2">
                          <ActionButton onClick={() => doc.isLocked ? handleUnlockUser(doc._id) : handleLockUser(doc._id)} icon={doc.isLocked ? LockOpen : Lock} color={doc.isLocked ? 'green' : 'red'} />
                          <ActionButton onClick={() => handleUpdateUserStatus(doc._id, !doc.isActive)} icon={doc.isActive ? Cancel : CheckCircle} color={doc.isActive ? 'yellow' : 'green'} />
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-6 animate-[slideIn_0.4s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Patient Database</h1>
           <div className="flex gap-2 mt-2 flex-wrap">
              {['Active', 'Moderate', 'Inactive', 'New'].map(status => {
                 const count = patients.filter(p => p.patientStatus === status.toLowerCase()).length;
                 const baseClass = getStatusStyles(status);
                 // extracting bg and text colors roughly for the count badges
                 return <span key={status} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${baseClass}`}>{status}: {count}</span>
              })}
           </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search patients..." className="flex-grow px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
           <button onClick={fetchSystemData} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600"><Refresh/></button>
           <button onClick={exportPatientData} disabled={!patients.length} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"><Download/></button>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
         {['', 'active', 'moderate', 'inactive'].map(filter => (
            <button 
              key={filter} 
              onClick={() => setSearchTerm(filter)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full capitalize border transition-all duration-200 ${searchTerm === filter ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
            >
              {filter || 'All Patients'}
            </button>
         ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <TableHeader cols={['Patient Details', 'Contact Info', 'Health Status', 'Appts', 'Records', 'Timeline', 'Account']} />
              <tbody className="divide-y divide-slate-100">
                 {patients.filter(p => !searchTerm || p.patientStatus === searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${getStatusStyles(p.patientStatus).replace('bg-', 'border-').replace('text-', 'text-slate-800 ')}`}>{p.name.charAt(0)}</div>
                             <div>
                                <p className="font-bold text-slate-800">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.email}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">DOB: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col">
                             <span className="flex items-center gap-1 text-slate-700 font-medium"><Phone style={{fontSize: 12}}/> {p.phoneNumber || '-'}</span>
                             <span className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">{p.address}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyles(p.patientStatus)}`}>{getStatusLabel(p.patientStatus)}</span>
                             <span className="text-[10px] text-slate-400 italic">{getStatusDescription(p.patientStatus)}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{p.appointmentCount}</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{p.medicalRecordCount}</span>
                       </td>
                       <td className="px-6 py-4 text-xs">
                          <p className="text-slate-700 font-medium">Last: {p?.lastAppointment ? new Date(p.lastAppointment).toLocaleDateString() : 'None'}</p>
                          <p className="text-slate-400 mt-0.5">Login: {p?.lastLogin ? new Date(p.lastLogin).toLocaleDateString() : 'Never'}</p>
                       </td>
                       <td className="px-6 py-4">
                          <Badge colorClass={p.isActive ? getStatusStyles('active') : getStatusStyles('inactive')}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </Card>
    </div>
  );

  const renderSimpleTable = (title: string, data: any[], columns: any[], renderRow: any) => (
    <div className="space-y-6 animate-[slideIn_0.4s_ease-out]">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-full text-sm">{data.length} records found</p>
       </div>
       <Card>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <TableHeader cols={columns} />
                <tbody className="divide-y divide-slate-100">
                   {data.length === 0 ? (
                      <tr><td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 italic">No data available at the moment</td></tr>
                   ) : data.map(renderRow)}
                </tbody>
             </table>
          </div>
       </Card>
    </div>
  );

  const renderAppointments = () => renderSimpleTable('Appointments Schedule', appointments, 
    ['Patient Details', 'Doctor Assigned', 'Department', 'Date & Time', 'Status', 'Reason', 'Booking Date'],
    (appt: Appointment) => (
       <tr key={appt._id} className="hover:bg-slate-50/80 transition-colors">
          <td className="px-6 py-4">
             <p className="font-bold text-slate-800">{appt.user_id.name}</p>
             <p className="text-xs text-slate-500">{appt.user_id.email}</p>
          </td>
          <td className="px-6 py-4">
             <p className="font-bold text-slate-800">{appt.doctor_id.name}</p>
             <p className="text-xs text-slate-500">{appt.doctor_id.email}</p>
          </td>
          <td className="px-6 py-4 text-sm font-medium text-slate-700">{appt.specialty_id.name}</td>
          <td className="px-6 py-4 text-sm">
             <p className="font-semibold text-slate-800">{appt?.appointment_date ? new Date(appt.appointment_date).toLocaleDateString() : 'N/A'}</p>
             <p className="text-blue-600 text-xs font-bold bg-blue-50 inline-block px-1 rounded mt-0.5">{appt?.time_slot || 'N/A'}</p>
          </td>
          <td className="px-6 py-4">
             <Badge colorClass={getStatusStyles(appt.status)}>{appt.status}</Badge>
          </td>
          <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{appt.reason}</td>
          <td className="px-6 py-4 text-sm text-slate-400">{new Date(appt.created_at).toLocaleDateString()}</td>
       </tr>
    )
  );

  const renderMedicalRecords = () => renderSimpleTable('Medical Records Database', medicalRecords,
     ['Patient', 'Attending Doctor', 'Diagnosis', 'Current Status', 'Consultation', 'Record Date'],
     (rec: MedicalRecord) => (
        <tr key={rec._id} className="hover:bg-slate-50/80 transition-colors">
           <td className="px-6 py-4"><p className="font-bold text-slate-800">{rec.user_id.name}</p></td>
           <td className="px-6 py-4"><p className="font-bold text-slate-800">{rec.doctor_id.name}</p></td>
           <td className="px-6 py-4 text-sm font-medium text-slate-700">{rec.diagnosis}</td>
           <td className="px-6 py-4"><Badge colorClass={getStatusStyles(rec.status)}>{rec.status}</Badge></td>
           <td className="px-6 py-4"><Badge colorClass={getStatusStyles(rec.consultation_status)}>{rec.consultation_status}</Badge></td>
           <td className="px-6 py-4 text-sm text-slate-500">{new Date(rec.created_at).toLocaleDateString()}</td>
        </tr>
     )
  );

  const renderUnlockRequests = () => renderSimpleTable('Account Unlock Requests', unlockRequests,
      ['Doctor Info', 'Contact', 'Reason', 'Lock Details', 'Status', 'Actions'],
      (req: UnlockRequest) => (
         <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
            <td className="px-6 py-4">
               <p className="font-bold text-slate-800">{req.doctor_name}</p>
               <p className="text-xs text-slate-500">{req.doctor_email}</p>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">{req.doctor_id.phoneNumber || '-'}</td>
            <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate bg-slate-50 p-2 rounded border border-slate-100">{req.request_reason}</td>
            <td className="px-6 py-4 text-xs text-slate-500">
               <p><span className="font-semibold">Locked:</span> {req?.doctor_id?.lockedAt ? new Date(req.doctor_id.lockedAt).toLocaleDateString() : 'N/A'}</p>
               <p><span className="font-semibold">Attempts:</span> {req?.doctor_id?.loginAttempts || 0}</p>
            </td>
            <td className="px-6 py-4">
               <Badge colorClass={getStatusStyles(req.status)}>
                  {req.status}
               </Badge>
            </td>
            <td className="px-6 py-4">
               {req.status === 'pending' && (
                  <div className="flex gap-2">
                     <button onClick={() => handleApproveUnlockRequest(req._id)} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all">Approve</button>
                     <button onClick={() => handleRejectUnlockRequest(req._id)} className="px-3 py-1 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded shadow-sm hover:bg-rose-50 transition-all">Reject</button>
                  </div>
               )}
            </td>
         </tr>
      )
  );

  const renderDoctorRegistrations = () => renderSimpleTable('New Doctor Registrations', registrationRequests,
      ['Applicant Info', 'Specialty', 'License No', 'Exp / Fee', 'Submitted On', 'Status', 'Actions'],
      (req: DoctorRegistrationRequest) => (
         <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
            <td className="px-6 py-4">
               <p className="font-bold text-slate-800">{req.name}</p>
               <p className="text-xs text-slate-500">{req.email}</p>
               <p className="text-[10px] text-slate-400">{req.phoneNumber}</p>
            </td>
            <td className="px-6 py-4 text-sm font-medium">{req.specialty_id.name}</td>
            <td className="px-6 py-4 text-sm font-mono text-slate-600">{req.license_number}</td>
            <td className="px-6 py-4 text-sm">
               <p>{req?.years_of_experience || 0} yrs</p>
               <p className="font-bold text-slate-800">${req?.consultation_fee || 0}</p>
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">{req?.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : 'N/A'}</td>
            <td className="px-6 py-4"><Badge colorClass={getStatusStyles(req.status)}>{req.status}</Badge></td>
            <td className="px-6 py-4">
               {req.status === 'pending' && (
                  <div className="flex gap-2">
                     <button onClick={() => handleApproveRegistration(req._id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"><CheckCircle fontSize="small"/></button>
                     <button onClick={() => handleRejectRegistration(req._id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors"><Cancel fontSize="small"/></button>
                  </div>
               )}
            </td>
         </tr>
      )
  );

  const renderSystemLogs = () => renderSimpleTable('System Audit Logs', systemLogs,
      ['Severity', 'Message Content', 'User', 'Action Type', 'IP Address', 'Timestamp'],
      (log: SystemLog) => (
         <tr key={log._id} className="hover:bg-slate-50/80 text-sm transition-colors group">
            <td className="px-6 py-4">
               <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusStyles(log.level)}`}>
                 {log.level}
               </span>
            </td>
            <td className="px-6 py-4 font-mono text-slate-700 text-xs">{log.message}</td>
            <td className="px-6 py-4 font-medium">{log.user || '-'}</td>
            <td className="px-6 py-4 text-slate-600">{log.action}</td>
            <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.ipAddress || '-'}</td>
            <td className="px-6 py-4 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
         </tr>
      )
  );

  const renderSpecialties = () => (
     <div className="space-y-6 animate-[slideIn_0.4s_ease-out]">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">Departments</h1>
              <p className="text-slate-500 text-sm">Manage medical specialties and departments</p>
           </div>
           <button onClick={() => handleOpenSpecialtyDialog()} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 font-semibold">
              <Add fontSize="small" /> Add Department
           </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {specialties.map(spec => (
              <div key={spec._id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                 <div className="h-1.5 w-full" style={{ backgroundColor: spec.color || '#ccc' }}></div>
                 <div className="p-6 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 shadow-sm" style={{ backgroundColor: `${spec.color}15`, color: spec.color || 'gray' }}>
                          <span className="material-symbols-outlined">{spec.icon || 'local_hospital'}</span> 
                          {!spec.icon && spec.name.charAt(0)}
                       </div>
                       <Badge colorClass={spec.isActive ? getStatusStyles('active') : getStatusStyles('inactive')}>{spec.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{spec.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{spec.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg">
                       <People fontSize="small" className="text-slate-400" /> {spec.doctorCount || 0} Medical Staff
                    </div>
                 </div>
                 <div className="border-t border-slate-50 p-4 flex justify-end gap-2 bg-slate-50/50">
                    <button onClick={() => handleOpenSpecialtyDialog(spec)} className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition"><Edit fontSize="small" /></button>
                    <button onClick={() => handleDeleteSpecialty(spec._id)} className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"><Delete fontSize="small" /></button>
                 </div>
              </div>
           ))}
        </div>
     </div>
  );

  const renderDrugs = () => (
     <div className="space-y-6 animate-[slideIn_0.4s_ease-out]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">Pharmacy Inventory</h1>
              <p className="text-slate-500 text-sm">Manage drugs and stock levels</p>
           </div>
           <div className="flex gap-2">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search inventory..." className="px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-64" />
              <button onClick={() => handleOpenDrugDialog()} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 font-semibold"><Add fontSize="small"/> Add Item</button>
           </div>
        </div>
        <Card>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <TableHeader cols={['Product Name', 'Category', 'Formulation', 'Stock Level', 'Manufacturer', 'Unit Price', 'Expiry Status', 'Actions']} />
                 <tbody className="divide-y divide-slate-100">
                    {filteredDrugs.length === 0 ? <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">No inventory items found</td></tr> : 
                       filteredDrugs.map(drug => {
                          const expiry = new Date(drug.expiry_date);
                          const today = new Date();
                          const isExpired = expiry < today;
                          const isLowStock = (drug.stock_quantity || 0) < 50;
                          return (
                             <tr key={drug._id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4">
                                   <p className="font-bold text-slate-800">{drug.name}</p>
                                   <p className="text-xs text-slate-500 font-medium">{drug.brand}</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{typeof drug.category_id === 'object' && drug.category_id ? (drug.category_id as any).name : 'Unknown'}</td>
                                <td className="px-6 py-4 text-sm">
                                   <p className="font-medium text-slate-700">{drug.form}</p>
                                   <p className="text-xs text-slate-400">{drug.strength}</p>
                                </td>
                                <td className="px-6 py-4">
                                   <p className={`font-bold ${isLowStock ? 'text-red-600' : 'text-slate-800'}`}>{drug.stock_quantity}</p>
                                   <p className="text-xs text-slate-500">{drug.unit}(s)</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{drug.manufacturer}</td>
                                <td className="px-6 py-4 font-mono font-bold text-slate-700">${drug.price || 0}</td>
                                <td className="px-6 py-4">
                                   <Badge colorClass={isExpired ? getStatusStyles('expired') : getStatusStyles('valid')}>{isExpired ? 'Expired' : 'Valid'}</Badge>
                                   <p className="text-[10px] text-slate-400 mt-1 font-mono">{expiry.toLocaleDateString()}</p>
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                   <ActionButton icon={Edit} onClick={() => handleOpenDrugDialog(drug)} />
                                   <ActionButton icon={Delete} color="red" onClick={() => handleDeleteDrug(drug._id)} />
                                </td>
                             </tr>
                          )
                       })
                    }
                 </tbody>
              </table>
           </div>
        </Card>
     </div>
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

  // --- Main Layout Render (High-end Enterprise Structure) ---
  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar - Fixed Left, Enterprise Dark Theme */}
      <aside className="fixed inset-y-0 left-0 w-72 bg-[#0f172a] text-slate-300 z-30 flex flex-col transition-all duration-300 shadow-2xl overflow-y-auto custom-scrollbar">
         <div className="p-6 border-b border-slate-800/50 bg-[#0f172a]">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <AdminPanelSettings className="text-white" />
               </div>
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">MediCareAdmin<span className="text-cyan-400">.</span></h1>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Enterprise Admin</p>
               </div>
            </div>
         </div>

         <nav className="flex-1 px-3 py-6 space-y-1">
            <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Management Modules</p>
            {[
               { id: 'dashboard', icon: Dashboard, label: 'Overview' },
               { id: 'doctors', icon: MedicalServices, label: 'Medical Staff', badge: systemStats?.totalDoctors, badgeColor: 'bg-blue-600' },
               { id: 'patients', icon: Group, label: 'Patients', badge: systemStats?.totalPatients, badgeColor: 'bg-emerald-600' },
               { id: 'specialties', icon: People, label: 'Departments', badge: systemStats?.totalSpecialties, badgeColor: 'bg-purple-600' },
               { id: 'drugs', icon: Vaccines, label: 'Pharmacy Inventory' },
               { id: 'appointments', icon: CalendarToday, label: 'Appointments', badge: systemStats?.totalAppointments, badgeColor: 'bg-amber-600' },
               { id: 'medical-records', icon: HealthAndSafety, label: 'Medical Records', badge: systemStats?.totalMedicalRecords, badgeColor: 'bg-teal-600' },
            ].map(item => (
               <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800/50 hover:text-white'}`}
               >
                  {/* Active Indicator Line */}
                  {activeTab === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400"></div>}
                  
                  <div className="flex items-center gap-3 relative z-10">
                     <item.icon fontSize="small" className={`transition-colors ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                     <span className="font-medium text-sm tracking-wide">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                        {item.badge || 0}
                     </span>
                  )}
               </button>
            ))}

            <div className="my-6 border-t border-slate-800/50 mx-4" />
            <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Administrative</p>
            
            {[
               { id: 'doctor-registrations', icon: PersonAdd, label: 'Registrations', count: systemStats?.pendingRegistrations },
               { id: 'unlock-requests', icon: LockOpen, label: 'Unlock Requests', count: systemStats?.pendingUnlockRequests },
               { id: 'system-logs', icon: ViewList, label: 'Audit Logs' },
            ].map(item => (
               <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800/50 hover:text-white'}`}
               >
                   {activeTab === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400"></div>}
                  <div className="flex items-center gap-3">
                     <item.icon fontSize="small" className={`transition-colors ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                     <span className="font-medium text-sm tracking-wide">{item.label}</span>
                  </div>
                  {item.count ? <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-rose-900/20">{item.count}</span> : null}
               </button>
            ))}
         </nav>
         
         {/* User Profile Snippet in Sidebar */}
         <div className="p-4 m-4 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white">A</div>
             <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">Administrator</p>
                <p className="text-[10px] text-slate-400 truncate">pvu7999@gmail.com</p>
             </div>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-72 p-8 transition-all duration-300">
         {/* Top Header - Glassmorphism */}
         <header className="fixed top-0 right-0 left-72 h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 z-20 px-8 flex items-center justify-between transition-all duration-300">
            <div>
               <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
               <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div className="flex items-center gap-4">
               {/* Quick Status Indicators */}
               <div className="hidden md:flex items-center gap-4 mr-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> System Online</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> DB Connected</span>
               </div>

               <div className="h-8 w-px bg-slate-200 mx-2"></div>

               <div className="relative">
                  <button 
                     onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                     className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                  >
                     <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-md">A</div>
                     <MenuIcon fontSize="small" className="text-slate-400" />
                  </button>
                  {isUserMenuOpen && (
                     <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-[pop_0.2s_ease-out]">
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                           <p className="text-sm font-bold text-slate-800">Admin Account</p>
                           <p className="text-xs text-slate-500">Super User Privileges</p>
                        </div>
                        <button onClick={() => { fetchSystemData(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
                           <Refresh fontSize="small"/> Sync Data
                        </button>
                         <button onClick={() => setIsUserMenuOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
                           <Settings fontSize="small"/> Settings
                        </button>
                        <div className="border-t border-slate-100 my-1"></div>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium">
                           <ExitToApp fontSize="small"/> Sign Out
                        </button>
                     </div>
                  )}
               </div>
            </div>
         </header>

         {/* Content Spacer for Header */}
         <div className="h-24"></div>

         {/* Notifications / Alerts */}
         {error && (
            <div className="mb-6 bg-white border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start justify-between animate-[slideIn_0.3s_ease-out]">
               <div className="flex gap-4">
                  <div className="bg-red-100 p-2 rounded-full h-fit"><Warning className="text-red-600" fontSize="small" /></div>
                  <div>
                     <h4 className="text-sm font-bold text-red-700">System Error</h4>
                     <p className="text-sm text-slate-600 mt-0.5">{error}</p>
                  </div>
               </div>
               <button onClick={() => setError('')} className="text-slate-400 hover:text-red-600 transition"><Close fontSize="small"/></button>
            </div>
         )}
         {success && (
            <div className="mb-6 bg-white border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm flex items-start justify-between animate-[slideIn_0.3s_ease-out]">
               <div className="flex gap-4">
                  <div className="bg-green-100 p-2 rounded-full h-fit"><CheckCircle className="text-green-600" fontSize="small" /></div>
                   <div>
                     <h4 className="text-sm font-bold text-green-700">Success</h4>
                     <p className="text-sm text-slate-600 mt-0.5">{success}</p>
                  </div>
               </div>
               <button onClick={() => setSuccess('')} className="text-slate-400 hover:text-green-600 transition"><Close fontSize="small"/></button>
            </div>
         )}

         {/* Dynamic Content */}
         <div className="min-h-[calc(100vh-12rem)]">
            {renderContent()}
         </div>
         
         {/* Footer */}
         <footer className="mt-12 text-center text-xs text-slate-400 py-6 border-t border-slate-200">
            <p>&copy; {new Date().getFullYear()} MedCare Hospital System. Enterprise Admin Portal v2.5.0</p>
         </footer>
      </main>

      {/* Specialty Modal */}
      <Modal 
         isOpen={openSpecialtyDialog} 
         onClose={() => setOpenSpecialtyDialog(false)}
         title={currentSpecialty._id ? 'Edit Department Details' : 'Create New Department'}
         actions={
            <>
               <button onClick={() => setOpenSpecialtyDialog(false)} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
               <button onClick={handleSaveSpecialty} disabled={!currentSpecialty.name} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none">Save Changes</button>
            </>
         }
      >
         <div className="space-y-5">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department Name *</label>
               <input 
                  type="text" 
                  value={currentSpecialty.name || ''} 
                  onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Cardiology"
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
               <textarea 
                  rows={3}
                  value={currentSpecialty.description || ''}
                  onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Brief description of the department's function..."
               />
            </div>
            <div className="grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Icon Code (Material)</label>
                  <input 
                     type="text" 
                     placeholder="e.g. local_hospital"
                     value={currentSpecialty.icon || ''}
                     onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, icon: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Theme Color</label>
                  <div className="flex gap-2 items-center">
                    <input 
                       type="color" 
                       value={currentSpecialty.color || '#06b6d4'}
                       onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, color: e.target.value })}
                       className="h-10 w-10 p-0.5 border border-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-sm text-slate-500 font-mono">{currentSpecialty.color}</span>
                  </div>
               </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
               <div>
                 <span className="text-sm font-bold text-slate-700 block">Department Status</span>
                 <span className="text-xs text-slate-500">Enable or disable this department system-wide</span>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={currentSpecialty.isActive ?? true} onChange={(e) => setCurrentSpecialty({ ...currentSpecialty, isActive: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
            </div>
         </div>
      </Modal>

      {/* Drug Modal */}
      <Modal 
         isOpen={openDrugDialog} 
         onClose={() => setOpenDrugDialog(false)}
         title={currentDrug._id ? 'Edit Inventory Item' : 'Add New Inventory Item'}
         actions={
            <>
               <button onClick={() => setOpenDrugDialog(false)} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
               <button onClick={handleSaveDrug} disabled={!currentDrug.name} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none">Save Item</button>
            </>
         }
      >
         <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Drug Name *</label>
                  <input 
                     type="text" 
                     value={currentDrug.name || ''} 
                     onChange={(e) => setCurrentDrug({ ...currentDrug, name: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                     placeholder="Scientific Name"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Brand Name</label>
                  <input 
                     type="text" 
                     value={currentDrug.brand || ''} 
                     onChange={(e) => setCurrentDrug({ ...currentDrug, brand: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                     placeholder="Commercial Name"
                  />
               </div>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Generic Name</label>
               <input 
                  type="text" 
                  value={currentDrug.generic_name || ''} 
                  onChange={(e) => setCurrentDrug({ ...currentDrug, generic_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
               <textarea 
                  rows={2}
                  value={currentDrug.description || ''}
                  onChange={(e) => setCurrentDrug({ ...currentDrug, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
               />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Form</label>
                  <select 
                     value={currentDrug.form || 'Tablet'} 
                     onChange={(e) => setCurrentDrug({ ...currentDrug, form: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                     {['Tablet', 'Capsule','Inhaler', 'Syrup', 'Injection', 'Gel', 'Cream', 'Drops', 'Inhaler', 'Powder'].map(f => (
                        <option key={f} value={f}>{f}</option>
                     ))}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Strength</label>
                  <input 
                     type="text" 
                     placeholder="e.g. 500mg"
                     value={currentDrug.strength || ''}
                     onChange={(e) => setCurrentDrug({ ...currentDrug, strength: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unit</label>
                  <select 
                     value={currentDrug.unit || 'tablet'} 
                     onChange={(e) => setCurrentDrug({ ...currentDrug, unit: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                     {['tablet','capsule','inhaler', 'bottle', 'packet', 'ml', 'strip', 'tube', 'vial'].map(u => (
                        <option key={u} value={u}>{u}</option>
                     ))}
                  </select>
               </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                  <select 
                     value={currentDrug.category_id as string || ''}
                     onChange={(e) => setCurrentDrug({ ...currentDrug, category_id: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                     <option value="">Select Category</option>
                     {drugCategories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                     ))}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Manufacturer</label>
                  <input 
                     type="text" 
                     value={currentDrug.manufacturer || ''}
                     onChange={(e) => setCurrentDrug({ ...currentDrug, manufacturer: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Price ($)</label>
                  <input 
                     type="number" 
                     value={currentDrug.price || ''}
                     onChange={(e) => setCurrentDrug({ ...currentDrug, price: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
                  <input 
                     type="date" 
                     value={currentDrug.expiry_date || ''}
                     onChange={(e) => setCurrentDrug({ ...currentDrug, expiry_date: e.target.value })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Stock Qty</label>
                  <input 
                     type="number" 
                     value={currentDrug.stock_quantity || 0}
                     onChange={(e) => setCurrentDrug({ ...currentDrug, stock_quantity: Number(e.target.value) })}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;