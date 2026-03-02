import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// ==================== TYPES & INTERFACES ====================
interface Drug {
  _id: string;
  name: string;
  unit?: string;
  strength?: string;
  form?: string;
}

interface PrescriptionItem {
  medication: string;
  dosage: string;
  duration: string;
  instructions: string;
  medicationId?: string;
}

interface Consultation {
  _id: string;
  user_id: {
    name: string;
    avatar?: string;
    gender: string;
    dateOfBirth: string;
  };
  diagnosis?: string;
  priority: 'normal' | 'urgent';
  consultation_status: 'active' | 'completed';
  created_at: string;
  next_appointment?: string;
  treatment_plan: TreatmentStep[];
}

interface TreatmentStep {
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
  isPhysicalVisit: boolean;
  reExaminationScheduled: boolean;
  needsReExamination: boolean;
  reExaminationDate?: Date;
  reExaminationAppointmentId?: string;
  arrivalConfirmed?: boolean;
  arrivalConfirmedAt?: Date;
  reExaminationNotes?: string;
  reExaminationTime?: string;
  isReExaminationVisit?: boolean;
  rejectionReason?: string;
  rejectedAt?: Date | string;
  prescriptions?: PrescriptionItem[];
}

interface LocalTreatmentStep extends TreatmentStep {
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
  isPhysicalVisit: boolean;
  reExaminationScheduled: boolean;
  needsReExamination: boolean;
  reExaminationDate?: Date;
  reExaminationAppointmentId?: string;
  arrivalConfirmed?: boolean;
  arrivalConfirmedAt?: Date;
  reExaminationNotes?: string;
  reExaminationTime?: string;
  isReExaminationVisit?: boolean;
  rejectionReason?: string;
  rejectedAt?: Date | string;
  prescriptions?: PrescriptionItem[];
}

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ==================== CONSTANTS ====================
const DOSAGE_OPTIONS = [
  "1 tablet", "2 tablets", "3 tablets", "4 tablets",
  "1 capsule", "2 capsules", "3 capsules",
  "5ml", "10ml", "15ml", "20ml",
  "1 sachet", "1 vial",
  "Apply thinly", "Apply generously",
  "1 drop", "2 drops", "3 drops",
  "1 puff", "2 puffs", "4 puffs"
];

const DURATION_OPTIONS = [
  "1 day", "2 days", "3 days", "5 days", "7 days",
  "10 days", "14 days", "21 days", "28 days",
  "1 month", "2 months", "3 months",
  "Until finished", "Ongoing", "One time", "As directed"
];

const INSTRUCTION_OPTIONS = [
  "After meals", "Before meals", "With food",
  "On empty stomach", "Before sleep",
  "In the morning", "Morning and Evening",
  "Once daily", "Twice daily", "Three times daily", "Four times daily",
  "Every 4 hours", "Every 6 hours", "Every 8 hours", "Every 12 hours",
  "As needed", "For pain", "For fever", "If symptoms persist",
  "With plenty of water", "Sublingual", "Inhalation", "Topical"
];

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  pending:     { dot: 'bg-slate-400',   text: 'text-slate-600',   label: 'Pending' },
  'in-progress': { dot: 'bg-sky-500',   text: 'text-sky-700',     label: 'In Progress' },
  scheduled:   { dot: 'bg-indigo-500',  text: 'text-indigo-700',  label: 'Scheduled' },
  completed:   { dot: 'bg-amber-500',   text: 'text-amber-700',   label: 'Awaiting Review' },
  approved:    { dot: 'bg-teal-500',    text: 'text-teal-700',    label: 'Approved' },
  confirmed:   { dot: 'bg-teal-500',    text: 'text-teal-700',    label: 'Confirmed' },
  rejected:    { dot: 'bg-rose-500',    text: 'text-rose-700',    label: 'Rejected' },
};

const CHIP_COLORS = {
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
  slate:  'bg-slate-100 text-slate-600 border-slate-200',
};

const BUTTON_VARIANTS = {
  primary: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500 focus:ring-2 focus:ring-offset-1",
  teal:    "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500 focus:ring-2 focus:ring-offset-1",
  ghost:   "text-slate-600 hover:bg-slate-100 focus:ring-slate-400 focus:ring-2 focus:ring-offset-1",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-sky-400 focus:ring-2 focus:ring-offset-1",
  danger:  "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 focus:ring-2 focus:ring-offset-1",
};

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl'
};

const ANIMATIONS = `
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.97) translateY(6px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .animate-toast { animation: toast-in 0.2s ease-out forwards; }
  .animate-modal { animation: modal-in 0.18s ease-out forwards; }
  .animate-pulse { animation: skeleton-pulse 1.5s ease-in-out infinite; }
  
  @media (prefers-color-scheme: dark) {
    .dark-mode-support {
      color-scheme: dark;
    }
  }
  
  @media (max-width: 640px) {
    .touch-target {
      min-height: 44px;
      min-width: 44px;
    }
    .bottom-sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      margin: 0;
      max-width: 100%;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      transform: translateY(0);
    }
  }
`;

