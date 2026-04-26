import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Appointment,
  Notification as NotificationType,
  Stat,
  DoctorProfile,
  Consultation,
  Patient,
} from '../types';
import { getDoctorId, API_BASE_URL, formatDate, getAvatarUrl, getInitials } from '../utils/api';

// ─── Equality helpers ──────────────────────────────────────────────────────────

const areAppointmentsEqual = (prev: Appointment[], next: Appointment[]) => {
  if (prev.length !== next.length) return false;
  return prev.every((p, i) =>
    p._id === next[i]._id && p.status === next[i].status && p.time_slot === next[i].time_slot
  );
};

const areNotificationsEqual = (prev: NotificationType[], next: NotificationType[]) => {
  if (prev.length !== next.length) return false;
  return prev.every((n, i) => n._id === next[i]._id && n.isRead === next[i].isRead);
};

// ─── Toast types ───────────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  notification: NotificationType;
  entering: boolean;
  leaving: boolean;
}

// ─── Notification helpers ──────────────────────────────────────────────────────

const getNotificationIcon = (type: string) => {
  const map: Record<string, string> = {
    appointment: 'event', alert: 'warning', message: 'mail',
    consultation: 'stethoscope', success: 'check_circle', emergency: 'emergency',
    reminder: 'notifications_active', approval_request: 'approval',
  };
  return map[type] ?? 'notifications';
};

const getTypeAccent = (type: string) => {
  const map: Record<string, string> = {
    appointment: 'bg-sky-500', alert: 'bg-rose-500', message: 'bg-violet-500',
    consultation: 'bg-indigo-500', emergency: 'bg-red-600', success: 'bg-emerald-500',
    approval_request: 'bg-amber-500', reminder: 'bg-cyan-500',
  };
  return map[type] ?? 'bg-slate-500';
};

