import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRealTimeData } from '../context/RealTimeDataContext';
import { useNavigate } from 'react-router-dom';
import { Appointment } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, calculateAge, getInitials } from '../utils/api';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Drug {
  _id: string;
  name: string;
  category_id?: { _id: string; name: string };
  unit?: string;
  price?: number;
  stock?: number;
}

interface PrescriptionItem {
  medication: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface PastConsultation {
  _id: string;
  diagnosis: string;
  severity: string;
  notes: string;
  created_at: string;
  initialStep?: {
    title: string;
    medication: string;
    dosage: string;
    duration: string;
    instructions: string;
  };
}

interface PatientContextData {
  recentConsultations: PastConsultation[];
  allergies: string[];
  currentMedications: string[];
  loading: boolean;
}

// ─── Tab filter type ────────────────────────────────────────────────────────────

type TabFilter = 'urgent' | 'today' | 'upcoming' | 'done';

// ─── Constants ─────────────────────────────────────────────────────────────────

const COMMON_DOSAGES = [
  '1 tablet once daily', '1 tablet twice daily', '1 tablet thrice daily',
  '2 tablets once daily', '2 tablets twice daily',
  '5ml once daily', '5ml twice daily', '10ml once daily',
  '1 pill as needed', 'Apply thinly twice daily',
];

const COMMON_DURATIONS = [
  '3 days', '5 days', '7 days', '10 days', '14 days',
  '21 days', '1 month', 'Chronic/Ongoing',
];

const COMMON_INSTRUCTIONS = [
  'Take after meals', 'Take before meals', 'Take on an empty stomach',
  'Take before bed', 'Take with plenty of water', 'Chew thoroughly',
  'Do not crush or chew', 'Apply to affected area',
];



// ─── Avatar Component ───────────────────────────────────────────────────────────

const Avatar: React.FC<{
  avatarPath?: string; name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; rounded?: boolean;
}> = ({ avatarPath, name, size = 'md', className = '', rounded = true }) => {
  const sizeClasses = { sm: 'size-8', md: 'size-10', lg: 'size-14', xl: 'size-20' };
  const textSizes  = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-2xl' };
  const avatarUrl  = getAvatarUrl(avatarPath);
  const initials   = getInitials(name);
  const hasRealAvatar = avatarPath &&
    avatarPath !== 'undefined' && avatarPath !== 'null' &&
    avatarPath.trim() !== '' && !avatarUrl.includes('aida-public');
  const shapeClass = rounded ? 'rounded-full' : 'rounded-xl';

  return (
    <div className={`${sizeClasses[size]} ${shapeClass} overflow-hidden shrink-0 ${className}`}>
      {hasRealAvatar ? (
        <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url('${avatarUrl}')` }} />
      ) : (
        <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
          <span className={`${textSizes[size]} font-bold text-slate-500 dark:text-slate-300`}>{initials}</span>
        </div>
      )}
    </div>
  );
};

// ─── Status Badge ───────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; bg: string; dot: string; label: string }> = {
    pending:      { color: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-900/30',   dot: 'bg-amber-400',   label: 'Pending' },
    scheduled:    { color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/30', dot: 'bg-indigo-500',  label: 'Scheduled' },
    confirmed:    { color: 'text-sky-700 dark:text-sky-300',       bg: 'bg-sky-50 dark:bg-sky-900/30',       dot: 'bg-sky-500',     label: 'Confirmed' },
    'checked-in': { color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-900/30', dot: 'bg-violet-500',  label: 'In Waiting Room' },
    completed:    { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30', dot: 'bg-emerald-500', label: 'Completed' },
    cancelled:    { color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800/60',  dot: 'bg-slate-400',   label: 'Cancelled' },
  };
  const s = map[status] ?? map['pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${s.color} ${s.bg}`}>
      <span className={`size-1.5 rounded-full ${s.dot} ${status === 'checked-in' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
};

// ─── Severity Badge ─────────────────────────────────────────────────────────────

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const map: Record<string, { color: string; bg: string }> = {
    mild:     { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    moderate: { color: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-50 dark:bg-amber-900/30' },
    severe:   { color: 'text-orange-700 dark:text-orange-300',   bg: 'bg-orange-50 dark:bg-orange-900/30' },
    critical: { color: 'text-red-700 dark:text-red-300',         bg: 'bg-red-50 dark:bg-red-900/30' },
  };
  const s = map[severity] ?? map['mild'];
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${s.color} ${s.bg}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const Appointments: React.FC = () => {
  const { notifications } = useRealTimeData() || { notifications: [] };
  const navigate = useNavigate();

  // Core data
  const [appointments, setAppointments]     = useState<Appointment[]>([]);
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [loading, setLoading]               = useState(false);
  const [loadingDrugs, setLoadingDrugs]     = useState(false);
  const [actionLoading, setActionLoading]   = useState<string>('');

  // Filters — new 4-tab system
  const [filter, setFilter]             = useState<TabFilter>('today');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [currentDate, setCurrentDate]   = useState(new Date());

  // Modals & Panels
  const [showConsultModal, setShowConsultModal]   = useState(false);
  const [showDetailModal, setShowDetailModal]     = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Patient Context Panel
  const [contextPanelOpen, setContextPanelOpen]   = useState(false);
  const [contextPatientId, setContextPatientId]   = useState<string | null>(null);
  const [patientContext, setPatientContext]        = useState<PatientContextData>({
    recentConsultations: [], allergies: [], currentMedications: [], loading: false,
  });

  // Internal Doctor Notes
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote]   = useState(false);



  // Consult form
  const [consultForm, setConsultForm] = useState({
    diagnosis: '', severity: 'mild', notes: '',
    initialStep: {
      title: 'Initial Prescription',
      description: 'Begin medication course immediately',
      prescriptions: [{ medication: '', dosage: '', duration: '', instructions: '' }] as PrescriptionItem[],
    },
  });

  // Smart Prescription
  const [pastPrescriptions, setPastPrescriptions] = useState<PastConsultation[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);

  const doctorId = getDoctorId();

  // ─── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    if (!doctorId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/appointments`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) setAppointments(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [doctorId]);

  const fetchDrugs = async () => {
    try {
      setLoadingDrugs(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE_URL}/doctors/drugs`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) setAvailableDrugs(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingDrugs(false); }
  };

  const fetchPatientContext = async (patientId: string) => {
    setPatientContext(p => ({ ...p, loading: true }));
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE_URL}/doctors/patients/${patientId}/context`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setPatientContext({
          recentConsultations: data.data?.recentConsultations || [],
          allergies:           data.data?.allergies           || [],
          currentMedications:  data.data?.currentMedications  || [],
          loading: false,
        });
      } else {
        setPatientContext(p => ({ ...p, loading: false }));
      }
    } catch {
      setPatientContext(p => ({ ...p, loading: false }));
    }
  };

  const fetchPastPrescriptions = async (patientId: string) => {
    setLoadingPast(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE_URL}/doctors/patients/${patientId}/consultations?limit=5`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) setPastPrescriptions(data.data || []);
    } catch { /* silent */ }
    finally { setLoadingPast(false); }
  };

  const saveDoctorNote = async (appointmentId: string, note: string) => {
    setSavingNote(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_BASE_URL}/doctors/appointments/${appointmentId}/notes`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorNote: note, doctorId }),
      });
    } catch { /* silent */ }
    finally { setSavingNote(false); }
  };

  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNoteChange = (appointmentId: string, value: string) => {
    setDoctorNotes(prev => ({ ...prev, [appointmentId]: value }));
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
    noteDebounceRef.current = setTimeout(() => saveDoctorNote(appointmentId, value), 1200);
  };

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { fetchAppointments(); fetchDrugs(); }, [doctorId]);

  useEffect(() => {
    if (notifications.some((n: any) => n.type === 'appointment')) fetchAppointments();
  }, [notifications]);

  useEffect(() => {
    if (appointments.length > 0) {
      const notes: Record<string, string> = {};
      appointments.forEach((a: any) => { if (a.doctorNote) notes[a._id] = a.doctorNote; });
      setDoctorNotes(prev => ({ ...prev, ...notes }));
    }
  }, [appointments]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAction = async (id: string, action: 'confirm' | 'cancel' | 'complete' | 'check-in') => {
    if (!doctorId) { alert('Doctor ID not found. Please log in again.'); return; }
    try {
      setActionLoading(id);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE_URL}/doctors/appointments/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ doctorId }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'complete') setShowConsultModal(false);
        await fetchAppointments();
      } else {
        alert(`Failed to ${action} appointment.`);
      }
    } catch { alert('An error occurred. Please try again.'); }
    finally { setActionLoading(''); }
  };

  const openContextPanel = (appt: Appointment) => {
    const patientId = appt.user_id?._id;
    if (!patientId) return;
    setSelectedAppointment(appt);
    setContextPatientId(patientId);
    setContextPanelOpen(true);
    fetchPatientContext(patientId);
  };

  const openStartConsultation = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setConsultForm({
      diagnosis: '', severity: 'mild', notes: '',
      initialStep: {
        title: 'Initial Prescription',
        description: 'Begin medication course immediately',
        prescriptions: [{ medication: '', dosage: '', duration: '', instructions: '' }],
      },
    });
    setPastPrescriptions([]);
    if (appt.user_id?._id) fetchPastPrescriptions(appt.user_id._id);
    setShowConsultModal(true);
    setShowDetailModal(false);
    setContextPanelOpen(false);
  };

  const openAppointmentDetails = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setShowDetailModal(true);
  };

  const applyPastPrescription = (past: PastConsultation) => {
    if (!past.initialStep) return;
    const meds = past.initialStep.medication?.split(' + ') || [''];
    const prescriptions: PrescriptionItem[] = meds.map((med, i) => ({
      medication: med.trim(),
      dosage:       past.initialStep!.dosage?.split(' | ')[i]?.replace(`${med.trim()}: `, '')        || '',
      duration:     past.initialStep!.duration?.split(' | ')[i]?.replace(`${med.trim()}: `, '')      || '',
      instructions: past.initialStep!.instructions?.split(' | ')[i]?.replace(`${med.trim()}: `, '')  || '',
    }));
    setConsultForm(prev => ({
      ...prev,
      diagnosis: past.diagnosis || prev.diagnosis,
      initialStep: { ...prev.initialStep, prescriptions },
    }));
  };

  const addPrescription = () => setConsultForm(prev => ({
    ...prev,
    initialStep: {
      ...prev.initialStep,
      prescriptions: [...prev.initialStep.prescriptions, { medication: '', dosage: '', duration: '', instructions: '' }],
    },
  }));

  const removePrescription = (index: number) => {
    if (consultForm.initialStep.prescriptions.length > 1) {
      setConsultForm(prev => ({
        ...prev,
        initialStep: {
          ...prev.initialStep,
          prescriptions: prev.initialStep.prescriptions.filter((_, i) => i !== index),
        },
      }));
    }
  };

  const updatePrescription = (index: number, field: keyof PrescriptionItem, value: string) => {
    setConsultForm(prev => {
      const newPrescriptions = [...prev.initialStep.prescriptions];
      newPrescriptions[index] = { ...newPrescriptions[index], [field]: value };
      let newTitle = prev.initialStep.title;
      if (index === 0 && field === 'medication' && prev.initialStep.title === 'Initial Prescription' && value) {
        newTitle = `Prescribe ${value}`;
      }
      return { ...prev, initialStep: { ...prev.initialStep, title: newTitle, prescriptions: newPrescriptions } };
    });
  };

  const submitConsultation = async () => {
    if (!selectedAppointment || !doctorId) return;
    if (!consultForm.diagnosis.trim()) { alert('Please enter a diagnosis'); return; }
    if (consultForm.initialStep.prescriptions.some(p => !p.medication || !p.dosage)) {
      alert('Please select medication and dosage for all prescription items.'); return;
    }
    try {
      const { prescriptions } = consultForm.initialStep;
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE_URL}/doctors/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          appointment_id: selectedAppointment._id,
          patient_id:     selectedAppointment.user_id?._id,
          doctor_id:      doctorId,
          diagnosis:      consultForm.diagnosis,
          severity:       consultForm.severity,
          notes:          consultForm.notes,
          initialStep: {
            title:        consultForm.initialStep.title,
            description:  consultForm.initialStep.description,
            medication:   prescriptions.map(p => p.medication).join(' + '),
            dosage:       prescriptions.map(p => p.dosage ? `${p.medication}: ${p.dosage}` : '').filter(Boolean).join(' | '),
            duration:     prescriptions.map(p => p.duration ? `${p.medication}: ${p.duration}` : '').filter(Boolean).join(' | '),
            instructions: prescriptions.map(p => p.instructions ? `${p.medication}: ${p.instructions}` : '').filter(Boolean).join(' | '),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        await handleAction(selectedAppointment._id, 'complete');
        setShowConsultModal(false);
        // Removed follow-up modal trigger
      } else {
        alert('Failed to start consultation: ' + (data.message || 'Unknown error'));
      }
    } catch { alert('Error starting consultation. Please check your connection.'); }
  };


  // ─── Filtering & Stats ──────────────────────────────────────────────────────

  const today = new Date();
  const todayStr = today.toDateString();

  const getTabAppointments = (tab: TabFilter) => {
    return appointments.filter(app => {
      const appDate = new Date(app.appointment_date);
      const appDateStr = appDate.toDateString();
      const isToday    = appDateStr === todayStr;
      const isFuture   = appDate > today && !isToday;

      const searchMatch = !searchQuery || (app.user_id?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) return false;

      if (selectedDate) {
        const dateMatch = appDate.getDate()     === selectedDate.getDate() &&
                          appDate.getMonth()    === selectedDate.getMonth() &&
                          appDate.getFullYear() === selectedDate.getFullYear();
        if (!dateMatch) return false;
      }

      switch (tab) {
        case 'urgent':   return ['pending', 'checked-in'].includes(app.status);
        case 'today':    return isToday;
        case 'upcoming': return isFuture && ['scheduled', 'confirmed'].includes(app.status);
        case 'done':     return ['completed', 'cancelled'].includes(app.status);
        default:         return false;
      }
    });
  };

  const sortOrder: Record<string, number> = {
    'checked-in': 1, pending: 2, scheduled: 3, confirmed: 4, completed: 5, cancelled: 6,
  };

  const filteredAppointments = getTabAppointments(filter).sort((a, b) => {
    const oa = sortOrder[a.status] ?? 7;
    const ob = sortOrder[b.status] ?? 7;
    if (oa !== ob) return oa - ob;
    return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
  });

  const urgentCount  = appointments.filter(a => ['pending', 'checked-in'].includes(a.status)).length;
  const checkedInCount = appointments.filter(a => a.status === 'checked-in').length;
  const todayAppts   = appointments.filter(a => new Date(a.appointment_date).toDateString() === todayStr && a.status !== 'cancelled');
  const todayDone    = todayAppts.filter(a => a.status === 'completed').length;
  const nextAppt     = todayAppts
    .filter(a => !['completed', 'cancelled'].includes(a.status))
    .sort((a, b) => (a.time_slot ?? '').localeCompare(b.time_slot ?? ''))[0];

  const tabCounts: Record<TabFilter, number> = {
    urgent:   urgentCount,
    today:    getTabAppointments('today').length,
    upcoming: getTabAppointments('upcoming').length,
    done:     getTabAppointments('done').length,
  };

  // ─── Calendar ───────────────────────────────────────────────────────────────

  const daysInMonth     = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName       = currentDate.toLocaleString('default', { month: 'long' });

  const changeMonth = (offset: number) =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (selectedDate &&
        newDate.getDate()     === selectedDate.getDate() &&
        newDate.getMonth()    === selectedDate.getMonth() &&
        newDate.getFullYear() === selectedDate.getFullYear()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(newDate);
    }
  };

  const hasAppointmentOnDay = (day: number) => appointments.some(app => {
    const d = new Date(app.appointment_date);
    return d.getDate() === day && d.getMonth() === currentDate.getMonth() &&
           d.getFullYear() === currentDate.getFullYear() && app.status !== 'cancelled';
  });

  const hasUrgentOnDay = (day: number) => appointments.some(app => {
    const d = new Date(app.appointment_date);
    return d.getDate() === day && d.getMonth() === currentDate.getMonth() &&
           d.getFullYear() === currentDate.getFullYear() && ['pending', 'checked-in'].includes(app.status);
  });

  const isCalToday = (day: number) => {
    const t = new Date();
    return day === t.getDate() && currentDate.getMonth() === t.getMonth() && currentDate.getFullYear() === t.getFullYear();
  };

  const isSelected = (day: number) => selectedDate &&
    day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() &&
    currentDate.getFullYear() === selectedDate.getFullYear();

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return dateString; }
  };

  const dotColor = (status: string) => ({
    'checked-in': 'bg-violet-500 ring-2 ring-violet-200 dark:ring-violet-800 animate-pulse',
    confirmed:    'bg-sky-500',
    scheduled:    'bg-indigo-500',
    pending:      'bg-amber-400',
    completed:    'bg-emerald-500',
    cancelled:    'bg-slate-300 dark:bg-slate-600',
  }[status] ?? 'bg-slate-300');

  // ─── Tab definitions ────────────────────────────────────────────────────────

  const tabs: { key: TabFilter; label: string; icon: string; urgent?: boolean }[] = [
    { key: 'urgent',   label: 'Action Needed', icon: 'alarm',           urgent: true },
    { key: 'today',    label: 'Today',    icon: 'today' },
    { key: 'upcoming', label: 'Upcoming',    icon: 'event_upcoming' },
    { key: 'done',     label: 'Completed',    icon: 'task_alt' },
  ];

  // ══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1619]">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* ── TODAY FOCUS STRIP ────────────────────────────────────────────── */}
        {todayAppts.length > 0 && (
          <div className="bg-white dark:bg-[#102023] border border-slate-100 dark:border-[#1e3438] rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4 justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <span className="material-symbols-outlined text-primary text-xl">today</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Schedule</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {todayDone}/{todayAppts.length} completed
                  {checkedInCount > 0 && (
                    <span className="ml-2 text-violet-600 dark:text-violet-400 inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-violet-500 animate-pulse inline-block" />
                      {checkedInCount} waiting
                    </span>
                  )}
                </p>
              </div>
            </div>

            {nextAppt && (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#1a2c2f] rounded-xl px-4 py-2.5 border border-slate-100 dark:border-[#224449]">
                <span className="material-symbols-outlined text-primary text-base">schedule</span>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Next Patient</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    {nextAppt.time_slot} — {nextAppt.user_id?.name || 'Unknown'}
                  </p>
                </div>
                <StatusBadge status={nextAppt.status} />
              </div>
            )}

            <div className="flex items-center gap-2">
              {urgentCount > 0 && (
                <button
                  onClick={() => setFilter('urgent')}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all flex items-center gap-2 shadow-md shadow-red-500/20"
                >
                  <span className="material-symbols-outlined text-sm">alarm</span>
                  {urgentCount} need attention
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Appointments</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-4 py-2 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              {selectedDate.toLocaleDateString('en-US')}
            </button>
          )}
        </div>

        {/* ── MAIN LAYOUT ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* Left Sidebar */}
          <div className="xl:col-span-3 flex flex-col gap-4 xl:sticky xl:top-6">

            {/* Calendar */}
            <div className="bg-white dark:bg-[#102023] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#1e3438]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-slate-800 dark:text-white text-sm">{monthName} {currentDate.getFullYear()}</span>
                <div className="flex gap-0.5">
                  <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2c2f] rounded-lg text-slate-400 transition-colors">
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2c2f] rounded-lg text-slate-400 transition-colors">
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center mb-1.5">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                  <div key={i} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1 uppercase">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center gap-y-0.5">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day      = i + 1;
                  const selected = isSelected(day);
                  const calToday = isCalToday(day);
                  const hasEvent = hasAppointmentOnDay(day);
                  const hasUrgent = hasUrgentOnDay(day);
                  return (
                    <div key={day} onClick={() => handleDateClick(day)}
                      className="flex flex-col items-center justify-center cursor-pointer aspect-square relative">
                      <span className={`
                        size-7 flex items-center justify-center text-xs rounded-lg transition-all font-medium
                        ${selected  ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md'
                          : calToday ? 'bg-primary text-white shadow-md shadow-primary/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a2c2f]'}
                      `}>{day}</span>
                      {hasEvent && !calToday && !selected && (
                        <span className={`absolute bottom-0.5 size-1 rounded-full ${hasUrgent ? 'bg-red-400' : 'bg-primary/40'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-[#102023] rounded-xl shadow-sm border border-slate-100 dark:border-[#1e3438]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-0 border-none outline-none"
                  placeholder="Search patients..."
                />
              </div>
            </div>

            {/* Checked-in quick panel */}
            {checkedInCount > 0 && (
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="size-2 rounded-full bg-violet-500 animate-pulse inline-block" />
                  <p className="text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">In Waiting Room</p>
                </div>
                <div className="space-y-2">
                  {appointments.filter(a => a.status === 'checked-in').map(appt => (
                    <div key={appt._id} className="flex items-center gap-2.5">
                      <Avatar avatarPath={appt.user_id?.avatar} name={appt.user_id?.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{appt.user_id?.name}</p>
                        <p className="text-xs text-slate-400">{appt.time_slot}</p>
                      </div>
                      <button
                        onClick={() => openStartConsultation(appt)}
                        className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">stethoscope</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Today', value: todayAppts.length, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Completed', value: todayDone, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Pending Action', value: urgentCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'Upcoming', value: tabCounts.upcoming, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#102023] rounded-xl p-3 border border-slate-100 dark:border-[#1e3438]">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                    <div className={`${stat.bg} rounded-lg px-1.5 py-0.5 ml-auto`}>
                      <span className={`text-[10px] font-bold ${stat.color}`}>
                        {stat.value > 0 ? '↑' : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-9 flex flex-col gap-4">

            {/* ── 4-TAB BAR ──────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm p-1.5 flex gap-1">
              {tabs.map(tab => {
                const isActive = filter === tab.key;
                const count = tabCounts[tab.key];
                const isUrgent = tab.urgent && count > 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                      ${isActive
                        ? isUrgent
                          ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                          : 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md'
                        : isUrgent
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a2c2f]'
                      }
                    `}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? '' : isUrgent ? 'text-red-500 dark:text-red-400' : ''}`}>
                      {tab.icon}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    {count > 0 && (
                      <span className={`
                        text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                        ${isActive
                          ? 'bg-white/20 text-white dark:bg-black/20 dark:text-white'
                          : isUrgent
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-100 dark:bg-[#224449] text-slate-500 dark:text-slate-400'
                        }
                      `}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── URGENT BANNER (only when on urgent tab) ────────────────── */}
            {filter === 'urgent' && urgentCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500 text-lg">priority_high</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">
                    {checkedInCount > 0 && `${checkedInCount} patients waiting in the room`}
                    {checkedInCount > 0 && appointments.filter(a => a.status === 'pending').length > 0 && ' · '}
                    {appointments.filter(a => a.status === 'pending').length > 0 &&
                      `${appointments.filter(a => a.status === 'pending').length} appointments pending confirmation`}
                  </p>
                </div>
                {checkedInCount > 0 && (
                  <div className="size-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
            )}

            {/* ── APPOINTMENT TIMELINE ───────────────────────────────────── */}
            <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm min-h-[400px]">
              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
                  <p className="text-slate-400 text-sm">Loading appointments...</p>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">
                      {filter === 'urgent' ? 'check_circle' : filter === 'today' ? 'calendar_today' : filter === 'upcoming' ? 'event_upcoming' : 'task_alt'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
                    {filter === 'urgent' ? 'Nothing needs attention' : 'No appointments'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {filter === 'urgent' ? 'All patients are handled' :
                     filter === 'today' ? 'No appointments today' :
                     filter === 'upcoming' ? 'No upcoming appointments' : 'No completed appointments yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-[#1a2c2f]">
                  {filteredAppointments.map((app, idx) => (
                    <div
                      key={app._id}
                      className={`flex flex-col md:flex-row gap-3 px-5 py-4 hover:bg-slate-50/80 dark:hover:bg-[#1a2c2f]/60 transition-colors group
                        ${idx === 0 ? 'rounded-t-2xl' : ''}
                        ${idx === filteredAppointments.length - 1 ? 'rounded-b-2xl' : ''}
                        ${app.status === 'checked-in' ? 'bg-violet-50/40 dark:bg-violet-900/10' : ''}
                      `}
                    >
                      {/* Time column */}
                      <div className="flex md:flex-col items-center md:items-end md:min-w-[80px] gap-2 md:gap-0.5 md:pt-1">
                        <div className={`size-2.5 rounded-full shrink-0 md:mb-1.5 ${dotColor(app.status)}`} />
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{app.time_slot}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:block">
                          {formatDate(app.appointment_date)}
                        </p>
                      </div>

                      {/* Patient info */}
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => openContextPanel(app)}
                      >
                        <div className="relative shrink-0">
                          <Avatar avatarPath={app.user_id?.avatar} name={app.user_id?.name} size="md" />
                          {app.status === 'checked-in' && (
                            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-violet-500 border-2 border-white dark:border-[#102023]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-primary transition-colors truncate">
                            {app.user_id?.name || 'Patient'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#1e3438] px-2 py-0.5 rounded truncate max-w-[180px]">
                              {app.reason || 'General Checkup'}
                            </span>
                            <StatusBadge status={app.status} />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(app._id, 'confirm')}
                              disabled={actionLoading === app._id}
                              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:bg-primary dark:hover:bg-slate-100 transition-all disabled:opacity-50"
                            >
                              {actionLoading === app._id
                                ? <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-b-transparent border-white dark:border-black" />
                                : 'Confirm'}
                            </button>
                            <button
                              onClick={() => handleAction(app._id, 'cancel')}
                              disabled={actionLoading === app._id}
                              className="size-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#224449] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </>
                        )}

                        {app.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleAction(app._id, 'confirm')}
                              disabled={actionLoading === app._id}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                              {actionLoading === app._id
                                ? <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-b-transparent border-white" />
                                : 'Confirm Arrival'}
                            </button>
                            <button
                              onClick={() => handleAction(app._id, 'cancel')}
                              disabled={actionLoading === app._id}
                              className="size-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#224449] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </>
                        )}

                        {app.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleAction(app._id, 'check-in')}
                              disabled={actionLoading === app._id}
                              className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-xl text-xs font-bold border border-violet-200 dark:border-violet-700/40 hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-all"
                            >
                              {actionLoading === app._id
                                ? <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-b-transparent border-violet-600" />
                                : <><span className="material-symbols-outlined text-sm">how_to_reg</span> Check-in</>}
                            </button>
                            <button
                              onClick={() => openStartConsultation(app)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">stethoscope</span>
                              Start
                            </button>
                          </>
                        )}

                        {app.status === 'checked-in' && (
                          <button
                            onClick={() => openStartConsultation(app)}
                            className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/25 transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">stethoscope</span>
                            Examine Now
                          </button>
                        )}

                        {app.status === 'completed' && (
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl">
                            <span className="material-symbols-outlined text-sm">check</span>
                            Completed
                          </span>
                        )}

                        {app.status === 'cancelled' && (
                          <span className="text-slate-400 text-xs font-medium px-3 py-1.5">Cancelled</span>
                        )}

                        <button
                          onClick={() => openAppointmentDetails(app)}
                          className="size-8 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#224449] transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PATIENT CONTEXT PANEL (Slide-in right)
        ══════════════════════════════════════════════════════════════════ */}
        {contextPanelOpen && selectedAppointment && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setContextPanelOpen(false)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white dark:bg-[#102023] shadow-2xl flex flex-col border-l border-slate-100 dark:border-[#1e3438]">

              {/* Panel Header */}
              <div className="p-5 border-b border-slate-100 dark:border-[#1e3438] flex items-start gap-4">
                <Avatar avatarPath={selectedAppointment.user_id?.avatar} name={selectedAppointment.user_id?.name} size="lg" rounded={false} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{selectedAppointment.user_id?.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedAppointment.user_id?.gender} · {calculateAge(selectedAppointment.user_id?.dateOfBirth)} years old
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selectedAppointment.status} />
                    <span className="text-[11px] text-slate-400">{selectedAppointment.time_slot} · {formatDate(selectedAppointment.appointment_date)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setContextPanelOpen(false)}
                  className="size-7 rounded-full bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-[#224449] transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Chief complaint */}
                <div className="bg-slate-50 dark:bg-[#1a2c2f] rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Chief Complaint</p>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{selectedAppointment.reason || 'General Checkup'}</p>
                  {selectedAppointment.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">"{selectedAppointment.notes}"</p>
                  )}
                </div>

                {patientContext.loading ? (
                  <div className="py-8 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3 animate-spin" />
                    <p className="text-xs text-slate-400">Loading patient records...</p>
                  </div>
                ) : (
                  <>
                    {patientContext.allergies.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
                          <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Drug Allergies</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {patientContext.allergies.map((a, i) => (
                            <span key={i} className="px-2.5 py-1 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {patientContext.currentMedications.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Medications</p>
                        <div className="flex flex-wrap gap-1.5">
                          {patientContext.currentMedications.map((m, i) => (
                            <span key={i} className="px-2.5 py-1 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-700/30 rounded-full text-xs font-medium">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Consultations</p>
                      {patientContext.recentConsultations.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No consultations on record</p>
                      ) : (
                        <div className="space-y-2">
                          {patientContext.recentConsultations.slice(0, 3).map((c) => (
                            <div key={c._id} className="bg-slate-50 dark:bg-[#1a2c2f] rounded-xl p-3 border border-slate-100 dark:border-[#224449]">
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-white">{c.diagnosis}</p>
                                <SeverityBadge severity={c.severity} />
                              </div>
                              {c.initialStep?.medication && (
                                <p className="text-[11px] text-slate-400">💊 {c.initialStep.medication}</p>
                              )}
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(c.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Private Doctor Notes */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Private Notes</p>
                        {savingNote && <span className="ml-auto text-[10px] text-primary animate-pulse">Saving...</span>}
                      </div>
                      <textarea
                        className="w-full rounded-xl border border-slate-200 dark:border-[#224449] bg-amber-50/60 dark:bg-amber-900/10 text-slate-800 dark:text-white p-3 text-xs resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none placeholder:text-slate-400"
                        rows={3}
                        placeholder="Internal note (not visible to patient)..."
                        value={doctorNotes[selectedAppointment._id] || ''}
                        onChange={e => handleNoteChange(selectedAppointment._id, e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-[#1e3438] flex gap-2">
                <button
                  onClick={() => navigate(`/patients/${selectedAppointment.user_id?._id}`)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#224449] text-slate-500 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[#1a2c2f] transition-colors"
                >
                  Full Profile
                </button>
                {['confirmed', 'checked-in'].includes(selectedAppointment.status) && (
                  <button
                    onClick={() => openStartConsultation(selectedAppointment)}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">stethoscope</span>
                    Start Consultation
                  </button>
                )}
                {selectedAppointment.status === 'pending' && (
                  <button
                    onClick={() => handleAction(selectedAppointment._id, 'confirm')}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-sm hover:bg-primary transition-colors"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            APPOINTMENT DETAIL MODAL
        ══════════════════════════════════════════════════════════════════ */}
        {showDetailModal && selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#102023] rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-[#1e3438]">
              <div className="p-5 flex justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                  <Avatar avatarPath={selectedAppointment.user_id?.avatar} name={selectedAppointment.user_id?.name} size="lg" rounded={false} />
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{selectedAppointment.user_id?.name || 'Unknown'}</h2>
                    <p className="text-xs text-slate-400 mb-2">{selectedAppointment.user_id?.gender} · {calculateAge(selectedAppointment.user_id?.dateOfBirth)} years old</p>
                    <StatusBadge status={selectedAppointment.status} />
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="size-7 rounded-full bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center text-slate-400 hover:bg-slate-200 shrink-0 transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="px-5 pb-5 space-y-3">
                <div className="flex gap-3 p-4 bg-slate-50 dark:bg-[#1a2c2f] rounded-xl">
                  <div className="p-2 bg-white dark:bg-[#102023] rounded-lg text-primary h-fit">
                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appointment</p>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{formatDate(selectedAppointment.appointment_date)} at {selectedAppointment.time_slot}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedAppointment.reason}</p>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-[#224449]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Notes</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{selectedAppointment.notes}"</p>
                  </div>
                )}

                <div className="p-4 rounded-xl border border-slate-100 dark:border-[#224449] flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
                    <p className="font-medium text-slate-800 dark:text-white text-sm">{selectedAppointment.user_id?.phoneNumber || 'N/A'}</p>
                  </div>
                  <button className="size-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                    <span className="material-symbols-outlined text-lg">call</span>
                  </button>
                </div>

                {/* Private note */}
                <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-700/30 bg-amber-50/50 dark:bg-amber-900/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-amber-500 text-sm">lock</span>
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Private Notes</p>
                    {savingNote && <span className="ml-auto text-[10px] text-primary animate-pulse">Saving...</span>}
                  </div>
                  <textarea
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-white resize-none outline-none placeholder:text-slate-400"
                    rows={2}
                    placeholder="Add private note..."
                    value={doctorNotes[selectedAppointment._id] || ''}
                    onChange={e => handleNoteChange(selectedAppointment._id, e.target.value)}
                  />
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-2">
                {selectedAppointment.status === 'pending' ? (
                  <>
                    <button onClick={() => handleAction(selectedAppointment._id, 'cancel')} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#224449] text-slate-500 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[#1a2c2f] transition-colors">Reject</button>
                    <button onClick={() => handleAction(selectedAppointment._id, 'confirm')} className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-sm hover:bg-primary transition-colors">Confirm</button>
                  </>
                ) : selectedAppointment.status === 'scheduled' ? (
                  <>
                    <button onClick={() => handleAction(selectedAppointment._id, 'cancel')} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#224449] text-slate-500 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[#1a2c2f] transition-colors">Cancel</button>
                    <button onClick={() => handleAction(selectedAppointment._id, 'confirm')} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors">Confirm Arrival</button>
                  </>
                ) : selectedAppointment.status === 'confirmed' ? (
                  <>
                    <button onClick={() => handleAction(selectedAppointment._id, 'check-in')} className="flex-1 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-semibold text-sm border border-violet-200 dark:border-violet-700/40 transition-colors">Check-in</button>
                    <button onClick={() => { setShowDetailModal(false); openStartConsultation(selectedAppointment); }} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">Start Consultation</button>
                  </>
                ) : selectedAppointment.status === 'checked-in' ? (
                  <button onClick={() => { setShowDetailModal(false); openStartConsultation(selectedAppointment); }} className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">Start Consultation</button>
                ) : (
                  <button onClick={() => setShowDetailModal(false)} className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#1a2c2f] text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-[#224449] transition-colors">Close</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            START CONSULTATION MODAL
        ══════════════════════════════════════════════════════════════════ */}
        {showConsultModal && selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-[#102023] rounded-2xl shadow-2xl max-w-3xl w-full my-auto border border-slate-100 dark:border-[#1e3438]">

              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-[#1e3438]">
                <div className="flex items-center gap-3">
                  <Avatar avatarPath={selectedAppointment.user_id?.avatar} name={selectedAppointment.user_id?.name} size="md" />
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white">Start Consultation</h2>
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedAppointment.user_id?.name}</span>
                      {selectedAppointment.reason && <span> · {selectedAppointment.reason}</span>}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowConsultModal(false)} className="size-8 rounded-xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-[#224449] transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)] space-y-6">

                {/* Smart Prescription chips */}
                {(loadingPast || pastPrescriptions.length > 0) && (
                  <div className="bg-sky-50/70 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-sky-500 text-sm">history</span>
                      <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Previous prescriptions — click to reuse</p>
                    </div>
                    {loadingPast ? (
                      <div className="flex gap-2">
                        {[1,2,3].map(i => <div key={i} className="h-7 w-28 bg-sky-200/50 rounded-full animate-pulse" />)}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {pastPrescriptions.map(p => (
                          <button
                            key={p._id}
                            onClick={() => applyPastPrescription(p)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#102023] border border-sky-200 dark:border-sky-700/40 rounded-full text-xs hover:border-primary hover:bg-primary/5 transition-all group"
                          >
                            <span className="material-symbols-outlined text-xs text-sky-400 group-hover:text-primary">medication</span>
                            <span className="font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary">{p.diagnosis}</span>
                            <span className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Diagnosis */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="size-1.5 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Primary Diagnosis <span className="text-red-400">*</span></label>
                      <input
                        className="w-full rounded-xl border border-slate-200 dark:border-[#224449] bg-slate-50 dark:bg-[#1a2c2f] text-slate-800 dark:text-white px-3.5 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        placeholder="e.g. Acute Bronchitis"
                        value={consultForm.diagnosis}
                        onChange={e => setConsultForm(p => ({ ...p, diagnosis: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Severity</label>
                      <div className="relative">
                        <select
                          className="w-full rounded-xl border border-slate-200 dark:border-[#224449] bg-slate-50 dark:bg-[#1a2c2f] text-slate-800 dark:text-white px-3.5 py-3 appearance-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer text-sm font-medium transition-all"
                          value={consultForm.severity}
                          onChange={e => setConsultForm(p => ({ ...p, severity: e.target.value }))}
                        >
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                          <option value="critical">Critical</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">expand_more</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Clinical Notes</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 dark:border-[#224449] bg-slate-50 dark:bg-[#1a2c2f] text-slate-800 dark:text-white px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none transition-all"
                      rows={2}
                      placeholder="Observations, symptoms..."
                      value={consultForm.notes}
                      onChange={e => setConsultForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Treatment Plan */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="size-1.5 bg-emerald-500 rounded-full" />
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Treatment Plan</h3>
                  </div>

                  <div className="bg-slate-50/80 dark:bg-[#1a2c2f]/50 border border-slate-100 dark:border-[#224449] rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Plan Name</label>
                        <input
                          className="w-full rounded-xl border border-slate-200 dark:border-[#224449] bg-white dark:bg-[#102023] px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none font-medium transition-all"
                          placeholder="e.g. Antibiotic Course"
                          value={consultForm.initialStep.title}
                          onChange={e => setConsultForm(p => ({ ...p, initialStep: { ...p.initialStep, title: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Description</label>
                        <input
                          className="w-full rounded-xl border border-slate-200 dark:border-[#224449] bg-white dark:bg-[#102023] px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                          placeholder="Goal for this step"
                          value={consultForm.initialStep.description}
                          onChange={e => setConsultForm(p => ({ ...p, initialStep: { ...p.initialStep, description: e.target.value } }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Prescription</label>

                      {consultForm.initialStep.prescriptions.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-[#102023] border border-slate-200 dark:border-[#224449] rounded-xl p-4 relative shadow-sm">
                          {consultForm.initialStep.prescriptions.length > 1 && (
                            <button
                              onClick={() => removePrescription(index)}
                              className="absolute top-2.5 right-2.5 p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Medication {index + 1}</label>
                              <div className="relative">
                                <select
                                  className="w-full rounded-lg border border-slate-200 dark:border-[#224449] bg-slate-50 dark:bg-[#1a2c2f] px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer font-medium transition-all"
                                  value={item.medication}
                                  onChange={e => updatePrescription(index, 'medication', e.target.value)}
                                  disabled={loadingDrugs}
                                >
                                  <option value="">— Select medication —</option>
                                  {availableDrugs.map(drug => (
                                    <option key={drug._id} value={drug.name}>
                                      {drug.name}{drug.unit ? ` (${drug.unit})` : ''}{drug.stock != null ? ` · in stock ${drug.stock}` : ''}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  {loadingDrugs
                                    ? <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                                    : <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>}
                                </div>
                              </div>
                            </div>

                            {[
                              { field: 'dosage' as const,   label: 'Dosage', options: COMMON_DOSAGES },
                              { field: 'duration' as const, label: 'Duration',  options: COMMON_DURATIONS },
                            ].map(({ field, label, options }) => (
                              <div key={field}>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>
                                <div className="relative">
                                  <select
                                    className="w-full rounded-lg border border-slate-200 dark:border-[#224449] bg-slate-50 dark:bg-[#1a2c2f] px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer transition-all"
                                    value={(item as any)[field]}
                                    onChange={e => updatePrescription(index, field, e.target.value)}
                                  >
                                    <option value="">— Select —</option>
                                    {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
                                  </select>
                                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">expand_more</span>
                                </div>
                              </div>
                            ))}

                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Instructions</label>
                              <div className="relative">
                                <select
                                  className="w-full rounded-lg border border-slate-200 dark:border-[#224449] bg-slate-50 dark:bg-[#1a2c2f] px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer transition-all"
                                  value={item.instructions}
                                  onChange={e => updatePrescription(index, 'instructions', e.target.value)}
                                >
                                  <option value="">— Select instructions —</option>
                                  {COMMON_INSTRUCTIONS.map((o, i) => <option key={i} value={o}>{o}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">expand_more</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addPrescription}
                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-[#224449] rounded-xl text-slate-400 font-semibold text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        Add Medication
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 dark:border-[#1e3438] flex justify-end gap-2">
                <button onClick={() => setShowConsultModal(false)} className="px-5 py-2.5 rounded-xl text-slate-500 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-[#1a2c2f] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={submitConsultation}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">task_alt</span>
                  Complete & Save
                </button>
              </div>
            </div>
          </div>
        )}



      </div>
    </div>
  );
};

export default Appointments;