// ==================== UTILS ====================
const getDoctorId = (): string | null => {
  return localStorage.getItem('doctorId');
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

const getAvatarUrl = (avatarPath: string): string => {
  if (!avatarPath) return '';
  if (avatarPath.startsWith('http')) return avatarPath;
  return `${API_BASE_URL}/${avatarPath}`;
};

const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// ==================== UTILITY COMPONENTS ====================

interface StatusDotProps {
  status: string;
  ariaLabel?: string;
}

const StatusDot: React.FC<StatusDotProps> = React.memo(({ status, ariaLabel }) => {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span 
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${styles.text}`}
      role="status"
      aria-label={ariaLabel || `Status: ${styles.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      <span>{styles.label}</span>
    </span>
  );
});

StatusDot.displayName = 'StatusDot';

interface ChipProps {
  label: string;
  color?: keyof typeof CHIP_COLORS;
  ariaLabel?: string;
}

const Chip: React.FC<ChipProps> = React.memo(({ label, color = 'slate', ariaLabel }) => {
  const colors = CHIP_COLORS[color];
  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors}`}
      aria-label={ariaLabel || label}
    >
      {label}
    </span>
  );
});

Chip.displayName = 'Chip';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'xs' | 'sm' | 'md';
  loading?: boolean;
  ariaLabel?: string;
}

const Btn = React.memo(React.forwardRef<HTMLButtonElement, BtnProps>(({ 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled, 
  loading, 
  children, 
  type = 'button',
  className = '',
  ariaLabel,
  ...props 
}, ref) => {
  const base = "inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed gap-1.5 touch-target";
  const variants = BUTTON_VARIANTS;
  const sizes = {
    xs: "px-2.5 py-1 text-xs min-h-[28px]",
    sm: "px-3 py-1.5 text-xs min-h-[32px]",
    md: "px-4 py-2 text-sm min-h-[38px]",
  };
  
  return (
    <button 
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}));

Btn.displayName = 'Btn';

const FieldLabel: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <span 
    className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1"
    id={id}
  >
    {children}
  </span>
);

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
}

const FormInput = React.memo(React.forwardRef<HTMLInputElement, FormInputProps>((
  {
    label,
    error,
    touched,
    className = '',
    id,
    required,
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref
) => {
  const generatedId = useRef(`input-${Math.random().toString(36).slice(2)}`);
  const uid = id || generatedId.current;
  const errorId = `${uid}-error`;
  
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={uid} 
          className="block text-xs font-medium text-slate-600"
        >
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={uid}
        className={`
          w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 
          placeholder-slate-400 transition-colors
          focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400
          disabled:bg-slate-50 disabled:text-slate-400
          ${error && touched ? 'border-rose-400' : 'border-slate-300'}
          ${className}
        `}
        aria-invalid={error && touched ? 'true' : 'false'}
        aria-describedby={error && touched ? errorId : ariaDescribedBy}
        required={required}
        {...props}
      />
      {error && touched && (
        <p id={errorId} className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}));

FormInput.displayName = 'FormInput';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  touched?: boolean;
}

const FormSelect: React.FC<FormSelectProps> = React.memo(({
  label,
  options,
  error,
  touched,
  className = '',
  id,
  required,
  ...props
}) => {
  const generatedId = useRef(`select-${Math.random().toString(36).slice(2)}`);
  const uid = id || generatedId.current;
  const errorId = `${uid}-error`;
  
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={uid} className="block text-xs font-medium text-slate-600">
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={uid}
        className={`
          w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800
          focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400
          disabled:bg-slate-50
          ${error && touched ? 'border-rose-400' : 'border-slate-300'}
          ${className}
        `}
        aria-invalid={error && touched ? 'true' : 'false'}
        aria-describedby={error && touched ? errorId : undefined}
        required={required}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && touched && (
        <p id={errorId} className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  touched?: boolean;
}

const FormTextarea: React.FC<FormTextareaProps> = React.memo(({
  label,
  error,
  touched,
  className = '',
  id,
  required,
  ...props
}) => {
  const generatedId = useRef(`textarea-${Math.random().toString(36).slice(2)}`);
  const uid = id || generatedId.current;
  const errorId = `${uid}-error`;
  
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={uid} className="block text-xs font-medium text-slate-600">
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={uid}
        className={`
          w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800
          placeholder-slate-400 resize-none
          focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400
          ${error && touched ? 'border-rose-400' : 'border-slate-300'}
          ${className}
        `}
        aria-invalid={error && touched ? 'true' : 'false'}
        aria-describedby={error && touched ? errorId : undefined}
        required={required}
        {...props}
      />
      {error && touched && (
        <p id={errorId} className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{children}</span>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

// Loading Skeleton Components
const StepSkeleton: React.FC = () => (
  <div className="relative flex gap-4 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-slate-200" />
    <div className="flex-1 rounded-lg border border-slate-200 p-4">
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
  </div>
);

// Toast Component
interface ToastStackProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

const ToastStack: React.FC<ToastStackProps> = React.memo(({ toasts, onRemove }) => {
  const toastRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  useEffect(() => {
    toasts.forEach(toast => {
      const element = toastRefs.current.get(toast.id);
      if (element) {
        element.focus();
      }
    });
  }, [toasts]);

  return (
    <div 
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(t => {
        const styles = {
          error: 'bg-rose-50 border-rose-200 text-rose-800',
          success: 'bg-teal-50 border-teal-200 text-teal-800',
          info: 'bg-sky-50 border-sky-200 text-sky-800'
        };
        
        return (
          <div
            key={t.id}
            ref={el => {
              if (el) toastRefs.current.set(t.id, el);
            }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm min-w-[280px] max-w-sm animate-toast ${styles[t.type]}`}
            role="status"
            aria-live="polite"
            tabIndex={-1}
          >
            <span className="mt-0.5 text-base leading-none" aria-hidden="true">
              {t.type === 'error' ? '⚠️' : t.type === 'success' ? '✓' : 'ℹ️'}
            </span>
            <span className="flex-1 font-medium">{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              className="opacity-50 hover:opacity-100 text-base leading-none p-1 touch-target"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
});

ToastStack.displayName = 'ToastStack';

