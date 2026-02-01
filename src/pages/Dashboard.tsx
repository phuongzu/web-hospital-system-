import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

// ============= OPTIMIZATION HELPERS =============
// Helper to compare appointments without JSON.stringify whole object
const areAppointmentsEqual = (prev: Appointment[], next: Appointment[]) => {
  if (prev.length !== next.length) return false;
  // Check crucial fields that affect UI: ID, Status, Time
  return prev.every((p, i) => 
    p._id === next[i]._id && 
    p.status === next[i].status && 
    p.time_slot === next[i].time_slot
  );
};

// Helper to compare notifications
const areNotificationsEqual = (prev: NotificationType[], next: NotificationType[]) => {
  if (prev.length !== next.length) return false;
  // Check ID and Read status
  return prev.every((n, i) => n._id === next[i]._id && n.isRead === next[i].isRead);
};

// ============= TOAST NOTIFICATION COMPONENT =============
// OPTIMIZATION: Memoize to prevent re-render when parent state (like stats) changes
const ToastNotification = React.memo(({ notification, onClose, navigate }: { 
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
    <div className={`fixed top-6 right-6 z-[100] w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 transform transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 p-3 rounded-xl ${notification.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
          <span className="material-symbols-outlined text-2xl">
            {getNotificationIcon(notification.type)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className={`text-sm font-bold truncate pr-4 ${notification.isRead ? 'text-slate-600' : 'text-slate-900 dark:text-white'}`}>
              {notification.title}
            </h4>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              {formatTime(notification.createdAt)}
            </span>
            {notification.data?.action_label && (
              <button
                onClick={handleActionClick}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
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
});

// ============= STAT CARD COMPONENT =============
// OPTIMIZATION: Memoize strictly. Only re-render if value/loading changes.
const StatCard = React.memo(({ icon, label, value, change, color, isLoading, onClick }: any) => {
  // Extracting from/to for the medical-grade subtle backgrounds
  const bgColorMap: Record<string, string> = {
    'from-blue-500 to-blue-700': 'bg-blue-600',
    'from-purple-500 to-purple-700': 'bg-indigo-600',
    'from-green-500 to-green-700': 'bg-emerald-600',
    'from-orange-500 to-orange-700': 'bg-rose-600',
  };

  const baseColor = bgColorMap[color] || 'bg-blue-600';

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-6 ${baseColor} text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer ${onClick ? 'active:scale-95' : ''}`}
      onClick={onClick}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md group-hover:bg-white/30 transition-all">
            <span className="material-symbols-outlined text-3xl">{icon}</span>
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/10`}>
              <span className="material-symbols-outlined text-xs">
                {change >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-1">{label}</p>
          {isLoading ? (
            <div className="h-9 w-24 bg-white/20 animate-pulse rounded-lg"></div>
          ) : (
            <p className="text-3xl font-black tracking-tight">{value}</p>
          )}
        </div>
      </div>
      {/* Subtle abstract background pattern */}
      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
        <span className="material-symbols-outlined text-[120px]">{icon}</span>
      </div>
    </div>
  );
});

// ============= APPOINTMENT CARD COMPONENT =============
// OPTIMIZATION: Memoize to avoid list re-renders during polling if this item didn't change
const AppointmentCard = React.memo(({ appointment, onClick }: any) => {
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg border border-slate-200 dark:border-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            {appointment.user_id?.name?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
            <span className="material-symbols-outlined text-[10px] text-blue-600 font-bold">timer</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
              {appointment.user_id?.name || 'Patient'}
            </h4>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${getStatusStyle(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 truncate">
            {appointment.reason || 'Routine Consultation'}
          </p>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>{appointment.time_slot}</span>
            </div>
            {appointment.user_id?.phoneNumber && (
              <div className="flex items-center gap-1 text-slate-400">
                <span className="material-symbols-outlined text-sm">phone</span>
                <span className="font-medium">{appointment.user_id.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
          <span className="material-symbols-outlined text-blue-600 text-xl">chevron_right</span>
        </div>
      </div>
    </div>
  );
});

// ============= CONSULTATION CARD COMPONENT =============
// OPTIMIZATION: Memoize to prevent re-renders when other dashboard parts update
const ConsultationCard = React.memo(({ consultation, onClick }: any) => {
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900/50';
      case 'severe':
        return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900/50';
      case 'moderate':
        return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'mild':
        return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/50';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
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
      className="group bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-md flex-shrink-0">
          {consultation.user_id?.name?.charAt(0)?.toUpperCase() || 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
            {consultation.user_id?.name || 'Patient'}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {consultation.diagnosis || 'Diagnosis pending...'}
          </p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getSeverityColor(consultation.severity)}`}>
          {consultation.severity || 'N/A'}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Treatment Progress</span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{completedSteps}/{totalSteps}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {consultation.notes && (
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 line-clamp-2 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
          "{consultation.notes}"
        </p>
      )}
    </div>
  );
});

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
  
  // OPTIMIZATION: State indicating background refresh vs manual refresh
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
  // OPTIMIZATION: Added `isBackground` param to avoid setting loading state during background polls
  const fetchAppointments = useCallback(async (showNotification = false, isBackground = false) => {
    if (!doctorId) return;
    
    try {
      if (!isBackground) setRefreshingAppointments(true);
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
        if (!isBackground) setRefreshingAppointments(false);
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
        
        setAppointments(prev => {
          // OPTIMIZATION: Check for equality before update to avoid re-renders
          const hasChanges = !areAppointmentsEqual(prev, newAppointments);
          
          if (!hasChanges) return prev; // Return same reference -> No re-render
          
          if (showNotification && prev.length > 0) {
            const newItems = newAppointments.filter(newApp => 
              !prev.some(oldApp => oldApp._id === newApp._id)
            );
            
            const updatedItems = newAppointments.filter(newApp => {
              const oldApp = prev.find(old => old._id === newApp._id);
              return oldApp && oldApp.status !== newApp.status;
            });
            
            if (newItems.length > 0) {
              const latestNewAppointment = newItems[0];
              const notification: NotificationType = {
                _id: `appointment-new-${Date.now()}`,
                title: 'New Booking',
                message: `Patient ${latestNewAppointment.user_id?.name || 'Unknown'} has scheduled a new visit.`,
                type: 'appointment',
                isRead: false,
                createdAt: new Date().toISOString(),
                data: {
                  action_url: `/appointments/${latestNewAppointment._id}`,
                  action_label: 'Review'
                },
                user_id: latestNewAppointment.user_id?._id || '',
                doctor_id: latestNewAppointment.doctor_id || '',
              };
              
              setToastNotification(notification);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 5000);
            }
            
            if (updatedItems.length > 0) {
              const latestUpdated = updatedItems[0];
              let message = '';
              
              switch (latestUpdated.status) {
                case 'confirmed':
                  message = `Appointment with ${latestUpdated.user_id?.name || 'Patient'} is now confirmed.`;
                  break;
                case 'completed':
                  message = `Visit with ${latestUpdated.user_id?.name || 'Patient'} has been successfully closed.`;
                  break;
                case 'cancelled':
                  message = `Appointment with ${latestUpdated.user_id?.name || 'Patient'} was cancelled.`;
                  break;
              }
              
              if (message) {
                const notification: NotificationType = {
                  _id: `appointment-update-${Date.now()}`,
                  title: 'Status Update',
                  message,
                  type: 'appointment',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                  data: {
                    action_url: `/appointments/${latestUpdated._id}`,
                    action_label: 'Details'
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

          // Update related stats only when appointments actually change
          const completedToday = newAppointments.filter(a => a.status === 'completed').length;
          
          // OPTIMIZATION: Only update quickStats if values differ
          setQuickStats(prevStats => {
            if (prevStats.todayAppointments === newAppointments.length && prevStats.completedToday === completedToday) {
              return prevStats;
            }
            return {
              ...prevStats,
              todayAppointments: newAppointments.length,
              completedToday: completedToday
            };
          });

          // OPTIMIZATION: Only update timestamps if data actually changed
          setLastAppointmentsUpdate(new Date());
          setLastUpdate(new Date());
          
          return newAppointments;
        });
      }
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
    } finally {
      if (!isBackground) setRefreshingAppointments(false);
    }
  }, [doctorId]);

  // ============= FETCH NOTIFICATIONS =============
  // OPTIMIZATION: Added `isBackground` param
  const fetchNotifications = useCallback(async (showToastOnNew = false, isBackground = false) => {
    try {
      if (!isBackground) setRefreshingNotifications(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token || !doctorId) {
        if (!isBackground) setRefreshingNotifications(false);
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
        if (!isBackground) setRefreshingNotifications(false);
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

        setNotifications(prev => {
          // OPTIMIZATION: Check for equality before update
          const hasChanges = !areNotificationsEqual(prev, processedNotifications);
          
          if (!hasChanges) return prev; // No re-render

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
          
          // Only update unread count if notifications changed
          const newUnreadCount = processedNotifications.filter((n: any) => !n.isRead).length;
          setUnreadCount(newUnreadCount);
          setLastUpdate(new Date());

          return processedNotifications;
        });
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    } finally {
      if (!isBackground) setRefreshingNotifications(false);
    }
  }, [doctorId]);

  // ============= SETUP APPOINTMENTS POLLING =============
  useEffect(() => {
    if (!doctorId || !pollingActive) return;
    
    // OPTIMIZATION: Check visibility state to pause polling when tab inactive
    const appointmentsInterval = setInterval(() => {
      if (document.hidden) return;
      fetchAppointments(true, true); // Pass true for isBackground
    }, 10000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAppointments(true, false); // Manual refresh on tab focus
        fetchNotifications(true, false);
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
    if (!doctorId) return;
    
    const fetchInitialData = async () => {
      // Don't run background refresh logic if tab is hidden
      if (document.hidden) return;

      try {
        // Only set global loading on first mount (profile check)
        if (!profile) setLoading(true);
        
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        
        try {
          // Profile rarely changes, shallow check inside if needed, but usually once is enough or on manual refresh
          if (!profile) {
            const profileRes = await fetch(`${API_BASE_URL}/doctors/profile/${doctorId}`);
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData.success) setProfile(profileData.data);
            }
          }
        } catch (e) {}

        try {
          const statsRes = await fetch(`${API_BASE_URL}/doctors/stats/${doctorId}`);
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            if (statsData.success) {
               // OPTIMIZATION: Simple length/id check for stats
               setStats(prev => {
                 if (JSON.stringify(prev) === JSON.stringify(statsData.data || [])) return prev;
                 return statsData.data || [];
               });
            }
          }
        } catch (e) {}

        await fetchAppointments(false, !loading); // Background if not initial load

        try {
          const consultRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations/active`);
          if (consultRes.ok) {
            const consultData = await consultRes.json();
            if (consultData.success) {
              const activeConsults = consultData.data || [];
              
              // OPTIMIZATION: Check equality
              setConsultations(prev => {
                if (prev.length === activeConsults.length && 
                    prev.every((c, i) => c._id === activeConsults[i]._id)) return prev;
                return activeConsults;
              });

              setQuickStats(prev => {
                if (prev.activeConsultations === activeConsults.length) return prev;
                return { ...prev, activeConsultations: activeConsults.length };
              });
            }
          }
        } catch (e) {}

        try {
          const patientsRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/patients?limit=6`);
          if (patientsRes.ok) {
            const patientsData = await patientsRes.json();
            if (patientsData.success) {
              const newPatients = patientsData.data || [];
              setRecentPatients(prev => {
                 if (prev.length === newPatients.length && 
                     prev.every((p, i) => p._id === newPatients[i]._id)) return prev;
                 return newPatients;
              });
              
              setQuickStats(prev => {
                const count = patientsData.data?.length || 0;
                if (prev.totalPatients === count) return prev;
                return { ...prev, totalPatients: count };
              });
            }
          }
        } catch (e) {}

        await fetchNotifications(false, !loading);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    const dashboardInterval = setInterval(fetchInitialData, 120000);
    return () => clearInterval(dashboardInterval);
  }, [doctorId, fetchAppointments, fetchNotifications, profile, loading]);

  // ============= SETUP NOTIFICATIONS POLLING =============
  useEffect(() => {
    if (!doctorId) return;
    const notificationsInterval = setInterval(() => {
      if (document.hidden) return; // OPTIMIZATION: Pause polling
      fetchNotifications(true, true); // Background fetch
    }, 15000);
    return () => clearInterval(notificationsInterval);
  }, [doctorId, fetchNotifications]);

  // ============= HANDLERS =============
  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {}
  };

  const handleNotificationClick = async (notif: NotificationType) => {
    if (!notif.isRead) {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        if (!token) return;
        await fetch(`${API_BASE_URL}/notifications/${notif._id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {}
    }
    if (notif.data?.action_url) {
      navigate(notif.data.action_url);
      setNotifOpen(false);
    }
  };

  const handleManualRefresh = () => {
    setLoading(true); // Explicit loading for manual refresh
    fetchAppointments(true, false);
    fetchNotifications(true, false);
    // Timeout fallback to turn off loading if requests fail silently
    setTimeout(() => setLoading(false), 1000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

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

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'consultation': return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
      case 'emergency': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20';
      case 'success': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
      default: return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
    }
  };

  const totalAppointments = useMemo(() => stats.reduce((acc, curr) => acc + (curr.count || 0), 0), [stats]);
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-800 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-t-4 border-blue-600 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-blue-600">health_and_safety</span>
          </div>
        </div>
        <p className="mt-6 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Medical Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900">
      {showToast && toastNotification && (
        <ToastNotification notification={toastNotification} onClose={() => setShowToast(false)} navigate={navigate} />
      )}
      
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-10">
        {/* ============= TOP HEADER ============= */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-500/20 ring-4 ring-white dark:ring-slate-900">
                {profile?.user_id?.name?.charAt(0)?.toUpperCase() || 'D'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[14px] text-white font-black">verified</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                {greeting}, <span className="text-blue-600">Dr. {profile?.user_id?.name?.split(' ')[0] || 'Doctor'}</span>
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <span className="material-symbols-outlined text-base">medical_services</span>
                  {profile?.specialty_id?.name || 'Medical Specialist'}
                </span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleManualRefresh}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-600 dark:text-slate-400 group"
              title="Refresh Data"
            >
              <span className={`material-symbols-outlined text-2xl group-active:rotate-180 transition-transform duration-500 ${(refreshingNotifications || refreshingAppointments) ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
            <div className="relative" ref={notifRef}>
              <button
                className={`relative p-3 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm hover:shadow-md transition-all group ${notifOpen ? 'border-blue-600 ring-2 ring-blue-50' : 'border-slate-200 dark:border-slate-800'}`}
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-2xl group-hover:scale-110 transition-transform">
                  notifications
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 bg-rose-600 text-white text-[10px] rounded-full flex items-center justify-center font-black shadow-lg shadow-rose-500/40 border-2 border-white dark:border-slate-900 animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {notifOpen && (
                <div className="absolute right-0 mt-4 w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Alerts & Messages</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{unreadCount} Pending</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Read All
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[450px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl">notifications_off</span>
                        </div>
                        <p className="text-slate-500 font-bold text-sm">All clear!</p>
                        <p className="text-xs text-slate-400 mt-1">No new updates to show.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group ${!notif.isRead ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-xl border-2 border-white dark:border-slate-800 shadow-sm ${getNotificationColor(notif.type)}`}>
                              <span className="material-symbols-outlined text-xl">{getNotificationIcon(notif.type)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className={`text-sm font-bold truncate ${notif.isRead ? 'text-slate-600' : 'text-slate-900 dark:text-white'}`}>
                                  {notif.title}
                                </h4>
                                {!notif.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{notif.message}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                                  {formatDate(notif.createdAt)}
                                </span>
                                {notif.data?.action_label && (
                                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                                    {notif.data.action_label}
                                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-800">
                    <Link to="/notifications" className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors" onClick={() => setNotifOpen(false)}>
                      View Archive
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============= METRICS ============= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon="calendar_today"
            label="Daily Appointments"
            value={quickStats.todayAppointments}
            change={5}
            color="from-blue-500 to-blue-700"
            isLoading={loading}
          />
          <StatCard
            icon="medical_services"
            label="In-Patient Care"
            value={quickStats.activeConsultations}
            color="from-purple-500 to-purple-700"
            isLoading={loading}
          />
          <StatCard
            icon="verified_user"
            label="Reports Completed"
            value={quickStats.completedToday}
            change={12}
            color="from-green-500 to-green-700"
            isLoading={loading}
          />
          <StatCard
            icon="groups"
            label="Total Case Files"
            value={quickStats.totalPatients}
            color="from-orange-500 to-orange-700"
            isLoading={loading}
          />
        </div>

        {/* ============= DASHBOARD GRID ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Schedule Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined font-bold">event</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Daily Schedule</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{appointments.length} Appointments confirmed</p>
                  </div>
                </div>
                <Link to="/appointments" className="p-2 px-4 rounded-xl text-blue-600 font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2">
                  Expand
                  <span className="material-symbols-outlined text-sm">open_in_full</span>
                </Link>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                {appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                    <span className="material-symbols-outlined text-7xl mb-4 font-light">calendar_today</span>
                    <p className="text-slate-500 font-bold italic">No active bookings for today.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appointments.map((app) => (
                      <AppointmentCard key={app._id} appointment={app} onClick={() => navigate(`/appointments/${app._id}`)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consultation Tracker Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                    <span className="material-symbols-outlined font-bold">monitoring</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Patient Monitoring</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{consultations.length} Active Tracks</p>
                  </div>
                </div>
                <Link to="/consultations" className="text-slate-400 hover:text-indigo-600 transition-colors">
                  <span className="material-symbols-outlined text-2xl">more_vert</span>
                </Link>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                {consultations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                    <span className="material-symbols-outlined text-7xl mb-4 font-light">vital_signs</span>
                    <p className="text-slate-500 font-bold italic">No ongoing consultations.</p>
                  </div>
                ) : (
                  consultations.map((consult) => (
                    <ConsultationCard key={consult._id} consultation={consult} onClick={() => navigate(`/consultations/${consult._id}`)} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============= BOTTOM ANALYTICS & RECENT FILES ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined font-bold">analytics</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Health Record Distribution</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Case Load Statistical Analysis</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {stats.map((stat) => (
                <div key={stat._id} className="group">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ${
                        stat._id === 'confirmed' ? 'bg-emerald-500' :
                        stat._id === 'pending' ? 'bg-amber-500' :
                        stat._id === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {stat._id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900 dark:text-white">{stat.count || 0}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Files</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.3)] ${
                        stat._id === 'confirmed' ? 'bg-emerald-500 shadow-emerald-500/20' :
                        stat._id === 'pending' ? 'bg-amber-500 shadow-amber-500/20' :
                        stat._id === 'cancelled' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-blue-600 shadow-blue-500/20'
                      }`}
                      style={{ width: `${totalAppointments > 0 ? ((stat.count || 0) / totalAppointments) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregate Throughput</span>
              <span className="text-2xl font-black text-blue-600">{totalAppointments} <span className="text-xs font-bold text-slate-300 uppercase">Records</span></span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined font-bold">folder_shared</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Files</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Patient Records Access</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {recentPatients.slice(0, 6).map((patient) => (
                <div 
                  key={patient._id} 
                  className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                  onClick={() => navigate(`/patients/${patient._id}`)}
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-sm border border-slate-200 dark:border-slate-700">
                    {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{patient.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{patient.phoneNumber || 'ID: XXXXX-XX'}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 text-xl">open_in_new</span>
                </div>
              ))}
            </div>
            
            <Link to="/patients" className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 transition-all">
              Comprehensive Directory
              <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
            </Link>
          </div>
        </div>

        {/* ============= FOOTER STATUS ============= */}
        <footer className="mt-12 py-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'} animate-pulse`}></span>
              {isOnline ? 'Cloud Core Connected' : 'Connectivity Interrupted'}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></span>
              Real-time synchronization
            </div>
            {refreshingAppointments && (
              <div className="flex items-center gap-2 text-amber-500">
                <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                Updating records...
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-300">
            <span>Terminal Sequence Update: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;