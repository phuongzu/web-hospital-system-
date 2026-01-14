import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Appointment, 
  Notification as NotificationType,
  Stat, 
  DoctorProfile, 
  Consultation, 
  Patient 
} from '../types';
import { getDoctorId, API_BASE_URL, formatDate } from '../utils/api';

// ============= TOAST NOTIFICATION COMPONENT =============
const ToastNotification = ({ notification, onClose, navigate }: { 
  notification: NotificationType, 
  onClose: () => void,
  navigate: any 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return 'event';
      case 'consultation': return 'medical_services';
      case 'message': return 'chat';
      case 'alert': return 'warning';
      case 'success': return 'check_circle';
      case 'emergency': return 'emergency';
      case 'reminder': return 'notifications_active';
      default: return 'notifications';
    }
  };

  const handleActionClick = () => {
    if (notification.data?.action_url) {
      navigate(notification.data.action_url);
    }
    onClose();
  };

  const formatTime = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-[100] w-96 bg-white dark:bg-[#1a2c2f] border border-gray-200 dark:border-[#2a4a52] rounded-xl shadow-2xl p-4 transform transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${notification.isRead ? 'bg-gray-100 dark:bg-gray-800' : 'bg-primary/10'}`}>
          <span className={`material-symbols-outlined text-xl ${notification.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-primary'}`}>
            {getNotificationIcon(notification.type)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className={`font-bold ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
              {notification.title}
            </h4>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
              aria-label="Close notification"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {formatTime(notification.createdAt)}
            </span>
            {notification.data?.action_label && (
              <button
                onClick={handleActionClick}
                className="text-xs text-primary font-medium hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                {notification.data.action_label}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= STAT CARD COMPONENT =============
const StatCard = ({ icon, label, value, change, color, isLoading, onClick }: any) => (
  <div 
    className={`relative overflow-hidden rounded-xl p-6 bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group cursor-pointer ${onClick ? 'active:scale-95' : ''}`}
    onClick={onClick}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300">
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-sm font-medium bg-white/20 px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-sm">
              {change >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm opacity-90 font-medium mb-1">{label}</p>
        {isLoading ? (
          <div className="h-8 w-20 bg-white/20 animate-pulse rounded"></div>
        ) : (
          <p className="text-3xl font-bold">{value}</p>
        )}
      </div>
    </div>
    <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity">
      <span className="material-symbols-outlined text-9xl">{icon}</span>
    </div>
    {onClick && (
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/20 rounded-xl transition-all"></div>
    )}
  </div>
);

// ============= APPOINTMENT CARD COMPONENT =============
const AppointmentCard = ({ appointment, onClick }: any) => {
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden bg-white dark:bg-[#1a2c2f] rounded-xl p-4 border border-gray-200 dark:border-[#2a4a52] hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {appointment.user_id?.name?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-[#1a2c2f] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-xs text-primary">schedule</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
              {appointment.user_id?.name || 'Patient'}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusStyle(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
            {appointment.reason || 'General Consultation'}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span className="font-medium">{appointment.time_slot}</span>
            </div>
            {appointment.user_id?.phoneNumber && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">phone</span>
                <span>{appointment.user_id.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all">
            arrow_forward
          </span>
        </div>
      </div>
    </div>
  );
};

// ============= CONSULTATION CARD COMPONENT =============
const ConsultationCard = ({ consultation, onClick }: any) => {
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'severe':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'mild':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const completedSteps = consultation.treatment_plan?.filter((s: any) => 
    s.status === 'approved' || s.status === 'completed'
  ).length || 0;
  const totalSteps = consultation.treatment_plan?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-[#1a2c2f] rounded-xl p-4 border border-gray-200 dark:border-[#2a4a52] hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
          {consultation.user_id?.name?.charAt(0)?.toUpperCase() || 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
            {consultation.user_id?.name || 'Patient'}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
            {consultation.diagnosis || 'No diagnosis yet'}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(consultation.severity)}`}>
          {consultation.severity || 'N/A'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Treatment Progress</span>
          <span className="font-medium">{completedSteps}/{totalSteps} steps</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-blue-600 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {consultation.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 line-clamp-2">
          {consultation.notes}
        </p>
      )}
    </div>
  );
};

