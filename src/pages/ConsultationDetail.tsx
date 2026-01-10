import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Consultation, TreatmentStep } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, calculateAge } from '../utils/api';

// Interfaces
interface Drug {
  _id: string;
  name: string;
  category_id?: {
    _id: string;
    name: string;
  };
  unit?: string;
  price?: number;
  stock_quantity?: number;
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
}

// Constants
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

const SEVERITY_LEVELS = ["mild", "moderate", "severe", "critical"];

const STATUS_CONFIG = {
  'pending': { color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400', icon: 'hourglass_empty', label: 'Pending' },
  'in-progress': { color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: 'sync', label: 'In Progress' },
  'completed': { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: 'assignment_turned_in', label: 'Completed (Waiting Review)' },
  'approved': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: 'verified', label: 'Approved' },
  'rejected': { color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: 'cancel', label: 'Rejected' }
};

const ConsultationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI States
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionStepId, setActionStepId] = useState<number | null>(null);

  // Modal states
  const [showStepModal, setShowStepModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPatientReportModal, setShowPatientReportModal] = useState(false);
  
  // Current operation states
  const [editingStepNumber, setEditingStepNumber] = useState<number | null>(null);
  const [reviewingStepNumber, setReviewingStepNumber] = useState<number | null>(null);
  const [deletingStepNumber, setDeletingStepNumber] = useState<number | null>(null);
  const [selectedPatientReport, setSelectedPatientReport] = useState<LocalTreatmentStep | null>(null);
  
  // Drug Inventory State
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [loadingDrugs, setLoadingDrugs] = useState(false);

  // Form States
  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    prescriptions: [] as PrescriptionItem[]
  });

  const [editForm, setEditForm] = useState({
    diagnosis: '',
    severity: 'mild' as 'mild' | 'moderate' | 'severe' | 'critical',
    notes: '',
    follow_up_instructions: '',
    next_appointment: ''
  });

  const [reviewForm, setReviewForm] = useState({
    decision: 'approve_with_followup' as 'approve_with_followup' | 'approve_and_complete' | 'reject',
    doctorNotes: '',
    requireFollowUp: true,
    followUpInstructions: '',
    additionalStepTitle: '',
    additionalStepDescription: ''
  });

  const [completeForm, setCompleteForm] = useState({
    diagnosis: '',
    summary: '',
    follow_up_instructions: '',
    next_appointment_date: ''
  });

  const doctorId = getDoctorId();

  // Helper for Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch consultation details
  const fetchConsultation = useCallback(async () => {
    if (!doctorId || !id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations`);
      const data = await response.json();
      
      if (data.success) {
        const foundConsultation = (data.data as Consultation[]).find(c => c._id === id);
        if (foundConsultation) {
          // Sort steps by stepNumber to ensure correct order
          if (foundConsultation.treatment_plan) {
            foundConsultation.treatment_plan.sort((a, b) => a.stepNumber - b.stepNumber);
          }
          setConsultation(foundConsultation);
          
          // Pre-fill forms
          setEditForm({
            diagnosis: foundConsultation.diagnosis || '',
            severity: foundConsultation.severity || 'mild',
            notes: foundConsultation.notes || '',
            follow_up_instructions: foundConsultation.follow_up_instructions || '',
            next_appointment: foundConsultation.next_appointment ? 
              new Date(foundConsultation.next_appointment).toISOString().split('T')[0] : ''
          });
          
          setCompleteForm({
            diagnosis: foundConsultation.diagnosis || '',
            summary: foundConsultation.notes || '',
            follow_up_instructions: foundConsultation.follow_up_instructions || '',
            next_appointment_date: foundConsultation.next_appointment ? 
              new Date(foundConsultation.next_appointment).toISOString().split('T')[0] : ''
          });
        } else {
          setError('Consultation not found');
        }
      } else {
        setError(data.message || 'Failed to load consultation');
      }
    } catch (e) {
      console.error('Error fetching consultation:', e);
      setError('Error loading consultation details');
    } finally {
      setLoading(false);
    }
  }, [doctorId, id]);

  // Fetch available drugs
  const fetchDrugs = useCallback(async () => {
    try {
      setLoadingDrugs(true);
      const response = await fetch(`${API_BASE_URL}/doctors/drugs`);
      const data = await response.json();
      if (data.success) {
        setAvailableDrugs(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching drugs:", error);
    } finally {
      setLoadingDrugs(false);
    }
  }, []);

  useEffect(() => {
    fetchConsultation();
    fetchDrugs();
  }, [fetchConsultation, fetchDrugs]);

  // Edit Consultation Handlers
  const handleOpenEdit = () => {
    setShowEditModal(true);
  };

  const handleUpdateConsultation = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: editForm.diagnosis,
          severity: editForm.severity,
          notes: editForm.notes,
          follow_up_instructions: editForm.follow_up_instructions,
          next_appointment: editForm.next_appointment
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        fetchConsultation();
        showToast('Consultation details updated', 'success');
      } else {
        const errorMsg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Failed to update consultation');
        showToast(errorMsg, 'error');
      }
    } catch (e) {
      console.error('Error updating consultation:', e);
      showToast('Error updating consultation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review Step Handlers
  const openReviewModal = (step: LocalTreatmentStep) => {
    setReviewingStepNumber(step.stepNumber);
    setReviewForm({
      decision: 'approve_with_followup',
      doctorNotes: '',
      requireFollowUp: true,
      followUpInstructions: `Follow-up for step ${step.stepNumber}: ${step.title}`,
      additionalStepTitle: `Follow-up: ${step.title}`,
      additionalStepDescription: `Follow-up appointment based on progress from step ${step.stepNumber}`
    });
    setShowReviewModal(true);
  };

const handleSubmitReview = async () => {
  if (!id || !reviewingStepNumber) return;
  
  setIsSubmitting(true);
  
  try {
    // Lấy token từ localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      showToast('Authentication token not found. Please login again.', 'error');
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/steps/${reviewingStepNumber}/review`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        decision: reviewForm.decision,
        doctorNotes: reviewForm.doctorNotes || '',
        requireFollowUp: reviewForm.requireFollowUp,
        followUpInstructions: reviewForm.followUpInstructions,
        additionalStepTitle: reviewForm.additionalStepTitle,
        additionalStepDescription: reviewForm.additionalStepDescription,
        completeConsultation: reviewForm.decision === 'approve_and_complete'
      })
    });
    
    const data = await response.json();
    if (data.success) {
      setShowReviewModal(false);
      fetchConsultation();
      
      const decisionMessages = {
        'approve_with_followup': 'Step approved and follow-up added',
        'approve_and_complete': 'Step approved and consultation completed',
        'reject': 'Step rejected, patient notified'
      };
      
      showToast(data.message || decisionMessages[reviewForm.decision] || 'Review submitted', 'success');
    } else {
      showToast(data.message || 'Failed to submit review', 'error');
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    showToast('Error submitting review', 'error');
  } finally {
    setIsSubmitting(false);
  }
};

  // Complete Step Handler
  const handleCompleteStep = async (stepNumber: number) => {
    if (!id) return;
    setActionStepId(stepNumber);
    
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/steps/${stepNumber}/complete`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      if (data.success) {
        fetchConsultation();
        showToast('Step marked as complete', 'success');
      } else {
        const errorMsg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Failed to mark step as complete');
        showToast(errorMsg, 'error');
      }
    } catch (e) {
      console.error('Error completing step:', e);
      showToast('Error marking step as complete', 'error');
    } finally {
      setActionStepId(null);
    }
  };

  // Patient Report Modal
  const openPatientReportModal = (step: LocalTreatmentStep) => {
    setSelectedPatientReport(step);
    setShowPatientReportModal(true);
  };

  // Check if all steps are approved
  const allStepsApproved = consultation?.treatment_plan?.every(step => step.status === 'approved');

  // Complete Consultation Handlers
  const handleOpenComplete = () => {
    if (!allStepsApproved) {
      showToast('All treatment steps must be approved before completing the consultation.', 'info');
      return;
    }
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: completeForm.diagnosis,
          notes: completeForm.summary,
          follow_up_instructions: completeForm.follow_up_instructions,
          next_appointment: completeForm.next_appointment_date
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowCompleteModal(false);
        fetchConsultation();
        showToast('Consultation completed successfully', 'success');
      } else {
        const errorMsg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Failed to complete consultation');
        showToast(errorMsg, 'error');
      }
    } catch (e) {
      console.error('Error completing consultation:', e);
      showToast('Error completing consultation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Step Handlers
  const handleOpenDeleteConfirm = (stepNumber: number) => {
    setDeletingStepNumber(stepNumber);
    setShowDeleteConfirm(true);
  };

  const handleDeleteStep = async () => {
    if (!id || !deletingStepNumber) return;
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/steps/${deletingStepNumber}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setShowDeleteConfirm(false);
        setDeletingStepNumber(null);
        fetchConsultation();
        fetchDrugs();
        showToast('Step deleted successfully', 'success');
      } else {
        const errorMsg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Failed to delete step');
        showToast(errorMsg, 'error');
      }
    } catch (e) {
      console.error('Error deleting step:', e);
      showToast('Error deleting step', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prescription handlers
  const addPrescription = () => {
    setStepForm(prev => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        { medication: '', dosage: '', duration: '', instructions: '' }
      ]
    }));
  };

  const removePrescription = (index: number) => {
    setStepForm(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  const updatePrescription = (index: number, field: keyof PrescriptionItem, value: string) => {
    setStepForm(prev => {
      const newPrescriptions = [...prev.prescriptions];
      newPrescriptions[index] = {
        ...newPrescriptions[index],
        [field]: value
      };
      
      let newTitle = prev.title;
      if (index === 0 && field === 'medication' && (!prev.title || prev.title.startsWith('Prescribe ')) && value) {
        newTitle = `Prescribe ${value}`;
      }

      return {
        ...prev,
        title: newTitle,
        prescriptions: newPrescriptions
      };
    });
  };

  // Step modal handlers
  const handleOpenAddStep = () => {
    setEditingStepNumber(null);
    setStepForm({
      title: '',
      description: '',
      prescriptions: [{ medication: '', dosage: '', duration: '', instructions: '' }]
    });
    setShowStepModal(true);
  };

  const handleOpenEditStep = (step: LocalTreatmentStep) => {
    setEditingStepNumber(step.stepNumber);
    
    const medications = step.medication ? step.medication.split(' + ') : [];
    
    const parseField = (fullString: string | undefined, medName: string) => {
      if (!fullString) return '';
      const parts = fullString.split(' | ');
      const prefix = `${medName}: `;
      const found = parts.find(p => p.trim().startsWith(prefix));
      return found ? found.substring(prefix.length) : '';
    };

    const prescriptions = medications.map((med: string) => ({
      medication: med,
      dosage: parseField(step.dosage, med),
      duration: parseField(step.duration, med),
      instructions: parseField(step.instructions, med)
    }));

    const finalPrescriptions = prescriptions.length > 0 ? prescriptions : 
      [{ medication: '', dosage: '', duration: '', instructions: '' }];

    setStepForm({
      title: step.title || '',
      description: step.description || '',
      prescriptions: finalPrescriptions
    });
    setShowStepModal(true);
  };

  const handleSaveStep = async () => {
    if (!id || !stepForm.title.trim()) {
      showToast("Title is required", 'error');
      return;
    }

    const hasInvalidPrescription = stepForm.prescriptions.some(p => p.medication && !p.dosage);
    if (hasInvalidPrescription) {
      showToast('Please select dosage for all prescription items.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const validPrescriptions = stepForm.prescriptions.filter(p => p.medication);
      const combinedMedication = validPrescriptions.map(p => p.medication).join(' + ');
      const combinedDosage = validPrescriptions.map(p => `${p.medication}: ${p.dosage}`).join(' | ');
      const combinedDuration = validPrescriptions.map(p => p.duration ? `${p.medication}: ${p.duration}` : '').filter(Boolean).join(' | ');
      const combinedInstructions = validPrescriptions.map(p => p.instructions ? `${p.medication}: ${p.instructions}` : '').filter(Boolean).join(' | ');

      const payload = {
        title: stepForm.title,
        description: stepForm.description,
        medication: combinedMedication,
        dosage: combinedDosage,
        duration: combinedDuration,
        instructions: combinedInstructions,
        prescriptions: validPrescriptions
      };

      let url = `${API_BASE_URL}/doctors/consultations/${id}/steps`;
      let method = 'POST';

      if (editingStepNumber !== null) {
        url = `${API_BASE_URL}/doctors/consultations/${id}/steps/${editingStepNumber}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowStepModal(false);
        fetchConsultation();
        fetchDrugs();
        showToast(`Step ${editingStepNumber !== null ? 'updated' : 'added'} successfully`, 'success');
      } else {
        const errorMsg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Failed to save step');
        showToast(errorMsg, 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving step', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to parse the pipe-separated prescription strings for display
  const getPrescriptionDisplay = (step: TreatmentStep) => {
    if (!step.medication) return [];
    
    const medications = step.medication.split(' + ');
    
    const parseField = (fullString: string | undefined, medName: string) => {
      if (!fullString) return '';
      const parts = fullString.split(' | ');
      const prefix = `${medName}: `;
      const found = parts.find(p => p.trim().startsWith(prefix));
      return found ? found.substring(prefix.length) : '';
    };

    return medications.map((med) => ({
      name: med,
      dosage: parseField(step.dosage, med),
      duration: parseField(step.duration, med),
      instructions: parseField(step.instructions, med)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading clinical data...</p>
        </div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">error_outline</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Case</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error || 'Consultation record not found.'}</p>
          <button 
            onClick={() => navigate('/consultations')}
            className="px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[consultation.consultation_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['pending'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white pb-10">
      
      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 text-white animate-fade-in-up max-w-sm ${
          toast.type === 'success' ? 'bg-green-600' : 
          toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          <span className="material-symbols-outlined text-[24px]">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <p className="font-medium text-sm">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* --- TOP NAVIGATION BAR --- */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/consultations" className="p-2 -ml-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-full transition-all">
              <span className="material-symbols-outlined align-middle">arrow_back</span>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Case #{id?.slice(-6).toUpperCase()}</h1>
              <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${statusConfig.color}`}>
                <span className="material-symbols-outlined text-[14px] mr-1">{statusConfig.icon}</span>
                {consultation.consultation_status?.replace('-', ' ') || 'In Progress'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Print Summary"
            >
              <span className="material-symbols-outlined">print</span>
            </button>
            
            {consultation.consultation_status !== 'completed' && (
              <button
                onClick={handleOpenComplete}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm
                  ${allStepsApproved 
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/20 ring-2 ring-primary/20 ring-offset-1 dark:ring-offset-gray-800' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="hidden sm:inline">Finalize Case</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: TREATMENT TIMELINE (66%) --- */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">medical_services</span>
                Treatment Timeline
              </h2>
              {consultation.consultation_status !== 'completed' && (
                <button 
                  onClick={handleOpenAddStep}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-primary rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Add Step
                </button>
              )}
            </div>

            <div className="relative pl-2 sm:pl-4 space-y-8">
              {/* Vertical Connector Line */}
              <div className="absolute left-[27px] sm:left-[35px] top-4 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              {consultation.treatment_plan && consultation.treatment_plan.length > 0 ? (
                consultation.treatment_plan.map((step, index) => {
                  const stepStatus = STATUS_CONFIG[step.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['pending'];
                  const prescriptionItems = getPrescriptionDisplay(step);
                  const isProcessingThisStep = actionStepId === step.stepNumber;
                  const isApproved = step.status === 'approved';
                  const isCompleted = step.status === 'completed';
                  const hasPatientReport = step.condition_description;
                  
                  return (
                    <div key={step._id || `step-${index}`} className="relative pl-12 sm:pl-16 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                      {/* Timeline Dot with Number */}
                      <div className={`absolute left-0 top-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-gray-50 dark:border-gray-900 flex items-center justify-center z-10 shadow-sm transition-colors duration-300 ${
                        step.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 
                        step.status === 'completed' ? 'bg-amber-100 text-amber-600' : 
                        step.status === 'in-progress' ? 'bg-blue-100 text-blue-600' : 
                        step.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isProcessingThisStep ? (
                          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="font-bold text-lg sm:text-xl">{step.stepNumber}</span>
                        )}
                      </div>

                      {/* Step Card */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md group">
                        
                        {/* Card Header */}
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-start gap-3 bg-gray-50/50 dark:bg-gray-800">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${stepStatus.color}`}>
                                {stepStatus.label}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{step.description}</p>
                          </div>
                          
                          {/* Card Actions */}
                          {consultation.consultation_status !== 'completed' && (
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              
                              {/* View Patient Report Button */}
                              {hasPatientReport && (
                                <button 
                                  onClick={() => openPatientReportModal(step as LocalTreatmentStep)} 
                                  className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" 
                                  title="View Patient Report"
                                >
                                  <span className="material-symbols-outlined text-[18px]">patient_list</span>
                                </button>
                              )}
                              
                              <button 
                                onClick={() => handleOpenEditStep(step as LocalTreatmentStep)} 
                                disabled={isProcessingThisStep || isApproved}
                                className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                                  isApproved 
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                }`} 
                                title={isApproved ? "Approved steps cannot be edited" : "Edit"}
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              
                              {/* Review Button for Completed Steps */}
                              {isCompleted && (
                                <button 
                                  onClick={() => openReviewModal(step as LocalTreatmentStep)} 
                                  disabled={isProcessingThisStep}
                                  className="p-1.5 text-amber-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors disabled:opacity-50" 
                                  title="Review Patient Progress"
                                >
                                  <span className="material-symbols-outlined text-[18px]">rate_review</span>
                                </button>
                              )}
                              
                              {/* Complete Button for In-Progress Steps */}
                              {step.status === 'in-progress' && (
                                <button 
                                  onClick={() => handleCompleteStep(step.stepNumber)} 
                                  disabled={isProcessingThisStep}
                                  className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50" 
                                  title="Mark Complete"
                                >
                                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                                </button>
                              )}
                              
                              <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1"></div>
                              
                              <button 
                                onClick={() => handleOpenDeleteConfirm(step.stepNumber)} 
                                disabled={isProcessingThisStep || isApproved}
                                className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                                  isApproved
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                                }`}
                                title={isApproved ? "Approved steps cannot be deleted" : "Delete"}
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Patient Report Badge */}
                        {hasPatientReport && (
                          <div className="px-5 pt-3">
                            <button 
                              onClick={() => openPatientReportModal(step as LocalTreatmentStep)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium transition-colors group"
                            >
                              <span className="material-symbols-outlined text-[14px]">patient_list</span>
                              Patient submitted condition report
                              <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                            </button>
                          </div>
                        )}

                        {/* Prescriptions Grid */}
                        {prescriptionItems.length > 0 && (
                          <div className="p-5 bg-white dark:bg-gray-800">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">prescriptions</span>
                              Prescribed Medications
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {prescriptionItems.map((rx, idx) => (
                                <div key={idx} className="p-3 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-white mb-1 flex items-start justify-between">
                                      {rx.name}
                                      <span className="material-symbols-outlined text-blue-300 text-[16px]">pill</span>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      {rx.dosage && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">scale</span> {rx.dosage}</p>}
                                      {rx.duration && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">schedule</span> {rx.duration}</p>}
                                    </div>
                                  </div>
                                  {rx.instructions && (
                                    <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-800/50 text-xs text-blue-700 dark:text-blue-300 italic flex items-start gap-1">
                                      <span className="material-symbols-outlined text-[12px] mt-0.5">info</span>
                                      {rx.instructions}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Feedback & Notes */}
                        {(step.doctorNotes || step.patient_message) && (
                          <div className="px-5 pb-5 flex flex-col gap-2">
                            {step.doctorNotes && (
                              <div className={`text-sm p-3 rounded-lg border flex gap-2 ${
                                step.status === 'rejected' 
                                  ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200 border-red-100 dark:border-red-900/30' 
                                  : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-200 border-emerald-100 dark:border-emerald-900/30'
                              }`}>
                                <span className="material-symbols-outlined text-[18px] shrink-0">
                                  {step.status === 'rejected' ? 'cancel' : 'clinical_notes'}
                                </span>
                                <div>
                                  <strong className="block text-xs uppercase opacity-70 mb-0.5">
                                    {step.status === 'rejected' ? 'Rejection Reason' : "Doctor's Note"}
                                  </strong>
                                  {step.doctorNotes}
                                </div>
                              </div>
                            )}
                            {step.patient_message && (
                              <div className="text-sm bg-indigo-50 dark:bg-indigo-900/10 text-indigo-800 dark:text-indigo-200 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 flex gap-2">
                                <span className="material-symbols-outlined text-[18px] shrink-0">chat</span>
                                <div>
                                  <strong className="block text-xs uppercase opacity-70 mb-0.5">Patient Message</strong>
                                  {step.patient_message}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 ml-12 sm:ml-16">
                  <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">post_add</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Treatment Steps Yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Start the patient's journey by adding the initial assessment and prescription.</p>
                  <button onClick={handleOpenAddStep} className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 font-medium flex items-center gap-2 mx-auto">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Create First Step
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: PATIENT & CLINICAL INFO (33%) --- */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Patient Profile Card (Sticky) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-24">
              {/* Header Gradient */}
              <div className="h-28 bg-gradient-to-br from-primary to-indigo-600 relative">
                 <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 overflow-hidden shadow-md">
                      {consultation.user_id?.avatar ? (
                        <img src={getAvatarUrl(consultation.user_id.avatar)} alt="Patient" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                          <span className="material-symbols-outlined text-4xl">person</span>
                        </div>
                      )}
                    </div>
                 </div>
              </div>
              
              <div className="pt-14 px-6 pb-6 text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{consultation.user_id?.name || 'Unknown Patient'}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                   {consultation.user_id?.gender}, {consultation.user_id?.dateOfBirth ? calculateAge(consultation.user_id.dateOfBirth) : '?'} Years
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-mono text-gray-600 dark:text-gray-300">
                  ID: {consultation.user_id?._id?.slice(-6)}
                </div>

                <div className="mt-6 space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-gray-500 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{consultation.user_id?.phoneNumber || 'No phone'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-gray-500 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{consultation.user_id?.email || 'No email'}</span>
                  </div>

                  {consultation.user_id?.allergies && consultation.user_id.allergies.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span> Allergies
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {consultation.user_id.allergies.map((allergy, i) => (
                          <span key={i} className="px-2 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-bold border border-red-100 dark:border-red-900">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Snapshot Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">diagnosis</span>
                    Clinical Snapshot
                  </h3>
                  <button onClick={handleOpenEdit} className="text-primary hover:text-primary/80 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                    Edit <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Diagnosis</span>
                    <span className="font-bold text-gray-900 dark:text-white block text-sm">{consultation.diagnosis}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                       <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Severity</span>
                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold capitalize ${
                         consultation.severity === 'critical' ? 'bg-red-100 text-red-700' :
                         consultation.severity === 'severe' ? 'bg-orange-100 text-orange-700' :
                         consultation.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                         'bg-green-100 text-green-700'
                       }`}>
                         {consultation.severity || 'Mild'}
                       </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                       <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Next Visit</span>
                       <span className="font-bold text-gray-900 dark:text-white text-sm">
                         {consultation.next_appointment ? new Date(consultation.next_appointment).toLocaleDateString() : 'N/A'}
                       </span>
                    </div>
                  </div>

                  {consultation.notes && (
                    <div className="mt-2">
                       <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Notes</span>
                       <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 italic leading-relaxed">
                         {consultation.notes}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pending Reviews Card */}
            {consultation.treatment_plan?.some(step => step.status === 'completed') && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">notifications_active</span>
                  </div>
                  <h3 className="font-bold text-amber-800 dark:text-amber-300">Pending Reviews</h3>
                </div>
                
                <div className="space-y-3">
                  {consultation.treatment_plan
                    .filter(step => step.status === 'completed')
                    .map(step => (
                      <div key={step.stepNumber} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-800/50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-900 dark:text-white">Step {step.stepNumber}: {step.title}</span>
                          <button 
                            onClick={() => openReviewModal(step as LocalTreatmentStep)}
                            className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded transition-colors"
                          >
                            Review
                          </button>
                        </div>
                        {step.condition_description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                            "{step.condition_description.substring(0, 80)}..."
                          </p>
                        )}
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          Waiting for your review
                        </div>
                      </div>
                    ))}
                </div>
                
                <button 
                  onClick={() => {
                    const firstCompleted = consultation.treatment_plan.find(step => step.status === 'completed');
                    if (firstCompleted) openReviewModal(firstCompleted as LocalTreatmentStep);
                  }}
                  className="mt-4 w-full py-2.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">rate_review</span>
                  Review Next Step
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* Patient Report Modal */}
      {showPatientReportModal && selectedPatientReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowPatientReportModal(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full relative z-10 animate-fade-in-up">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">patient_list</span>
                Patient Condition Report - Step {selectedPatientReport.stepNumber}
              </h2>
              <button onClick={() => setShowPatientReportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{selectedPatientReport.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{selectedPatientReport.description}</p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-blue-500">heart_check</span>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">Patient's Health Condition</h4>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                  <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    {selectedPatientReport.condition_description}
                  </p>
                </div>
                
                {selectedPatientReport.patient_message && (
                  <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-indigo-500">chat</span>
                      <h5 className="font-medium text-indigo-700 dark:text-indigo-300">Additional Message</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPatientReport.patient_message}
                    </p>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-800/50 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    Submitted: {selectedPatientReport.completedAt ? new Date(selectedPatientReport.completedAt).toLocaleString() : 'Recently'}
                  </div>
                  <button 
                    onClick={() => {
                      setShowPatientReportModal(false);
                      openReviewModal(selectedPatientReport);
                    }}
                    className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">rate_review</span>
                    Review Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Step Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative z-10 animate-fade-in-up">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">rate_review</span>
                Review Patient Progress - Step {reviewingStepNumber}
              </h2>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Patient's Condition Description */}
              {consultation?.treatment_plan?.find(s => s.stepNumber === reviewingStepNumber)?.condition_description && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-500">patient_list</span>
                    <h3 className="font-semibold text-blue-700 dark:text-blue-300">Patient's Condition Report</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic">
                    "{consultation.treatment_plan.find(s => s.stepNumber === reviewingStepNumber)?.condition_description}"
                  </p>
                </div>
              )}

              {/* Decision Options */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                  Select Decision
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center p-3 border rounded-lg hover:border-green-500 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="decision"
                      value="approve_with_followup"
                      checked={reviewForm.decision === 'approve_with_followup'}
                      onChange={(e) => setReviewForm({...reviewForm, decision: e.target.value as any})}
                      className="mr-3"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500">assignment_add</span>
                        <span className="font-semibold">Approve & Add Follow-up</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Patient needs follow-up appointment or additional treatment steps
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-lg hover:border-emerald-500 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="decision"
                      value="approve_and_complete"
                      checked={reviewForm.decision === 'approve_and_complete'}
                      onChange={(e) => setReviewForm({...reviewForm, decision: e.target.value as any})}
                      className="mr-3"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                        <span className="font-semibold">Approve & Complete Treatment</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Patient's condition is satisfactory, complete the consultation
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-lg hover:border-red-500 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="decision"
                      value="reject"
                      checked={reviewForm.decision === 'reject'}
                      onChange={(e) => setReviewForm({...reviewForm, decision: e.target.value as any})}
                      className="mr-3"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500">cancel</span>
                        <span className="font-semibold">Reject & Request Revision</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Patient needs to redo or revise this step
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Doctor's Notes */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Doctor's Notes *
                </label>
                <textarea
                  className="w-full rounded-xl border-gray-300 dark:border-gray-600 p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  rows={3}
                  placeholder="Provide feedback or instructions for the patient..."
                  value={reviewForm.doctorNotes}
                  onChange={(e) => setReviewForm({...reviewForm, doctorNotes: e.target.value})}
                  required
                />
              </div>

              {/* Additional Options based on decision */}
              {reviewForm.decision === 'approve_with_followup' && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-green-500">add_circle</span>
                    <h4 className="font-semibold text-green-700 dark:text-green-300">Follow-up Details</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Follow-up Instructions
                      </label>
                      <textarea
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 p-2 text-sm"
                        rows={2}
                        value={reviewForm.followUpInstructions}
                        onChange={(e) => setReviewForm({...reviewForm, followUpInstructions: e.target.value})}
                        placeholder="Instructions for the follow-up appointment..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Additional Step Title
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 p-2 text-sm"
                        value={reviewForm.additionalStepTitle}
                        onChange={(e) => setReviewForm({...reviewForm, additionalStepTitle: e.target.value})}
                        placeholder="e.g., Follow-up Examination"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Step Description
                      </label>
                      <textarea
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 p-2 text-sm"
                        rows={2}
                        value={reviewForm.additionalStepDescription}
                        onChange={(e) => setReviewForm({...reviewForm, additionalStepDescription: e.target.value})}
                        placeholder="Description of the follow-up step..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowReviewModal(false)} disabled={isSubmitting} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSubmitReview} disabled={isSubmitting || !reviewForm.doctorNotes.trim()} className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Step Modal */}
      {showStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowStepModal(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative z-10 animate-fade-in-up">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">medication_liquid</span>
                {editingStepNumber !== null ? `Edit Step ${editingStepNumber}` : 'New Treatment Step'}
              </h2>
              <button onClick={() => setShowStepModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title <span className="text-red-500">*</span></label>
                      <input 
                        className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Initial Assessment"
                        value={stepForm.title}
                        onChange={(e) => setStepForm({...stepForm, title: e.target.value})}
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                      <input 
                        className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="Brief description of the procedure or goal"
                        value={stepForm.description}
                        onChange={(e) => setStepForm({...stepForm, description: e.target.value})}
                      />
                   </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-500">prescriptions</span>
                      Prescriptions
                    </h3>
                    <button onClick={addPrescription} className="text-primary text-sm font-bold hover:underline flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">add_circle</span> Add Drug
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {stepForm.prescriptions.map((item, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 relative group transition-all hover:border-primary/30 hover:shadow-sm">
                        <button 
                          onClick={() => removePrescription(index)}
                          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Remove"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Medication</label>
                            <select 
                              className="w-full rounded-lg border-gray-300 dark:border-gray-600 p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none"
                              value={item.medication}
                              onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                              disabled={loadingDrugs}
                            >
                              <option value="">Select Drug...</option>
                              {availableDrugs.map(drug => (
                                <option key={drug._id} value={drug.name}>
                                  {drug.name} {drug.unit ? `(${drug.unit})` : ''} {drug.stock_quantity ? `• Stock: ${drug.stock_quantity}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-4">
                             <label className="block text-xs font-bold text-gray-500 mb-1.5">Dosage</label>
                             <select 
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none"
                                value={item.dosage}
                                onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                              >
                                <option value="">Select...</option>
                                {COMMON_DOSAGES.map((d, i) => <option key={i} value={d}>{d}</option>)}
                              </select>
                          </div>
                          <div className="md:col-span-4">
                             <label className="block text-xs font-bold text-gray-500 mb-1.5">Duration</label>
                             <select 
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none"
                                value={item.duration}
                                onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                              >
                                <option value="">Select...</option>
                                {COMMON_DURATIONS.map((d, i) => <option key={i} value={d}>{d}</option>)}
                              </select>
                          </div>
                          <div className="md:col-span-12">
                             <label className="block text-xs font-bold text-gray-500 mb-1.5">Special Instructions</label>
                             <input 
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none"
                                placeholder="e.g. Take after food"
                                value={item.instructions}
                                onChange={(e) => updatePrescription(index, 'instructions', e.target.value)}
                                list={`instructions-${index}`}
                             />
                             <datalist id={`instructions-${index}`}>
                                {COMMON_INSTRUCTIONS.map((ins, i) => <option key={i} value={ins} />)}
                             </datalist>
                          </div>
                        </div>
                      </div>
                    ))}
                    {stepForm.prescriptions.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
                        <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">medical_services</span>
                        <p className="text-sm text-gray-500">No medications added yet.</p>
                        <button onClick={addPrescription} className="mt-3 text-primary text-sm font-medium hover:underline">Add First Medication</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowStepModal(false)} disabled={isSubmitting} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSaveStep} disabled={isSubmitting} className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2">
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {editingStepNumber !== null ? 'Save Changes' : 'Create Step'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Consultation Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full relative z-10 p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">edit_document</span>
               Update Case Details
            </h3>
            
            <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Diagnosis</label>
                 <input 
                   className="w-full mt-1 rounded-xl border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
                   value={editForm.diagnosis}
                   onChange={(e) => setEditForm({...editForm, diagnosis: e.target.value})}
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Severity</label>
                    <select 
                      className="w-full mt-1 rounded-xl border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
                      value={editForm.severity}
                      onChange={(e) => setEditForm({...editForm, severity: e.target.value as any})}
                    >
                      {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Next Visit</label>
                    <input 
                      type="date"
                      className="w-full mt-1 rounded-xl border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
                      value={editForm.next_appointment}
                      onChange={(e) => setEditForm({...editForm, next_appointment: e.target.value})}
                    />
                 </div>
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Clinical Notes</label>
                 <textarea 
                   className="w-full mt-1 rounded-xl border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
                   rows={3}
                   value={editForm.notes}
                   onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Follow-up Instructions</label>
                 <textarea 
                   className="w-full mt-1 rounded-xl border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
                   rows={2}
                   value={editForm.follow_up_instructions}
                   onChange={(e) => setEditForm({...editForm, follow_up_instructions: e.target.value})}
                 />
               </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowEditModal(false)} disabled={isSubmitting} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleUpdateConsultation} disabled={isSubmitting} className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCompleteModal(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full relative z-10 overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-primary to-indigo-600 p-6 flex items-center gap-4 text-white">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
               </div>
               <div>
                 <h3 className="text-lg font-bold">Complete Consultation</h3>
                 <p className="text-sm text-blue-100">Finalize diagnosis and close the case.</p>
               </div>
            </div>
            
            <div className="p-6 space-y-5">
               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Final Diagnosis</label>
                 <input 
                   className="w-full rounded-xl border-gray-300 dark:border-gray-600 p-3 focus:ring-2 focus:ring-primary outline-none"
                   value={completeForm.diagnosis}
                   onChange={(e) => setCompleteForm({...completeForm, diagnosis: e.target.value})}
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Discharge Summary</label>
                 <textarea 
                   className="w-full rounded-xl border-gray-300 dark:border-gray-600 p-3 focus:ring-2 focus:ring-primary outline-none"
                   rows={4}
                   value={completeForm.summary}
                   onChange={(e) => setCompleteForm({...completeForm, summary: e.target.value})}
                 />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Recommended Follow-up</label>
                  <input 
                    type="date"
                    className="w-full rounded-xl border-gray-300 dark:border-gray-600 p-3 focus:ring-2 focus:ring-primary outline-none"
                    value={completeForm.next_appointment_date}
                    onChange={(e) => setCompleteForm({...completeForm, next_appointment_date: e.target.value})}
                  />
               </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
               <button onClick={() => setShowCompleteModal(false)} disabled={isSubmitting} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
               <button onClick={handleConfirmComplete} disabled={isSubmitting} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                 {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                 Complete & Close
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full relative z-10 p-6 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
               <span className="material-symbols-outlined text-3xl">delete</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Step?</h3>
            <p className="text-gray-500 mb-6 text-sm">Are you sure you want to remove this treatment step? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
               <button onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">Cancel</button>
               <button onClick={handleDeleteStep} disabled={isSubmitting} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                 {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                 Delete Step
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View (Hidden on screen) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 text-black">
        <div className="flex justify-between items-end border-b-2 border-gray-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Medical Report</h1>
            <p className="text-gray-600">Generated by SmartCare</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-bold text-lg">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10">
           <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Patient</h2>
              <p className="text-xl font-bold">{consultation.user_id?.name}</p>
              <p className="text-gray-600">ID: {consultation.user_id?._id}</p>
              <p className="text-gray-600">DOB: {new Date(consultation.user_id?.dateOfBirth || '').toLocaleDateString()}</p>
           </div>
           <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Clinical Details</h2>
              <p className="font-bold">Diagnosis: {consultation.diagnosis}</p>
              <p className="text-gray-600">Severity: {consultation.severity}</p>
              <p className="text-gray-600">Doctor ID: {doctorId}</p>
           </div>
        </div>

        <div className="mb-8">
           <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Treatment Plan</h2>
           {consultation.treatment_plan?.map((step, i) => (
             <div key={i} className="mb-6">
                <div className="flex items-start gap-3">
                   <span className="font-bold text-gray-400">{i + 1}.</span>
                   <div>
                      <h3 className="font-bold">{step.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                      {step.medication && (
                         <div className="bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                            <strong>Rx:</strong> {step.medication} <br/>
                            <span className="text-gray-500">{step.dosage}</span>
                         </div>
                      )}
                   </div>
                </div>
             </div>
           ))}
        </div>

        <div className="border-t border-gray-200 pt-8 mt-12 flex justify-between items-end">
           <div className="text-xs text-gray-400">
             Confidential Medical Record
           </div>
           <div className="text-center">
              <div className="w-48 border-b border-gray-900 mb-2"></div>
              <p className="text-xs font-bold uppercase">Doctor Signature</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationDetail;