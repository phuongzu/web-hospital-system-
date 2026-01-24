import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Consultation, TreatmentStep } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, calculateAge } from '../utils/api';

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
  status: 'pending' | 'in-progress' | 'completed' | 'approved' | 'rejected' | 'scheduled';
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


// ==================== COMPONENTS ====================

// Status Badge với màu sắc y tế
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    'pending': { bg: 'bg-slate-100', text: 'text-slate-700', icon: '⏳', label: 'Pending' },
    'in-progress': { bg: 'bg-blue-50', text: 'text-blue-700', icon: '📋', label: 'In Progress' },
    'scheduled': { bg: 'bg-purple-50', text: 'text-purple-700', icon: '📅', label: 'Scheduled' },
    'completed': { bg: 'bg-amber-50', text: 'text-amber-700', icon: '✓', label: 'Awaiting Review' },
    'approved': { bg: 'bg-green-50', text: 'text-green-700', icon: '✓✓', label: 'Approved' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-slate-200`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

// Badge cho Physical Visit
const PhysicalVisitBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
    <span>🏥</span>
    <span>Physical Visit</span>
  </span>
);

// Thẻ thông tin bệnh nhân
const PatientInfoCard: React.FC<{ consultation: Consultation | null }> = ({ consultation }) => {
  if (!consultation) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header với avatar */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="relative">
            {consultation.user_id.avatar ? (
              <img 
                src={getAvatarUrl(consultation.user_id.avatar)} 
                alt="Patient"
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-2xl">
                {consultation.user_id.name.charAt(0)}
              </div>
            )}
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
              consultation.priority === 'urgent' ? 'bg-red-500' : 'bg-green-500'
            }`} />
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800">{consultation.user_id.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className="font-medium">{consultation.user_id.gender}</span>
                <span className="text-slate-400">•</span>
                <span>{calculateAge(consultation.user_id.dateOfBirth)} years</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin chẩn đoán */}
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Primary Diagnosis</h3>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-800 italic leading-relaxed">
              "{consultation.diagnosis || 'Pending diagnosis'}"
            </p>
          </div>
        </div>

        {/* Thông tin hẹn tái khám */}
        {consultation.next_appointment && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Next Appointment</h3>
            <div className="bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  📅
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(consultation.next_appointment).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-slate-600">
                    {new Date(consultation.next_appointment).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thông tin priority */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority Level</h3>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
            consultation.priority === 'urgent' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-slate-100 text-slate-700 border border-slate-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              consultation.priority === 'urgent' ? 'bg-red-500' : 'bg-slate-500'
            }`} />
            <span className="font-medium capitalize">{consultation.priority}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị thông tin hẹn tái khám
const ReExaminationInfo: React.FC<{ step: LocalTreatmentStep }> = ({ step }) => {
  if (!step.reExaminationScheduled || !step.reExaminationDate) return null;

  const appointmentDate = new Date(step.reExaminationDate);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isPast = appointmentDate < new Date();
  
  // Xác định trạng thái
  let status = '';
  let statusColor = '';
  
  if (step.status === 'completed') {
    status = 'Completed';
    statusColor = 'bg-green-100 text-green-700';
  } else if (step.status === 'in-progress' && step.arrivalConfirmed) {
    status = 'In Progress';
    statusColor = 'bg-blue-100 text-blue-700';
  } else if (isToday && !step.arrivalConfirmed) {
    status = 'Scheduled for Today';
    statusColor = 'bg-amber-100 text-amber-700';
  } else if (isPast && !step.arrivalConfirmed) {
    status = 'Missed';
    statusColor = 'bg-red-100 text-red-700';
  } else {
    status = 'Scheduled';
    statusColor = 'bg-purple-100 text-purple-700';
  }

  return (
    <div className={`rounded-xl border ${
      step.status === 'completed' ? 'border-green-300 bg-green-50' :
      step.status === 'in-progress' ? 'border-blue-300 bg-blue-50' :
      isToday ? 'border-amber-300 bg-amber-50' :
      'border-slate-200 bg-white'
    } p-4 mb-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 rounded-lg ${
            step.status === 'completed' ? 'bg-green-100 text-green-600' :
            step.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
            isToday ? 'bg-amber-100 text-amber-600' :
            'bg-slate-100 text-slate-600'
          } flex items-center justify-center`}>
            {step.status === 'completed' ? '✓' : isToday ? '📋' : '📅'}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-slate-800">
                {step.status === 'completed' ? "Physical Visit Completed" :
                 step.status === 'in-progress' ? "Physical Visit In Progress" :
                 isToday ? "Today's Appointment" : "Scheduled Re-Examination"}
              </h4>
              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                {status}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 min-w-[80px]">Date:</span>
                <span className="text-sm font-medium text-slate-800">
                  {appointmentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 min-w-[80px]">Time:</span>
                <span className="text-sm font-medium text-slate-800">
                  {appointmentDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {step.arrivalConfirmed && step.arrivalConfirmedAt && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                  <span className="text-sm text-slate-600 min-w-[80px]">Arrived:</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      {new Date(step.arrivalConfirmedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}

              {step.doctorNotes && step.status === 'completed' && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-1">Doctor's Notes:</p>
                  <p className="text-sm text-slate-600 italic">"{step.doctorNotes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component thông tin đơn thuốc
const PrescriptionCard: React.FC<{ 
  prescription: { name: string; dosage: string; duration: string; instructions?: string };
  index: number;
}> = ({ prescription, index }) => {
  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg border border-slate-200 p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            💊
          </div>
          <div>
            <h5 className="font-semibold text-slate-800">{prescription.name}</h5>
            <p className="text-xs text-slate-500">Medication #{index + 1}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2.5 pl-13">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 min-w-[70px]">Dosage:</span>
          <span className="text-sm font-medium text-slate-800">{prescription.dosage}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 min-w-[70px]">Duration:</span>
          <span className="text-sm font-medium text-slate-800">{prescription.duration}</span>
        </div>
        
        {prescription.instructions && (
          <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
            <span className="text-sm text-slate-500 min-w-[70px] mt-1">Notes:</span>
            <span className="text-sm font-medium text-slate-800">{prescription.instructions}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Component báo cáo của bệnh nhân
const PatientReportCard: React.FC<{ step: LocalTreatmentStep }> = ({ step }) => {
  if (!step.condition_description && !step.patient_message) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg border border-amber-100 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
          💬
        </div>
        <div className="flex-1">
          <h5 className="font-semibold text-slate-800">Patient Report</h5>
          <p className="text-xs text-slate-500">Status update from patient</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {step.condition_description && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Condition Description</p>
            <p className="text-sm text-slate-600 italic leading-relaxed">"{step.condition_description}"</p>
          </div>
        )}
        
        {step.patient_message && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Patient Message</p>
            <p className="text-sm text-slate-600 leading-relaxed">{step.patient_message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Component ghi chú của bác sĩ
const DoctorNotesCard: React.FC<{ step: TreatmentStep }> = ({ step }) => {
  if (!step.doctorNotes) return null;

  return (
    <div className="bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          ✓
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-slate-800">Doctor's Notes</h5>
            {step.approvedAt && (
              <span className="text-xs text-slate-500">
                {new Date(step.approvedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Clinical assessment and follow-up</p>
        </div>
      </div>
      
      <div className="pl-13">
        <p className="text-sm text-slate-700 leading-relaxed">{step.doctorNotes}</p>
      </div>
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
  
  // Data states
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  
  // Working states
  const [editingStepNumber, setEditingStepNumber] = useState<number | null>(null);
  const [reviewingStepNumber, setReviewingStepNumber] = useState<number | null>(null);
  const [schedulingStepNumber, setSchedulingStepNumber] = useState<number | null>(null);
  const [completingStepNumber, setCompletingStepNumber] = useState<number | null>(null);

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

  const doctorId = getDoctorId();

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
        
        // Tự động mở modal để tạo treatment step tiếp theo
        setEditingStepNumber(null);
        setStepForm({
          title: `Post-Reexamination Treatment: Phase ${(consultation?.treatment_plan.length || 0) + 1}`,
          description: `Treatment plan based on physical examination findings from ${new Date().toLocaleDateString()}.`,
          prescriptions: [],
          isPhysicalVisit: false
        });
        setShowStepModal(true);
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

  // Xử lý thông tin đơn thuốc để hiển thị
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

  // Kiểm tra xem step có phải là physical visit không
  const isPhysicalVisitStep = (step: TreatmentStep | LocalTreatmentStep) => {
    return step.isPhysicalVisit || 
           step.title?.toLowerCase().includes('re-ex') ||
           step.title?.toLowerCase().includes('physical') ||
           step.title?.toLowerCase().includes('follow-up') ||
           step.title?.toLowerCase().includes('visit') ||
           step.needsReExamination;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-6">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Loading Consultation</h3>
          <p className="text-sm text-slate-500">Please wait while we load patient data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-100 to-red-200 rounded-full text-red-500 text-2xl mb-6">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Consultation</h3>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/consultations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Consultations
          </button>
        </div>
      </div>
    );
  }

  const approvedSteps = consultation?.treatment_plan.filter(s => s.status === 'approved').length || 0;
  const totalSteps = consultation?.treatment_plan.length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((approvedSteps / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 max-w-md animate-slideIn ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 
          toast.type === 'info' ? 'bg-blue-500 text-white' : 
          'bg-green-500 text-white'
        }`}>
          <span className="text-xl">
            {toast.type === 'error' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✓'}
          </span>
          <span className="font-medium flex-1">{toast.message}</span>
          <button 
            onClick={() => setToast(null)} 
            className="text-white/80 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link 
                to="/consultations" 
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 hidden sm:inline">
                    Back to List
                  </span>
                </div>
              </Link>
              
              <div className="border-l border-slate-300 pl-4">
                <h1 className="text-xl font-bold text-slate-800">
                  Consultation <span className="text-blue-600">#{id?.slice(-6).toUpperCase()}</span>
                </h1>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <span>Started on {new Date(consultation?.created_at || '').toLocaleDateString()}</span>
                  <span className="text-slate-400">•</span>
                  <span className={`font-medium ${consultation?.priority === 'urgent' ? 'text-red-600' : 'text-blue-600'}`}>
                    {consultation?.priority?.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            {/* Progress và action buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Treatment Progress</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-800">{approvedSteps}/{totalSteps}</span>
                    <span className="text-sm text-slate-500">steps</span>
                  </div>
                </div>
                <div className="w-32">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-center">{progressPercent}% complete</p>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/doctors/consultations/${id}/finalize`)}
                disabled={!consultation?.treatment_plan.every(s => s.status === 'approved')}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Finalize Case
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Patient Info và Quick Actions */}
          <div className="lg:col-span-1 space-y-8">
            <PatientInfoCard consultation={consultation} />

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-blue-600">⚡</span>
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => { 
                    setEditingStepNumber(null); 
                    setStepForm({ 
                      title: '', 
                      description: '', 
                      prescriptions: [],
                      isPhysicalVisit: false 
                    }); 
                    setShowStepModal(true); 
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Treatment Step
                </button>
                
                <button 
                  onClick={() => navigate(`/doctors/consultations/${id}/notes`)}
                  className="w-full px-4 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Clinical Notes
                </button>
              </div>

              {/* Treatment Stats */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Treatment Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{totalSteps}</div>
                    <div className="text-xs text-slate-600 mt-1">Total Steps</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-100">
                    <div className="text-2xl font-bold text-green-600">{approvedSteps}</div>
                    <div className="text-xs text-slate-600 mt-1">Approved</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Treatment Timeline */}
          <div className="lg:col-span-2">
            {/* Timeline Header */}
            <div className="bg-gradient-to-r from-white to-blue-50 rounded-xl border border-slate-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600">
                      📋
                    </div>
                    <span>Treatment Timeline</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">Review and manage treatment steps with patient</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">Filter:</span>
                  <select className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option>All Steps</option>
                    <option>Physical Visits Only</option>
                    <option>Pending Review</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Treatment Steps List */}
            <div className="space-y-6">
              {consultation?.treatment_plan.map((step, index) => {
                const localStep = step as LocalTreatmentStep;
                const rx = getPrescriptionDisplay(step);
                const isPhysicalVisit = isPhysicalVisitStep(step);
                
                return (
                  <div 
                    key={step._id || index}
                    className={`bg-white rounded-xl border-2 hover:border-blue-300 transition-all duration-300 ${
                      isPhysicalVisit ? 'border-purple-200' : 'border-slate-200'
                    } ${step.status === 'scheduled' ? 'ring-1 ring-blue-200' : ''}`}
                  >
                    {/* Step Header */}
                    <div className="p-6 border-b border-slate-100">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Step Number và Title */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-3">
                            <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-lg font-bold ${
                              isPhysicalVisit 
                                ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600' 
                                : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600'
                            }`}>
                              {isPhysicalVisit ? '🏥' : step.stepNumber}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0">
                                  <h3 className="text-lg font-bold text-slate-800 truncate">
                                    {step.title}
                                  </h3>
                                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Status và Tags */}
                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                <StatusBadge status={step.status} />
                                {isPhysicalVisit && <PhysicalVisitBadge />}
                                
                                {/* Badge đặc biệt cho các trạng thái của physical visit */}
                                {isPhysicalVisit && localStep.arrivalConfirmed && step.status === 'in-progress' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    <span>👤</span>
                                    <span>Patient Arrived</span>
                                  </span>
                                )}
                                
                                {step.completedAt && (
                                  <span className="text-xs text-slate-500">
                                    Completed: {new Date(step.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Review Button cho steps đã hoàn thành */}
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
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-amber-700 transition-all flex items-center gap-2 shadow-sm hover:shadow"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Review
                            </button>
                          )}

                          {/* Schedule Button cho physical visits */}
                          {isPhysicalVisit && !localStep.reExaminationScheduled && (
                            <button 
                              onClick={() => handleScheduleReExamination(localStep)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm hover:shadow"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Schedule Visit
                            </button>
                          )}

                          {/* Complete Re-examination Button - Hiển thị khi bệnh nhân đã đến và step đang in-progress */}
                          {isPhysicalVisit && 
                           step.status === 'in-progress' && 
                           localStep.arrivalConfirmed && (
                            <button 
                              onClick={() => {
                                setCompletingStepNumber(step.stepNumber);
                                setCompleteReExaminationForm({
                                  doctorNotes: localStep.doctorNotes || 'Physical examination completed. Patient condition improved.'
                                });
                                setShowCompleteReExaminationModal(true);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2 shadow-sm hover:shadow"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Complete Visit
                            </button>
                          )}

                          {/* Confirm Arrival Button - Chỉ hiển thị khi chưa xác nhận đến */}
                          {isPhysicalVisit && 
                           step.status === 'scheduled' && 
                           localStep.reExaminationScheduled && 
                           !localStep.arrivalConfirmed && 
                           new Date(localStep.reExaminationDate!).toDateString() === new Date().toDateString() && (
                            <button 
                              onClick={() => handleConfirmReExArrival(localStep)}
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm hover:shadow"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Confirm Arrival
                            </button>
                          )}

                          {/* Edit Button */}
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
                              className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label="Edit step"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Re-Examination Info */}
                      {isPhysicalVisit && localStep.reExaminationScheduled && (
                        <div className="mt-4">
                          <ReExaminationInfo step={localStep} />
                        </div>
                      )}
                    </div>

                    {/* Patient Report */}
                    {(step.condition_description || step.patient_message) && (
                      <div className="p-6 border-b border-slate-100">
                        <PatientReportCard step={localStep} />
                      </div>
                    )}

                    {/* Doctor Notes */}
                    {step.doctorNotes && (
                      <div className="p-6 border-b border-slate-100">
                        <DoctorNotesCard step={step} />
                      </div>
                    )}

                    {/* Prescriptions */}
                    {rx.length > 0 && (
                      <div className="p-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                          <span className="text-blue-600">💊</span>
                          Prescriptions
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rx.map((med, i) => (
                            <PrescriptionCard key={i} prescription={med} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty State */}
              {consultation?.treatment_plan.length === 0 && (
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 text-3xl mx-auto mb-6">
                    🏥
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">No Treatment Steps Yet</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                    Start building the treatment plan by adding the first step. You can create medication plans, schedule physical visits, or set up follow-up appointments.
                  </p>
                  <button 
                    onClick={() => { 
                      setEditingStepNumber(null); 
                      setStepForm({ 
                        title: 'Initial Treatment Phase', 
                        description: 'Start with diagnosis and initial medication plan', 
                        prescriptions: [],
                        isPhysicalVisit: false 
                      }); 
                      setShowStepModal(true); 
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow"
                  >
                    Add First Treatment Step
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ==================== MODALS ==================== */}
      
      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-white border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Review Treatment Step</h3>
                  <p className="text-sm text-slate-500 mt-1">Step #{reviewingStepNumber}</p>
                </div>
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Decision Options */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Decision</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, decision: 'approve_with_followup'})}
                      className={`p-4 text-left rounded-xl border-2 transition-all ${
                        reviewForm.decision === 'approve_with_followup' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          reviewForm.decision === 'approve_with_followup' 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-slate-300'
                        }`}>
                          {reviewForm.decision === 'approve_with_followup' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Approve with Follow-up</p>
                          <p className="text-sm text-slate-500 mt-1">Schedule next appointment</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, decision: 'approve_and_complete'})}
                      className={`p-4 text-left rounded-xl border-2 transition-all ${
                        reviewForm.decision === 'approve_and_complete' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          reviewForm.decision === 'approve_and_complete' 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-slate-300'
                        }`}>
                          {reviewForm.decision === 'approve_and_complete' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Approve & Complete</p>
                          <p className="text-sm text-slate-500 mt-1">No further treatment needed</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Follow-up Appointment */}
                {reviewForm.decision === 'approve_with_followup' && (
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-4 space-y-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="text-blue-600">📅</span>
                      Follow-up Appointment
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                        <input 
                          type="date" 
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          value={reviewForm.nextAppointmentDate}
                          onChange={e => setReviewForm({...reviewForm, nextAppointmentDate: e.target.value})}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                        <input 
                          type="time" 
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          value={reviewForm.nextAppointmentTime}
                          onChange={e => setReviewForm({...reviewForm, nextAppointmentTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Doctor Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Clinical Notes</label>
                  <textarea 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                    rows={4}
                    placeholder="Add your clinical assessment and notes..."
                    value={reviewForm.doctorNotes}
                    onChange={e => setReviewForm({...reviewForm, doctorNotes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6">
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || (reviewForm.decision === 'approve_with_followup' && !reviewForm.nextAppointmentDate)}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Re-Examination Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Schedule Physical Re-Examination</h3>
                  <p className="text-blue-100 text-sm mt-1">Step #{schedulingStepNumber}</p>
                </div>
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Appointment Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={reExaminationForm.date}
                  onChange={e => setReExaminationForm({...reExaminationForm, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Time Slot</label>
                {loadingTimeSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <select 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={reExaminationForm.time}
                    onChange={e => setReExaminationForm({...reExaminationForm, time: e.target.value})}
                    disabled={availableTimeSlots.length === 0}
                  >
                    <option value="">Select time...</option>
                    {availableTimeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                )}
                {reExaminationForm.date && availableTimeSlots.length === 0 && !loadingTimeSlots && (
                  <p className="text-xs text-amber-600 mt-2">No available slots for this date. Try another date.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Duration</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={reExaminationForm.duration}
                  onChange={e => setReExaminationForm({...reExaminationForm, duration: e.target.value})}
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Instructions for Patient</label>
                <textarea 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                  rows={3}
                  placeholder="e.g., Bring previous medical records, come fasting..."
                  value={reExaminationForm.notes}
                  onChange={e => setReExaminationForm({...reExaminationForm, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 p-6 rounded-b-2xl">
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleScheduleReExaminationSubmit}
                  disabled={isSubmitting || !reExaminationForm.date || !reExaminationForm.time}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule Visit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Re-examination Modal */}
      {showCompleteReExaminationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Complete Physical Re-Examination</h3>
                  <p className="text-green-100 text-sm mt-1">Step #{completingStepNumber}</p>
                </div>
                <button 
                  onClick={() => setShowCompleteReExaminationModal(false)}
                  className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Clinical Notes *</label>
                <textarea 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none bg-white"
                  rows={4}
                  placeholder="Document your findings from the physical examination..."
                  value={completeReExaminationForm.doctorNotes}
                  onChange={e => setCompleteReExaminationForm({...completeReExaminationForm, doctorNotes: e.target.value})}
                />
                <p className="text-xs text-slate-500 mt-2">
                  This will mark the physical visit as completed and update the appointment status.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    📝
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">What happens next?</p>
                    <ul className="text-sm text-slate-600 mt-2 space-y-1">
                      <li>• Step status changes to "completed"</li>
                      <li>• Appointment status updates to "completed"</li>
                      <li>• Patient will be notified</li>
                      <li>• Next step will be activated (if available)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 p-6 rounded-b-2xl">
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowCompleteReExaminationModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCompleteReExamination}
                  disabled={isSubmitting || !completeReExaminationForm.doctorNotes.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Complete & Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Treatment Step Modal */}
      {showStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-white border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingStepNumber ? `Edit Step #${editingStepNumber}` : 'Add Treatment Step'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Configure treatment details</p>
                </div>
                <button 
                  onClick={() => setShowStepModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Title *</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="e.g., Initial Treatment Phase"
                      value={stepForm.title}
                      onChange={e => setStepForm({...stepForm, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Brief description of this step"
                      value={stepForm.description}
                      onChange={e => setStepForm({...stepForm, description: e.target.value})}
                    />
                  </div>
                </div>

                {/* Physical Visit */}
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={stepForm.isPhysicalVisit}
                      onChange={e => setStepForm({...stepForm, isPhysicalVisit: e.target.checked})}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Physical Re-Examination Required</p>
                      <p className="text-sm text-slate-600">Patient needs to visit for physical assessment</p>
                    </div>
                  </label>
                </div>

                {/* Prescriptions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-800">Prescriptions</h4>
                    <button 
                      type="button"
                      onClick={() => setStepForm({
                        ...stepForm, 
                        prescriptions: [...stepForm.prescriptions, {medication: '', dosage: '', duration: '', instructions: ''}]
                      })}
                      className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 rounded-lg font-medium hover:from-blue-100 hover:to-blue-200 transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Medication
                    </button>
                  </div>

                  <div className="space-y-3">
                    {stepForm.prescriptions.map((p, i) => (
                      <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium text-slate-700">Medication #{i + 1}</h5>
                          <button 
                            type="button"
                            onClick={() => setStepForm({
                              ...stepForm, 
                              prescriptions: stepForm.prescriptions.filter((_, idx) => idx !== i)
                            })}
                            className="px-3 py-1 text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Medication</label>
                            <select 
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              value={p.medication}
                              onChange={e => {
                                const n = [...stepForm.prescriptions];
                                n[i].medication = e.target.value;
                                setStepForm({...stepForm, prescriptions: n});
                              }}
                            >
                              <option value="">Select medication...</option>
                              {availableDrugs.map(d => (
                                <option key={d._id} value={d.name}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Dosage</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              placeholder="e.g., 1 tablet twice daily"
                              value={p.dosage}
                              onChange={e => {
                                const n = [...stepForm.prescriptions];
                                n[i].dosage = e.target.value;
                                setStepForm({...stepForm, prescriptions: n});
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Duration</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              placeholder="e.g., 7 days"
                              value={p.duration}
                              onChange={e => {
                                const n = [...stepForm.prescriptions];
                                n[i].duration = e.target.value;
                                setStepForm({...stepForm, prescriptions: n});
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Instructions</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              placeholder="Additional instructions"
                              value={p.instructions}
                              onChange={e => {
                                const n = [...stepForm.prescriptions];
                                n[i].instructions = e.target.value;
                                setStepForm({...stepForm, prescriptions: n});
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 p-6">
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowStepModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveStep}
                  disabled={isSubmitting || !stepForm.title.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingStepNumber ? 'Update Step' : 'Create Step'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      `}</style>
    </div>
  );
};

export default ConsultationDetail;