import React, { useEffect, useState } from 'react';
import { useRealTimeData } from '../context/RealTimeDataContext';
import { useNavigate } from 'react-router-dom';
import { Appointment } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, calculateAge, getInitials } from '../utils/api';

// Interfaces for local state
interface Drug {
  _id: string;
  name: string;
  category_id?: {
    _id: string;
    name: string;
  };
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

const COMMON_DOSAGES = [
  "1 tablet once daily",
  "1 tablet twice daily", 
  "1 tablet thrice daily",
  "2 tablets once daily",
  "2 tablets twice daily",
  "5ml once daily",
  "5ml twice daily",
  "10ml once daily",
  "1 pill as needed",
  "Apply thinly twice daily"
];

const COMMON_DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "1 month",
  "Chronic/Ongoing"
];

const COMMON_INSTRUCTIONS = [
  "Take after meals",
  "Take before meals",
  "Take on an empty stomach",
  "Take before bed",
  "Take with plenty of water",
  "Chew thoroughly",
  "Do not crush or chew",
  "Apply to affected area"
];

// Avatar Component đã sửa logic
const Avatar: React.FC<{ 
  avatarPath?: string; 
  name?: string; 
  size?: 'sm' | 'md' | 'lg' | 'xl'; 
  className?: string;
  rounded?: boolean;
}> = ({ 
  avatarPath, 
  name, 
  size = 'md',
  className = '',
  rounded = true
}) => {
  const sizeClasses = {
    sm: 'size-8',
    md: 'size-12',
    lg: 'size-16',
    xl: 'size-20'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl'
  };
  
  const avatarUrl = getAvatarUrl(avatarPath);
  const initials = getInitials(name);
  
  // Kiểm tra thực sự có avatar hay không (không phải default)
  const hasRealAvatar = avatarPath && 
    avatarPath !== 'undefined' && 
    avatarPath !== 'null' && 
    avatarPath.trim() !== '' &&
    !avatarUrl.includes('aida-public'); // Kiểm tra không phải default Google avatar
  
  const shapeClass = rounded ? 'rounded-full' : 'rounded-2xl';
  
  return (
    <div className={`${sizeClasses[size]} ${shapeClass} overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}>
      {hasRealAvatar ? (
        <div 
          className="size-full bg-cover bg-center"
          style={{ backgroundImage: `url('${avatarUrl}')` }}
        />
      ) : (
        <div className="size-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30">
          <span className={`${textSizes[size]} font-bold text-blue-600 dark:text-blue-400`}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
};

const Appointments: React.FC = () => {
  const { notifications } = useRealTimeData() || { notifications: [] };
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Appointment['status'] | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // New state for Date Filtering
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [actionLoading, setActionLoading] = useState<string>('');

  // Drug Inventory State
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [loadingDrugs, setLoadingDrugs] = useState(false);

  // Modal & Form States
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  const [consultForm, setConsultForm] = useState({
    diagnosis: '',
    severity: 'mild',
    notes: '',
    initialStep: {
      title: 'Initial Prescription',
      description: 'Begin medication course immediately',
      prescriptions: [] as PrescriptionItem[] 
    }
  });

  const doctorId = getDoctorId();

  const fetchAppointments = async () => {
    if (!doctorId) {
      console.error('No doctor ID found');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching appointments for doctor:', doctorId);
      
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Appointments API response:', data);
      
      if (data.success) {
        setAppointments(data.data || []);
      } else {
        console.error('Failed to fetch appointments:', data.message);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrugs = async () => {
    try {
      setLoadingDrugs(true);
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_BASE_URL}/doctors/drugs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAvailableDrugs(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching drugs:", error);
    } finally {
      setLoadingDrugs(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDrugs();
  }, [doctorId]);

  // Refetch appointments on relevant real-time notifications
  useEffect(() => {
    if (notifications.some(n => n.type === 'appointment')) {
      fetchAppointments();
    }
  }, [notifications]);

  const handleAction = async (id: string, action: 'confirm' | 'cancel' | 'complete') => {
    if (!doctorId) {
      alert('Doctor ID not found. Please log in again.');
      return;
    }
    
    try {
      setActionLoading(id);
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_BASE_URL}/doctors/appointments/${id}/${action}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ doctorId })
      });
      
      const data = await response.json();
      if (data.success) {
        if (action === 'complete') {
          setShowConsultModal(false);
        }
        await fetchAppointments(); 
      } else {
        alert(`Failed to ${action} appointment. Please try again.`);
      }
    } catch (error) {
      console.error(`Error ${action} appointment:`, error);
      alert('An error occurred. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  const openStartConsultation = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setConsultForm({
      diagnosis: '',
      severity: 'mild',
      notes: '',
      initialStep: {
        title: 'Initial Prescription',
        description: 'Begin medication course immediately',
        prescriptions: [{
          medication: '',
          dosage: '',
          duration: '',
          instructions: ''
        }]
      }
    });
    setShowConsultModal(true);
  };

  const openAppointmentDetails = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setShowDetailModal(true);
  };

  const addPrescription = () => {
    setConsultForm(prev => ({
      ...prev,
      initialStep: {
        ...prev.initialStep,
        prescriptions: [
          ...prev.initialStep.prescriptions,
          { medication: '', dosage: '', duration: '', instructions: '' }
        ]
      }
    }));
  };

  const removePrescription = (index: number) => {
    if (consultForm.initialStep.prescriptions.length > 1) {
      setConsultForm(prev => ({
        ...prev,
        initialStep: {
          ...prev.initialStep,
          prescriptions: prev.initialStep.prescriptions.filter((_, i) => i !== index)
        }
      }));
    }
  };

  const updatePrescription = (index: number, field: keyof PrescriptionItem, value: string) => {
    setConsultForm(prev => {
      const newPrescriptions = [...prev.initialStep.prescriptions];
      newPrescriptions[index] = {
        ...newPrescriptions[index],
        [field]: value
      };
      
      let newTitle = prev.initialStep.title;
      if (index === 0 && field === 'medication' && prev.initialStep.title === 'Initial Prescription' && value) {
        newTitle = `Prescribe ${value}`;
      }

      return {
        ...prev,
        initialStep: {
          ...prev.initialStep,
          title: newTitle,
          prescriptions: newPrescriptions
        }
      };
    });
  };

  const submitConsultation = async () => {
    if (!selectedAppointment || !doctorId) {
      alert('Missing appointment or doctor ID');
      return;
    }
    
    if (!consultForm.diagnosis.trim()) {
      alert('Please enter a diagnosis');
      return;
    }

    const hasInvalidPrescription = consultForm.initialStep.prescriptions.some(p => !p.medication || !p.dosage);
    if (hasInvalidPrescription) {
      alert('Please select medication and dosage for all prescription items.');
      return;
    }

    try {
      const prescriptions = consultForm.initialStep.prescriptions;
      
      const combinedMedication = prescriptions.map(p => p.medication).join(' + ');
      const combinedDosage = prescriptions.map(p => p.dosage ? `${p.medication}: ${p.dosage}` : '').filter(Boolean).join(' | ');
      const combinedDuration = prescriptions.map(p => p.duration ? `${p.medication}: ${p.duration}` : '').filter(Boolean).join(' | ');
      const combinedInstructions = prescriptions.map(p => p.instructions ? `${p.medication}: ${p.instructions}` : '').filter(Boolean).join(' | ');

      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_BASE_URL}/doctors/consultations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointment_id: selectedAppointment._id,
          patient_id: selectedAppointment.user_id?._id,
          doctor_id: doctorId,
          diagnosis: consultForm.diagnosis,
          severity: consultForm.severity,
          notes: consultForm.notes,
          initialStep: {
            title: consultForm.initialStep.title,
            description: consultForm.initialStep.description,
            medication: combinedMedication,
            dosage: combinedDosage,
            duration: combinedDuration,
            instructions: combinedInstructions
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        await handleAction(selectedAppointment._id, 'complete');
        setShowConsultModal(false);
        if (data.data && data.data._id) {
           navigate(`/consultations/${data.data._id}`);
        }
      } else {
        alert('Failed to start consultation: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating consultation:', error);
      alert('Error starting consultation. Please check your connection.');
    }
  };

  // --- Filtering Logic ---
  const filteredAppointments = appointments.filter(app => {
    // 1. Status Filter
    const statusMatch = filter === 'all' ? true : app.status === filter;

    // 2. Date Filter
    if (!selectedDate) return statusMatch;

    const appDate = new Date(app.appointment_date);
    const dateMatch = appDate.getDate() === selectedDate.getDate() &&
                      appDate.getMonth() === selectedDate.getMonth() &&
                      appDate.getFullYear() === selectedDate.getFullYear();
    
    return statusMatch && dateMatch;
  });

  // Sorting: Pending first, then by date
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
  });

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDateClick = (day: number) => {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      
      // If clicking the already selected date, deselect it (toggle)
      if (selectedDate && 
          newDate.getDate() === selectedDate.getDate() && 
          newDate.getMonth() === selectedDate.getMonth() && 
          newDate.getFullYear() === selectedDate.getFullYear()) {
          setSelectedDate(null);
      } else {
          setSelectedDate(newDate);
      }
  };

  const hasAppointmentOnDay = (day: number) => {
    return appointments.some(app => {
      const appDate = new Date(app.appointment_date);
      return appDate.getDate() === day && 
             appDate.getMonth() === currentDate.getMonth() && 
             appDate.getFullYear() === currentDate.getFullYear() &&
             app.status !== 'cancelled';
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  // Helper to check if a specific day is the currently selected date
  const isSelected = (day: number) => {
    return selectedDate && 
           day === selectedDate.getDate() && 
           currentDate.getMonth() === selectedDate.getMonth() &&
           currentDate.getFullYear() === selectedDate.getFullYear();
  };

  const formatAppointmentDate = (dateString: string) => {
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
    } catch {
        return dateString;
    }
  };

  // Debug: Log appointments data
  useEffect(() => {
    if (appointments.length > 0) {
      console.log('Appointments loaded:', appointments.map(app => ({
        id: app._id,
        patient: app.user_id?.name,
        avatar: app.user_id?.avatar,
        status: app.status,
        date: app.appointment_date
      })));
    }
  }, [appointments]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-[#0b1619]">
      
      {/* Top Header & Stats */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Schedule Overview</h1>
            {selectedDate && (
                <button 
                    onClick={() => setSelectedDate(null)}
                    className="text-sm font-bold text-primary hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                    Clear Date Filter ({selectedDate.toLocaleDateString()})
                </button>
            )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Appointments', value: stats.total, icon: 'calendar_month', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Pending Requests', value: stats.pending, icon: 'hourglass_top', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Confirmed', value: stats.confirmed, icon: 'check_circle', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Completed', value: stats.completed, icon: 'task_alt', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-[#102023] p-5 rounded-2xl border border-gray-100 dark:border-[#224449] shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar: Calendar & Tools (4 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-6 sticky top-8">
          
          {/* Calendar Widget */}
          <div className="bg-white dark:bg-[#102023] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-[#224449]">
            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-900 dark:text-white font-bold">{monthName} {year}</span>
              <div className="flex gap-1">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#1a2c2f] rounded-lg text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#1a2c2f] rounded-lg text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center mb-3">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                <div key={day} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 py-1 uppercase">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 text-center gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isCurrent = isToday(day);
                const isDaySelected = isSelected(day);
                const hasEvent = hasAppointmentOnDay(day);
                
                return (
                  <div 
                    key={day} 
                    onClick={() => handleDateClick(day)}
                    className="flex flex-col items-center justify-center relative cursor-pointer group aspect-square"
                  >
                    <span 
                      className={`
                        size-8 flex items-center justify-center text-sm rounded-xl transition-all font-medium
                        ${isDaySelected
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-lg scale-110' 
                            : isCurrent 
                                ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a2c2f]'
                        }
                      `}
                    >
                      {day}
                    </span>
                    {hasEvent && !isCurrent && !isDaySelected && (
                      <span className="absolute bottom-1 size-1 rounded-full bg-primary"></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Search */}
          <div className="bg-white dark:bg-[#102023] p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-[#224449]">
            <div className="relative">
               <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400">search</span>
               <input 
                  className="w-full bg-transparent border-none rounded-xl py-3.5 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0"
                  placeholder="Find patient..."
               />
            </div>
          </div>
        </div>

        {/* Main Content: Timeline Feed (8 cols) */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
             {['pending', 'confirmed', 'completed', 'cancelled', 'all'].map(status => (
                <button 
                    key={status} 
                    onClick={() => setFilter(status as any)}
                    className={`
                      px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border
                      ${filter === status 
                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white shadow-lg' 
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-[#102023] dark:text-gray-400 dark:border-[#224449]'}
                    `}
                >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {status === 'pending' && stats.pending > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{stats.pending}</span>
                    )}
                </button>
            ))}
          </div>

          {/* Timeline List */}
          <div className="bg-white dark:bg-[#102023] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-[#224449] min-h-[500px]">
            {loading ? (
                <div className="py-20 text-center">
                  <div className="spinner border-4 border-primary border-t-transparent rounded-full w-12 h-12 mx-auto mb-4 animate-spin"></div>
                  <p className="text-gray-500">Loading schedule...</p>
                </div>
            ) : sortedAppointments.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <span className="material-symbols-outlined text-6xl mb-4">calendar_today</span>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">No appointments found</p>
                    {selectedDate && <p className="text-sm text-gray-500">for {selectedDate.toLocaleDateString()}</p>}
                </div>
            ) : (
                <div className="space-y-0">
                    {sortedAppointments.map((app, index) => {
                      return (
                        <div key={app._id} className="relative pl-8 pb-8 last:pb-0 border-l-2 border-dashed border-gray-200 dark:border-[#224449] group">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[9px] top-0 size-4 rounded-full border-4 border-white dark:border-[#102023] transition-colors ${
                                app.status === 'confirmed' ? 'bg-primary' : 
                                app.status === 'completed' ? 'bg-green-500' :
                                app.status === 'pending' ? 'bg-yellow-400' : 'bg-gray-300'
                            }`}></div>

                            {/* Card */}
                            <div className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#1a2c2f] transition-colors -mt-2">
                                {/* Time Column */}
                                <div className="min-w-[100px] md:text-right">
                                    <p className="font-bold text-lg text-gray-900 dark:text-white">{app.time_slot}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase">{formatAppointmentDate(app.appointment_date)}</p>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
                                    
                                    {/* Patient Info */}
                                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => openAppointmentDetails(app)}>
                                    <Avatar 
                                      avatarPath={app.user_id?.avatar}
                                      name={app.user_id?.name}
                                      size="md"
                                    />
                                    <div>
                                      <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-primary transition-colors">
                                        {app.user_id?.name || 'Unknown Patient'}
                                      </h3>
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span className="bg-gray-100 dark:bg-[#224449] px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                          {app.reason || 'Consultation'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                                        
                                        {app.status === 'pending' && (
                                            <>
                                                <button 
                                                    onClick={() => handleAction(app._id, 'confirm')}
                                                    disabled={actionLoading === app._id}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-primary hover:border-primary transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                                                >
                                                    {actionLoading === app._id ? (
                                                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-black"></span>
                                                    ) : 'Confirm'}
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(app._id, 'cancel')}
                                                    disabled={actionLoading === app._id}
                                                    className="size-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#224449] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </>
                                        )}

                                        {app.status === 'confirmed' && (
                                            <button 
                                                onClick={() => openStartConsultation(app)}
                                                className="flex-1 md:flex-none px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/30 flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">stethoscope</span>
                                                <span>Start</span>
                                            </button>
                                        )}

                                        {app.status === 'completed' && (
                                            <span className="flex items-center gap-1 text-green-600 font-bold text-sm bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
                                                <span className="material-symbols-outlined text-sm">check</span> Completed
                                            </span>
                                        )}

                                        {app.status === 'cancelled' && (
                                            <span className="text-gray-400 font-medium text-sm px-3 py-1.5">Cancelled</span>
                                        )}
                                        
                                        <button 
                                            onClick={() => openAppointmentDetails(app)}
                                            className="size-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-[#224449] transition-all"
                                        >
                                            <span className="material-symbols-outlined text-xl">more_vert</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                      );
                    })}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white dark:bg-[#102023] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-[#224449]">
              {/* Modal Header Image */}
                <div className="p-6 pb-0 flex justify-between items-start">
                  <Avatar 
                    avatarPath={selectedAppointment.user_id?.avatar}
                    name={selectedAppointment.user_id?.name}
                    size="xl"
                    className="rounded-2xl"
                    rounded={false}
                  />
                  <button onClick={() => setShowDetailModal(false)} className="size-8 rounded-full bg-gray-100 dark:bg-[#1a2c2f] flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              <div className="p-6">
                 <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-1">{selectedAppointment.user_id?.name || 'Unknown'}</h2>
                 <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    {selectedAppointment.user_id?.gender} • {calculateAge(selectedAppointment.user_id?.dateOfBirth)} years old
                 </p>
                 
                 <div className="space-y-4">
                    <div className="flex gap-4 p-4 bg-gray-50 dark:bg-[#1a2c2f] rounded-2xl">
                        <div className="p-2 bg-white dark:bg-[#102023] rounded-xl text-primary h-fit">
                            <span className="material-symbols-outlined">calendar_month</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Appointment</p>
                            <p className="font-bold text-gray-900 dark:text-white">
                                {formatAppointmentDate(selectedAppointment.appointment_date)} at {selectedAppointment.time_slot}
                            </p>
                            <p className="text-sm text-gray-500">{selectedAppointment.reason}</p>
                        </div>
                    </div>
                    
                    {selectedAppointment.notes && (
                         <div className="p-4 rounded-2xl border border-gray-100 dark:border-[#224449]">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Notes from Patient</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedAppointment.notes}"</p>
                        </div>
                    )}

                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-[#224449] flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Contact</p>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedAppointment.user_id?.phoneNumber || 'N/A'}</p>
                        </div>
                        <button className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors">
                            <span className="material-symbols-outlined">call</span>
                        </button>
                    </div>
                 </div>
              </div>
              
              <div className="p-6 pt-0 flex gap-3">
                 {selectedAppointment.status === 'pending' ? (
                    <>
                         <button onClick={() => handleAction(selectedAppointment._id, 'cancel')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Decline</button>
                         <button onClick={() => handleAction(selectedAppointment._id, 'confirm')} className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors">Confirm</button>
                    </>
                 ) : selectedAppointment.status === 'confirmed' ? (
                     <button onClick={() => { setShowDetailModal(false); openStartConsultation(selectedAppointment); }} className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/30">Start Consultation</button>
                 ) : (
                    <button onClick={() => setShowDetailModal(false)} className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors">Close</button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Start Consultation Modal */}
      {showConsultModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
           <div className="bg-white dark:bg-[#102023] rounded-3xl shadow-2xl max-w-4xl w-full my-auto flex flex-col animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-[#224449]">
              {/* Modal Header */}
              <div className="flex justify-between items-start p-8 border-b border-gray-100 dark:border-[#224449]">
                 <div>
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Start Consultation</h2>
                     <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Patient: <span className="text-gray-900 dark:text-white font-bold">{selectedAppointment.user_id?.name}</span>
                     </p>
                 </div>
                 <button onClick={() => setShowConsultModal(false)} className="size-10 rounded-xl bg-gray-50 dark:bg-[#1a2c2f] flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-8 overflow-y-auto max-h-[calc(100vh-200px)]">
                 {/* Diagnosis Section */}
                 <div className="mb-8">
                     <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="size-2 bg-primary rounded-full"></span> Diagnosis
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Primary Diagnosis <span className="text-red-500">*</span></label>
                            <input 
                                className="w-full rounded-xl border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] text-gray-900 dark:text-white p-4 font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="e.g. Acute Bronchitis"
                                value={consultForm.diagnosis}
                                onChange={(e) => setConsultForm({...consultForm, diagnosis: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Severity</label>
                            <div className="relative">
                                <select 
                                    className="w-full rounded-xl border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] text-gray-900 dark:text-white p-4 pr-10 appearance-none focus:ring-2 focus:ring-primary outline-none cursor-pointer font-medium"
                                    value={consultForm.severity}
                                    onChange={(e) => setConsultForm({...consultForm, severity: e.target.value})}
                                >
                                    <option value="mild">Mild</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="severe">Severe</option>
                                    <option value="critical">Critical</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-4 text-gray-500 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Clinical Notes</label>
                        <textarea 
                            className="w-full rounded-xl border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] text-gray-900 dark:text-white p-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                            rows={3}
                            placeholder="Observations, symptoms, etc..."
                            value={consultForm.notes}
                            onChange={(e) => setConsultForm({...consultForm, notes: e.target.value})}
                        />
                     </div>
                 </div>
                
                 {/* Treatment Plan Section */}
                 <div>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="size-2 bg-green-500 rounded-full"></span> Treatment Plan
                        </h3>
                     </div>
                     
                     <div className="bg-gray-50/50 dark:bg-[#1a2c2f]/50 border border-gray-100 dark:border-[#224449] rounded-2xl p-6">
                         <div className="space-y-4 mb-8">
                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Plan Title</label>
                                <input 
                                    className="w-full rounded-xl border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023] p-3 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                                    placeholder="e.g. Antibiotic Therapy"
                                    value={consultForm.initialStep.title}
                                    onChange={(e) => setConsultForm({...consultForm, initialStep: {...consultForm.initialStep, title: e.target.value}})}
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Description</label>
                                <input 
                                    className="w-full rounded-xl border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023] p-3 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="Brief description of the goal for this step"
                                    value={consultForm.initialStep.description}
                                    onChange={(e) => setConsultForm({...consultForm, initialStep: {...consultForm.initialStep, description: e.target.value}})}
                                />
                             </div>
                         </div>

                         {/* List of Medications */}
                         <div className="space-y-4">
                           <label className="block text-xs font-bold text-gray-400 uppercase">Prescriptions</label>
                           
                           {consultForm.initialStep.prescriptions.map((item, index) => (
                             <div key={index} className="bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] rounded-2xl p-4 relative group shadow-sm">
                               {consultForm.initialStep.prescriptions.length > 1 && (
                                 <button 
                                   onClick={() => removePrescription(index)}
                                   className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                   title="Remove Drug"
                                 >
                                   <span className="material-symbols-outlined text-sm">delete</span>
                                 </button>
                               )}

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Medication Dropdown */}
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Medication {index + 1}</label>
                                      <div className="relative">
                                        <select 
                                            className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer font-medium"
                                            value={item.medication}
                                            onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                                            disabled={loadingDrugs}
                                        >
                                            <option value="">-- Select Medication --</option>
                                            {availableDrugs.map(drug => (
                                              <option key={drug._id} value={drug.name}>
                                                {drug.name} {drug.unit ? `(${drug.unit})` : ''} {drug.stock ? `- ${drug.stock} left` : ''}
                                              </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-3 pointer-events-none">
                                          {loadingDrugs ? (
                                            <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin block"></span>
                                          ) : (
                                            <span className="material-symbols-outlined text-gray-500 text-sm">expand_more</span>
                                          )}
                                        </div>
                                      </div>
                                  </div>

                                  {/* Dosage Options */}
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dosage</label>
                                      <div className="relative">
                                        <select 
                                            className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                                            value={item.dosage}
                                            onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                                        >
                                            <option value="">-- Select Dosage --</option>
                                            {COMMON_DOSAGES.map((dose, idx) => (
                                              <option key={idx} value={dose}>{dose}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-3 text-gray-500 pointer-events-none text-sm">expand_more</span>
                                      </div>
                                  </div>

                                  {/* Duration Options */}
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duration</label>
                                      <div className="relative">
                                          <select 
                                              className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                                              value={item.duration}
                                              onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                                          >
                                              <option value="">-- Select Duration --</option>
                                              {COMMON_DURATIONS.map((dur, idx) => (
                                                <option key={idx} value={dur}>{dur}</option>
                                              ))}
                                          </select>
                                          <span className="material-symbols-outlined absolute right-3 top-3 text-gray-500 pointer-events-none text-sm">expand_more</span>
                                      </div>
                                  </div>

                                  {/* Instructions Options */}
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Instructions</label>
                                      <div className="relative">
                                        <select 
                                            className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                                            value={item.instructions}
                                            onChange={(e) => updatePrescription(index, 'instructions', e.target.value)}
                                        >
                                            <option value="">-- Select Instructions --</option>
                                            {COMMON_INSTRUCTIONS.map((inst, idx) => (
                                              <option key={idx} value={inst}>{inst}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-3 text-gray-500 pointer-events-none text-sm">expand_more</span>
                                      </div>
                                  </div>
                               </div>
                             </div>
                           ))}

                           <button 
                              onClick={addPrescription}
                              className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-[#224449] rounded-2xl text-gray-500 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                           >
                              <span className="material-symbols-outlined">add_circle</span>
                              Add Medication
                           </button>
                         </div>
                     </div>
                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-[#224449] bg-white dark:bg-[#102023] flex justify-end gap-4 rounded-b-3xl">
                 <button 
                    onClick={() => setShowConsultModal(false)} 
                    className="px-6 py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={submitConsultation} 
                    className="px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all transform active:scale-95"
                 >
                    Start Treatment
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Appointments;