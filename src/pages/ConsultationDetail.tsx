import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Consultation, TreatmentStep, StepStatus } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, calculateAge } from '../utils/api';

// Interfaces for component use
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

interface LocalTreatmentStep extends Omit<TreatmentStep, 'completedAt'> {
  _id?: string;
  completedAt?: string | Date;
  condition_description?: string;
  patient_message?: string;
  reExaminationScheduled?: boolean;
  reExaminationDate?: Date;
  reExaminationAppointmentId?: string;
  arrivalConfirmed?: boolean;
  arrivalConfirmedAt?: Date;
}

const availableTimeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30'
];

const STATUS_CONFIG = {
  'pending': { 
    color: 'bg-slate-100 text-slate-600 border-slate-200', 
    icon: 'hourglass_top', 
    label: 'Pending Phase' 
  },
  'in-progress': { 
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200', 
    icon: 'clinical_notes', 
    label: 'Active Treatment' 
  },
  'scheduled': {
    color: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200',
    icon: 'calendar_today',
    label: 'Scheduled Visit'
  },
  'completed': { 
    color: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200', 
    icon: 'review', 
    label: 'Awaiting Approval' 
  },
  'approved': { 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: 'verified', 
    label: 'Verified & Closed' 
  }
};

const ConsultationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showStepModal, setShowStepModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  const [editingStepNumber, setEditingStepNumber] = useState<number | null>(null);
  const [reviewingStepNumber, setReviewingStepNumber] = useState<number | null>(null);
  const [deletingStepNumber, setDeletingStepNumber] = useState<number | null>(null);
  const [schedulingStepNumber, setSchedulingStepNumber] = useState<number | null>(null);
  
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    prescriptions: [] as PrescriptionItem[],
    isPhysicalVisit: false
  });

  const [editForm, setEditForm] = useState({
    diagnosis: '',
    severity: 'mild' as 'mild' | 'moderate' | 'severe' | 'critical',
    notes: '',
    follow_up_instructions: '',
    next_appointment: ''
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

  const doctorId = getDoctorId();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
          setEditForm({
            diagnosis: found.diagnosis || '',
            severity: found.severity || 'mild',
            notes: found.notes || '',
            follow_up_instructions: found.follow_up_instructions || '',
            next_appointment: found.next_appointment ? new Date(found.next_appointment).toISOString().split('T')[0] : ''
          });
        } else {
          setError('Record not found.');
        }
      }
    } catch (e) {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  }, [doctorId, id]);

  const fetchDrugs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/drugs`);
      const data = await response.json();
      if (data.success) setAvailableDrugs(data.data || []);
    } catch (error) {}
  }, []);

const fetchAvailableTimeSlots = useCallback(async (date: string) => {
    setLoadingTimeSlots(true);
  try {
    console.log('🔍 Fetching time slots for date:', date, 'doctorId:', doctorId);
    
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
    
    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (data.success) {
      const slots = data.data || [];
      console.log('✅ Available slots:', slots);
      setAvailableTimeSlots(slots);
    } else {
      console.error('❌ API error:', data.message);
      setAvailableTimeSlots([]);
      showToast(data.message || 'Error fetching time slots', 'error');
    }
  } catch (error) {
    console.error('❌ Network error fetching time slots:', error);
    setAvailableTimeSlots([]);
    showToast('Failed to load available time slots', 'error');
  }
  finally {
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

  const handleSubmitReview = async (customDecision?: any) => {
    const activeDecision = customDecision || reviewForm;
    const stepToReview = reviewingStepNumber;
    
    if (!id || !stepToReview) return;
    
    setIsSubmitting(true);
    try {
      const combinedDateTime = activeDecision.nextAppointmentDate 
        ? `${activeDecision.nextAppointmentDate}T${activeDecision.nextAppointmentTime || '09:00'}:00` 
        : null;

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/steps/${stepToReview}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...activeDecision,
          nextAppointmentDate: combinedDateTime,
          completeConsultation: activeDecision.decision === 'approve_and_complete'
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowReviewModal(false);
        fetchConsultation();
        showToast('Clinical step verified and approved.');
      } else {
        showToast(data.message || 'Error processing review.', 'error');
      }
    } catch (error) {
      showToast('API Communication error.', 'error');
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
      notes: `Please come prepared for physical examination. Bring any previous medical records.`,
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
        showToast('Re-examination scheduled successfully. Patient has been notified.', 'success');
      } else {
        showToast(data.message || 'Error scheduling re-examination.', 'error');
      }
    } catch (error) {
      showToast('Failed to schedule re-examination.', 'error');
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
        showToast('Arrival confirmed. Starting re-examination process.', 'success');
        await fetchConsultation();
        
        // Auto-open modal for the next treatment phase
        setEditingStepNumber(null);
        setStepForm({
          title: `Post Re-Examination: Phase ${(consultation?.treatment_plan.length || 0) + 1}`,
          description: `Treatment plan established based on physical re-examination findings from ${new Date().toLocaleDateString('vi-VN')}.`,
          prescriptions: [],
          isPhysicalVisit: false
        });
        setShowStepModal(true);
      }
    } catch (error) {
      showToast('Error confirming arrival.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (step: LocalTreatmentStep) => {
    setReviewingStepNumber(step.stepNumber);
    setReviewForm({
      decision: 'approve_with_followup',
      doctorNotes: '',
      requireFollowUp: true,
      nextAppointmentDate: '',
      nextAppointmentTime: '09:00',
      followUpInstructions: `Recommended observation post-${step.title}.`,
      additionalStepTitle: `Clinical Follow-up: Physical Review`,
      additionalStepDescription: `Mandatory clinic visit for physical assessment.`
    });
    setShowReviewModal(true);
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
        showToast(editingStepNumber ? 'Step updated successfully.' : 'Clinical phase initialized successfully.');
      }
    } catch (error) {
      showToast('Error saving step.', 'error');
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-sm"></div>
      <p className="text-slate-400 font-medium text-sm animate-pulse tracking-tight">Syncing Clinical Data...</p>
    </div>
  );

  const approvedSteps = consultation?.treatment_plan.filter(s => s.status === 'approved').length || 0;
  const totalSteps = consultation?.treatment_plan.length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((approvedSteps / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900 flex flex-col">
      {/* Dynamic Toast */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white animate-fade-in-up ${toast.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'clinical_notes'}</span>
          <p className="font-bold text-sm tracking-tight">{toast.message}</p>
        </div>
      )}

      {/* Main Clinical Header */}
      <header className="bg-white border-b sticky top-0 z-40 h-20 flex items-center px-8 shadow-sm justify-between">
        <div className="flex items-center gap-6">
          <Link to="/consultations" className="group p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 hover:border-indigo-100">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-600 transition-colors">arrow_back</span>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Patient Case: #{id?.slice(-6).toUpperCase()}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border-2 ${STATUS_CONFIG[consultation?.consultation_status as keyof typeof STATUS_CONFIG]?.color || 'bg-indigo-50 text-indigo-700'}`}>
                {consultation?.consultation_status?.replace('-', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
               <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(consultation?.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
               <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
               <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">flag</span> Priority: <span className={consultation?.priority === 'urgent' ? 'text-rose-500' : 'text-slate-600'}>{consultation?.priority}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end mr-6">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timeline Progress</div>
             <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-emerald-500 transition-all duration-700 shadow-[0_0_100px_rgba(16,185,129,0.3)]" style={{ width: `${progressPercent}%` }}></div>
             </div>
             <div className="text-[10px] font-bold text-emerald-600 mt-1">{approvedSteps} / {totalSteps} Phases Validated</div>
          </div>
          <button onClick={() => setShowEditModal(true)} className="px-5 py-2.5 text-xs font-black text-slate-600 bg-white hover:bg-slate-50 border-2 border-slate-100 rounded-xl transition-all uppercase tracking-widest">Edit Assessment</button>
          <button 
            onClick={() => navigate(`/doctors/consultations/${id}/finalize`)}
            disabled={!consultation?.treatment_plan.every(s => s.status === 'approved')}
            className="px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            Finalize Case
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-8 grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-10">
        
        {/* Left Sidebar: Sticky Patient Profile */}
        <aside className="space-y-8">
           <div className="sticky top-28 space-y-8">
              {/* Profile Card */}
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden p-8 flex flex-col items-center">
                 <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-[2rem] bg-indigo-50 border-4 border-white shadow-xl overflow-hidden group">
                       {consultation?.user_id.avatar ? (
                         <img src={getAvatarUrl(consultation.user_id.avatar)} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-indigo-300 font-black text-4xl uppercase">
                           {consultation?.user_id.name.charAt(0)}
                         </div>
                       )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-xl border-4 border-white shadow-lg flex items-center justify-center">
                       <span className="material-symbols-outlined text-white text-[16px]">verified</span>
                    </div>
                 </div>

                 <h3 className="text-2xl font-black text-slate-800 tracking-tight text-center leading-tight mb-2">{consultation?.user_id.name}</h3>
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
                    <span>{consultation?.user_id.gender}</span>
                    <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                    <span>{consultation?.user_id.dateOfBirth ? calculateAge(consultation.user_id.dateOfBirth) : 'N/A'} yrs</span>
                 </div>

                 <div className="w-full space-y-4">
                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px] text-indigo-500">stethoscope</span> Clinical Diagnosis
                       </div>
                       <div className="font-bold text-slate-800 text-sm italic">"{consultation?.diagnosis || 'Unassessed'}"</div>
                    </div>
                 </div>
              </div>

              {/* Next Appointment Card */}
              <div className="bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-100 p-8 text-white relative overflow-hidden">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-[11px] font-black uppercase tracking-widest opacity-70">Follow-up Schedule</h4>
                       <span className="material-symbols-outlined opacity-60">calendar_clock</span>
                    </div>

                    {consultation?.next_appointment ? (
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-20 bg-white rounded-2xl flex flex-col items-center justify-center border shadow-lg shrink-0">
                           <span className="text-[10px] font-black text-indigo-300 uppercase leading-none mb-1">{new Date(consultation.next_appointment).toLocaleString('default', { month: 'short' })}</span>
                           <span className="text-3xl font-black text-indigo-700 leading-none">{new Date(consultation.next_appointment).getDate()}</span>
                        </div>
                        <div>
                           <div className="text-lg font-bold leading-tight">Re-Examination Visit</div>
                           <div className="text-xs text-white/60 font-medium mt-1 uppercase tracking-tight flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              {new Date(consultation.next_appointment).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 border-2 border-dashed border-white/20 rounded-2xl text-center">
                         <p className="text-xs font-bold text-white/50 italic">No follow-up visit scheduled.</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </aside>

        {/* Right Content: Therapeutic Timeline */}
        <div className="space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <span className="material-symbols-outlined text-[20px]">hub</span>
                 </div>
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Therapeutic Protocol Timeline</h2>
              </div>
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
                className="group flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border-2 border-indigo-100 hover:border-indigo-600 rounded-xl transition-all duration-300 shadow-sm"
              >
                 <span className="material-symbols-outlined text-[20px]">add_task</span>
                 <span className="text-xs font-black uppercase tracking-widest">Initialize Clinical Phase</span>
              </button>
           </div>

           <div className="relative pl-10 ml-5 border-l-4 border-slate-100 space-y-12">
              {consultation?.treatment_plan.map((step, index) => {
                const config = STATUS_CONFIG[step.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['pending'];
                const isCompleted = step.status === 'completed';
                const isApproved = step.status === 'approved';
                const isInProgress = step.status === 'in-progress';
                const isScheduled = step.status === 'scheduled';
                const rx = getPrescriptionDisplay(step);
                
                // Identify Re-Examination / Physical Visit
                const isPhysicalVisit = step.title?.toLowerCase().includes('re-ex') || 
                                      step.title?.toLowerCase().includes('tái khám') ||
                                      step.description?.toLowerCase().includes('physical') ||
                                      step.isPhysicalVisit;

                return (
                  <div key={index} className="relative animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    {/* Timeline Node */}
                    <div className={`absolute -left-[54px] top-0 w-14 h-14 rounded-2xl border-4 border-slate-50 shadow-lg flex items-center justify-center z-10 transition-all duration-500 ${
                      isApproved ? 'bg-emerald-500 text-white' : 
                      isCompleted ? 'bg-amber-400 text-white' : 
                      isScheduled ? 'bg-blue-500 text-white' :
                      isInProgress ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-white text-slate-300'
                    }`}>
                      {isApproved ? (
                        <span className="material-symbols-outlined text-[28px] animate-in zoom-in">task_alt</span>
                      ) : (
                        <span className="text-lg font-black tracking-tight">
                           {isPhysicalVisit ? <span className="material-symbols-outlined">home_health</span> : step.stepNumber}
                        </span>
                      )}
                    </div>

                    {/* Step Content Card */}
                    <div className={`bg-white rounded-[2rem] border-2 transition-all duration-500 shadow-sm hover:shadow-xl hover:translate-x-1 ${
                      isCompleted ? 'border-amber-400 bg-amber-50/20' : 
                      isScheduled ? 'border-blue-400 bg-blue-50/20' :
                      isInProgress ? (isPhysicalVisit ? 'border-emerald-400 bg-emerald-50/20' : 'border-indigo-200') : 'border-slate-100'
                    }`}>
                      <div className="p-8">
                         <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                            <div className="flex-1">
                               <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{step.title}</h3>
                                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border ${config.color}`}>
                                    {config.label}
                                  </span>
                                  
                                  {/* Re-Examination Badge */}
                                  {isPhysicalVisit && (
                                    <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">home_health</span> 
                                      {isScheduled ? 'Scheduled Physical Visit' : 'Physical Re-Examination'}
                                    </span>
                                  )}
                                  
                                  {/* Appointment Date Badge */}
                                  {(step as LocalTreatmentStep).reExaminationScheduled && (step as LocalTreatmentStep).reExaminationDate && (
                                    <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                      {new Date((step as LocalTreatmentStep).reExaminationDate!).toLocaleDateString()}
                                    </span>
                                  )}
                               </div>
                               <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">{step.description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                               {/* CASE 1: Physical Visit - Schedule or Confirm */}
                               {isPhysicalVisit && (
                                 <div className="flex items-center gap-2">
                                   {/* Schedule Button (for pending physical visits) */}
                                   {(!(step as LocalTreatmentStep).reExaminationScheduled) && (
                                     <button 
                                       onClick={() => handleScheduleReExamination(step as LocalTreatmentStep)}
                                       className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all transform active:scale-95"
                                     >
                                       <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                                       Schedule Re-Examination
                                     </button>
                                   )}
                                   
                                   {/* Confirm Arrival Button (for scheduled visits on appointment day) */}
                                   {(step as LocalTreatmentStep).reExaminationScheduled && 
                                    !(step as LocalTreatmentStep).arrivalConfirmed && 
                                    new Date((step as LocalTreatmentStep).reExaminationDate!).toDateString() === new Date().toDateString() && (
                                     <button 
                                       onClick={() => handleConfirmReExArrival(step as LocalTreatmentStep)}
                                       className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all transform active:scale-95"
                                     >
                                       <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                                       Confirm Arrival & Start
                                     </button>
                                   )}
                                   
                                   {/* Already Confirmed Badge */}
                                   {(step as LocalTreatmentStep).arrivalConfirmed && (
                                     <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-2">
                                       <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                       Arrival Confirmed
                                     </span>
                                   )}
                                 </div>
                               )}

                               {/* CASE 2: Standard Clinical Review (Completed Digital Step) */}
                               {isCompleted && !isPhysicalVisit && (
                                 <button 
                                   onClick={() => openReviewModal(step as LocalTreatmentStep)}
                                   className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-100 transition-all transform active:scale-95 animate-pulse hover:animate-none"
                                 >
                                    <span className="material-symbols-outlined text-[20px]">fact_check</span>
                                    Clinical Review
                                 </button>
                               )}

                               <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                  {!isApproved && !isScheduled && (
                                    <button onClick={() => { 
                                      setEditingStepNumber(step.stepNumber); 
                                      setStepForm({ 
                                        title: step.title, 
                                        description: step.description, 
                                        prescriptions: rx as any,
                                        isPhysicalVisit: isPhysicalVisit
                                      }); 
                                      setShowStepModal(true); 
                                    }} className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors">
                                      <span className="material-symbols-outlined text-[20px]">edit_square</span>
                                    </button>
                                  )}
                                  <button onClick={() => { 
                                    setDeletingStepNumber(step.stepNumber); 
                                    setShowDeleteConfirm(true); 
                                  }} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                  </button>
                               </div>
                            </div>
                         </div>

                         {/* Scheduled Appointment Info */}
                         {(step as LocalTreatmentStep).reExaminationScheduled && (step as LocalTreatmentStep).reExaminationDate && (
                           <div className="mb-8 p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-100">
                             <div className="flex items-center gap-3 mb-3">
                               <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                 <span className="material-symbols-outlined text-blue-600">calendar_month</span>
                               </div>
                               <div>
                                 <h4 className="font-black text-sm text-blue-800 uppercase tracking-widest">Scheduled Appointment</h4>
                                 <p className="text-sm text-blue-600 font-medium">
                                   {new Date((step as LocalTreatmentStep).reExaminationDate!).toLocaleDateString('en-US', { 
                                     weekday: 'long', 
                                     year: 'numeric', 
                                     month: 'long', 
                                     day: 'numeric' 
                                   })} at {' '}
                                   {new Date((step as LocalTreatmentStep).reExaminationDate!).toLocaleTimeString([], { 
                                     hour: '2-digit', 
                                     minute: '2-digit' 
                                   })}
                                 </p>
                               </div>
                             </div>
                             
                             {/* Status Indicator */}
                             {(step as LocalTreatmentStep).arrivalConfirmed ? (
                               <div className="flex items-center gap-2 text-emerald-600">
                                 <span className="material-symbols-outlined">check_circle</span>
                                 <span className="text-sm font-bold">Patient arrived at {new Date((step as LocalTreatmentStep).arrivalConfirmedAt!).toLocaleTimeString()}</span>
                               </div>
                             ) : new Date((step as LocalTreatmentStep).reExaminationDate!).toDateString() === new Date().toDateString() ? (
                               <div className="flex items-center gap-2 text-amber-600">
                                 <span className="material-symbols-outlined">schedule</span>
                                 <span className="text-sm font-bold">Today's appointment - Waiting for patient arrival</span>
                               </div>
                             ) : (
                               <div className="flex items-center gap-2 text-blue-600">
                                 <span className="material-symbols-outlined">pending_actions</span>
                                 <span className="text-sm font-bold">Awaiting appointment date</span>
                               </div>
                             )}
                           </div>
                         )}

                         {/* Drug Details Grid */}
                         {rx.length > 0 && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                             {rx.map((p, i) => (
                               <div key={i} className="bg-slate-50/80 rounded-2xl border border-slate-100 p-5 flex flex-col gap-2 group/rx transition-all hover:bg-white hover:shadow-md">
                                  <div className="flex items-center justify-between mb-1">
                                     <div className="font-black text-slate-800 text-sm tracking-tight">{p.name}</div>
                                     <span className="material-symbols-outlined text-[16px] text-indigo-400">medication</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                     <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">scale</span> {p.dosage}</span>
                                     <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">history</span> {p.duration}</span>
                                  </div>
                               </div>
                             ))}
                           </div>
                         )}

                         {/* Patient's Reported Data */}
                         {step.condition_description && (
                           <div className="bg-white rounded-2xl border-2 border-amber-100 p-6 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-2 opacity-10 transition-opacity group-hover:opacity-20">
                                 <span className="material-symbols-outlined text-[80px]">chat_bubble_outline</span>
                              </div>
                              <div className="relative z-10">
                                 <div className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">record_voice_over</span> Patient Status Report
                                 </div>
                                 <p className="text-slate-700 font-medium italic leading-relaxed text-sm">"{step.condition_description}"</p>
                              </div>
                           </div>
                         )}

                         {/* Review History */}
                         {step.doctorNotes && (
                           <div className="mt-6 flex items-center gap-4 py-4 px-6 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                 <span className="material-symbols-outlined text-[18px]">gavel</span>
                              </div>
                              <div className="text-[11px] font-medium text-slate-600">
                                 <span className="font-black text-emerald-700 uppercase tracking-tight mr-2">Validated Decision:</span> 
                                 {step.doctorNotes}
                                 {step.approvedAt && <span className="text-slate-400 ml-2 italic">on {new Date(step.approvedAt).toLocaleDateString()}</span>}
                              </div>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>

           {/* Proactive Add Phase Trigger (Post Re-Examination UI) */}
           {consultation?.treatment_plan[consultation.treatment_plan.length - 1]?.status === 'approved' && (
             <div className="p-10 border-2 border-dashed border-indigo-200 rounded-[2.5rem] bg-indigo-50/30 flex flex-col items-center justify-center text-center group transition-all hover:bg-white hover:border-indigo-400">
                <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-100/50 mb-4 transition-transform group-hover:scale-110">
                   <span className="material-symbols-outlined text-[32px]">clinical_notes</span>
                </div>
                <h4 className="text-xl font-black text-slate-800 tracking-tight">Assessment Completed</h4>
                <p className="text-sm text-slate-500 font-medium max-w-md mt-2 mb-8 italic">Based on the re-examination findings, you can now initialize the next therapeutic phase to continue the patient's recovery protocol.</p>
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
                   className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1"
                >
                   Initialize New Clinical Phase
                </button>
             </div>
           )}
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* 1. Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="px-10 py-8 border-b-2 border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
               <div>
                  <h3 className="font-black text-2xl tracking-tight">Phase Clinical Validation</h3>
                  <p className="text-xs text-white/60 font-medium uppercase tracking-widest mt-1">Reviewing Protocol Step #{reviewingStepNumber}</p>
               </div>
               <button onClick={() => setShowReviewModal(false)} className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-[20px]">close</span>
               </button>
            </div>
            
            <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Therapeutic Path</label>
                  <div className="grid grid-cols-1 gap-4">
                     <label className={`flex items-center gap-5 p-6 rounded-3xl border-2 transition-all cursor-pointer ${reviewForm.decision === 'approve_with_followup' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${reviewForm.decision === 'approve_with_followup' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                           {reviewForm.decision === 'approve_with_followup' && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                        </div>
                        <input type="radio" checked={reviewForm.decision === 'approve_with_followup'} onChange={() => setReviewForm({...reviewForm, decision: 'approve_with_followup'})} className="hidden" />
                        <div>
                           <div className="font-black text-slate-800 text-base">Approve & Schedule Physical Follow-up</div>
                           <div className="text-xs text-slate-500 font-medium leading-relaxed mt-1">Validated for next phase. Scheduling a clinic visit is mandatory.</div>
                        </div>
                     </label>

                     <label className={`flex items-center gap-5 p-6 rounded-3xl border-2 transition-all cursor-pointer ${reviewForm.decision === 'approve_and_complete' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-100 hover:border-emerald-200'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${reviewForm.decision === 'approve_and_complete' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                           {reviewForm.decision === 'approve_and_complete' && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                        </div>
                        <input type="radio" checked={reviewForm.decision === 'approve_and_complete'} onChange={() => setReviewForm({...reviewForm, decision: 'approve_and_complete'})} className="hidden" />
                        <div>
                           <div className="font-black text-slate-800 text-base">Approve & Conclude Protocol</div>
                           <div className="text-xs text-slate-500 font-medium leading-relaxed mt-1">Full recovery or endpoint reached. Closes the active consultation.</div>
                        </div>
                     </label>
                  </div>
               </div>

               {reviewForm.decision === 'approve_with_followup' && (
                  <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 space-y-6 shadow-inner">
                     <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                        <h4 className="font-black text-xs uppercase tracking-widest">Next Appointment Parameters</h4>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Clinic Review Date <span className="text-rose-500">*</span></label>
                           <input 
                             type="date" 
                             className="w-full border-2 border-slate-200 p-3.5 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-bold" 
                             value={reviewForm.nextAppointmentDate} 
                             onChange={e => setReviewForm({...reviewForm, nextAppointmentDate: e.target.value})}
                             min={new Date().toISOString().split('T')[0]}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Appointment Time <span className="text-rose-500">*</span></label>
                           <input 
                             type="time" 
                             className="w-full border-2 border-slate-200 p-3.5 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-bold" 
                             value={reviewForm.nextAppointmentTime} 
                             onChange={e => setReviewForm({...reviewForm, nextAppointmentTime: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>
               )}

               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Doctor's Clinical Notes</label>
                  <textarea 
                    className="w-full border-2 border-slate-100 rounded-[2rem] p-6 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm h-32 resize-none font-medium placeholder:text-slate-300"
                    placeholder="Enter final observations for this phase..."
                    value={reviewForm.doctorNotes}
                    onChange={(e) => setReviewForm({...reviewForm, doctorNotes: e.target.value})}
                  />
               </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t-2 border-slate-100 flex justify-end gap-4">
              <button 
                onClick={() => setShowReviewModal(false)} 
                className="px-8 py-3.5 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={() => handleSubmitReview()}
                disabled={isSubmitting || (reviewForm.decision === 'approve_with_followup' && !reviewForm.nextAppointmentDate)}
                className="px-10 py-3.5 font-black text-xs uppercase tracking-widest text-white bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-100 disabled:opacity-40 disabled:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-3"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : <span className="material-symbols-outlined text-[20px]">task_alt</span>}
                Commit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Schedule Re-Examination Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-10 py-8 border-b-2 border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
               <div>
                  <h3 className="font-black text-2xl tracking-tight">Schedule Re-Examination</h3>
                  <p className="text-xs text-white/60 font-medium uppercase tracking-widest mt-1">
                    Step #{schedulingStepNumber}: Physical Visit
                  </p>
               </div>
               <button onClick={() => setShowScheduleModal(false)} className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-[20px]">close</span>
               </button>
            </div>
            
            <div className="p-10 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Select Appointment Date
                </label>
                <input 
                  type="date" 
                  className="w-full border-2 border-slate-200 p-3.5 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-bold"
                  value={reExaminationForm.date}
                  onChange={e => setReExaminationForm({...reExaminationForm, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              {/* Trong Schedule Re-Examination Modal */}
<div className="space-y-3">
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
    Select Time Slot
  </label>
  <select 
    className="w-full border-2 border-slate-200 p-3.5 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-bold"
    value={reExaminationForm.time}
    onChange={e => setReExaminationForm({...reExaminationForm, time: e.target.value})}
    disabled={availableTimeSlots.length === 0}
  >
    <option value="">Select time...</option>
    {availableTimeSlots.length > 0 ? (
      availableTimeSlots.map(slot => (
        <option key={slot} value={slot}>{slot}</option>
      ))
    ) : reExaminationForm.date ? (
      <option value="" disabled>
        No available slots. Try another date.
      </option>
    ) : (
      <option value="" disabled>
        Select a date first
      </option>
    )}
  </select>
  
  {/* Debug thông tin */}
  {reExaminationForm.date && availableTimeSlots.length === 0 && (
    <div className="mt-2 p-2 bg-amber-50 text-amber-700 rounded-lg text-xs">
      <p className="font-bold">⚠️ No time slots available for {reExaminationForm.date}</p>
      <p className="text-xs mt-1">Try selecting a different date.</p>
    </div>
  )}
</div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Appointment Duration (minutes)
                </label>
                <select 
                  className="w-full border-2 border-slate-200 p-3.5 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-bold"
                  value={reExaminationForm.duration}
                  onChange={e => setReExaminationForm({...reExaminationForm, duration: e.target.value})}
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Instructions for Patient
                </label>
                <textarea 
                  className="w-full border-2 border-slate-100 rounded-[2rem] p-4 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm h-24 resize-none font-medium placeholder:text-slate-300"
                  placeholder="Instructions for the re-examination (e.g., bring medical records, come fasting, etc.)"
                  value={reExaminationForm.notes}
                  onChange={e => setReExaminationForm({...reExaminationForm, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t-2 border-slate-100 flex justify-end gap-4">
              <button 
                onClick={() => setShowScheduleModal(false)} 
                className="px-8 py-3.5 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleScheduleReExaminationSubmit}
                disabled={isSubmitting || !reExaminationForm.date || !reExaminationForm.time}
                className="px-10 py-3.5 font-black text-xs uppercase tracking-widest text-white bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-100 disabled:opacity-40 disabled:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-3"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : <span className="material-symbols-outlined text-[20px]">schedule_send</span>}
                Schedule & Notify Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Phase Config Modal (Add/Edit) */}
      {showStepModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
              <div className="p-10 border-b-2 border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined">edit_calendar</span>
                       </div>
                       {editingStepNumber ? `Configure Phase ${editingStepNumber}` : 'Initialize New Clinical Phase'}
                    </h3>
                 </div>
                 <button onClick={() => setShowStepModal(false)} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Phase Title</label>
                       <input 
                         className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none font-black text-slate-800 transition-all" 
                         value={stepForm.title} 
                         onChange={e => setStepForm({...stepForm, title: e.target.value})} 
                         placeholder="e.g. Acute Induction Phase or Re-Examination Visit"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Objective</label>
                       <input 
                         className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none font-medium text-slate-600 transition-all" 
                         value={stepForm.description} 
                         onChange={e => setStepForm({...stepForm, description: e.target.value})} 
                         placeholder="e.g. Reduction of focal inflammation or Physical assessment and follow-up"
                       />
                    </div>
                 </div>

                 {/* Physical Visit Checkbox */}
                 <div className="flex items-center gap-4 p-6 bg-slate-50/50 rounded-2xl border-2 border-slate-100">
                    <input
                      type="checkbox"
                      id="physicalVisit"
                      checked={stepForm.isPhysicalVisit}
                      onChange={(e) => setStepForm({...stepForm, isPhysicalVisit: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="physicalVisit" className="flex items-center gap-3 cursor-pointer">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-rose-600">home_health</span>
                      </div>
                      <div>
                        <div className="font-black text-slate-800">Physical Re-Examination Visit</div>
                        <div className="text-sm text-slate-500">Check if this step requires an in-person clinic visit for physical assessment</div>
                      </div>
                    </label>
                 </div>

                 {/* Medication Section */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center">
                             <span className="material-symbols-outlined text-[18px]">vaccines</span>
                          </div>
                          <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Medication Protocol</h4>
                       </div>
                       <button 
                         onClick={() => setStepForm({...stepForm, prescriptions: [...stepForm.prescriptions, {medication: '', dosage: '', duration: '', instructions: ''}]})}
                         className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all duration-300"
                       >
                          Add Compound
                       </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       {stepForm.prescriptions.map((p, i) => (
                         <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border-2 border-slate-100 relative group/rx hover:border-indigo-100 transition-all">
                            <button 
                              onClick={() => setStepForm({...stepForm, prescriptions: stepForm.prescriptions.filter((_, idx) => idx !== i)})}
                              className="absolute -top-3 -right-3 w-8 h-8 bg-white text-rose-500 rounded-xl border border-slate-100 shadow-lg flex items-center justify-center opacity-0 group-hover/rx:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                            >
                               <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Select Medication</label>
                                  <select className="w-full border-2 border-slate-200 p-2.5 rounded-xl text-sm font-bold bg-white" value={p.medication} onChange={e => { const n = [...stepForm.prescriptions]; n[i].medication = e.target.value; setStepForm({...stepForm, prescriptions: n})}}>
                                     <option value="">Choose Agent...</option>
                                     {availableDrugs.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                  </select>
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Dosage Regimen</label>
                                  <input className="w-full border-2 border-slate-200 p-2.5 rounded-xl text-sm font-bold bg-white" placeholder="e.g. 1 tab bid" value={p.dosage} onChange={e => { const n = [...stepForm.prescriptions]; n[i].dosage = e.target.value; setStepForm({...stepForm, prescriptions: n})}} />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Duration</label>
                                  <input className="w-full border-2 border-slate-200 p-2.5 rounded-xl text-sm font-bold bg-white" placeholder="e.g. 10 days" value={p.duration} onChange={e => { const n = [...stepForm.prescriptions]; n[i].duration = e.target.value; setStepForm({...stepForm, prescriptions: n})}} />
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t-2 border-slate-50 bg-slate-50/30 flex justify-end gap-4">
                 <button onClick={() => setShowStepModal(false)} className="px-8 py-3.5 font-black text-xs uppercase tracking-widest text-slate-400">Cancel</button>
                 <button onClick={handleSaveStep} className="px-12 py-3.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                   {editingStepNumber ? 'Update Phase Protocol' : 'Commit Phase Protocol'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Global Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
      `}} />
    </div>
  );
};

export default ConsultationDetail;