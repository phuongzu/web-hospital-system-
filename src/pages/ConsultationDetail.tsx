import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Consultation, TreatmentStep } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, calculateAge } from '../utils/api';

// ==================== CONSTANTS ====================

const DOSAGE_OPTIONS = [
  "1 tablet", "2 tablets", "3 tablets", 
  "1 capsule", "2 capsules", 
  "5ml", "10ml", "15ml", 
  "1 sachet", "1 vial",
  "Apply thinly", "Apply generously", 
  "1 drop", "2 drops", "3 drops",
  "1 puff", "2 puffs"
];

const DURATION_OPTIONS = [
  "1 day", "2 days", "3 days", "5 days", "7 days", 
  "10 days", "14 days", "21 days", "1 month", "2 months",
  "Until finished", "Ongoing", "One time"
];

const INSTRUCTION_OPTIONS = [
  "After meals", "Before meals", "With food", 
  "On empty stomach", "Before sleep", 
  "In the morning", "Morning and Evening", 
  "Once daily", "Twice daily", "Three times daily", "Four times daily", 
  "Every 4 hours", "Every 6 hours", "Every 8 hours", 
  "As needed", "For pain", "For fever", "If symptoms persist"
];

// ==================== INTERFACES ====================

interface Drug {
  _id: string;
  name: string;
  unit?: string;
}

interface PrescriptionItem {
  medication: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface LocalTreatmentStep {
  _id?: string;
  stepNumber: number;
  title: string;
  description: string;
  medication?: string;
  dosage?: string;
  duration?: string;
  instructions?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'confirmed' | 'approved' | 'rejected' | 'scheduled';
  completedAt?: string | Date;
  approvedAt?: string | Date;
  startedAt?: string | Date;
  condition_description?: string;
  patient_message?: string;
  patientMessage?: string;
  doctorNotes?: string;
  approval_requested?: boolean;
  approval_requested_at?: Date | string;
  requires_followup?: boolean;
  followup_reason?: string;
  isPhysicalVisit?: boolean;
  reExaminationScheduled?: boolean;
  reExaminationDate?: Date;
  reExaminationAppointmentId?: string;
  arrivalConfirmed?: boolean;
  arrivalConfirmedAt?: Date;
  reExaminationNotes?: string;
  reExaminationTime?: string;
  isReExaminationVisit?: boolean;
  needsReExamination?: boolean;
  rejectionReason?: string;
  rejectedAt?: Date | string;
}

// ==================== UI COMPONENTS ====================

// Status Badge with standardized colors
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: '⏳', label: 'Pending' },
    'in-progress': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: '⚡', label: 'In Progress' },
    'scheduled': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', icon: '📅', label: 'Scheduled' },
    'completed': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', icon: '✓', label: 'Awaiting Review' },
    'approved': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: '✓✓', label: 'Approved' },
    'confirmed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: '✓', label: 'Confirmed' },
    'rejected': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: '✕', label: 'Rejected' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.border} border shadow-sm`}>
      <span className="text-[10px]">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

// Physical Visit Badge
const PhysicalVisitBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
    <span className="text-[10px]">🏥</span>
    <span>Physical Visit</span>
  </span>
);

// Appointment Status Badge
const AppointmentStatusBadge: React.FC<{ 
  appointmentId: string; 
  status: string;
  arrivalConfirmed?: boolean;
}> = ({ appointmentId, status, arrivalConfirmed }) => {
  const statusConfig = {
    'pending': { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Pending' },
    'scheduled': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' },
    'confirmed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
    'completed': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Completed' },
    'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} border border-transparent`}>
      <span>{config.label}</span>
      {arrivalConfirmed && (
        <span className="ml-1 pl-1.5 border-l border-current flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          <span>Arrived</span>
        </span>
      )}
    </span>
  );
};