// ============= MAIN DASHBOARD COMPONENT =============
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingNotifications, setRefreshingNotifications] = useState(false);
  const [refreshingAppointments, setRefreshingAppointments] = useState(false);
  const [quickStats, setQuickStats] = useState({
    todayAppointments: 0,
    activeConsultations: 0,
    completedToday: 0,
    totalPatients: 0
  });
  const [toastNotification, setToastNotification] = useState<NotificationType | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [lastAppointmentsUpdate, setLastAppointmentsUpdate] = useState(new Date());
  const [pollingActive, setPollingActive] = useState(true);

  const doctorId = getDoctorId();

  // ============= NETWORK STATUS MONITORING =============
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============= FETCH APPOINTMENTS (REAL-TIME POLLING) =============
  const fetchAppointments = useCallback(async (showNotification = false) => {
    if (!doctorId) return;
    
    try {
      setRefreshingAppointments(true);
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().getTime();
      
      const aptRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/appointments?date=${today}&_t=${timestamp}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('accessToken')}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!aptRes.ok) {
        console.error('❌ Failed to fetch appointments:', aptRes.status);
        return;
      }
      
      const aptData = await aptRes.json();
      
      if (aptData.success && aptData.data) {
        const newAppointments = (aptData.data as Appointment[])
          .filter(a => a.status !== 'cancelled')
          .sort((a, b) => {
            const timeA = a.time_slot?.split(':').map(Number) || [0, 0];
            const timeB = b.time_slot?.split(':').map(Number) || [0, 0];
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
          });
        
        // So sánh với appointments hiện tại để phát hiện thay đổi
        setAppointments(prev => {
          // Kiểm tra xem có thay đổi không
          const hasChanges = JSON.stringify(prev) !== JSON.stringify(newAppointments);
          
          if (hasChanges && showNotification && prev.length > 0) {
            // Tìm appointments mới
            const newItems = newAppointments.filter(newApp => 
              !prev.some(oldApp => oldApp._id === newApp._id)
            );
            
            // Tìm appointments bị thay đổi status
            const updatedItems = newAppointments.filter(newApp => {
              const oldApp = prev.find(old => old._id === newApp._id);
              return oldApp && oldApp.status !== newApp.status;
            });
            
            // Hiển thị notification nếu có appointment mới
            if (newItems.length > 0) {
              const latestNewAppointment = newItems[0];
              const notification: NotificationType = {
                _id: `appointment-new-${Date.now()}`,
                title: 'New Appointment',
                message: `Patient ${latestNewAppointment.user_id?.name || 'Unknown'} booked an appointment`,
                type: 'appointment',
                isRead: false,
                createdAt: new Date().toISOString(),
                data: {
                  action_url: `/appointments/${latestNewAppointment._id}`,
                  action_label: 'View Appointment'
                },
                user_id: latestNewAppointment.user_id?._id || '',
                doctor_id: latestNewAppointment.doctor_id || '',
              };
              
              setToastNotification(notification);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 5000);
            }
            
            // Hiển thị notification nếu có appointment thay đổi status
            if (updatedItems.length > 0) {
              const latestUpdated = updatedItems[0];
              let message = '';
              
              switch (latestUpdated.status) {
                case 'confirmed':
                  message = `Appointment with ${latestUpdated.user_id?.name || 'Patient'} has been confirmed`;
                  break;
                case 'completed':
                  message = `Appointment with ${latestUpdated.user_id?.name || 'Patient'} has been completed`;
                  break;
                case 'cancelled':
                  message = `Appointment with ${latestUpdated.user_id?.name || 'Patient'} has been cancelled`;
                  break;
              }
              
              if (message) {
                const notification: NotificationType = {
                  _id: `appointment-update-${Date.now()}`,
                  title: 'Appointment Updated',
                  message,
                  type: 'appointment',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                  data: {
                    action_url: `/appointments/${latestUpdated._id}`,
                    action_label: 'View Appointment'
                  },
                  user_id: latestUpdated.user_id?._id || '',
                  doctor_id: latestUpdated.doctor_id || '',
                };
                
                setToastNotification(notification);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 5000);
              }
            }
          }
          
          return newAppointments;
        });
        
        // Cập nhật quick stats
        const completedToday = newAppointments.filter(a => a.status === 'completed').length;
        setQuickStats(prev => ({
          ...prev,
          todayAppointments: newAppointments.length,
          completedToday: completedToday
        }));
        
        setLastAppointmentsUpdate(new Date());
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
    } finally {
      setRefreshingAppointments(false);
    }
  }, [doctorId]);

  // ============= FETCH NOTIFICATIONS =============
  const fetchNotifications = useCallback(async (showToastOnNew = false) => {
    try {
      setRefreshingNotifications(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token || !doctorId) {
        console.log('No token or doctorId found');
        return;
      }

      const timestamp = new Date().getTime();
      
      const notifRes = await fetch(`${API_BASE_URL}/notifications?page=1&limit=20&_t=${timestamp}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!notifRes.ok) {
        console.error('❌ Failed to fetch notifications:', notifRes.status);
        return;
      }
      
      const notifData = await notifRes.json();
      
      if (notifData.success && notifData.data) {
        const processedNotifications = notifData.data.map((n: any) => ({
          ...n,
          _id: n._id || n.id,
          isRead: n.isRead !== undefined ? n.isRead : (n.read === true),
          title: n.title || 'Notification',
          message: n.message || '',
          type: n.type || 'system',
          createdAt: n.createdAt || n.created_at || new Date().toISOString(),
          data: n.data || {}
        }));

        // Kiểm tra notifications mới
        setNotifications(prev => {
          if (showToastOnNew && prev.length > 0) {
            const newNotifications = processedNotifications.filter((newNotif: any) => 
              !prev.some(oldNotif => oldNotif._id === newNotif._id) && !newNotif.isRead
            );
            
            if (newNotifications.length > 0) {
              const latestNotification = newNotifications[0];
              setToastNotification(latestNotification);
              setShowToast(true);
              
              setTimeout(() => setShowToast(false), 6000);
            }
          }
          
          return processedNotifications;
        });
        
        const newUnreadCount = processedNotifications.filter((n: any) => !n.isRead).length;
        setUnreadCount(newUnreadCount);
        
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    } finally {
      setRefreshingNotifications(false);
    }
  }, [doctorId]);

  // ============= SETUP APPOINTMENTS POLLING =============
  useEffect(() => {
    if (!doctorId || !pollingActive) return;
    const appointmentsInterval = setInterval(() => {
      fetchAppointments(true);
    }, 10000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔍 Tab visible, refreshing appointments');
        fetchAppointments(true);
        fetchNotifications(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(appointmentsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [doctorId, pollingActive, fetchAppointments, fetchNotifications]);

  // ============= FETCH INITIAL DATA =============
  useEffect(() => {
    if (!doctorId) {
      console.log('❌ No doctorId found');
      return;
    }
    
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        
        // Fetch Profile
        try {
          const profileRes = await fetch(`${API_BASE_URL}/doctors/profile/${doctorId}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.success) setProfile(profileData.data);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }

        // Fetch Stats
        try {
          const statsRes = await fetch(`${API_BASE_URL}/doctors/stats/${doctorId}`);
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            if (statsData.success) setStats(statsData.data || []);
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
        }

        // Fetch Today's Appointments
        await fetchAppointments(false);

        // Fetch Active Consultations
        try {
          const consultRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations/active`);
          if (consultRes.ok) {
            const consultData = await consultRes.json();
            if (consultData.success) {
              const activeConsults = consultData.data || [];
              setConsultations(activeConsults);
              setQuickStats(prev => ({
                ...prev,
                activeConsultations: activeConsults.length
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching consultations:', error);
        }

        // Fetch Recent Patients
        try {
          const patientsRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/patients?limit=6`);
          if (patientsRes.ok) {
            const patientsData = await patientsRes.json();
            if (patientsData.success) {
              setRecentPatients(patientsData.data || []);
              setQuickStats(prev => ({
                ...prev,
                totalPatients: patientsData.data?.length || 0
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching patients:', error);
        }

        // Fetch Notifications lần đầu
        await fetchNotifications(false);

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    
    // Auto-refresh dashboard data every 2 minutes
    const dashboardInterval = setInterval(fetchInitialData, 120000);

    return () => clearInterval(dashboardInterval);
  }, [doctorId, fetchAppointments, fetchNotifications]);

  // ============= SETUP NOTIFICATIONS POLLING =============
  useEffect(() => {
    if (!doctorId) return;

    const notificationsInterval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    return () => {
      clearInterval(notificationsInterval);
    };
  }, [doctorId, fetchNotifications]);

  // ============= HANDLE MARK ALL AS READ =============
  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) return;
      
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
          
          console.log('✅ All notifications marked as read');
        }
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // ============= HANDLE SINGLE NOTIFICATION CLICK =============
  const handleNotificationClick = async (notif: NotificationType) => {
    if (!notif.isRead) {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        if (!token) return;
        
        await fetch(`${API_BASE_URL}/notifications/${notif._id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setNotifications(prev => prev.map(n => 
          n._id === notif._id ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
    
    if (notif.data?.action_url) {
      navigate(notif.data.action_url);
      setNotifOpen(false);
    }
  };

  // ============= MANUAL REFRESH =============
  const handleManualRefresh = () => {
    fetchAppointments(true);
    fetchNotifications(true);
  };

  // ============= CLICK OUTSIDE NOTIFICATIONS =============
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  // ============= HELPER FUNCTIONS =============
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'event';
      case 'consultation':
        return 'medical_services';
      case 'message':
        return 'chat';
      case 'alert':
        return 'warning';
      case 'success':
        return 'check_circle';
      case 'emergency':
        return 'emergency';
      case 'reminder':
        return 'notifications_active';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'consultation':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'emergency':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'success':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    }
  };

  const totalAppointments = stats.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  // ============= LOADING STATE =============
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a1214] dark:to-[#102023]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ============= MAIN RENDER =============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a1214] dark:to-[#102023]">
      {/* Toast Notification */}
      {showToast && toastNotification && (
        <ToastNotification
          notification={toastNotification}
          onClose={() => setShowToast(false)}
          navigate={navigate}
        />
      )}
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* ============= HEADER ============= */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {profile?.user_id?.name?.charAt(0)?.toUpperCase() || 'D'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-[#102023] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs text-white">check</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {greeting}, Dr. {profile?.user_id?.name?.split(' ')[0] || 'Doctor'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">medical_services</span>
                  <span>{profile?.specialty_id?.name || 'General Practitioner'}</span>
                  <span className="text-gray-400">•</span>
                  <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </p>
              </div>
            </div>
            
            {/* ============= NOTIFICATION BELL ============= */}
            <div className="relative" ref={notifRef}>
              <button
                className="relative p-3 rounded-xl bg-white dark:bg-[#1a2c2f] hover:bg-gray-50 dark:hover:bg-[#223a3f] transition-all duration-300 border border-gray-200 dark:border-[#2a4a52] shadow-sm hover:shadow-md group"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 text-2xl group-hover:scale-110 transition-transform">
                  notifications
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {refreshingNotifications && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500/80 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-xs text-white animate-spin">refresh</span>
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-[#1a2c2f] border border-gray-200 dark:border-[#2a4a52] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-primary/5 to-blue-500/5">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {unreadCount} unread {unreadCount !== 1 ? 'messages' : 'message'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-sm text-primary hover:text-primary/80 font-medium px-3 py-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={handleManualRefresh}
                        disabled={refreshingNotifications || refreshingAppointments}
                        className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 font-medium px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {refreshingNotifications ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3">
                          notifications_off
                        </span>
                        <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          You're all caught up!
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-all ${
                            !notif.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                          }`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-lg ${getNotificationColor(notif.type)}`}>
                              <span className={`material-symbols-outlined text-xl ${
                                notif.isRead 
                                  ? 'text-gray-600 dark:text-gray-400' 
                                  : 'text-primary'
                              }`}>
                                {getNotificationIcon(notif.type)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`font-medium truncate ${
                                  notif.isRead 
                                    ? 'text-gray-700 dark:text-gray-300' 
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {notif.title}
                                </h4>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"></span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                  {formatDate(notif.createdAt)}
                                </span>
                                {notif.data?.action_label && (
                                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                                    {notif.data.action_label}
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                    <Link
                      to="/notifications"
                      className="block text-center text-sm text-primary font-medium hover:text-primary/80 transition-colors py-1"
                      onClick={() => setNotifOpen(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============= QUICK STATS ============= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon="calendar_today"
            label="Today's Appointments"
            value={quickStats.todayAppointments}
            change={5}
            color="from-blue-500 to-blue-700"
            isLoading={loading}
          />
          <StatCard
            icon="medical_services"
            label="Active Consultations"
            value={quickStats.activeConsultations}
            color="from-purple-500 to-purple-700"
            isLoading={loading}
          />
          <StatCard
            icon="task_alt"
            label="Completed Today"
            value={quickStats.completedToday}
            change={12}
            color="from-green-500 to-green-700"
            isLoading={loading}
          />
          <StatCard
            icon="people"
            label="Total Patients"
            value={quickStats.totalPatients}
            color="from-orange-500 to-orange-700"
            isLoading={loading}
          />
        </div>

        {/* ============= MAIN CONTENT GRID ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Schedule - 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#1a2c2f] rounded-xl border border-gray-200 dark:border-[#2a4a52] shadow-sm overflow-hidden h-full">
              <div className="p-6 border-b border-gray-200 dark:border-[#2a4a52] bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary">event</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Today's Schedule</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {appointments.length} appointments • 
                        {refreshingAppointments && (
                          <span className="ml-2">
                            <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/appointments"
                      className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      View all
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3">
                      event_busy
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No appointments scheduled for today</p>
                    <Link
                      to="/appointments"
                      className="inline-block mt-2 text-primary hover:text-primary/80 font-medium text-sm"
                    >
                      View calendar →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {appointments.map((app) => (
                      <AppointmentCard
                        key={app._id}
                        appointment={app}
                        onClick={() => navigate(`/appointments/${app._id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Consultations - 1 column */}
          <div>
            <div className="bg-white dark:bg-[#1a2c2f] rounded-xl border border-gray-200 dark:border-[#2a4a52] shadow-sm overflow-hidden h-full">
              <div className="p-6 border-b border-gray-200 dark:border-[#2a4a52] bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">medical_services</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Consultations</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{consultations.length} ongoing cases</p>
                    </div>
                  </div>
                  <Link
                    to="/consultations"
                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    View all
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
              
              <div className="p-6">
                {consultations.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3">
                      medical_services
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No active consultations</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Start a consultation from an appointment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {consultations.map((consult) => (
                      <ConsultationCard
                        key={consult._id}
                        consultation={consult}
                        onClick={() => navigate(`/consultations/${consult._id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============= BOTTOM SECTION ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointment Statistics */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#1a2c2f] rounded-xl border border-gray-200 dark:border-[#2a4a52] shadow-sm p-6 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">bar_chart</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Appointment Statistics</h3>
              </div>
              <div className="space-y-4">
                {stats.map((stat) => (
                  <div key={stat._id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          stat._id === 'confirmed' ? 'bg-green-500' :
                          stat._id === 'pending' ? 'bg-yellow-500' :
                          stat._id === 'cancelled' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {stat._id}
                        </span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {stat.count || 0}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stat._id === 'confirmed' ? 'bg-green-500' :
                          stat._id === 'pending' ? 'bg-yellow-500' :
                          stat._id === 'cancelled' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${totalAppointments > 0 ? ((stat.count || 0) / totalAppointments) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Appointments</span>
                  <span className="font-bold text-gray-900 dark:text-white text-lg">{totalAppointments}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Patients Quick View */}
          <div>
            <div className="bg-white dark:bg-[#1a2c2f] rounded-xl border border-gray-200 dark:border-[#2a4a52] shadow-sm p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">groups</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Patients</h3>
                </div>
              </div>
              <div className="space-y-2">
                {recentPatients.slice(0, 6).map((patient) => (
                  <div 
                    key={patient._id} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/patients/${patient._id}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm">
                      {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{patient.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{patient.phoneNumber || 'No phone'}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-sm">
                      chevron_right
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/patients"
                className="block text-center mt-4 py-3 text-primary hover:text-primary/80 font-medium text-sm hover:bg-primary/5 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              >
                View all patients
              </Link>
            </div>
          </div>
        </div>

        {/* ============= FOOTER ============= */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span>{isOnline ? 'System Online' : 'System Offline'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span>Auto-refresh active</span>
              </div>
              {refreshingAppointments && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span>Updating appointments...</span>
                </div>
              )}
            </div>
            <div>
              <span>Last updated: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;