// Skip Link Component
const SkipLink: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white p-4 z-[100] shadow-lg rounded-md"
  >
    Skip to main content
  </a>
);

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof MODAL_SIZES;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children, 
  footer, 
  size = 'md',
  initialFocusRef 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen && initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen, initialFocusRef]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div 
        ref={modalRef}
        className={`relative bg-white rounded-xl shadow-2xl w-full ${MODAL_SIZES[size]} flex flex-col max-h-[90vh] animate-modal bottom-sheet`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 id="modal-title" className="text-sm font-semibold text-slate-900">{title}</h3>
            {subtitle && <p id="modal-description" className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose} 
            className="ml-4 text-slate-400 hover:text-slate-600 text-lg leading-none p-2 touch-target rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const ConsultationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [appointmentStatuses, setAppointmentStatuses] = useState<Record<string, string>>({});
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [editingStepNumber, setEditingStepNumber] = useState<number | null>(null);
  const [reviewingStepNumber, setReviewingStepNumber] = useState<number | null>(null);
  const [schedulingStepNumber, setSchedulingStepNumber] = useState<number | null>(null);
  const [completingStepNumber, setCompletingStepNumber] = useState<number | null>(null);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
  const [customInputModes, setCustomInputModes] = useState<Record<string, boolean>>({});
  const [touchMap, setTouchMap] = useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Form state
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

  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    notes: '',
    duration: '30'
  });

  const [completeExamForm, setCompleteExamForm] = useState({ doctorNotes: '' });
  const [completeVisitForm, setCompleteVisitForm] = useState({ doctorNotes: '' });

  // Modal state
  const [modals, setModals] = useState({
    step: false,
    review: false,
    schedule: false,
    completeReExam: false,
    completeVisit: false
  });

  // Refs
  const nextToastId = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const modalTriggerRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const doctorId = getDoctorId();

  // ==================== UTILITIES ====================

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const tid = nextToastId.current++;
    setToasts(prev => [...prev, { id: tid, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 4000);
  }, []);

  const removeToast = useCallback((tid: number) => {
    setToasts(prev => prev.filter(t => t.id !== tid));
  }, []);

  const closeModal = useCallback((name: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [name]: false }));
    // Return focus to trigger element
    setTimeout(() => {
      modalTriggerRef.current?.focus();
    }, 100);
  }, []);

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (modals.step && stepForm.title) {
          handleSaveStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modals, stepForm.title]);

  // ==================== UNSAVED CHANGES PROTECTION ====================

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ==================== DATA FETCHING ====================

  const fetchConsultation = useCallback(async () => {
    if (!doctorId || !id) return;
    
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await res.json();
      
      if (data.success) {
        const found = (data.data as Consultation[]).find(c => c._id === id);
        if (found) {
          found.treatment_plan?.sort((a, b) => a.stepNumber - b.stepNumber);
          setConsultation(found);
          await fetchAppointmentStatuses(found);
        } else {
          setError('Consultation not found');
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please try again');
      } else {
        setError('Failed to load consultation');
      }
      showToast('Failed to load consultation', 'error');
    } finally {
      setLoading(false);
    }
  }, [doctorId, id, showToast]);

  const fetchAppointmentStatuses = async (c: Consultation) => {
    const ids = c.treatment_plan
      .map(s => (s as LocalTreatmentStep).reExaminationAppointmentId)
      .filter((v): v is string => !!v);
    
    if (!ids.length) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/appointments/batch-status?ids=${ids.join(',')}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const map: Record<string, string> = {};
          data.data.forEach((a: any) => { map[a._id] = a.status; });
          setAppointmentStatuses(map);
        }
      }
    } catch (e) {
      console.error('Failed to fetch appointment statuses:', e);
    }
  };

  const fetchDrugs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors/drugs`);
      const data = await res.json();
      if (data.success) setAvailableDrugs(data.data || []);
    } catch (e) {
      console.error('Failed to fetch drugs:', e);
    }
  }, []);

  const fetchTimeSlots = useCallback(async (date: string) => {
    if (!date) return;
    
    setLoadingTimeSlots(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/doctors/appointments/available-slots?date=${date}&doctorId=${doctorId}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        setAvailableTimeSlots(data.data || []);
      } else {
        setAvailableTimeSlots([]);
        showToast('No available time slots', 'info');
      }
    } catch {
      setAvailableTimeSlots([]);
      showToast('Failed to load time slots', 'error');
    } finally {
      setLoadingTimeSlots(false);
    }
  }, [doctorId, showToast]);

  useEffect(() => { 
    fetchConsultation(); 
    fetchDrugs(); 
  }, [fetchConsultation, fetchDrugs]);

  useEffect(() => { 
    if (scheduleForm.date) fetchTimeSlots(scheduleForm.date); 
  }, [scheduleForm.date, fetchTimeSlots]);

  // ==================== RETRY MECHANISM ====================

  const handleRetry = useCallback(() => {
    setError('');
    fetchConsultation();
  }, [fetchConsultation]);

  // ==================== ACTION HANDLERS ====================

  const handleSubmitReview = async () => {
    if (!id || !reviewingStepNumber) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const combinedDT = reviewForm.nextAppointmentDate
        ? `${reviewForm.nextAppointmentDate}T${reviewForm.nextAppointmentTime || '09:00'}:00`
        : null;
      
      const res = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/steps/${reviewingStepNumber}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          ...reviewForm, 
          nextAppointmentDate: combinedDT, 
          completeConsultation: reviewForm.decision === 'approve_and_complete' 
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        closeModal('review');
        await fetchConsultation();
        showToast('Step reviewed successfully');
      } else {
        showToast(data.message || 'Failed to review step', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!id || !schedulingStepNumber) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${schedulingStepNumber}/schedule-re-examination`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            ...scheduleForm, 
            appointmentDateTime: `${scheduleForm.date}T${scheduleForm.time}:00` 
          })
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        closeModal('schedule');
        await fetchConsultation();
        showToast('Visit scheduled');
      } else {
        showToast(data.message || 'Failed to schedule', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmArrival = async (step: LocalTreatmentStep) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${step.stepNumber}/confirm-arrival`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        showToast('Arrival confirmed');
        await fetchConsultation();
      } else {
        showToast(data.message || 'Failed to confirm arrival', 'error');
      }
    } catch {
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
      const res = await fetch(
        `${API_BASE_URL}/doctors/consultations/${id}/steps/${completingStepNumber}/complete-re-examination`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ doctorNotes: completeExamForm.doctorNotes })
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        closeModal('completeReExam');
        await fetchConsultation();
        showToast('Examination completed');
      } else {
        showToast(data.message || 'Failed to complete', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!completingAppointmentId) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/doctors/re-examinations/appointments/${completingAppointmentId}/complete`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ doctorNotes: completeVisitForm.doctorNotes })
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        closeModal('completeVisit');
        await fetchConsultation();
        showToast('Visit completed');
      } else {
        showToast(data.message || 'Failed to complete visit', 'error');
      }
    } catch {
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
      
      const url = editingStepNumber
        ? `${API_BASE_URL}/doctors/consultations/${id}/steps/${editingStepNumber}`
        : `${API_BASE_URL}/doctors/consultations/${id}/steps`;
      
      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        method: editingStepNumber ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.success) {
        closeModal('step');
        await fetchConsultation();
        showToast(editingStepNumber ? 'Step updated' : 'Step created');
        setHasUnsavedChanges(false);
      } else {
        showToast(data.message || 'Failed to save step', 'error');
      }
    } catch {
      showToast('Failed to save step', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast('Consultation completed');
        await fetchConsultation();
        setTimeout(() => navigate('/consultations'), 1500);
      } else {
        showToast(data.message || 'Failed to complete', 'error');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== COMPUTED PROPERTIES ====================

  const getPrescriptionDisplay = useCallback((step: TreatmentStep) => {
    if (!step.medication) return [];
    
    return step.medication.split(' + ').map(med => {
      const parse = (str?: string) => {
        if (!str) return '';
        const f = str.split(' | ').find(p => p.trim().startsWith(`${med}:`));
        return f ? f.split(':')[1].trim() : '';
      };
      
      return {
        name: med,
        dosage: parse(step.dosage),
        duration: parse(step.duration),
        instructions: parse(step.instructions)
      };
    });
  }, []);

  const isPhysicalVisitStep = useCallback((step: TreatmentStep | LocalTreatmentStep) => {
    return step.isPhysicalVisit ||
      step.title?.toLowerCase().includes('re-ex') ||
      step.title?.toLowerCase().includes('physical') ||
      step.title?.toLowerCase().includes('follow-up') ||
      step.title?.toLowerCase().includes('visit') ||
      step.needsReExamination ||
      step.isReExaminationVisit ||
      step.reExaminationScheduled;
  }, []);

  const getAppointmentStatus = useCallback((step: LocalTreatmentStep) => {
    if (!step.reExaminationAppointmentId) return null;
    return appointmentStatuses[step.reExaminationAppointmentId] || 'pending';
  }, [appointmentStatuses]);

  const approvedSteps = useMemo(() => 
    consultation?.treatment_plan?.filter(s => s.status === 'approved').length || 0, 
    [consultation]
  );
  
  const totalSteps = useMemo(() => 
    consultation?.treatment_plan?.length || 0, 
    [consultation]
  );
  
  const progressPercent = useMemo(() => 
    totalSteps > 0 ? Math.round((approvedSteps / totalSteps) * 100) : 0, 
    [approvedSteps, totalSteps]
  );

  const openAddStep = () => {
    if (isCompleted) {
      showToast('Cannot add treatment steps to a closed case', 'info');
      return;
    }
    
    setEditingStepNumber(null);
    setStepForm({ 
      title: '', 
      description: '', 
      prescriptions: [], 
      isPhysicalVisit: false 
    });
    setModals(prev => ({ ...prev, step: true }));
    setHasUnsavedChanges(false);
  };

  const handleFormChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleTouch = (field: string) => {
    setTouchMap(prev => ({ ...prev, [field]: true }));
  };

  // ==================== RENDER STATES ====================

  const isCompleted = consultation?.consultation_status === 'completed';
  const allApproved = consultation?.treatment_plan.every(s => s.status === 'approved') ?? false;

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-sm text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-rose-600 text-xl" aria-hidden="true">⚠️</span>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Failed to Load</h2>
          <p className="text-xs text-slate-500 mb-5">{error}</p>
          <div className="flex gap-2 justify-center">
            <Btn onClick={handleRetry} size="sm" ariaLabel="Retry loading consultation">
              Retry
            </Btn>
            <Btn 
              onClick={() => navigate('/consultations')} 
              size="sm" 
              variant="outline"
              ariaLabel="Return to consultations list"
            >
              Return to List
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SkipLink />
      <ToastStack toasts={toasts} onRemove={removeToast} />

      {/* Exit Dialog */}
      {showExitDialog && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setShowExitDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 id="exit-dialog-title" className="text-sm font-semibold text-slate-900 mb-2">
              Unsaved Changes
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className="flex justify-end gap-2">
              <Btn 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowExitDialog(false)}
              >
                Stay
              </Btn>
              <Btn 
                variant="danger" 
                size="sm" 
                onClick={() => {
                  setShowExitDialog(false);
                  navigate('/consultations');
                }}
              >
                Leave
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-14">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowExitDialog(true);
                } else {
                  navigate('/consultations');
                }
              }}
              className="p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 touch-target"
              aria-label="Go back to consultations"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-900 truncate">
                  Case #{id?.slice(-6).toUpperCase()}
                </h1>
                {isCompleted && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200"
                    role="status"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                    Closed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Opened {new Date(consultation?.created_at || '').toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {/* Right: progress + action */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-700">{approvedSteps}/{totalSteps} steps</span>
                <span className="text-[10px] text-slate-400">completed</span>
              </div>
              <div 
                className="relative w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div 
                  className="absolute left-0 top-0 h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-sky-600">{progressPercent}%</span>
            </div>

            {!isCompleted ? (
              <Btn 
                onClick={handleCompleteConsultation} 
                disabled={!allApproved || isSubmitting}
                loading={isSubmitting} 
                variant="teal" 
                size="sm"
                ariaLabel="Close case"
              >
                Close Case
              </Btn>
            ) : (
              <span 
                className="text-xs text-teal-700 font-medium bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-md"
                role="status"
              >
                ✓ Case Closed
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        ref={mainRef}
        id="main-content"
        className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5"
        tabIndex={-1}
      >
        {loading ? (
          <div className="space-y-4">
            <StepSkeleton />
            <StepSkeleton />
            <StepSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
            {/* Left Panel */}
            <aside className="space-y-4" aria-label="Patient information">
              {/* Patient card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative shrink-0">
                    {consultation?.user_id.avatar ? (
                      <img 
                        src={getAvatarUrl(consultation.user_id.avatar)} 
                        alt="" 
                        className="w-12 h-12 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-base font-bold text-sky-600"
                        aria-label={`${consultation?.user_id.name}'s avatar`}
                      >
                        {consultation?.user_id.name.charAt(0)}
                      </div>
                    )}
                    <span 
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white 
                        ${consultation?.priority === 'urgent' ? 'bg-rose-500' : 'bg-teal-400'}`}
                      role="status"
                      aria-label={`Priority: ${consultation?.priority || 'normal'}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{consultation?.user_id.name}</p>
                    <p className="text-xs text-slate-500">
                      {consultation?.user_id.gender} · {calculateAge(consultation?.user_id.dateOfBirth || '')} yrs
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <FieldLabel id="diagnosis-label">Primary Diagnosis</FieldLabel>
                    <p 
                      className="text-xs text-slate-700 bg-slate-50 rounded-md px-3 py-2 leading-relaxed"
                      aria-labelledby="diagnosis-label"
                    >
                      {consultation?.diagnosis || 'Pending diagnosis'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>Priority</FieldLabel>
                      <span className={`text-xs font-semibold ${consultation?.priority === 'urgent' ? 'text-rose-600' : 'text-slate-700'}`}>
                        {consultation?.priority === 'urgent' ? '↑ Urgent' : '— Normal'}
                      </span>
                    </div>
                    <div>
                      <FieldLabel>Opened</FieldLabel>
                      <span className="text-xs text-slate-700">
                        {new Date(consultation?.created_at || '').toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                  </div>

                  {consultation?.next_appointment && (
                    <div>
                      <FieldLabel>Next Appointment</FieldLabel>
                      <p className="text-xs text-slate-700 flex items-center gap-1.5">
                        <span className="text-slate-400" aria-hidden="true">📅</span>
                        {new Date(consultation.next_appointment).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <FieldLabel>Actions</FieldLabel>
                <div className="space-y-2 mt-2">
                  <Btn 
                    onClick={openAddStep} 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    disabled={isCompleted}
                    ariaLabel="Add treatment step"
                    ref={modalTriggerRef}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Treatment Step
                  </Btn>
                  <Btn 
                    onClick={() => navigate(`/doctors/consultations/${id}/notes`)}
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    ariaLabel="View clinical notes"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                    Clinical Notes
                  </Btn>
                </div>
              </div>

              {/* Step summary */}
              {totalSteps > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <FieldLabel>Plan Overview</FieldLabel>
                  <div className="mt-2 space-y-1.5">
                    {consultation?.treatment_plan.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          step.status === 'approved' ? 'border-teal-400 bg-teal-50 text-teal-600' :
                          step.status === 'in-progress' ? 'border-sky-400 bg-sky-50 text-sky-600' :
                          'border-slate-300 bg-slate-50 text-slate-400'
                        }`}>
                          {step.status === 'approved' ? '✓' : i + 1}
                        </div>
                        <span className="text-xs text-slate-700 truncate">{step.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Right Panel */}
            <section aria-label="Treatment plan">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                {/* Panel header */}
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">Treatment Plan</h2>
                  <Btn 
                    onClick={openAddStep} 
                    variant="outline" 
                    size="xs" 
                    disabled={isCompleted}
                    ariaLabel="Add treatment step"
                  >
                    + Add Step
                  </Btn>
                </div>

                <div className="p-5">
                  {consultation?.treatment_plan && consultation.treatment_plan.length > 0 ? (
                    <div className="relative">
                      {/* Vertical track */}
                      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-100" aria-hidden="true" />

                      <div className="space-y-4">
                        {consultation.treatment_plan.map((step, index) => {
                          const ls = step as LocalTreatmentStep;
                          const prescriptions = getPrescriptionDisplay(step);
                          const isPhysical = isPhysicalVisitStep(step);
                          const apptStatus = getAppointmentStatus(ls);
                          const isApproved = step.status === 'approved';

                          return (
                            <div 
                              key={step._id || index} 
                              className="relative flex gap-4"
                              role="listitem"
                            >
                              {/* Step indicator */}
                              <div 
                                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold bg-white ${
                                  isApproved ? 'border-teal-400 text-teal-600' :
                                  step.status === 'in-progress' ? 'border-sky-400 text-sky-600' :
                                  step.status === 'rejected' ? 'border-rose-400 text-rose-600' :
                                  'border-slate-300 text-slate-400'
                                }`}
                                aria-hidden="true"
                              >
                                {isApproved ? '✓' : index + 1}
                              </div>

                              {/* Step card */}
                              <div className={`flex-1 min-w-0 rounded-lg border transition-colors ${
                                isApproved ? 'border-teal-100 bg-teal-50/30' :
                                step.status === 'in-progress' ? 'border-sky-100 bg-sky-50/20' :
                                step.status === 'completed' ? 'border-amber-100 bg-amber-50/20' :
                                step.status === 'rejected' ? 'border-rose-100 bg-rose-50/20' :
                                'border-slate-200 bg-white'
                              }`}>
                                {/* Card header */}
                                <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                      <span className="text-xs font-semibold text-slate-800">{step.title}</span>
                                      {isPhysical && <Chip label="Physical Visit" color="purple" />}
                                      {apptStatus && <Chip label={apptStatus} color="slate" />}
                                    </div>
                                    {step.description && (
                                      <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                                    )}
                                  </div>
                                  <StatusDot status={step.status} ariaLabel={`Step ${index + 1} status: ${step.status}`} />
                                </div>

                                {/* Prescriptions */}
                                {prescriptions.length > 0 && (
                                  <div className="px-4 pb-3">
                                    <div className="border-t border-slate-100 pt-3">
                                      <FieldLabel>Prescriptions</FieldLabel>
                                      <div className="space-y-1.5 mt-1">
                                        {prescriptions.map((rx, i) => (
                                          <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                                            <span className="font-semibold text-slate-800">{rx.name}</span>
                                            {rx.dosage && <span className="text-slate-500">{rx.dosage}</span>}
                                            {rx.duration && <span className="text-slate-400">· {rx.duration}</span>}
                                            {rx.instructions && <span className="text-slate-400 italic">· {rx.instructions}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Doctor notes */}
                                {step.doctorNotes && (
                                  <div className="px-4 pb-3">
                                    <div className="border-t border-slate-100 pt-3">
                                      <FieldLabel>Notes</FieldLabel>
                                      <p className="text-xs text-slate-600 leading-relaxed mt-1">{step.doctorNotes}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Action row */}
                                <div className="px-4 py-2.5 border-t border-slate-100 flex flex-wrap gap-2">
                                  {step.status === 'completed' && !isPhysical && (
                                    <Btn 
                                      size="xs" 
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
                                        setModals(prev => ({ ...prev, review: true }));
                                      }}
                                      ariaLabel="Review step"
                                    >
                                      Review Step
                                    </Btn>
                                  )}

                                  {isPhysical && !ls.reExaminationScheduled && !['approved', 'confirmed'].includes(step.status) && (
                                    <Btn 
                                      size="xs" 
                                      variant="outline" 
                                      onClick={() => {
                                        setSchedulingStepNumber(step.stepNumber);
                                        const d = new Date(); 
                                        d.setDate(d.getDate() + 1);
                                        setScheduleForm({ 
                                          date: d.toISOString().split('T')[0], 
                                          time: '09:00', 
                                          notes: ls.reExaminationNotes || 'Please bring previous medical records.', 
                                          duration: '30' 
                                        });
                                        setModals(prev => ({ ...prev, schedule: true }));
                                      }}
                                      ariaLabel="Schedule visit"
                                    >
                                      Schedule Visit
                                    </Btn>
                                  )}

                                  {isPhysical && step.status === 'scheduled' && ls.reExaminationScheduled && !ls.arrivalConfirmed &&
                                    new Date(ls.reExaminationDate!).toDateString() === new Date().toDateString() && (
                                    <Btn 
                                      size="xs" 
                                      variant="outline" 
                                      onClick={() => handleConfirmArrival(ls)} 
                                      disabled={isSubmitting}
                                      ariaLabel="Confirm patient arrival"
                                    >
                                      Confirm Arrival
                                    </Btn>
                                  )}

                                  {isPhysical && ls.reExaminationAppointmentId && apptStatus === 'confirmed' && step.status === 'in-progress' && (
                                    <Btn 
                                      size="xs" 
                                      variant="teal" 
                                      onClick={() => {
                                        setCompletingAppointmentId(ls.reExaminationAppointmentId!);
                                        setCompleteVisitForm({ doctorNotes: '' });
                                        setModals(prev => ({ ...prev, completeVisit: true }));
                                      }}
                                      ariaLabel="Complete visit"
                                    >
                                      Complete Visit
                                    </Btn>
                                  )}

                                  {isPhysical && ls.reExaminationScheduled && step.status === 'scheduled' && apptStatus !== 'confirmed' && (
                                    <Btn 
                                      size="xs" 
                                      variant="teal" 
                                      onClick={() => {
                                        setCompletingStepNumber(step.stepNumber);
                                        setCompleteExamForm({ doctorNotes: ls.doctorNotes || '' });
                                        setModals(prev => ({ ...prev, completeReExam: true }));
                                      }}
                                      ariaLabel="Complete examination"
                                    >
                                      Complete Exam
                                    </Btn>
                                  )}

                                  {step.status !== 'approved' && step.status !== 'scheduled' && (
                                    <Btn 
                                      size="xs" 
                                      variant="ghost" 
                                      onClick={() => {
                                        setEditingStepNumber(step.stepNumber);
                                        setStepForm({
                                          title: step.title,
                                          description: step.description,
                                          prescriptions: prescriptions.map(p => ({ ...p, medication: p.name })) as PrescriptionItem[],
                                          isPhysicalVisit: isPhysical || false
                                        });
                                        setModals(prev => ({ ...prev, step: true }));
                                      }}
                                      ariaLabel="Edit step"
                                    >
                                      Edit
                                    </Btn>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-slate-400 text-lg" aria-hidden="true">+</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-1">No treatment steps yet</p>
                      <p className="text-xs text-slate-400 mb-4">
                        {isCompleted 
                          ? 'This case is closed and no new steps can be added.' 
                          : 'Add the first step to begin the treatment plan'}
                      </p>
                      <Btn 
                        onClick={openAddStep} 
                        size="sm" 
                        disabled={isCompleted}
                        ariaLabel="Add first treatment step"
                      >
                        Add First Step
                      </Btn>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Step Modal */}
      {!isCompleted && (
        <Modal 
          isOpen={modals.step} 
          onClose={() => closeModal('step')}
          title={editingStepNumber ? `Edit Step #${editingStepNumber}` : 'New Treatment Step'}
          size="xl"
          initialFocusRef={firstInputRef}
          footer={
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" size="sm" onClick={() => closeModal('step')}>Cancel</Btn>
              <Btn 
                size="sm" 
                onClick={handleSaveStep} 
                disabled={isSubmitting || !stepForm.title.trim()} 
                loading={isSubmitting}
                ariaLabel={editingStepNumber ? 'Update step' : 'Create step'}
              >
                {editingStepNumber ? 'Update Step' : 'Create Step'}
                <span className="text-xs opacity-70 ml-1 hidden sm:inline">(Ctrl+S)</span>
              </Btn>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput 
                ref={firstInputRef}
                label="Title *" 
                value={stepForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setStepForm({ ...stepForm, title: e.target.value });
                  handleFormChange();
                }}
                onBlur={() => handleTouch('title')}
                error={touchMap['title'] && !stepForm.title.trim() ? 'Title is required' : undefined}
                touched={touchMap['title']}
                placeholder="e.g. Initial Assessment"
                required
              />
              <FormInput 
                label="Description" 
                value={stepForm.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setStepForm({ ...stepForm, description: e.target.value });
                  handleFormChange();
                }}
                placeholder="Brief description"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={stepForm.isPhysicalVisit}
                onChange={e => {
                  setStepForm({ ...stepForm, isPhysicalVisit: e.target.checked });
                  handleFormChange();
                }}
                className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                aria-label="Requires physical visit"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                Requires physical visit
              </span>
              {stepForm.isPhysicalVisit && <Chip label="Physical Visit" color="purple" />}
            </label>

            <div>
              <SectionLabel>Prescriptions</SectionLabel>
              <div className="space-y-3">
                {stepForm.prescriptions.map((rx, index) => (
                  <div key={index} className="relative p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <button 
                      onClick={() => {
                        const n = [...stepForm.prescriptions]; 
                        n.splice(index, 1);
                        setStepForm({ ...stepForm, prescriptions: n });
                        handleFormChange();
                      }} 
                      className="absolute top-2 right-2 text-xs text-slate-400 hover:text-rose-600 w-5 h-5 flex items-center justify-center rounded hover:bg-rose-50 touch-target"
                      aria-label="Remove medication"
                    >
                      ×
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Medication selector */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                          Medication
                        </label>
                        <select 
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                          value={availableDrugs.find(d => d.name === rx.medication) ? rx.medication : ''}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const n = [...stepForm.prescriptions];
                            n[index].medication = e.target.value;
                            setStepForm({ ...stepForm, prescriptions: n });
                            handleFormChange();
                          }}
                        >
                          <option value="">Select medication...</option>
                          {availableDrugs.map(d => (
                            <option key={d._id} value={d.name}>{d.name}{d.strength ? ` — ${d.strength}` : ''}</option>
                          ))}
                          <option value="other">Other (type manually)</option>
                        </select>
                        {(!availableDrugs.find(d => d.name === rx.medication) && rx.medication) && (
                          <FormInput 
                            className="mt-2 text-xs" 
                            value={rx.medication}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const n = [...stepForm.prescriptions]; 
                              n[index].medication = e.target.value;
                              setStepForm({ ...stepForm, prescriptions: n });
                              handleFormChange();
                            }} 
                            placeholder="Enter medication name"
                          />
                        )}
                      </div>

                      {/* Dosage */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                          Dosage
                        </label>
                        <select 
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                          value={DOSAGE_OPTIONS.includes(rx.dosage) ? rx.dosage : ''}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const n = [...stepForm.prescriptions];
                            if (e.target.value === 'custom') { 
                              setCustomInputModes(p => ({ ...p, [`${index}-dosage`]: true })); 
                              n[index].dosage = ''; 
                            } else { 
                              setCustomInputModes(p => ({ ...p, [`${index}-dosage`]: false })); 
                              n[index].dosage = e.target.value; 
                            }
                            setStepForm({ ...stepForm, prescriptions: n });
                            handleFormChange();
                          }}
                        >
                          <option value="">Select dosage...</option>
                          {DOSAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          <option value="custom">Custom...</option>
                        </select>
                        {(customInputModes[`${index}-dosage`] || (rx.dosage && !DOSAGE_OPTIONS.includes(rx.dosage))) && (
                          <FormInput 
                            className="mt-1.5 text-xs" 
                            value={rx.dosage}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const n = [...stepForm.prescriptions]; 
                              n[index].dosage = e.target.value;
                              setStepForm({ ...stepForm, prescriptions: n });
                              handleFormChange();
                            }} 
                            placeholder="Enter dosage"
                          />
                        )}
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                          Duration
                        </label>
                        <select 
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                          value={DURATION_OPTIONS.includes(rx.duration) ? rx.duration : ''}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const n = [...stepForm.prescriptions];
                            if (e.target.value === 'custom') { 
                              setCustomInputModes(p => ({ ...p, [`${index}-duration`]: true })); 
                              n[index].duration = ''; 
                            } else { 
                              setCustomInputModes(p => ({ ...p, [`${index}-duration`]: false })); 
                              n[index].duration = e.target.value; 
                            }
                            setStepForm({ ...stepForm, prescriptions: n });
                            handleFormChange();
                          }}
                        >
                          <option value="">Select duration...</option>
                          {DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          <option value="custom">Custom...</option>
                        </select>
                        {(customInputModes[`${index}-duration`] || (rx.duration && !DURATION_OPTIONS.includes(rx.duration))) && (
                          <FormInput 
                            className="mt-1.5 text-xs" 
                            value={rx.duration}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const n = [...stepForm.prescriptions]; 
                              n[index].duration = e.target.value;
                              setStepForm({ ...stepForm, prescriptions: n });
                              handleFormChange();
                            }} 
                            placeholder="Enter duration"
                          />
                        )}
                      </div>

                      {/* Instructions */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                          Instructions
                        </label>
                        <select 
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                          value={INSTRUCTION_OPTIONS.includes(rx.instructions) ? rx.instructions : ''}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const n = [...stepForm.prescriptions];
                            if (e.target.value === 'custom') { 
                              setCustomInputModes(p => ({ ...p, [`${index}-instructions`]: true })); 
                              n[index].instructions = ''; 
                            } else { 
                              setCustomInputModes(p => ({ ...p, [`${index}-instructions`]: false })); 
                              n[index].instructions = e.target.value; 
                            }
                            setStepForm({ ...stepForm, prescriptions: n });
                            handleFormChange();
                          }}
                        >
                          <option value="">Select instructions...</option>
                          {INSTRUCTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          <option value="custom">Custom...</option>
                        </select>
                        {(customInputModes[`${index}-instructions`] || (rx.instructions && !INSTRUCTION_OPTIONS.includes(rx.instructions))) && (
                          <FormInput 
                            className="mt-1.5 text-xs" 
                            value={rx.instructions}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const n = [...stepForm.prescriptions]; 
                              n[index].instructions = e.target.value;
                              setStepForm({ ...stepForm, prescriptions: n });
                              handleFormChange();
                            }} 
                            placeholder="Enter instructions"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <Btn 
                  variant="ghost" 
                  size="xs"
                  onClick={() => {
                    setStepForm({ 
                      ...stepForm, 
                      prescriptions: [...stepForm.prescriptions, { medication: '', dosage: '', duration: '', instructions: '' }] 
                    });
                    handleFormChange();
                  }}
                >
                  + Add medication
                </Btn>

                {stepForm.prescriptions.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No medications added yet</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Review Modal */}
      <Modal 
        isOpen={modals.review} 
        onClose={() => closeModal('review')}
        title={`Review — Step #${reviewingStepNumber}`}
        subtitle="Assess patient progress and set next action"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => closeModal('review')}>Cancel</Btn>
            <Btn 
              size="sm" 
              onClick={handleSubmitReview}
              disabled={isSubmitting || (reviewForm.decision === 'approve_with_followup' && !reviewForm.nextAppointmentDate)}
              loading={isSubmitting}
            >
              Submit Review
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Decision</FieldLabel>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { value: 'approve_with_followup', label: 'Approve & Follow-up', sub: 'Continue with next step', border: 'border-sky-500 bg-sky-50' },
                { value: 'approve_and_complete',  label: 'Approve & Close',    sub: 'End treatment here',     border: 'border-teal-500 bg-teal-50' },
              ].map(opt => (
                <button 
                  key={opt.value} 
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, decision: opt.value as any })}
                  className={`p-3 text-left rounded-lg border-2 transition-all touch-target ${
                    reviewForm.decision === opt.value ? opt.border : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  aria-pressed={reviewForm.decision === opt.value}
                >
                  <p className="text-xs font-semibold text-slate-900">{opt.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {reviewForm.decision === 'approve_with_followup' && (
            <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100 space-y-3">
              <FieldLabel>Next Appointment</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <FormInput 
                  type="date" 
                  label="Date" 
                  value={reviewForm.nextAppointmentDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewForm({ ...reviewForm, nextAppointmentDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                <FormInput 
                  type="time" 
                  label="Time" 
                  value={reviewForm.nextAppointmentTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewForm({ ...reviewForm, nextAppointmentTime: e.target.value })}
                />
              </div>
            </div>
          )}

          <FormTextarea 
            label="Clinical Notes" 
            rows={4} 
            value={reviewForm.doctorNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewForm({ ...reviewForm, doctorNotes: e.target.value })}
            placeholder="Assessment findings, treatment rationale..."
          />
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal 
        isOpen={modals.schedule} 
        onClose={() => closeModal('schedule')}
        title={`Schedule Visit — Step #${schedulingStepNumber}`}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => closeModal('schedule')}>Cancel</Btn>
            <Btn 
              size="sm" 
              onClick={handleScheduleSubmit}
              disabled={isSubmitting || !scheduleForm.date || !scheduleForm.time} 
              loading={isSubmitting}
            >
              Confirm Schedule
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput 
            type="date" 
            label="Date" 
            value={scheduleForm.date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            required
          />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time Slot</label>
            {loadingTimeSlots ? (
              <p className="text-xs text-slate-400">Checking availability...</p>
            ) : (
              <select 
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                value={scheduleForm.time}
                onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                disabled={!availableTimeSlots.length}
                required
              >
                <option value="">Select a time slot</option>
                {availableTimeSlots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {scheduleForm.date && !availableTimeSlots.length && !loadingTimeSlots && (
              <p className="mt-1 text-xs text-rose-600">No slots available for this date</p>
            )}
          </div>

          <FormSelect 
            label="Duration" 
            value={scheduleForm.duration}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScheduleForm({ ...scheduleForm, duration: e.target.value })}
            options={[
              { value: '30', label: '30 min' }, 
              { value: '45', label: '45 min' }, 
              { value: '60', label: '60 min' }
            ]}
          />

          <FormTextarea 
            label="Patient Instructions" 
            rows={3} 
            value={scheduleForm.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
            placeholder="Preparation notes for the patient..."
          />
        </div>
      </Modal>

      {/* Complete Re-Exam Modal */}
      <Modal 
        isOpen={modals.completeReExam} 
        onClose={() => closeModal('completeReExam')}
        title={`Complete Exam — Step #${completingStepNumber}`}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => closeModal('completeReExam')}>Cancel</Btn>
            <Btn 
              size="sm" 
              variant="teal" 
              onClick={handleCompleteReExamination}
              disabled={isSubmitting || !completeExamForm.doctorNotes.trim()} 
              loading={isSubmitting}
            >
              Mark Complete
            </Btn>
          </div>
        }
      >
        <FormTextarea 
          label="Examination Findings *" 
          rows={5} 
          value={completeExamForm.doctorNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCompleteExamForm({ ...completeExamForm, doctorNotes: e.target.value })}
          placeholder="Document physical examination findings, observations, and outcomes..."
          required
        />
      </Modal>

      {/* Complete Visit Modal */}
      <Modal 
        isOpen={modals.completeVisit} 
        onClose={() => closeModal('completeVisit')}
        title="Complete Physical Visit"
        subtitle={completingAppointmentId ? `Appt. #${completingAppointmentId.slice(-6).toUpperCase()}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => closeModal('completeVisit')}>Cancel</Btn>
            <Btn 
              size="sm" 
              variant="teal" 
              onClick={handleCompleteVisit}
              disabled={isSubmitting || !completeVisitForm.doctorNotes.trim()} 
              loading={isSubmitting}
            >
              Mark Complete
            </Btn>
          </div>
        }
      >
        <FormTextarea 
          label="Visit Notes *" 
          rows={5} 
          value={completeVisitForm.doctorNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCompleteVisitForm({ ...completeVisitForm, doctorNotes: e.target.value })}
          placeholder="Record visit findings, patient condition, outcomes..."
          required
        />
      </Modal>

      <style>{ANIMATIONS}</style>
    </>
  );
};

export default ConsultationDetail;