const getTypeIconStyle = (type: string) => {
  const map: Record<string, string> = {
    appointment: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    alert: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    message: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    consultation: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    emergency: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    approval_request: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return map[type] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
};

// ─── Avatar ────────────────────────────────────────────────────────────────────

const getAvatarColor = (name: string) => {
  const palette = [
    'from-sky-100 to-sky-200 text-sky-700 dark:from-sky-900/40 dark:to-sky-800/40 dark:text-sky-300',
    'from-violet-100 to-violet-200 text-violet-700 dark:from-violet-900/40 dark:to-violet-800/40 dark:text-violet-300',
    'from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/40 dark:to-emerald-800/40 dark:text-emerald-300',
    'from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900/40 dark:to-amber-800/40 dark:text-amber-300',
    'from-rose-100 to-rose-200 text-rose-700 dark:from-rose-900/40 dark:to-rose-800/40 dark:text-rose-300',
    'from-indigo-100 to-indigo-200 text-indigo-700 dark:from-indigo-900/40 dark:to-indigo-800/40 dark:text-indigo-300',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const PatientAvatar: React.FC<{ name?: string; avatar?: string; size?: 'sm' | 'md' }> = ({ name, avatar, size = 'md' }) => {
  const url = getAvatarUrl(avatar);
  const hasReal = avatar && avatar !== 'undefined' && avatar !== 'null' && avatar.trim() !== '';
  const dim = size === 'md' ? 'size-10' : 'size-8';
  const ts = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <div className={`${dim} rounded-xl overflow-hidden shrink-0`}>
      {hasReal ? (
        <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url('${url}')` }} />
      ) : (
        <div className={`size-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(name || '')}`}>
          <span className={`${ts} font-bold`}>{getInitials(name)}</span>
        </div>
      )}
    </div>
  );
};

// ─── Toast ─────────────────────────────────────────────────────────────────────

const ToastCard = React.memo(({ item, onClose, navigate, index, total }: {
  item: ToastItem; onClose: (id: string) => void; navigate: any; index: number; total: number;
}) => {
  const [progress, setProgress] = useState(100);
  const DURATION = 6000;
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const rem = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(rem);
      if (rem > 0) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const offset = (total - 1 - index) * 6;
  const scale = 1 - (total - 1 - index) * 0.025;
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out
        ${item.entering || item.leaving ? 'translate-y-3 opacity-0 scale-95' : 'translate-y-0 opacity-100 scale-100'}`}
      style={{ transform: `translateY(-${offset}px) scale(${scale})`, zIndex: index + 1 }}
    >
      <div className="bg-white dark:bg-[#102023] border border-slate-200 dark:border-[#1e3438] rounded-2xl shadow-2xl overflow-hidden">
        <div className={`h-0.5 ${getTypeAccent(item.notification.type)}`} />
        <div className="p-4 flex items-start gap-3">
          <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${getTypeIconStyle(item.notification.type)}`}>
            <span className="material-symbols-outlined text-lg">{getNotificationIcon(item.notification.type)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.notification.type?.replace(/_/g, ' ')}</p>
              <button onClick={() => onClose(item.id)} className="size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1a2c2f] transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{item.notification.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.notification.message}</p>
            {item.notification.data?.action_label && (
              <button
                onClick={() => { if (item.notification.data?.action_url) navigate(item.notification.data.action_url); onClose(item.id); }}
                className={`mt-2 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg text-white ${getTypeAccent(item.notification.type)} hover:opacity-90`}
              >
                {item.notification.data.action_label}
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-0.5 bg-slate-100 dark:bg-[#1a2c2f]">
          <div className={`h-full ${getTypeAccent(item.notification.type)} transition-none`} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
});

const ToastStack = React.memo(({ toasts, onClose, navigate }: { toasts: ToastItem[]; onClose: (id: string) => void; navigate: any }) => {
  if (toasts.length === 0) return null;
  const visible = toasts.slice(-3);
  return (
    <div className="fixed bottom-6 right-6 z-[200] w-80" style={{ height: 120 + (visible.length - 1) * 6 }}>
      {visible.map((item, i) => (
        <ToastCard key={item.id} item={item} onClose={onClose} navigate={navigate} index={i} total={visible.length} />
      ))}
      {toasts.length > 3 && (
        <div className="absolute -top-7 right-0 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black px-2 py-1 rounded-full">
          +{toasts.length - 3} more
        </div>
      )}
    </div>
  );
});

// ─── Appointment row ───────────────────────────────────────────────────────────

const statusStyle: Record<string, { badge: string; dot: string }> = {
  confirmed: { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
  pending: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', dot: 'bg-amber-400' },
  'checked-in': { badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400', dot: 'bg-violet-500 animate-pulse' },
  completed: { badge: 'bg-green-100 text-green-500 dark:bg-green-800/60 dark:text-green-400', dot: 'bg-green-400' },
  cancelled: { badge: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400', dot: 'bg-red-400' },
};

const AppointmentRow = React.memo(({ appointment, isNow, onClick }: { appointment: Appointment; isNow?: boolean; onClick: () => void }) => {
  const s = statusStyle[appointment.status] ?? statusStyle['pending'];
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer group transition-all
        ${isNow ? 'bg-primary/5 dark:bg-primary/10 border border-primary/20' : 'hover:bg-slate-50 dark:hover:bg-[#1a2c2f]/60 border border-transparent'}`}
    >
      <div className="w-14 text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${isNow ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
          {appointment.time_slot}
        </p>
      </div>
      <span className={`size-2.5 rounded-full shrink-0 ${s.dot}`} />
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <PatientAvatar name={appointment.user_id?.name} avatar={appointment.user_id?.avatar} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors truncate">
            {appointment.user_id?.name || 'Patient'}
          </p>
          <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{appointment.reason || 'General consultation'}</p>
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize shrink-0 ${s.badge}`}>
        {appointment.status === 'checked-in' ? 'Waiting' : appointment.status}
      </span>
      <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base group-hover:text-primary transition-colors shrink-0">chevron_right</span>
    </div>
  );
});

// ─── Consultation card ─────────────────────────────────────────────────────────

const severityStyle: Record<string, { badge: string; bar: string }> = {
  mild: { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', bar: 'bg-emerald-500' },
  moderate: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', bar: 'bg-amber-400' },
  severe: { badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400', bar: 'bg-orange-500' },
  critical: { badge: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', bar: 'bg-red-500' },
};

const ConsultationCard = React.memo(({ consultation, onClick }: { consultation: Consultation; onClick: () => void }) => {
  const sev = consultation.severity?.toLowerCase() ?? 'mild';
  const style = severityStyle[sev] ?? severityStyle['mild'];
  const plan = consultation.treatment_plan || [];
  const total = plan.length;
  const done = Math.min(plan.filter((s: any) => s.status === 'completed' || s.status === 'approved').length, total);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const med = plan[0]?.medication || (consultation as any).initialStep?.medication || '';
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 border cursor-pointer group transition-all hover:shadow-md
        ${sev === 'critical'
          ? 'border-l-2 border-red-400 dark:border-red-500 bg-red-50/30 dark:bg-red-900/5 border-slate-100 dark:border-[#1e3438]'
          : 'border-slate-100 dark:border-[#1e3438] bg-white dark:bg-[#102023] hover:border-primary/30 dark:hover:border-primary/20'}`}
    >
      <div className="flex items-start gap-3">
        <PatientAvatar name={consultation.user_id?.name} avatar={consultation.user_id?.avatar} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors truncate">
              {consultation.user_id?.name || 'Patient'}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${style.badge}`}>{sev}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{consultation.diagnosis || '—'}</p>
          {med && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-xs">medication</span>{med}
            </p>
          )}
        </div>
      </div>
      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              {pct === 100 ? 'Done' : `Step ${Math.min(done, total)} / ${total}`}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-[#224449] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : style.bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const doctorId = getDoctorId();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState({ todayTotal: 0, checkedIn: 0, activeCases: 0, completedToday: 0 });

  const notifRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Network
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Toast
  const pushToast = useCallback((notification: NotificationType) => {
    const id = `toast-${notification._id}-${Date.now()}`;
    setToasts(prev => [...prev, { id, notification, entering: true, leaving: false }]);
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, entering: false } : t)), 50);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  // Fetch appointments
  const fetchAppointments = useCallback(async (detectChanges = false) => {
    if (!doctorId) return;
    try {
      const token = localStorage.getItem('token') || '';
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/appointments?date=${today}&_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      const sorted: Appointment[] = (data.data as Appointment[])
        .filter(a => a.status !== 'cancelled')
        .sort((a, b) => {
          const [ah, am] = (a.time_slot || '00:00').split(':').map(Number);
          const [bh, bm] = (b.time_slot || '00:00').split(':').map(Number);
          return (ah * 60 + am) - (bh * 60 + bm);
        });
      setAppointments(prev => {
        if (areAppointmentsEqual(prev, sorted)) return prev;
        if (detectChanges && prev.length > 0) {
          sorted.filter(a => !prev.find(p => p._id === a._id)).slice(0, 1).forEach(a =>
            pushToast({
              _id: `new-apt-${Date.now()}`, title: 'New Appointment',
              message: `${a.user_id?.name || 'A patient'} booked at ${a.time_slot}.`,
              type: 'appointment', isRead: false, createdAt: new Date().toISOString(),
              data: { action_url: '/appointments', action_label: 'View' },
              user_id: '', doctor_id: '',
            })
          );
        }
        const checkedIn = sorted.filter(a => a.status === 'checked-in').length;
        const completedToday = sorted.filter(a => a.status === 'completed').length;
        setQuickStats(p => ({ ...p, todayTotal: sorted.length, checkedIn, completedToday }));
        setLastSynced(new Date());
        return sorted;
      });
    } catch (e) { console.error(e); }
  }, [doctorId, pushToast]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!doctorId) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE_URL}/notifications?doctorId=${doctorId}&_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.data) return;
      const fetched: NotificationType[] = data.data.map((n: any) => ({
        _id: n._id, title: n.title || 'Notification', message: n.message || '',
        type: n.type || 'system', isRead: n.read ?? n.isRead ?? false,
        createdAt: n.created_at ?? n.createdAt ?? new Date().toISOString(),
        data: n.data ?? n.metadata ?? {}, user_id: '', doctor_id: '',
      }));
      if (!isFirstLoad.current) {
        fetched.filter(n => !seenIds.current.has(n._id) && !n.isRead).slice(0, 2).forEach(n => pushToast(n));
      } else {
        isFirstLoad.current = false;
      }
      fetched.forEach(n => seenIds.current.add(n._id));
      setNotifications(prev => {
        const prevMap = new Map(prev.map(n => [n._id, n]));
        const merged = fetched.map(n => { const ex = prevMap.get(n._id); return ex ? { ...n, isRead: ex.isRead || n.isRead } : n; });
        if (areNotificationsEqual(prev, merged)) return prev;
        return merged;
      });
      setUnreadCount(fetched.filter(n => !n.isRead).length);
      setLastSynced(new Date());
    } catch (e) { console.error(e); }
  }, [doctorId, pushToast]);

  // Initial load + polling
  useEffect(() => {
    if (!doctorId) return;
    const init = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') || '';
        const hdr = { Authorization: `Bearer ${token}` };
        const [profileRes, statsRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/doctors/profile/${doctorId}`),
          fetch(`${API_BASE_URL}/doctors/stats/${doctorId}`),
        ]);
        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
          const d = await profileRes.value.json();
          if (d.success) setProfile(d.data);
        }
        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const d = await statsRes.value.json();
          if (d.success) setStats(d.data || []);
        }
        await fetchAppointments(false);
        const [consultRes, patRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations/active`, { headers: hdr }),
          fetch(`${API_BASE_URL}/doctors/${doctorId}/patients?limit=6`, { headers: hdr }),
        ]);
        if (consultRes.status === 'fulfilled' && consultRes.value.ok) {
          const d = await consultRes.value.json();
          if (d.success) { setConsultations(d.data || []); setQuickStats(p => ({ ...p, activeCases: (d.data || []).length })); }
        }
        if (patRes.status === 'fulfilled' && patRes.value.ok) {
          const d = await patRes.value.json();
          if (d.success) setRecentPatients(d.data || []);
        }
        await fetchNotifications();
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
    const apt = setInterval(() => { if (!document.hidden) fetchAppointments(true); }, 10_000);
    const notif = setInterval(() => { if (!document.hidden) fetchNotifications(); }, 15_000);
    const dash = setInterval(() => { if (!document.hidden) init(); }, 120_000);
    const onVis = () => { fetchAppointments(true); fetchNotifications(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(apt); clearInterval(notif); clearInterval(dash); document.removeEventListener('visibilitychange', onVis); };
  }, [doctorId, fetchAppointments, fetchNotifications]);

  // Click outside notif
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // Notification actions
  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { console.error(e); }
  };

  const handleNotificationClick = async (notif: NotificationType) => {
    if (!notif.isRead) {
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnreadCount(p => Math.max(0, p - 1));
      try {
        const token = localStorage.getItem('token') || '';
        await fetch(`${API_BASE_URL}/notifications/${notif._id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      } catch (e) { console.error(e); }
    }
    if (notif.data?.action_url) { navigate(notif.data.action_url); setNotifOpen(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAppointments(false), fetchNotifications()]);
    setTimeout(() => setRefreshing(false), 600);
  };

  // Derived
  const totalStats = useMemo(() => stats.reduce((s, c) => s + (c.count || 0), 0), [stats]);
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const minSinceSynced = Math.floor((Date.now() - lastSynced.getTime()) / 60_000);

  const nowApptId = useMemo(() => {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    return appointments.find(a => {
      const [h, m] = (a.time_slot || '00:00').split(':').map(Number);
      const diff = (h * 60 + m) - nowMin;
      return diff >= 0 && diff <= 30 && !['completed', 'cancelled'].includes(a.status);
    })?._id;
  }, [appointments]);

  // Loading screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0b1619] gap-4">
        <div className="relative size-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-sm">stethoscope</span>
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1619]">
      <ToastStack toasts={toasts} onClose={dismissToast} navigate={navigate} />

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-primary/20">
                {profile?.user_id?.name?.charAt(0)?.toUpperCase() || 'D'}
              </div>
              <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0b1619] flex items-center justify-center">
                <span className="material-symbols-outlined text-[9px] text-white font-black">check</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {greeting}, <span className="text-primary">Dr. {profile?.user_id?.name?.split(' ')[0] || 'Doctor'}</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-medium">
                <span>{profile?.specialty_id?.name || 'Medical Specialist'}</span>
                <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 mr-2">
              <span className={`size-1.5 rounded-full inline-block ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isOnline ? (minSinceSynced === 0 ? 'Just synced' : `Synced ${minSinceSynced}m ago`) : 'Offline'}
            </div>

            <button
              onClick={handleRefresh}
              className="size-9 rounded-xl bg-white dark:bg-[#102023] border border-slate-200 dark:border-[#1e3438] text-slate-500 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center shadow-sm"
            >
              <span className={`material-symbols-outlined text-lg ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                className={`size-9 rounded-xl bg-white dark:bg-[#102023] border text-slate-500 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center shadow-sm relative
                  ${notifOpen ? 'border-primary/40 text-primary' : 'border-slate-200 dark:border-[#1e3438]'}`}
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#0b1619]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-[#102023] border border-slate-200 dark:border-[#1e3438] rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-[#1e3438] bg-slate-50/50 dark:bg-[#1a2c2f]/50">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Notifications</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{unreadCount} unread</p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50 dark:divide-[#1a2c2f]">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl block mb-2">notifications_off</span>
                        <p className="text-sm font-semibold text-slate-500">All caught up</p>
                      </div>
                    ) : notifications.map(notif => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-[#1a2c2f]/60
                          ${!notif.isRead ? 'bg-primary/3 dark:bg-primary/5' : ''}`}
                      >
                        <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${getTypeIconStyle(notif.type)}`}>
                          <span className="material-symbols-outlined text-base">{getNotificationIcon(notif.type)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-bold truncate ${!notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-semibold">{formatDate(notif.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 dark:border-[#1e3438] px-4 py-3 text-center">
                    <Link to="/notifications" onClick={() => setNotifOpen(false)} className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── STATS ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Today's Appointments", value: quickStats.todayTotal, icon: 'calendar_today', color: 'text-primary', bg: 'bg-primary/8 dark:bg-primary/10', iconBg: 'bg-primary/10 dark:bg-primary/15', to: '/appointments' },
            { label: 'In Waiting Room', value: quickStats.checkedIn, icon: 'person_pin_circle', color: 'text-violet-600 dark:text-violet-400', bg: quickStats.checkedIn > 0 ? 'bg-violet-50 dark:bg-violet-900/15' : 'bg-slate-50 dark:bg-[#1a2c2f]', iconBg: 'bg-violet-100 dark:bg-violet-900/30', pulse: quickStats.checkedIn > 0, to: '/appointments' },
            { label: 'Active Cases', value: quickStats.activeCases, icon: 'stethoscope', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/15', iconBg: 'bg-sky-100 dark:bg-sky-900/30', to: '/consultations' },
            { label: 'Completed Today', value: quickStats.completedToday, icon: 'task_alt', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/15', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', to: '/appointments' },
          ].map((s, i) => (
            <div
              key={i}
              onClick={() => navigate(s.to)}
              className={`${s.bg} rounded-2xl p-4 border border-white/60 dark:border-white/5 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5`}
            >
              <div className={`${s.iconBg} p-2.5 rounded-xl shrink-0 relative`}>
                <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
                {(s as any).pulse && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-violet-500 border-2 border-white dark:border-[#0b1619] animate-pulse" />}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── WAITING ROOM ALERT ────────────────────────────────────────── */}
        {quickStats.checkedIn > 0 && (
          <div
            onClick={() => navigate('/appointments')}
            className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-700/30 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors"
          >
            <span className="size-2 rounded-full bg-violet-500 animate-pulse inline-block shrink-0" />
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-400 flex-1">
              {quickStats.checkedIn} patient{quickStats.checkedIn > 1 ? 's' : ''} checked in and waiting —
              <span className="underline ml-1">start next consultation</span>
            </p>
            <span className="material-symbols-outlined text-violet-400 text-sm">chevron_right</span>
          </div>
        )}

        {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Schedule */}
          <div className="lg:col-span-2 bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e3438]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-lg">today</span>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Daily Schedule</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} today</p>
                </div>
              </div>
              <Link to="/appointments" className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                Full schedule <span className="material-symbols-outlined text-sm">chevron_right</span>
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3 max-h-[460px]">
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-12 rounded-2xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">calendar_today</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No appointments today</p>
                  <p className="text-xs text-slate-400 mt-1">Enjoy the free day</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {appointments.map(appt => (
                    <AppointmentRow key={appt._id} appointment={appt} isNow={appt._id === nowApptId} onClick={() => navigate('/appointments')} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Cases */}
          <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e3438]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 dark:bg-sky-900/20 rounded-xl">
                  <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-lg">stethoscope</span>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Active Cases</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{consultations.length} ongoing</p>
                </div>
              </div>
              <Link to="/consultations" className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                All cases <span className="material-symbols-outlined text-sm">chevron_right</span>
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3 max-h-[460px]">
              {consultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-12 rounded-2xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">folder_open</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No active cases</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {consultations.slice(0, 8).map(c => (
                    <ConsultationCard key={c._id} consultation={c} onClick={() => navigate(`/consultations/${c._id}`)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Breakdown */}
          <div className="lg:col-span-2 bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-slate-100 dark:bg-[#1a2c2f] rounded-xl">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-lg">analytics</span>
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">Appointment Breakdown</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{totalStats} total records</p>
              </div>
            </div>
            {stats.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No stats available</p>
            ) : (
              <div className="space-y-4">
                {stats.map(stat => {
                  const pct = totalStats > 0 ? ((stat.count || 0) / totalStats) * 100 : 0;
                  const colorMap: Record<string, string> = { confirmed: 'bg-emerald-500', pending: 'bg-amber-400', cancelled: 'bg-red-400', completed: 'bg-sky-500' };
                  const bar = colorMap[stat._id] ?? 'bg-primary';
                  return (
                    <div key={stat._id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${bar}`} />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{stat._id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{stat.count || 0}</span>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-[#224449] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent patients */}
          <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">group</span>
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">Recent Patients</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Quick access</p>
              </div>
            </div>
            <div className="space-y-1">
              {recentPatients.slice(0, 6).map(patient => (
                <div
                  key={patient._id}
                  onClick={() => navigate(`/patients/${patient._id}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a2c2f] transition-colors cursor-pointer group"
                >
                  <PatientAvatar name={patient.name} avatar={(patient as any).avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors truncate">{patient.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{patient.phoneNumber || 'No phone'}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base group-hover:text-primary transition-colors">chevron_right</span>
                </div>
              ))}
            </div>
            <Link to="/patients" className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-100 dark:border-[#224449] text-xs font-bold text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all">
              All patients <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between pt-2 pb-4 text-[11px] text-slate-400 border-t border-slate-100 dark:border-[#1e3438]">
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full inline-block ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {isOnline ? 'Connected' : 'Offline'}
          </div>
          <span>Last synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </footer>

      </div>
    </div>
  );
};

export default Dashboard;