// Patient Info Card
const PatientInfoCard: React.FC<{ consultation: Consultation | null }> = ({ consultation }) => {
  if (!consultation) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {consultation.user_id.avatar ? (
              <img 
                src={getAvatarUrl(consultation.user_id.avatar)} 
                alt="Patient"
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-3xl border-4 border-white shadow-md">
                {consultation.user_id.name.charAt(0)}
              </div>
            )}
            <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white shadow-sm ${
              consultation.priority === 'urgent' ? 'bg-red-500' : 'bg-emerald-500'
            }`} />
          </div>
          
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 truncate">{consultation.user_id.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <span className="font-medium px-2 py-0.5 bg-slate-200 rounded text-slate-700">{consultation.user_id.gender}</span>
              <span>•</span>
              <span>{calculateAge(consultation.user_id.dateOfBirth)} years old</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Diagnosis</h3>
          <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
            <p className="text-base font-medium text-slate-800">
              {consultation.diagnosis || 'Pending diagnosis'}
            </p>
          </div>
        </div>

        {consultation.next_appointment && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Next Appointment</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                📅
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(consultation.next_appointment).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(consultation.next_appointment).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500 block mb-1">Priority</span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold capitalize ${
                consultation.priority === 'urgent' ? 'text-red-600' : 'text-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${consultation.priority === 'urgent' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                {consultation.priority}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500 block mb-1">Created</span>
              <span className="text-sm font-semibold text-slate-700">
                {new Date(consultation.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-Examination Info Card
const ReExaminationInfo: React.FC<{ step: LocalTreatmentStep }> = ({ step }) => {
  if (!step.reExaminationScheduled || !step.reExaminationDate) return null;

  const appointmentDate = new Date(step.reExaminationDate);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isPast = appointmentDate < new Date();
  
  let statusColor = 'border-slate-200 bg-white';
  let iconColor = 'bg-slate-100 text-slate-500';
  let title = "Scheduled Re-Examination";
  
  if (step.status === 'completed') {
    statusColor = 'border-emerald-200 bg-emerald-50';
    iconColor = 'bg-emerald-100 text-emerald-600';
    title = "Physical Visit Completed";
  } else if (step.status === 'in-progress' && step.arrivalConfirmed) {
    statusColor = 'border-blue-200 bg-blue-50';
    iconColor = 'bg-blue-100 text-blue-600';
    title = "Visit In Progress";
  } else if (isToday && !step.arrivalConfirmed) {
    statusColor = 'border-amber-200 bg-amber-50';
    iconColor = 'bg-amber-100 text-amber-600';
    title = "Appointment Today";
  } else if (isPast && !step.arrivalConfirmed) {
    statusColor = 'border-red-200 bg-red-50';
    iconColor = 'bg-red-100 text-red-600';
    title = "Missed Appointment";
  }

  return (
    <div className={`mt-4 rounded-lg border ${statusColor} p-4 transition-colors`}>
      <div className="flex gap-4">
        <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-xl shadow-sm ${iconColor}`}>
          {step.status === 'completed' ? '✓' : '🏥'}
        </div>
        
        <div className="flex-1">
          <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-4 text-center">📅</span>
              <span className="font-medium">
                {appointmentDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-4 text-center">⏰</span>
              <span className="font-medium">
                {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {step.reExaminationTime && (
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-4 text-center">⏱</span>
                <span>Slot: {step.reExaminationTime}</span>
              </div>
            )}
          </div>

          {step.arrivalConfirmed && step.arrivalConfirmedAt && (
            <div className="mt-3 pt-2 border-t border-black/5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">
                Arrived at {new Date(step.arrivalConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {step.doctorNotes && step.status === 'completed' && (
             <div className="mt-3 bg-white/60 p-2 rounded text-sm text-slate-600 italic">
               "{step.doctorNotes}"
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Prescription Item
const PrescriptionCard: React.FC<{ 
  prescription: { name: string; dosage: string; duration: string; instructions?: string };
}> = ({ prescription }) => {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/80">
      <div className="shrink-0 w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
        💊
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="font-bold text-slate-800 text-sm">{prescription.name}</h5>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">{prescription.dosage}</span>
          <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">{prescription.duration}</span>
        </div>
        {prescription.instructions && (
          <p className="mt-1.5 text-xs text-slate-500 italic">"{prescription.instructions}"</p>
        )}
      </div>
    </div>
  );
};

// Patient Report Component
const PatientReportCard: React.FC<{ step: LocalTreatmentStep }> = ({ step }) => {
  if (!step.condition_description && !step.patient_message) return null;

  return (
    <div className="mt-4 bg-amber-50 rounded-lg border border-amber-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600">💬</span>
        <h5 className="font-bold text-amber-900 text-sm">Patient Report</h5>
      </div>
      <div className="space-y-2 text-sm text-amber-900/80">
        {step.condition_description && <p className="italic">"{step.condition_description}"</p>}
        {step.patient_message && <p className="font-medium">- {step.patient_message}</p>}
      </div>
    </div>
  );
};

// Doctor Notes Component
const DoctorNotesCard: React.FC<{ step: TreatmentStep }> = ({ step }) => {
  if (!step.doctorNotes) return null;

  return (
    <div className="mt-4 bg-slate-50 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">👨‍⚕️</span>
          <h5 className="font-bold text-slate-800 text-sm">Doctor's Notes</h5>
        </div>
        {step.approvedAt && (
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            {new Date(step.approvedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{step.doctorNotes}</p>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const ConsultationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State management
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [showStepModal, setShowStepModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteReExaminationModal, setShowCompleteReExaminationModal] = useState(false);
  const [showCompleteVisitModal, setShowCompleteVisitModal] = useState(false);
  
  // Data states
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [appointmentStatuses, setAppointmentStatuses] = useState<Record<string, string>>({});
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  
  // Working states
  const [editingStepNumber, setEditingStepNumber] = useState<number | null>(null);
  const [reviewingStepNumber, setReviewingStepNumber] = useState<number | null>(null);
  const [schedulingStepNumber, setSchedulingStepNumber] = useState<number | null>(null);
  const [completingStepNumber, setCompletingStepNumber] = useState<number | null>(null);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
  const [customInputModes, setCustomInputModes] = useState<Record<string, boolean>>({});

  // Form states
  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    prescriptions: [] as PrescriptionItem[],
    isPhysicalVisit: false
  });

  const [reviewForm, setReviewForm] = useState({
    decision: 'approve_with_followup' as 'approve_with_followup' | 'approve_and_complete',
    doctorNotes: '',
    requireFollowUp: true,
    nextAppointmentDate: '',
    nextAppointmentTime: '09:00',
    followUpInstructions: '',
    additionalStepTitle: '',
    additionalStepDescription: ''
  });

  const [reExaminationForm, setReExaminationForm] = useState({
    date: '',
    time: '',
    notes: '',
    duration: '30'
  });

  const [completeReExaminationForm, setCompleteReExaminationForm] = useState({
    doctorNotes: ''
  });

  const [completeVisitForm, setCompleteVisitForm] = useState({
    doctorNotes: ''
  });

  const doctorId = getDoctorId();

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleCustomMode = (index: number, field: string, isCustom: boolean) => {
    setCustomInputModes(prev => ({
      ...prev,
      [`${index}-${field}`]: isCustom
    }));
  };

  // Fetch functions
  const fetchConsultation = useCallback(async () => {
    if (!doctorId || !id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations`);
      const data = await response.json();
      if (data.success) {
        const found = (data.data as Consultation[]).find(c => c._id === id);
        if (found) {
          if (found.treatment_plan) {
            found.treatment_plan.sort((a, b) => a.stepNumber - b.stepNumber);
          }
          setConsultation(found);
          await fetchAppointmentStatuses(found);
        } else {
          setError('Consultation not found.');
        }
      }
    } catch (e) {
      setError('Failed to load consultation.');
    } finally {
      setLoading(false);
    }
  }, [doctorId, id]);

  const fetchAppointmentStatuses = async (consultationData: Consultation) => {
    const statusMap: Record<string, string> = {};
    const appointmentIds = consultationData.treatment_plan
      .map(step => (step as LocalTreatmentStep).reExaminationAppointmentId)
      .filter(id => id) as string[];
    
    if (appointmentIds.length > 0) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${API_BASE_URL}/appointments/batch-status?ids=${appointmentIds.join(',')}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            data.data.forEach((appointment: any) => {
              statusMap[appointment._id] = appointment.status;
            });
            setAppointmentStatuses(statusMap);
          }
        }
      } catch (error) {
        console.error('Error fetching appointment statuses:', error);
      }
    }
  };

  const fetchDrugs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/drugs`);
      const data = await response.json();
      if (data.success) setAvailableDrugs(data.data || []);
    } catch (error) {
      console.error('Failed to load drugs:', error);
    }
  }, []);

  const fetchAvailableTimeSlots = useCallback(async (date: string) => {
    setLoadingTimeSlots(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/doctors/appointments/available-slots?date=${date}&doctorId=${doctorId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setAvailableTimeSlots(data.data || []);
      } else {
        setAvailableTimeSlots([]);
        showToast(data.message || 'No available time slots', 'error');
      }
    } catch (error) {
      setAvailableTimeSlots([]);
      showToast('Failed to load time slots', 'error');
    } finally {
      setLoadingTimeSlots(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchConsultation();
    fetchDrugs();
  }, [fetchConsultation, fetchDrugs]);

  useEffect(() => {
    if (reExaminationForm.date) {
      fetchAvailableTimeSlots(reExaminationForm.date);
    }
  }, [reExaminationForm.date, fetchAvailableTimeSlots]);

  // Handler functions
  const handleSubmitReview = async () => {
    const stepToReview = reviewingStepNumber;
    if (!id || !stepToReview) return;
    
    setIsSubmitting(true);
    try {
      const combinedDateTime = reviewForm.nextAppointmentDate 
        ? `${reviewForm.nextAppointmentDate}T${reviewForm.nextAppointmentTime || '09:00'}:00` 
        : null;

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${stepToReview}/review`, 
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...reviewForm,
            nextAppointmentDate: combinedDateTime,
            completeConsultation: reviewForm.decision === 'approve_and_complete'
          })
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setShowReviewModal(false);
        fetchConsultation();
        showToast('Treatment step approved successfully');
      } else {
        showToast(data.message || 'Failed to approve step', 'error');
      }
    } catch (error) {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleReExamination = (step: LocalTreatmentStep) => {
    setSchedulingStepNumber(step.stepNumber);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReExaminationForm({
      date: tomorrow.toISOString().split('T')[0],
      time: '09:00',
      notes: step.reExaminationNotes || 'Please bring previous medical records and come prepared for physical examination.',
      duration: '30'
    });
    setShowScheduleModal(true);
  };

  const handleScheduleReExaminationSubmit = async () => {
    if (!id || !schedulingStepNumber) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${schedulingStepNumber}/schedule-re-examination`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...reExaminationForm,
            appointmentDateTime: `${reExaminationForm.date}T${reExaminationForm.time}:00`
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setShowScheduleModal(false);
        fetchConsultation();
        showToast('Re-examination scheduled successfully');
      } else {
        showToast(data.message || 'Failed to schedule', 'error');
      }
    } catch (error) {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReExArrival = async (step: LocalTreatmentStep) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${step.stepNumber}/confirm-arrival`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        showToast('Patient arrival confirmed');
        await fetchConsultation();
      } else {
        showToast(data.message || 'Failed to confirm arrival', 'error');
      }
    } catch (error) {
      showToast('Failed to confirm arrival', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteReExamination = async () => {
    if (!id || !completingStepNumber) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${completingStepNumber}/complete-re-examination`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            doctorNotes: completeReExaminationForm.doctorNotes
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setShowCompleteReExaminationModal(false);
        fetchConsultation();
        showToast('Re-examination completed successfully');
      } else {
        showToast(data.message || 'Failed to complete re-examination', 'error');
      }
    } catch (error) {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletePhysicalVisit = async (appointmentId: string) => {
    if (!appointmentId) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/doctors/re-examinations/appointments/${appointmentId}/complete`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            doctorNotes: completeVisitForm.doctorNotes
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setShowCompleteVisitModal(false);
        await fetchConsultation();
        showToast('Physical visit completed successfully');
      } else {
        showToast(data.message || 'Failed to complete visit', 'error');
      }
    } catch (error) {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCompleteVisitModal = (appointmentId: string) => {
    setCompletingAppointmentId(appointmentId);
    setCompleteVisitForm({ doctorNotes: '' });
    setShowCompleteVisitModal(true);
  };

  const handleSaveStep = async () => {
    if (!id || !stepForm.title.trim()) return;
    setIsSubmitting(true);
    try {
      const validRx = stepForm.prescriptions.filter(p => p.medication);
      const payload = {
        title: stepForm.title,
        description: stepForm.description,
        medication: validRx.map(p => p.medication).join(' + '),
        dosage: validRx.map(p => `${p.medication}: ${p.dosage}`).join(' | '),
        duration: validRx.map(p => `${p.medication}: ${p.duration}`).join(' | '),
        instructions: validRx.map(p => `${p.medication}: ${p.instructions}`).join(' | '),
        prescriptions: validRx,
        isPhysicalVisit: stepForm.isPhysicalVisit
      };

      const url = editingStepNumber ? 
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${editingStepNumber}` : 
        `${API_BASE_URL}/doctors/consultations/${id}/steps`;
      
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method: editingStepNumber ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        setShowStepModal(false);
        fetchConsultation();
        showToast(editingStepNumber ? 'Treatment step updated' : 'Treatment step created');
      } else {
        showToast(data.message || 'Failed to save step', 'error');
      }
    } catch (error) {
      showToast('Failed to save step', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteConsultation = async () => {
    try {
      if (!id) return;
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/complete`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        showToast('Consultation marked as complete');
        navigate('/consultations');
      } else {
        showToast(data.message || 'Failed to complete consultation', 'error');
      }
    } catch (error) {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrescriptionDisplay = (step: TreatmentStep) => {
    if (!step.medication) return [];
    const meds = step.medication.split(' + ');
    return meds.map(med => {
      const parseField = (str: string | undefined, med: string) => {
        if (!str) return '';
        const found = str.split(' | ').find(p => p.trim().startsWith(`${med}:`));
        return found ? found.split(':')[1].trim() : '';
      };
      return {
        name: med,
        dosage: parseField(step.dosage, med),
        duration: parseField(step.duration, med),
        instructions: parseField(step.instructions, med)
      };
    });
  };

  const isPhysicalVisitStep = (step: TreatmentStep | LocalTreatmentStep) => {
    return step.isPhysicalVisit || 
           step.title?.toLowerCase().includes('re-ex') ||
           step.title?.toLowerCase().includes('physical') ||
           step.title?.toLowerCase().includes('follow-up') ||
           step.title?.toLowerCase().includes('visit') ||
           step.needsReExamination ||
           step.isReExaminationVisit ||
           step.reExaminationScheduled;
  };

  const getAppointmentStatus = (step: LocalTreatmentStep) => {
    if (!step.reExaminationAppointmentId) return null;
    return appointmentStatuses[step.reExaminationAppointmentId] || 'pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Loading Medical Record...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-red-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Consultation</h3>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => navigate('/consultations')} className="w-full py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 transition-colors">Return to List</button>
        </div>
      </div>
    );
  }

  const approvedSteps = consultation?.treatment_plan?.filter(s => s.status === 'approved')?.length || 0;
  const totalSteps = consultation?.treatment_plan?.length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((approvedSteps / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-5 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md animate-slideIn border-l-4 ${
          toast.type === 'error' ? 'bg-white border-red-500 text-slate-800' : 
          toast.type === 'info' ? 'bg-white border-blue-500 text-slate-800' : 
          'bg-white border-green-500 text-slate-800'
        }`}>
          <span className={`text-xl ${
             toast.type === 'error' ? 'text-red-500' : 
             toast.type === 'info' ? 'text-blue-500' : 
             'text-green-500'
          }`}>
            {toast.type === 'error' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✓'}
          </span>
          <p className="font-medium text-sm">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/consultations" className="p-2 -ml-2 text-slate-400 hover:text-blue-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-800">Consultation #{id?.slice(-6).toUpperCase()}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${
                    consultation?.priority === 'urgent' 
                    ? 'bg-red-50 text-red-700 border-red-100' 
                    : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {consultation?.priority}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Started on {new Date(consultation?.created_at || '').toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:block text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Progress</p>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{approvedSteps}/{totalSteps}</span>
                </div>
              </div>

              <button 
                onClick={handleCompleteConsultation}
                disabled={!consultation?.treatment_plan.every(s => s.status === 'approved')}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <span>✓</span>
                Complete Case
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Patient & Actions */}
          <div className="lg:col-span-4 space-y-6">
            <PatientInfoCard consultation={consultation} />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-blue-500">⚡</span> Actions
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => { 
                    setEditingStepNumber(null); 
                    setStepForm({ title: '', description: '', prescriptions: [], isPhysicalVisit: false }); 
                    setShowStepModal(true); 
                  }}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="text-xl leading-none">+</span> Add Treatment Step
                </button>
                <button 
                  onClick={() => navigate(`/doctors/consultations/${id}/notes`)}
                  className="w-full py-3 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <span>📝</span> Clinical Notes
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Timeline */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>📋</span> Treatment Plan
                </h2>
                <div className="text-sm text-slate-500">
                  Total Steps: <span className="font-bold text-slate-900">{totalSteps}</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50/50">
                <div className="relative pl-4 sm:pl-8 space-y-8">
                  {/* Timeline Line */}
                  {(consultation?.treatment_plan?.length || 0) > 0 && (
                    <div className="absolute left-[2.25rem] sm:left-[3.25rem] top-4 bottom-4 w-0.5 bg-slate-200" />
                  )}

                  {consultation?.treatment_plan?.map((step, index) => {
                    const localStep = step as LocalTreatmentStep;
                    const rx = getPrescriptionDisplay(step);
                    const isPhysicalVisit = isPhysicalVisitStep(step);
                    const appointmentStatus = getAppointmentStatus(localStep);
                    const isLast = index === consultation.treatment_plan.length - 1;

                    return (
                      <div key={step._id || index} className="relative pl-8 sm:pl-12">
                        {/* Timeline Node */}
                        <div className={`absolute left-4 sm:left-8 top-6 -translate-x-1/2 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center font-bold text-sm z-10 ${
                          step.status === 'approved' ? 'bg-green-100 text-green-700' :
                          step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          step.status === 'in-progress' ? 'bg-blue-600 text-white' :
                          step.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-white text-slate-500 border-slate-200'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Card Content */}
                        <div className={`bg-white rounded-xl border shadow-sm transition-all hover:shadow-md ${
                          step.status === 'in-progress' ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                        }`}>
                          <div className="p-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                                <p className="text-slate-500 text-sm mt-1 leading-relaxed">{step.description}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 items-center justify-start sm:justify-end shrink-0">
                                <StatusBadge status={step.status} />
                                {isPhysicalVisit && <PhysicalVisitBadge />}
                                {appointmentStatus && localStep.reExaminationAppointmentId && (
                                  <AppointmentStatusBadge 
                                    appointmentId={localStep.reExaminationAppointmentId}
                                    status={appointmentStatus}
                                    arrivalConfirmed={localStep.arrivalConfirmed}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Actions Toolbar */}
                            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                               {/* Review Button */}
                               {step.status === 'completed' && !isPhysicalVisit && (
                                <button 
                                  onClick={() => {
                                    setReviewingStepNumber(step.stepNumber);
                                    setReviewForm({
                                      decision: 'approve_with_followup',
                                      doctorNotes: '',
                                      requireFollowUp: true,
                                      nextAppointmentDate: '',
                                      nextAppointmentTime: '09:00',
                                      followUpInstructions: '',
                                      additionalStepTitle: '',
                                      additionalStepDescription: ''
                                    });
                                    setShowReviewModal(true);
                                  }}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <span>⚖️</span> Review
                                </button>
                              )}

                              {/* Schedule Visit */}
                              {isPhysicalVisit && !localStep.reExaminationScheduled && !['approved', 'confirmed'].includes(step.status) && (
                                <button 
                                  onClick={() => handleScheduleReExamination(localStep)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <span>📅</span> Schedule Visit
                                </button>
                              )}

                              {/* Complete Physical Visit (via Appt) */}
                              {isPhysicalVisit && localStep.reExaminationAppointmentId && appointmentStatus === 'confirmed' && localStep.status === 'in-progress' && (
                                <button 
                                  onClick={() => handleOpenCompleteVisitModal(localStep.reExaminationAppointmentId!)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <span>✓</span> Complete Visit
                                </button>
                              )}

                              {/* Complete Physical Visit (via Step) */}
                              {isPhysicalVisit && localStep.reExaminationScheduled && step.status === 'scheduled' && appointmentStatus !== 'confirmed' && (
                                <button 
                                  onClick={() => {
                                    setCompletingStepNumber(step.stepNumber);
                                    setCompleteReExaminationForm({ doctorNotes: localStep.doctorNotes || 'Physical examination completed.' });
                                    setShowCompleteReExaminationModal(true);
                                  }}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <span>✓</span> Complete Visit
                                </button>
                              )}

                              {/* Confirm Arrival */}
                              {isPhysicalVisit && step.status === 'scheduled' && localStep.reExaminationScheduled && !localStep.arrivalConfirmed && new Date(localStep.reExaminationDate!).toDateString() === new Date().toDateString() && (
                                <button 
                                  onClick={() => handleConfirmReExArrival(localStep)}
                                  disabled={isSubmitting}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                  <span>📍</span> Confirm Arrival
                                </button>
                              )}

                              {/* Edit */}
                              {step.status !== 'approved' && step.status !== 'scheduled' && (
                                <button 
                                  onClick={() => { 
                                    setEditingStepNumber(step.stepNumber); 
                                    setStepForm({ 
                                      title: step.title, 
                                      description: step.description, 
                                      prescriptions: rx as any,
                                      isPhysicalVisit: isPhysicalVisit || false
                                    }); 
                                    setShowStepModal(true); 
                                  }}
                                  className="px-4 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded-lg transition-colors ml-auto flex items-center gap-2"
                                >
                                  <span>✏️</span> Edit
                                </button>
                              )}
                            </div>

                            {/* Extended Content */}
                            <div className="space-y-4">
                              {isPhysicalVisit && localStep.reExaminationScheduled && <ReExaminationInfo step={localStep} />}
                              {(step.condition_description || step.patient_message) && <PatientReportCard step={localStep} />}
                              {step.doctorNotes && <DoctorNotesCard step={step} />}
                              
                              {rx.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Prescriptions</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {rx.map((med, i) => (
                                      <PrescriptionCard key={i} prescription={med} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(consultation?.treatment_plan?.length || 0) === 0 && (
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-slate-400">📋</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">No Treatment Steps</h3>
                      <p className="text-slate-500 mb-6 max-w-sm mx-auto">This consultation has not started yet. Add the first treatment step to begin.</p>
                      <button 
                        onClick={() => { 
                          setEditingStepNumber(null); 
                          setStepForm({ title: 'Initial Assessment', description: 'Start with initial diagnosis and treatment plan.', prescriptions: [], isPhysicalVisit: false }); 
                          setShowStepModal(true); 
                        }}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Start Treatment Plan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Modal Overlay Base */}
      {(showReviewModal || showScheduleModal || showCompleteReExaminationModal || showCompleteVisitModal || showStepModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          
          {/* Review Modal */}
          {showReviewModal && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slideIn">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Review Step #{reviewingStepNumber}</h3>
                  <p className="text-sm text-slate-500">Make a decision on the patient's progress</p>
                </div>
                <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Decision</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, decision: 'approve_with_followup'})}
                      className={`p-4 text-left rounded-xl border-2 transition-all ${
                        reviewForm.decision === 'approve_with_followup' 
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-bold text-slate-800 mb-1">Approve & Follow-up</span>
                      <span className="block text-sm text-slate-500">Schedule next step</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, decision: 'approve_and_complete'})}
                      className={`p-4 text-left rounded-xl border-2 transition-all ${
                        reviewForm.decision === 'approve_and_complete' 
                          ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-bold text-slate-800 mb-1">Approve & Complete</span>
                      <span className="block text-sm text-slate-500">Finish treatment</span>
                    </button>
                  </div>
                </div>

                {reviewForm.decision === 'approve_with_followup' && (
                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 space-y-4">
                    <h4 className="font-bold text-blue-900 flex items-center gap-2">📅 Schedule Follow-up</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Date</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 rounded-lg border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                          value={reviewForm.nextAppointmentDate}
                          onChange={e => setReviewForm({...reviewForm, nextAppointmentDate: e.target.value})}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Time</label>
                        <input 
                          type="time" 
                          className="w-full px-3 py-2 rounded-lg border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                          value={reviewForm.nextAppointmentTime}
                          onChange={e => setReviewForm({...reviewForm, nextAppointmentTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Clinical Notes</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                    placeholder="Enter detailed clinical assessment..."
                    value={reviewForm.doctorNotes}
                    onChange={e => setReviewForm({...reviewForm, doctorNotes: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setShowReviewModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">Cancel</button>
                <button 
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || (reviewForm.decision === 'approve_with_followup' && !reviewForm.nextAppointmentDate)}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmitting ? 'Processing...' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}

          {/* Schedule Modal */}
          {showScheduleModal && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideIn">
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">Schedule Visit</h3>
                  <p className="text-indigo-200 text-sm mt-1">Physical Re-Examination for Step #{schedulingStepNumber}</p>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="text-indigo-200 hover:text-white text-xl">✕</button>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={reExaminationForm.date}
                    onChange={e => setReExaminationForm({...reExaminationForm, date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Time Slot</label>
                  {loadingTimeSlots ? (
                    <div className="py-2 text-indigo-600 text-sm font-medium animate-pulse">Checking availability...</div>
                  ) : (
                    <select 
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                      value={reExaminationForm.time}
                      onChange={e => setReExaminationForm({...reExaminationForm, time: e.target.value})}
                      disabled={availableTimeSlots.length === 0}
                    >
                      <option value="">Select a time slot...</option>
                      {availableTimeSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  )}
                  {reExaminationForm.date && availableTimeSlots.length === 0 && !loadingTimeSlots && (
                    <p className="text-xs text-red-500 mt-2 font-medium">No slots available for this date.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Duration</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    value={reExaminationForm.duration}
                    onChange={e => setReExaminationForm({...reExaminationForm, duration: e.target.value})}
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Instructions</label>
                  <textarea 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Preparation instructions for patient..."
                    value={reExaminationForm.notes}
                    onChange={e => setReExaminationForm({...reExaminationForm, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button onClick={() => setShowScheduleModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">Cancel</button>
                <button 
                  onClick={handleScheduleReExaminationSubmit}
                  disabled={isSubmitting || !reExaminationForm.date || !reExaminationForm.time}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Re-Exam Modal */}
          {showCompleteReExaminationModal && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slideIn">
              <div className="bg-emerald-600 p-6 text-white">
                <h3 className="text-xl font-bold">Complete Physical Exam</h3>
                <p className="text-emerald-100 text-sm mt-1">Finalize Step #{completingStepNumber}</p>
              </div>
              <div className="p-6 space-y-4">
                <label className="block text-sm font-bold text-slate-700">Exam Findings & Notes <span className="text-red-500">*</span></label>
                <textarea 
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
                  placeholder="Record physical examination findings here..."
                  value={completeReExaminationForm.doctorNotes}
                  onChange={e => setCompleteReExaminationForm({...completeReExaminationForm, doctorNotes: e.target.value})}
                />
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button onClick={() => setShowCompleteReExaminationModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">Cancel</button>
                <button 
                  onClick={handleCompleteReExamination}
                  disabled={isSubmitting || !completeReExaminationForm.doctorNotes.trim()}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Completing...' : 'Complete Exam'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Visit Modal */}
          {showCompleteVisitModal && (
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slideIn">
              <div className="bg-emerald-600 p-6 text-white">
                <h3 className="text-xl font-bold">Complete Visit</h3>
                <p className="text-emerald-100 text-sm mt-1">Appointment #{completingAppointmentId?.slice(-6)}</p>
              </div>
              <div className="p-6 space-y-4">
                <label className="block text-sm font-bold text-slate-700">Doctor's Notes <span className="text-red-500">*</span></label>
                <textarea 
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
                  placeholder="Record visit notes..."
                  value={completeVisitForm.doctorNotes}
                  onChange={e => setCompleteVisitForm({...completeVisitForm, doctorNotes: e.target.value})}
                />
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button onClick={() => setShowCompleteVisitModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">Cancel</button>
                <button 
                  onClick={() => completingAppointmentId && handleCompletePhysicalVisit(completingAppointmentId)}
                  disabled={isSubmitting || !completeVisitForm.doctorNotes.trim()}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Processing...' : 'Complete Visit'}
                </button>
              </div>
            </div>
          )}

          {/* Add/Edit Step Modal */}
          {showStepModal && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-slideIn">
              <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingStepNumber ? `Edit Step #${editingStepNumber}` : 'New Treatment Step'}
                </h3>
                <button onClick={() => setShowStepModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Initial Consultation"
                      value={stepForm.title}
                      onChange={e => setStepForm({...stepForm, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description..."
                      value={stepForm.description}
                      onChange={e => setStepForm({...stepForm, description: e.target.value})}
                    />
                  </div>
                </div>

                {/* Physical Visit Checkbox */}
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-4">
                  <input 
                    type="checkbox"
                    id="isPhysicalVisit"
                    checked={stepForm.isPhysicalVisit}
                    onChange={e => setStepForm({...stepForm, isPhysicalVisit: e.target.checked})}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                  />
                  <label htmlFor="isPhysicalVisit" className="cursor-pointer">
                    <p className="font-bold text-purple-900">Requires Physical Visit</p>
                    <p className="text-sm text-purple-700/80">Check this if the patient needs to come to the clinic.</p>
                  </label>
                </div>

                {/* Prescriptions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <span>💊</span> Prescriptions
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setStepForm({...stepForm, prescriptions: [...stepForm.prescriptions, {medication: '', dosage: '', duration: '', instructions: ''}]})}
                      className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      + Add Medication
                    </button>
                  </div>

                  <div className="space-y-4">
                    {stepForm.prescriptions.map((p, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative group">
                        <button 
                          type="button"
                          onClick={() => setStepForm({...stepForm, prescriptions: stepForm.prescriptions.filter((_, idx) => idx !== i)})}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                        >✕</button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Medication Field */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medication</label>
                            <div className="space-y-2">
                              <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                value={availableDrugs.find(d => d.name === p.medication) ? p.medication : (p.medication || customInputModes[`${i}-medication`] ? 'custom' : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const n = [...stepForm.prescriptions];
                                  if (val === 'custom') {
                                    toggleCustomMode(i, 'medication', true);
                                    n[i].medication = '';
                                  } else {
                                    toggleCustomMode(i, 'medication', false);
                                    n[i].medication = val;
                                  }
                                  setStepForm({...stepForm, prescriptions: n});
                                }}
                              >
                                <option value="">Select Drug...</option>
                                {availableDrugs.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                <option value="custom">Other (Type manually)...</option>
                              </select>
                              
                              {(customInputModes[`${i}-medication`] || (p.medication && !availableDrugs.find(d => d.name === p.medication))) && (
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter medication name"
                                  value={p.medication}
                                  onChange={e => {
                                    const n = [...stepForm.prescriptions];
                                    n[i].medication = e.target.value;
                                    setStepForm({...stepForm, prescriptions: n});
                                  }}
                                  autoFocus={customInputModes[`${i}-medication`]}
                                />
                              )}
                            </div>
                          </div>

                          {/* Dosage Field */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage</label>
                            <div className="space-y-2">
                              <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                value={DOSAGE_OPTIONS.includes(p.dosage) ? p.dosage : (p.dosage || customInputModes[`${i}-dosage`] ? 'custom' : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const n = [...stepForm.prescriptions];
                                  if (val === 'custom') {
                                    toggleCustomMode(i, 'dosage', true);
                                    n[i].dosage = '';
                                  } else {
                                    toggleCustomMode(i, 'dosage', false);
                                    n[i].dosage = val;
                                  }
                                  setStepForm({...stepForm, prescriptions: n});
                                }}
                              >
                                <option value="">Select Dosage...</option>
                                {DOSAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                <option value="custom">Other (Type manually)...</option>
                              </select>

                              {(customInputModes[`${i}-dosage`] || (p.dosage && !DOSAGE_OPTIONS.includes(p.dosage))) && (
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                  placeholder="e.g. 500mg"
                                  value={p.dosage}
                                  onChange={e => {
                                    const n = [...stepForm.prescriptions];
                                    n[i].dosage = e.target.value;
                                    setStepForm({...stepForm, prescriptions: n});
                                  }}
                                  autoFocus={customInputModes[`${i}-dosage`]}
                                />
                              )}
                            </div>
                          </div>

                          {/* Duration Field */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration</label>
                            <div className="space-y-2">
                              <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                value={DURATION_OPTIONS.includes(p.duration) ? p.duration : (p.duration || customInputModes[`${i}-duration`] ? 'custom' : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const n = [...stepForm.prescriptions];
                                  if (val === 'custom') {
                                    toggleCustomMode(i, 'duration', true);
                                    n[i].duration = '';
                                  } else {
                                    toggleCustomMode(i, 'duration', false);
                                    n[i].duration = val;
                                  }
                                  setStepForm({...stepForm, prescriptions: n});
                                }}
                              >
                                <option value="">Select Duration...</option>
                                {DURATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                <option value="custom">Other (Type manually)...</option>
                              </select>
                              
                              {(customInputModes[`${i}-duration`] || (p.duration && !DURATION_OPTIONS.includes(p.duration))) && (
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                  placeholder="e.g. 7 days"
                                  value={p.duration}
                                  onChange={e => {
                                    const n = [...stepForm.prescriptions];
                                    n[i].duration = e.target.value;
                                    setStepForm({...stepForm, prescriptions: n});
                                  }}
                                  autoFocus={customInputModes[`${i}-duration`]}
                                />
                              )}
                            </div>
                          </div>

                          {/* Instructions Field */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instructions</label>
                            <div className="space-y-2">
                              <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                value={INSTRUCTION_OPTIONS.includes(p.instructions) ? p.instructions : (p.instructions || customInputModes[`${i}-instructions`] ? 'custom' : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const n = [...stepForm.prescriptions];
                                  if (val === 'custom') {
                                    toggleCustomMode(i, 'instructions', true);
                                    n[i].instructions = '';
                                  } else {
                                    toggleCustomMode(i, 'instructions', false);
                                    n[i].instructions = val;
                                  }
                                  setStepForm({...stepForm, prescriptions: n});
                                }}
                              >
                                <option value="">Select Instructions...</option>
                                {INSTRUCTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                <option value="custom">Other (Type manually)...</option>
                              </select>
                              
                              {(customInputModes[`${i}-instructions`] || (p.instructions && !INSTRUCTION_OPTIONS.includes(p.instructions))) && (
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                  placeholder="e.g. Take after meals with plenty of water"
                                  value={p.instructions}
                                  onChange={e => {
                                    const n = [...stepForm.prescriptions];
                                    n[i].instructions = e.target.value;
                                    setStepForm({...stepForm, prescriptions: n});
                                  }}
                                  autoFocus={customInputModes[`${i}-instructions`]}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {stepForm.prescriptions.length === 0 && (
                      <div className="text-center py-6 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No prescriptions added.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                <button onClick={() => setShowStepModal(false)} className="px-6 py-3 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">Cancel</button>
                <button 
                  onClick={handleSaveStep}
                  disabled={isSubmitting || !stepForm.title.trim()}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : (editingStepNumber ? 'Update Step' : 'Create Step')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideIn { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ConsultationDetail;
