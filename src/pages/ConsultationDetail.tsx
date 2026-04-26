import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface Drug { _id: string; name: string; strength?: string; unit?: string; form?: string; }

interface PrescriptionItem {
  medication: string; dosage: string; duration: string; instructions: string;
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
  status: 'pending' | 'in-progress' | 'completed' | 'approved' | 'scheduled' | 'rejected';
  isPhysicalVisit?: boolean;
  isReExaminationVisit?: boolean;
  reExaminationScheduled?: boolean;
  needsReExamination?: boolean;
  reExaminationDate?: string;
  reExaminationTime?: string;
  reExaminationAppointmentId?: string;
  reExaminationNotes?: string;
  arrivalConfirmed?: boolean;
  arrivalConfirmedAt?: string;
  doctorNotes?: string;
  patient_message?: string;
  condition_description?: string;
  approval_requested?: boolean;
  rejectionReason?: string;
  completedAt?: string;
  approvedAt?: string;
}

interface Consultation {
  _id: string;
  user_id: { _id: string; name: string; avatar?: string; gender: string; dateOfBirth: string; };
  doctor_id: { _id: string; name: string; } | string;
  diagnosis?: string;
  priority: 'normal' | 'urgent';
  consultation_status: 'in-progress' | 'completed';
  created_at: string;
  next_appointment?: string;
  treatment_plan: TreatmentStep[];
}

interface StepAppointmentStatus {
  step: { stepNumber: number; title: string; status: string; reExaminationAppointmentId?: string; };
  appointment: {
    _id: string; status: string;
    appointment_date: string; time_slot: string;
    patient?: { name: string; email: string; phoneNumber: string; };
    reason?: string; notes?: string;
  } | null;
  doctorAction: 'waiting_patient' | 'start_examination' | 'examination_done' | 'reschedule' | null;
}

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const API = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api');
const getDoctorId = () => localStorage.getItem('doctorId');
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const DOSAGES = ["1 tablet", "2 tablets", "3 tablets", "1 capsule", "2 capsules", "5ml", "10ml", "15ml", "Apply thinly", "1 drop", "2 drops", "1 puff", "2 puffs"];
const DURATIONS = ["1 day", "3 days", "5 days", "7 days", "10 days", "14 days", "21 days", "1 month", "2 months", "3 months", "Until finished", "Ongoing", "As directed"];
const INSTRUCTIONS = ["After meals", "Before meals", "With food", "On empty stomach", "Before sleep", "Once daily", "Twice daily", "Three times daily", "Every 8 hours", "Every 12 hours", "As needed", "With plenty of water"];

// ─────────────────────────────────────────────────────────────
// STEP CONFIG
// ─────────────────────────────────────────────────────────────
const STEP_CFG: Record<string, { label: string; dot: string; badge: string; track: string }> = {
  pending: { label: 'Pending', dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500 border-slate-200', track: 'border-slate-300 text-slate-400' },
  'in-progress': { label: 'In Progress', dot: 'bg-sky-400', badge: 'bg-sky-50 text-sky-700 border-sky-200', track: 'border-sky-400 text-sky-600 bg-sky-50' },
  scheduled: { label: 'Scheduled', dot: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700 border-violet-200', track: 'border-violet-400 text-violet-600 bg-violet-50' },
  completed: { label: 'Awaiting Review', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', track: 'border-amber-400 text-amber-600 bg-amber-50' },
  approved: { label: 'Approved', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200', track: 'border-teal-500 text-teal-600 bg-teal-50' },
  rejected: { label: 'Revision', dot: 'bg-rose-400', badge: 'bg-rose-50 text-rose-700 border-rose-200', track: 'border-rose-400 text-rose-600 bg-rose-50' },
};
const stepCfg = (s: string) => STEP_CFG[s] ?? STEP_CFG.pending;

// ─────────────────────────────────────────────────────────────
// HELPER: Get doctor name from consultation (FIX: "Dr. Doctor" bug)
// ─────────────────────────────────────────────────────────────
const getDoctorName = (consultation: Consultation | null): string => {
  if (!consultation) return localStorage.getItem('doctorName') || 'Doctor';

  // doctor_id may be populated (object) or just an ID string
  const doctorId = consultation.doctor_id;
  if (doctorId && typeof doctorId === 'object' && (doctorId as any).name) {
    return (doctorId as any).name;
  }

  // Fallback to localStorage
  const stored = localStorage.getItem('doctorName');
  if (stored && stored !== 'Doctor' && stored !== 'undefined' && stored !== 'null') {
    return stored;
  }

  return 'Doctor';
};

// ─────────────────────────────────────────────────────────────
// QR CODE GENERATOR
// ─────────────────────────────────────────────────────────────
const generateQRDataURL = (text: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=2&data=${encodeURIComponent(text)}`;
};

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const c = stepCfg(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const Spinner: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg className="animate-spin" style={{ width: size, height: size }} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'teal' | 'outline' | 'ghost' | 'danger' | 'amber';
  size?: 'xs' | 'sm' | 'md';
  loading?: boolean;
}
const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(({
  variant = 'primary', size = 'md', loading, disabled, children, className = '', ...p
}, ref) => {
  const v = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 border border-sky-600',
    teal: 'bg-teal-600 text-white hover:bg-teal-700 border border-teal-600',
    amber: 'bg-amber-500 text-white hover:bg-amber-600 border border-amber-500',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 border border-rose-600',
  }[variant];
  const s = { xs: 'px-2.5 py-1 text-[11px] min-h-[26px]', sm: 'px-3 py-1.5 text-xs min-h-[30px]', md: 'px-4 py-2 text-sm min-h-[36px]' }[size];
  return (
    <button ref={ref} disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${v} ${s} ${className}`}
      {...p}
    >
      {loading && <Spinner size={12} />}
      {children}
    </button>
  );
});
Btn.displayName = 'Btn';

const FL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] mb-1">{children}</p>
);

const SL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{children}</span>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ label, error, className = '', ...p }, ref) => (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <input ref={ref} className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:bg-slate-50 ${error ? 'border-rose-400' : 'border-slate-300'} ${className}`} {...p} />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...p }) => (
  <div className="space-y-1">
    {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
    <textarea className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 resize-none focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400 ${className}`} {...p} />
  </div>
);

const Modal: React.FC<{
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, footer, size = 'md', children }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${w} flex flex-col max-h-[88vh] animate-[modalIn_0.16s_ease-out]`}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-4 w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg">×</button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
};

const Toasts: React.FC<{ items: Toast[]; onDismiss: (id: number) => void }> = ({ items, onDismiss }) => (
  <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
    {items.map(t => (
      <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm min-w-[280px] max-w-sm animate-[toastIn_0.2s_ease-out] ${t.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
        t.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' :
          'bg-sky-50 border-sky-200 text-sky-800'
        }`}>
        <span className="mt-0.5 text-base shrink-0">{t.type === 'error' ? '⚠' : t.type === 'success' ? '✓' : 'ℹ'}</span>
        <span className="flex-1 font-medium">{t.message}</span>
        <button onClick={() => onDismiss(t.id)} className="opacity-50 hover:opacity-100 text-lg leading-none">×</button>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// CONSULTATION QR MODAL (Full consultation, not per-step)
// ─────────────────────────────────────────────────────────────
interface ConsultationQRModalProps {
  open: boolean;
  onClose: () => void;
  consultation: Consultation | null;
  consultationId: string;
}

const ConsultationQRModal: React.FC<ConsultationQRModalProps> = ({
  open, onClose, consultation, consultationId
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (open && consultation) {
      // Link to full consultation (not a step) — this is what the patient scans on mobile
      const consultationUrl = `${window.location.origin}/consultation/${consultationId}/summary`;
      const qr = generateQRDataURL(consultationUrl);
      setQrDataUrl(qr);
    }
  }, [open, consultation, consultationId]);

  const calcAge = (dob: string) => {
    const b = new Date(dob); const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };

  const doctorName = getDoctorName(consultation);
  const totalSteps = consultation?.treatment_plan.length ?? 0;
  const approvedSteps = consultation?.treatment_plan.filter(s => s.status === 'approved').length ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consultation QR Code"
      subtitle={`Case #${consultationId.slice(-6).toUpperCase()} — Full Consultation`}
      size="md"
      footer={
        <div className="flex justify-between items-center gap-2">
          <p className="text-[11px] text-slate-400">Patient scans to view full consultation & all prescriptions</p>
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>
            <Btn variant="outline" size="sm" onClick={() => {
              if (!qrDataUrl) return;
              const a = document.createElement('a');
              a.href = qrDataUrl;
              a.download = `consultation-qr-${consultationId.slice(-6)}.png`;
              a.click();
            }}>
              ⬇ Download QR
            </Btn>
          </div>
        </div>
      }
    >
      {consultation && (
        <div className="space-y-4">
          {/* Patient info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-600">
              {consultation.user_id.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">{consultation.user_id.name}</p>
              <p className="text-[11px] text-slate-500">
                {consultation.user_id.gender} · {calcAge(consultation.user_id.dateOfBirth)} yrs · Case #{consultationId.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 py-2">
            {qrDataUrl ? (
              <div className="p-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm">
                <img src={qrDataUrl} alt="Consultation QR Code" className="w-44 h-44" />
              </div>
            ) : (
              <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center">
                <Spinner size={24} />
              </div>
            )}
            <p className="text-[11px] text-slate-400 text-center max-w-[220px]">
              Scan with mobile to view all prescriptions and treatment steps
            </p>
          </div>

          {/* Consultation summary */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Treatment Progress</span>
              <span className="text-xs font-bold text-teal-600">{approvedSteps}/{totalSteps} steps approved</span>
            </div>
            {consultation.diagnosis && (
              <p className="text-xs text-slate-600"><span className="font-semibold">Diagnosis:</span> {consultation.diagnosis}</p>
            )}
            <p className="text-xs text-slate-500"><span className="font-semibold">Doctor:</span> Dr. {doctorName}</p>
          </div>

          {/* Step list */}
          <div>
            <FL>All Treatment Steps</FL>
            <div className="space-y-1.5 mt-1">
              {consultation.treatment_plan.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${s.status === 'approved' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.status === 'approved' ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{s.title}</p>
                    {s.medication && <p className="text-[11px] text-slate-500 truncate">{s.medication}</p>}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// PRINT FULL CONSULTATION (FIXED: includes ALL steps, correct doctor name)
// ─────────────────────────────────────────────────────────────
const printFullConsultation = (consultation: Consultation, consultationId: string) => {
  const calcAge = (dob: string) => {
    const b = new Date(dob); const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };

  const parsePrescriptions = (s: TreatmentStep) => {
    if (!s.medication) return [];
    return s.medication.split(' + ').map(med => {
      const parse = (str?: string) => {
        if (!str) return '';
        const part = str.split(' | ').find(p => p.trim().startsWith(`${med}:`));
        return part ? part.split(':')[1].trim() : (str.includes(':') ? '' : str);
      };
      return { name: med, dosage: parse(s.dosage), duration: parse(s.duration), instructions: parse(s.instructions) };
    });
  };

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const caseId = consultationId.slice(-6).toUpperCase();
  const age = calcAge(consultation.user_id.dateOfBirth);
  // FIX: use getDoctorName to avoid "Dr. Doctor"
  const doctorName = getDoctorName(consultation);

  // FIX: Generate QR for full consultation URL (scannable on mobile)
  const consultationUrl = `${window.location.origin}/consultation/${consultationId}/summary`;
  const qrDataUrl = generateQRDataURL(consultationUrl);

  // FIX: Sort treatment_plan by stepNumber to ensure correct order
  const sortedSteps = [...consultation.treatment_plan].sort((a, b) => a.stepNumber - b.stepNumber);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Full Consultation History — ${consultation.user_id.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.5; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 20px; border-bottom: 2px solid #0284c7; margin-bottom: 24px; }
    .clinic-name { font-size: 22px; font-weight: 800; color: #0284c7; }
    .clinic-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 4px; }
    .patient-info { display: flex; gap: 40px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 30px; }
    .step-card { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; page-break-inside: avoid; }
    .step-header { background: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .step-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .step-status-approved { font-size: 10px; font-weight: 700; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 10px; border-radius: 12px; text-transform: uppercase; }
    .step-status-other { font-size: 10px; font-weight: 700; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 2px 10px; border-radius: 12px; text-transform: uppercase; }
    .step-body { padding: 16px; }
    .rx-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .rx-table th { background: #0284c7; color: white; padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .rx-table th:first-child { border-radius: 6px 0 0 0; }
    .rx-table th:last-child { border-radius: 0 6px 0 0; }
    .rx-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    .rx-table tr:last-child td { border-bottom: none; }
    .no-rx { font-size: 12px; color: #94a3b8; font-style: italic; padding: 8px 0; }
    .notes { font-size: 12px; color: #475569; margin-top: 10px; font-style: italic; white-space: pre-wrap; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }
    .qr-section { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .qr-section img { width: 90px; height: 90px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px; }
    .qr-label { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 2px; }
    .diagnosis-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #1e40af; font-weight: 500; }
    .step-number-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 700; margin-right: 8px; }
    @media print { .page { padding: 20px; } .step-card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="clinic-name">MediCare Clinic</div>
        <div class="clinic-sub">Full Consultation Summary — Case #${caseId}</div>
        <div class="clinic-sub">Dr. ${doctorName}</div>
        <div class="clinic-sub">123 Healthcare Avenue · Ho Chi Minh City · Tel: +84 28 1234 5678</div>
      </div>
      <div style="text-align: right">
        <div class="label">Date Issued</div>
        <div style="font-weight: 600">${today}</div>
        <div class="label" style="margin-top: 8px">Total Steps</div>
        <div style="font-weight: 600">${sortedSteps.length} steps</div>
      </div>
    </div>

    <div class="label">Patient Records</div>
    <div class="patient-info">
      <div><div class="label">Name</div><div style="font-weight: 600">${consultation.user_id.name}</div></div>
      <div><div class="label">Gender</div><div style="font-weight: 600">${consultation.user_id.gender}</div></div>
      <div><div class="label">Age</div><div style="font-weight: 600">${age} yrs</div></div>
    </div>

    ${consultation.diagnosis ? `
    <div class="label" style="margin-bottom: 8px">Primary Diagnosis</div>
    <div class="diagnosis-box">${consultation.diagnosis}</div>
    ` : ''}

    <div class="label" style="margin-bottom: 12px">Treatment History (${sortedSteps.length} steps total)</div>
    
    ${sortedSteps.map((s) => {
    const rxList = parsePrescriptions(s);
    const statusClass = s.status === 'approved' ? 'step-status-approved' : 'step-status-other';
    const statusLabel = stepCfg(s.status).label;
    return `
      <div class="step-card">
        <div class="step-header">
          <div class="step-title">
            <span class="step-number-badge">${s.status === 'approved' ? '✓' : s.stepNumber}</span>
            Step ${s.stepNumber}: ${s.title}
          </div>
          <div class="${statusClass}">${statusLabel}</div>
        </div>
        <div class="step-body">
          ${s.description ? `<p style="margin-bottom: 10px; font-size: 12px; color: #64748b;">${s.description}</p>` : ''}
          
          ${rxList.length > 0 ? `
            <div class="label">Prescribed Medications</div>
            <table class="rx-table">
              <thead><tr><th>Medication</th><th>Dosage</th><th>Duration</th><th>Instructions</th></tr></thead>
              <tbody>
                ${rxList.map(rx => `
                  <tr>
                    <td style="font-weight: 600">${rx.name}</td>
                    <td>${rx.dosage || '—'}</td>
                    <td>${rx.duration || '—'}</td>
                    <td style="font-style: italic;">${rx.instructions || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<p class="no-rx">No medications prescribed for this step.</p>`}
          
          ${s.doctorNotes ? `
            <div class="label" style="margin-top: 12px">Doctor's Clinical Notes</div>
            <div class="notes">${s.doctorNotes}</div>
          ` : ''}
        </div>
      </div>
      `;
  }).join('')}

    <div class="footer">
      <div class="qr-section">
        <img src="${qrDataUrl}" alt="Consultation QR" />
        <div class="qr-label">Scan to view full consultation</div>
      </div>

      <div style="flex: 1; padding: 0 32px;">
        <p style="font-size: 10px; color: #94a3b8; line-height: 1.6;">
          This document contains all ${sortedSteps.length} treatment steps for Case #${caseId}.<br/>
          Please follow all dosage instructions carefully. Contact your doctor if you experience any adverse effects.
        </p>
      </div>

      <div style="text-align: center">
        <div style="width: 150px; border-bottom: 1px solid #000; margin-bottom: 6px"></div>
        <div style="font-weight: 700; font-size: 13px;">Dr. ${doctorName}</div>
        <div class="label">Attending Physician</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=800');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

// ─────────────────────────────────────────────────────────────
// APPOINTMENT STATUS PANEL
// ─────────────────────────────────────────────────────────────
const AppointmentPanel: React.FC<{
  apptStatus: StepAppointmentStatus | null;
  loading: boolean;
  onStartExamination: () => void;
  onScheduleVisit: () => void;
  actionLoading: boolean;
  examinationStarted?: boolean;
}> = ({ apptStatus, loading, onStartExamination, onScheduleVisit, actionLoading, examinationStarted = false }) => {
  if (loading) return (
    <div className="mt-3 rounded-lg border border-slate-200 p-3 animate-pulse bg-slate-50">
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-3/4" />
    </div>
  );

  if (!apptStatus?.appointment) return null;

  const { appointment, doctorAction } = apptStatus;
  const apptDate = new Date(appointment.appointment_date);
  const isToday = apptDate.toDateString() === new Date().toDateString();
  const isConfirmed = appointment.status === 'confirmed';

  return (
    <div className={`mt-3 rounded-lg border p-3 space-y-2.5 ${doctorAction === 'start_examination' ? 'border-teal-300 bg-teal-50/60' :
      doctorAction === 'examination_done' ? 'border-slate-200 bg-slate-50' :
        'border-violet-200 bg-violet-50/40'
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Appointment</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${appointment.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
              appointment.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                appointment.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                  'bg-violet-100 text-violet-700'
              }`}>{appointment.status}</span>
            {isToday && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">Today</span>}
          </div>
          <p className="text-xs font-semibold text-slate-800">
            {apptDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            {' · '}{appointment.time_slot}
          </p>
          {appointment.reason && <p className="text-[11px] text-slate-500">{appointment.reason}</p>}
        </div>
        {!isConfirmed && (appointment.status === 'scheduled' || appointment.status === 'pending') && (
          <button onClick={onScheduleVisit} className="text-[11px] text-slate-400 hover:text-sky-600 underline underline-offset-2 shrink-0">
            Reschedule
          </button>
        )}
      </div>

      {doctorAction === 'waiting_patient' && (
        <div className="flex items-center gap-2 bg-violet-100/60 rounded-md px-3 py-2">
          <span className="text-violet-500 text-sm">⏳</span>
          <div>
            <p className="text-xs font-semibold text-violet-800">Waiting for Patient</p>
            <p className="text-[11px] text-violet-600">Patient will check in via the mobile app when they arrive</p>
          </div>
        </div>
      )}

      {doctorAction === 'start_examination' && !examinationStarted && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-teal-100 rounded-md px-3 py-2">
            <span className="text-teal-600 text-sm">✓</span>
            <div>
              <p className="text-xs font-bold text-teal-800">Patient Has Arrived</p>
              <p className="text-[11px] text-teal-700">
                {appointment.patient?.name || 'Patient'} has checked in and is waiting
              </p>
            </div>
          </div>
          <Btn size="sm" variant="teal" className="w-full" onClick={onStartExamination} loading={actionLoading} disabled={actionLoading}>
            🩺 Start Examination
          </Btn>
        </div>
      )}

      {doctorAction === 'start_examination' && examinationStarted && (
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-md px-3 py-2">
          <span className="text-teal-500 text-sm animate-pulse">🩺</span>
          <div>
            <p className="text-xs font-bold text-teal-800">Examination In Progress</p>
            <p className="text-[11px] text-teal-600">Use "Complete Examination" below when done</p>
          </div>
        </div>
      )}

      {doctorAction === 'examination_done' && (
        <div className="flex items-center gap-2 bg-slate-100 rounded-md px-3 py-2">
          <span className="text-slate-500 text-sm">✓</span>
          <p className="text-xs font-medium text-slate-600">Appointment completed</p>
        </div>
      )}

      {appointment.status === 'cancelled' && (
        <div className="flex items-center justify-between gap-2 bg-rose-50 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-rose-500 text-sm">✗</span>
            <p className="text-xs font-medium text-rose-700">Appointment was cancelled</p>
          </div>
          <Btn size="xs" variant="outline" onClick={onScheduleVisit}>Reschedule</Btn>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PRESCRIPTION DISPLAY
// ─────────────────────────────────────────────────────────────
const PrescriptionDisplay: React.FC<{ step: TreatmentStep }> = ({ step }) => {
  if (!step.medication) return null;

  const rxList = step.medication.split(' + ').map(med => {
    const parse = (str?: string) => {
      if (!str) return '';
      const part = str.split(' | ').find(p => p.trim().startsWith(`${med}:`));
      return part ? part.split(':')[1].trim() : str.includes(':') ? '' : str;
    };
    return { name: med, dosage: parse(step.dosage), duration: parse(step.duration), instructions: parse(step.instructions) };
  });

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <FL>Prescriptions</FL>
      <div className="space-y-1.5 mt-1">
        {rxList.map((rx, i) => (
          <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-semibold text-slate-800">{rx.name}</span>
            {rx.dosage && <span className="text-xs text-slate-500">{rx.dosage}</span>}
            {rx.duration && <span className="text-xs text-slate-400">· {rx.duration}</span>}
            {rx.instructions && <span className="text-xs text-slate-400 italic">· {rx.instructions}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PATIENT REPORT BOX
// ─────────────────────────────────────────────────────────────
const PatientReportBox: React.FC<{ step: TreatmentStep }> = ({ step }) => {
  const msg = step.condition_description || step.patient_message;
  if (!msg) return null;
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <FL>Patient's Report</FL>
      <div className="mt-1 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-900 leading-relaxed">{msg}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const ConsultationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const doctorId = getDoctorId();

  // ── Core state ────────────────────────────────────────────
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [stepApptStatuses, setStepApptStatuses] = useState<Record<number, StepAppointmentStatus>>({});
  const [loadingApptFor, setLoadingApptFor] = useState<number | null>(null);
  const [arrivalBusy, setArrivalBusy] = useState<number | null>(null);
  const [examinationStarted, setExaminationStarted] = useState<Set<number>>(new Set());

  // ── Which step is being acted on ─────────────────────────
  const [reviewingStep, setReviewingStep] = useState<TreatmentStep | null>(null);
  const [editingStep, setEditingStep] = useState<TreatmentStep | null>(null);
  const [schedulingStep, setSchedulingStep] = useState<TreatmentStep | null>(null);
  const [completingReStep, setCompletingReStep] = useState<TreatmentStep | null>(null);

  // ── QR modal for full consultation ───────────────────────
  const [showConsultationQRModal, setShowConsultationQRModal] = useState(false);

  // ── Modal visibility ──────────────────────────────────────
  const [showStepModal, setShowStepModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteReModal, setShowCompleteReModal] = useState(false);

  // ── Form state ────────────────────────────────────────────
  const [stepForm, setStepForm] = useState({
    title: '', description: '',
    prescriptions: [] as PrescriptionItem[],
    isPhysicalVisit: false,
  });

  const [reviewForm, setReviewForm] = useState({
    decision: 'approve_with_followup' as 'approve_with_followup' | 'approve_and_complete',
    doctorNotes: '',
    requireFollowUp: true,
    nextAppointmentDate: '',
    nextAppointmentTime: '09:00',
    followUpInstructions: '',
    additionalStepTitle: '',
    additionalStepDescription: '',
  });

  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', notes: '' });
  const [completeReForm, setCompleteReForm] = useState({
    doctorNotes: '',
    outcome: 'all_good' as 'all_good' | 'needs_followup',
    followupTitle: '',
    followupDescription: '',
    followupPrescriptions: [] as PrescriptionItem[],
    followupIsPhysicalVisit: false,
    scheduleNext: false,
    nextDate: '',
    nextTime: '09:00',
  });
  const [followupCustomMode, setFollowupCustomMode] = useState<Record<string, boolean>>({});
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});

  // ── Refs ──────────────────────────────────────────────────
  const toastId = useRef(0);
  const pollTimers = useRef<Record<number, NodeJS.Timeout>>({});

  // ─────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────
  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const tid = toastId.current++;
    setToasts(p => [...p, { id: tid, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== tid)), 4500);
  }, []);

  // ─────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────
  const fetchConsultation = useCallback(async (quiet = false) => {
    if (!doctorId || !id) return;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${API}/doctors/${doctorId}/consultations`);
      const data = await res.json();
      if (data.success) {
        const found = (data.data as Consultation[]).find(c => c._id === id);
        if (found) {
          // FIX: Always sort by stepNumber to ensure correct order
          found.treatment_plan.sort((a, b) => a.stepNumber - b.stepNumber);
          setConsultation(found);
          found.treatment_plan
            .filter(s => s.status === 'scheduled' || s.status === 'in-progress' || s.isReExaminationVisit || s.reExaminationScheduled)
            .forEach(s => fetchStepApptStatus(s.stepNumber, true));
        } else {
          setError('Consultation not found');
        }
      }
    } catch {
      setError('Network error — could not load consultation');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [doctorId, id]);

  const fetchStepApptStatus = useCallback(async (stepNumber: number, silent = false) => {
    if (!id) return;
    if (!silent) setLoadingApptFor(stepNumber);
    try {
      const res = await fetch(
        `${API}/doctors/consultations/${id}/steps/${stepNumber}/appointment-status`,
        { headers: authHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setStepApptStatuses(prev => ({ ...prev, [stepNumber]: data.data }));
      }
    } catch { }
    finally {
      if (!silent) setLoadingApptFor(null);
    }
  }, [id]);

  const startPolling = useCallback((stepNumber: number) => {
    if (pollTimers.current[stepNumber]) return;
    pollTimers.current[stepNumber] = setInterval(() => {
      fetchStepApptStatus(stepNumber, true);
    }, 20_000);
  }, [fetchStepApptStatus]);

  const stopPolling = useCallback((stepNumber: number) => {
    clearInterval(pollTimers.current[stepNumber]);
    delete pollTimers.current[stepNumber];
  }, []);

  const fetchDrugs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/doctors/drugs`);
      const data = await res.json();
      if (data.success) setAvailableDrugs(data.data || []);
    } catch { }
  }, []);

  const fetchSlots = useCallback(async (date: string) => {
    if (!date) return;
    setSlotsLoading(true);
    try {
      const res = await fetch(`${API}/doctors/appointments/available-slots?date=${date}&doctorId=${doctorId}`, { headers: authHeaders() });
      const data = await res.json();
      setAvailableSlots(data.success ? (data.data || []) : []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [doctorId]);

  useEffect(() => { fetchConsultation(); fetchDrugs(); }, [fetchConsultation, fetchDrugs]);
  useEffect(() => { if (scheduleForm.date) fetchSlots(scheduleForm.date); }, [scheduleForm.date]);

  useEffect(() => {
    if (!consultation) return;
    const scheduledSteps = consultation.treatment_plan.filter(s =>
      (s.status === 'scheduled' || s.status === 'in-progress') &&
      (s.isReExaminationVisit || s.reExaminationScheduled || s.isPhysicalVisit)
    );
    scheduledSteps.forEach(s => {
      startPolling(s.stepNumber);
      fetchStepApptStatus(s.stepNumber, true);
    });
    consultation.treatment_plan
      .filter(s => s.status === 'approved' || s.status === 'pending')
      .forEach(s => stopPolling(s.stepNumber));

    return () => {
      Object.keys(pollTimers.current).forEach(k => stopPolling(Number(k)));
    };
  }, [consultation]);

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  const isPhysical = (s: TreatmentStep) =>
    s.isPhysicalVisit || s.isReExaminationVisit || s.reExaminationScheduled ||
    s.needsReExamination ||
    s.title?.toLowerCase().includes('re-ex') ||
    s.title?.toLowerCase().includes('physical') ||
    s.title?.toLowerCase().includes('follow-up');

  const isClinicStep = (s: TreatmentStep) =>
    !!(s.isReExaminationVisit || s.reExaminationScheduled || s.needsReExamination || s.title?.toLowerCase()?.includes('re-ex') || s.title?.toLowerCase()?.includes('follow-up'));

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  const calcAge = (dob: string) => {
    const b = new Date(dob); const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };

  // ─────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────
  const handleReview = async () => {
    if (!reviewingStep || !id) return;
    setBusy(true);
    try {
      const body: any = { ...reviewForm, completeConsultation: reviewForm.decision === 'approve_and_complete' };
      if (reviewForm.nextAppointmentDate) {
        body.nextAppointmentDate = `${reviewForm.nextAppointmentDate}T${reviewForm.nextAppointmentTime}:00`;
      }
      const res = await fetch(`${API}/doctors/consultations/${id}/steps/${reviewingStep.stepNumber}/review`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast('Step reviewed successfully');
        setShowReviewModal(false);
        await fetchConsultation(true);
      } else {
        toast(data.message || 'Failed to submit review', 'error');
      }
    } catch { toast('Network error', 'error'); }
    finally { setBusy(false); }
  };

  const handleSchedule = async () => {
    if (!schedulingStep || !id || !scheduleForm.date || !scheduleForm.time) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/doctors/consultations/${id}/steps/${schedulingStep.stepNumber}/schedule-re-examination`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          ...scheduleForm,
          timeSlot: scheduleForm.time,
          appointmentDateTime: `${scheduleForm.date}T${scheduleForm.time}:00`
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast('Visit scheduled');
        setShowScheduleModal(false);
        await fetchConsultation(true);
        fetchStepApptStatus(schedulingStep.stepNumber);
        startPolling(schedulingStep.stepNumber);
      } else {
        toast(data.message || 'Failed to schedule', 'error');
      }
    } catch { toast('Network error', 'error'); }
    finally { setBusy(false); }
  };

  const handleConfirmArrival = async (step: TreatmentStep) => {
    if (!id) return;
    setArrivalBusy(step.stepNumber);
    try {
      const res = await fetch(`${API}/doctors/consultations/${id}/steps/${step.stepNumber}/confirm-arrival`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast('Examination started');
        setExaminationStarted(prev => new Set(prev).add(step.stepNumber));
        await fetchConsultation(true);
        fetchStepApptStatus(step.stepNumber);
      } else {
        toast(data.message || 'Failed to confirm arrival', 'error');
      }
    } catch { toast('Network error', 'error'); }
    finally { setArrivalBusy(null); }
  };

  const handleCompleteReExamination = async () => {
    if (!completingReStep || !id) return;
    setBusy(true);
    try {
      const completeRes = await fetch(
        `${API}/doctors/consultations/${id}/steps/${completingReStep.stepNumber}/complete-re-examination`,
        { method: 'POST', headers: authHeaders(), body: JSON.stringify({ doctorNotes: completeReForm.doctorNotes }) }
      );
      const completeData = await completeRes.json();
      if (!completeData.success) {
        toast(completeData.message || 'Failed to complete examination', 'error');
        return;
      }

      if (completeReForm.outcome === 'all_good') {
        const reviewRes = await fetch(
          `${API}/doctors/consultations/${id}/steps/${completingReStep.stepNumber}/review`,
          {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({
              decision: 'approve_and_complete', doctorNotes: completeReForm.doctorNotes,
              requireFollowUp: false, completeConsultation: false,
            }),
          }
        );
        const reviewData = await reviewRes.json();
        if (reviewData.success) {
          toast('Examination completed & approved — no follow-up needed');
          setShowCompleteReModal(false);
          await fetchConsultation(true);
          stopPolling(completingReStep.stepNumber);
        } else {
          toast('Completed. Please review the step manually.', 'info');
          setShowCompleteReModal(false);
          await fetchConsultation(true);
        }
      } else {
        const validRx = completeReForm.followupPrescriptions.filter(p => p.medication.trim());
        const medicationString = validRx.length ? validRx.map(p => p.medication).join(' + ') : undefined;
        const dosageString = validRx.length ? validRx.map(p => `${p.medication}: ${p.dosage}`).join(' | ') : undefined;
        const durationString = validRx.length ? validRx.map(p => `${p.medication}: ${p.duration}`).join(' | ') : undefined;
        const instructionsString = validRx.length ? validRx.map(p => `${p.medication}: ${p.instructions}`).join(' | ') : undefined;

        const body: any = {
          decision: 'approve_with_followup', doctorNotes: completeReForm.doctorNotes, requireFollowUp: true,
          additionalStepTitle: completeReForm.followupTitle || `Follow-up: ${completingReStep.title}`,
          additionalStepDescription: completeReForm.followupDescription || 'Additional treatment required based on examination findings.',
          medication: medicationString, dosage: dosageString, duration: durationString, instructions: instructionsString,
          prescriptions: validRx, isPhysicalVisit: completeReForm.followupIsPhysicalVisit, completeConsultation: false,
        };

        const reviewRes = await fetch(
          `${API}/doctors/consultations/${id}/steps/${completingReStep.stepNumber}/review`,
          { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }
        );
        const reviewData = await reviewRes.json();
        if (reviewData.success) {
          toast('Examination completed — follow-up step added');
          setShowCompleteReModal(false);
          await fetchConsultation(true);
          stopPolling(completingReStep.stepNumber);
        } else {
          toast(reviewData.message || 'Completed but failed to create follow-up', 'error');
          setShowCompleteReModal(false);
          await fetchConsultation(true);
        }
      }
    } catch {
      toast('Network error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveStep = async () => {
    if (!id || !stepForm.title.trim()) return;
    setBusy(true);
    try {
      const validRx = stepForm.prescriptions.filter(p => p.medication.trim());
      const payload = {
        title: stepForm.title, description: stepForm.description,
        medication: validRx.map(p => p.medication).join(' + ') || undefined,
        dosage: validRx.map(p => `${p.medication}: ${p.dosage}`).join(' | ') || undefined,
        duration: validRx.map(p => `${p.medication}: ${p.duration}`).join(' | ') || undefined,
        instructions: validRx.map(p => `${p.medication}: ${p.instructions}`).join(' | ') || undefined,
        prescriptions: validRx,
        isPhysicalVisit: stepForm.isPhysicalVisit,
      };
      const url = editingStep
        ? `${API}/doctors/consultations/${id}/steps/${editingStep.stepNumber}`
        : `${API}/doctors/consultations/${id}/steps`;
      const res = await fetch(url, { method: editingStep ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        toast(editingStep ? 'Step updated' : 'Step added');
        setShowStepModal(false);
        await fetchConsultation(true);
      } else {
        toast(data.message || 'Failed to save step', 'error');
      }
    } catch { toast('Network error', 'error'); }
    finally { setBusy(false); }
  };

  const handleCloseCase = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/doctors/consultations/${id}/complete`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        toast('Case closed');
        await fetchConsultation(true);
        setTimeout(() => navigate('/consultations'), 1200);
      } else {
        toast(data.message || 'Cannot close case yet', 'error');
      }
    } catch { toast('Network error', 'error'); }
    finally { setBusy(false); }
  };

  // ─────────────────────────────────────────────────────────
  // OPEN MODAL HELPERS
  // ─────────────────────────────────────────────────────────
  const openAddStep = () => {
    if (isCompleted) return toast('Cannot add steps to a closed case', 'info');
    setEditingStep(null);
    setStepForm({ title: '', description: '', prescriptions: [], isPhysicalVisit: false });
    setCustomMode({});
    setShowStepModal(true);
  };

  const openEditStep = (s: TreatmentStep) => {
    const rxList = (s.medication || '').split(' + ').filter(Boolean).map(med => ({
      medication: med,
      dosage: (s.dosage || '').split(' | ').find(p => p.startsWith(`${med}:`))?.split(':')[1]?.trim() || '',
      duration: (s.duration || '').split(' | ').find(p => p.startsWith(`${med}:`))?.split(':')[1]?.trim() || '',
      instructions: (s.instructions || '').split(' | ').find(p => p.startsWith(`${med}:`))?.split(':')[1]?.trim() || '',
    }));
    setEditingStep(s);
    setStepForm({ title: s.title, description: s.description, prescriptions: rxList, isPhysicalVisit: !!s.isPhysicalVisit });
    setCustomMode({});
    setShowStepModal(true);
  };

  const openReview = (s: TreatmentStep) => {
    setReviewingStep(s);
    setReviewForm({
      decision: 'approve_with_followup', doctorNotes: '', requireFollowUp: true,
      nextAppointmentDate: '', nextAppointmentTime: '09:00',
      followUpInstructions: '', additionalStepTitle: '', additionalStepDescription: '',
    });
    setShowReviewModal(true);
  };

  const openSchedule = (s: TreatmentStep) => {
    setSchedulingStep(s);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleForm({ date: tomorrow.toISOString().split('T')[0], time: '', notes: s.reExaminationNotes || 'Please bring your medical records.' });
    setAvailableSlots([]);
    setShowScheduleModal(true);
  };

  const openCompleteReExam = (s: TreatmentStep) => {
    setCompletingReStep(s);
    setCompleteReForm({
      doctorNotes: '', outcome: 'all_good', followupTitle: '', followupDescription: '',
      followupPrescriptions: [], followupIsPhysicalVisit: false, scheduleNext: false, nextDate: '', nextTime: '09:00',
    });
    setFollowupCustomMode({});
    setShowCompleteReModal(true);
  };

  // ─────────────────────────────────────────────────────────
  // COMPUTED
  // ─────────────────────────────────────────────────────────
  const isCompleted = consultation?.consultation_status === 'completed';
  const allApproved = consultation?.treatment_plan.every(s => s.status === 'approved') ?? false;
  const totalSteps = consultation?.treatment_plan.length ?? 0;
  const doneSteps = consultation?.treatment_plan.filter(s => s.status === 'approved').length ?? 0;
  const pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  // ─────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow p-8 max-w-xs text-center">
        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-600 text-xl">⚠</div>
        <p className="text-sm font-semibold text-slate-800 mb-1">Error</p>
        <p className="text-xs text-slate-500 mb-5">{error}</p>
        <div className="flex gap-2 justify-center">
          <Btn size="sm" onClick={() => { setError(''); fetchConsultation(); }}>Retry</Btn>
          <Btn size="sm" variant="outline" onClick={() => navigate('/consultations')}>Back</Btn>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>

      <Toasts items={toasts} onDismiss={tid => setToasts(p => p.filter(t => t.id !== tid))} />

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-14">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/consultations')}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">Case #{id?.slice(-6).toUpperCase()}</h1>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />Closed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Opened {consultation ? formatDate(consultation.created_at) : '…'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-2.5">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-700">{doneSteps}/{totalSteps} steps</p>
                <p className="text-[10px] text-slate-400">completed</p>
              </div>
              <div className="relative w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-sky-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-sky-600 w-8 text-right">{pct}%</span>
            </div>

            {!isCompleted ? (
              <Btn variant="teal" size="sm" onClick={handleCloseCase} disabled={!allApproved || busy} loading={busy && allApproved}>
                Close Case
              </Btn>
            ) : (
              <span className="text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-md">✓ Case Closed</span>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[268px_1fr] gap-5">

            {/* ─── LEFT PANEL ─── */}
            <aside className="space-y-4">
              {/* Patient card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-600 border border-sky-200">
                      {consultation?.user_id.name.charAt(0)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${consultation?.priority === 'urgent' ? 'bg-rose-500' : 'bg-teal-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{consultation?.user_id.name}</p>
                    <p className="text-xs text-slate-500">{consultation?.user_id.gender} · {calcAge(consultation?.user_id.dateOfBirth || '')} yrs</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <FL>Primary Diagnosis</FL>
                    <p className="text-xs text-slate-700 bg-slate-50 rounded-md px-3 py-2 leading-relaxed border border-slate-100">
                      {consultation?.diagnosis || 'Pending'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FL>Priority</FL>
                      <span className={`text-xs font-bold ${consultation?.priority === 'urgent' ? 'text-rose-600' : 'text-slate-600'}`}>
                        {consultation?.priority === 'urgent' ? '↑ Urgent' : '— Normal'}
                      </span>
                    </div>
                    <div>
                      <FL>Opened</FL>
                      <span className="text-xs text-slate-700">
                        {consultation ? new Date(consultation.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <FL>Actions</FL>
                <div className="space-y-1.5 mt-2">
                  <Btn variant="outline" size="sm" className="w-full justify-start" onClick={openAddStep} disabled={isCompleted}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Treatment Step
                  </Btn>
                </div>
              </div>

              {/* Plan overview */}
              {totalSteps > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <FL>Plan Overview</FL>
                  <div className="mt-2 space-y-1.5">
                    {consultation?.treatment_plan.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 ${s.status === 'approved' ? 'border-teal-400 bg-teal-50 text-teal-600' :
                          s.status === 'in-progress' ? 'border-sky-400 bg-sky-50 text-sky-600' :
                            s.status === 'completed' ? 'border-amber-400 bg-amber-50 text-amber-600' :
                              s.status === 'scheduled' ? 'border-violet-400 bg-violet-50 text-violet-600' :
                                'border-slate-300 bg-slate-50 text-slate-400'
                          }`}>
                          {s.status === 'approved' ? '✓' : i + 1}
                        </div>
                        <span className="text-xs text-slate-600 truncate">{s.title}</span>
                        {isPhysical(s) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 shrink-0 font-semibold">Visit</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* ─── RIGHT PANEL ─── */}
            <section>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                {/* ── Treatment Plan Header with QR + Print for full consultation ── */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">Treatment Plan</h2>
                  <div className="flex gap-2">
                    {/* QR Code button — full consultation */}
                    <button
                      onClick={() => setShowConsultationQRModal(true)}
                      title="Show Consultation QR Code"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 border border-violet-200 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <path d="M14 14h1v1h-1zM17 14h1v1h-1zM20 14v1M14 17h1M17 17h1v1h-1zM20 17v1M14 20h1v1h-1zM17 20h1M20 20v1" />
                      </svg>
                      QR
                    </button>

                    {/* Print full consultation button */}
                    <Btn variant="outline" size="xs" onClick={() => consultation && printFullConsultation(consultation, id || '')}>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9V2h12v7" />
                        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                        <path d="M6 14h12v8H6z" />
                      </svg>
                      Print
                    </Btn>
                    <Btn variant="outline" size="xs" onClick={openAddStep} disabled={isCompleted}>+ Add Step</Btn>
                  </div>
                </div>

                <div className="p-5">
                  {!totalSteps ? (
                    <div className="text-center py-12">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl">+</div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">No steps yet</p>
                      <p className="text-xs text-slate-400 mb-4">{isCompleted ? 'Case is closed.' : 'Add the first step to begin treatment'}</p>
                      <Btn size="sm" onClick={openAddStep} disabled={isCompleted}>Add First Step</Btn>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-100 pointer-events-none" />

                      <div className="space-y-3">
                        {consultation!.treatment_plan.map((step, idx) => {
                          const physical = isPhysical(step);
                          const clinic = isClinicStep(step);
                          const apptInfo = stepApptStatuses[step.stepNumber] || null;
                          const isApproved = step.status === 'approved';

                          return (
                            <div key={step._id || idx} className="relative flex gap-4">
                              {/* Step circle */}
                              <div className={`relative z-10 shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold bg-white ${stepCfg(step.status).track}`}>
                                {isApproved ? '✓' : idx + 1}
                              </div>

                              {/* Step card */}
                              <div className={`flex-1 min-w-0 rounded-xl border transition-colors duration-200 ${isApproved ? 'border-teal-100 bg-teal-50/30' :
                                step.status === 'in-progress' ? 'border-sky-100 bg-sky-50/20' :
                                  step.status === 'completed' ? 'border-amber-100 bg-amber-50/20' :
                                    step.status === 'scheduled' ? 'border-violet-100 bg-violet-50/20' :
                                      step.status === 'rejected' ? 'border-rose-100 bg-rose-50/20' :
                                        'border-slate-200 bg-white'
                                }`}>
                                {/* Card header */}
                                <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                      <span className="text-xs font-bold text-slate-800">{step.title}</span>
                                      {physical && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                          Physical Visit
                                        </span>
                                      )}
                                    </div>
                                    {step.description && (
                                      <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                                    )}
                                  </div>
                                  <StatusBadge status={step.status} />
                                </div>

                                {/* Prescriptions */}
                                {step.medication && (
                                  <div className="px-4 pb-3">
                                    <PrescriptionDisplay step={step} />
                                  </div>
                                )}

                                {/* Patient report */}
                                {step.status === 'completed' && (
                                  <div className="px-4 pb-3">
                                    <PatientReportBox step={step} />
                                  </div>
                                )}

                                {/* Doctor notes */}
                                {step.doctorNotes && (
                                  <div className="px-4 pb-3">
                                    <div className="border-t border-slate-100 pt-3">
                                      <FL>Doctor's Notes</FL>
                                      <p className="text-xs text-slate-600 leading-relaxed mt-1">{step.doctorNotes}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Rejection note */}
                                {step.status === 'rejected' && step.rejectionReason && (
                                  <div className="px-4 pb-3">
                                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                                      <p className="text-[11px] font-bold text-rose-700 mb-1">Revision Requested</p>
                                      <p className="text-xs text-rose-600">{step.rejectionReason}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Appointment panel */}
                                {clinic && (apptInfo?.appointment || loadingApptFor === step.stepNumber) && (step.status === 'scheduled' || step.status === 'in-progress') && (
                                  <div className="px-4 pb-3 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <FL>Appointment</FL>
                                      {step.reExaminationScheduled && (
                                        <button
                                          onClick={() => fetchStepApptStatus(step.stepNumber)}
                                          className="text-[10px] text-slate-400 hover:text-sky-600 flex items-center gap-1 transition-colors"
                                        >
                                          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                          </svg>
                                          Refresh
                                        </button>
                                      )}
                                    </div>
                                    <AppointmentPanel
                                      apptStatus={apptInfo}
                                      loading={loadingApptFor === step.stepNumber}
                                      onStartExamination={() => handleConfirmArrival(step)}
                                      onScheduleVisit={() => openSchedule(step)}
                                      actionLoading={arrivalBusy === step.stepNumber}
                                      examinationStarted={examinationStarted.has(step.stepNumber)}
                                    />
                                  </div>
                                )}

                                {/* ── ACTION ROW ── */}
                                <div className="px-4 py-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                                  {!clinic && step.status === 'completed' && (
                                    <Btn size="xs" onClick={() => openReview(step)}>Review Step</Btn>
                                  )}
                                  {clinic && step.status === 'in-progress' && (
                                    <Btn size="xs" variant="teal" onClick={() => openCompleteReExam(step)}>Complete Examination</Btn>
                                  )}
                                  {clinic && step.status === 'completed' && (
                                    <Btn size="xs" onClick={() => openReview(step)}>Review Step</Btn>
                                  )}
                                  {!isApproved && step.status !== 'scheduled' && step.status !== 'in-progress' && (
                                    <Btn size="xs" variant="ghost" onClick={() => openEditStep(step)}>Edit</Btn>
                                  )}
                                  {clinic && !isApproved && !apptInfo?.appointment && !loadingApptFor && (
                                    <Btn size="xs" variant="outline" onClick={() => openSchedule(step)}>Schedule Visit</Btn>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ═══════════════════════════
           MODALS
      ═══════════════════════════ */}

      {/* ── FULL CONSULTATION QR MODAL ── */}
      <ConsultationQRModal
        open={showConsultationQRModal}
        onClose={() => setShowConsultationQRModal(false)}
        consultation={consultation}
        consultationId={id || ''}
      />

      {/* ── REVIEW MODAL ── */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)}
        title={`Review — Step #${reviewingStep?.stepNumber}`}
        subtitle={reviewingStep?.title}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setShowReviewModal(false)}>Cancel</Btn>
            <Btn size="sm" onClick={handleReview} loading={busy} disabled={busy ||
              (reviewForm.decision === 'approve_with_followup' && reviewForm.requireFollowUp && !reviewForm.nextAppointmentDate)
            }>
              Submit Review
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <FL>Decision</FL>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { v: 'approve_with_followup', label: 'Approve & Continue', sub: 'Approve step, add follow-up', color: 'sky' },
                { v: 'approve_and_complete', label: 'Approve & Close', sub: 'Approve and end treatment', color: 'teal' },
              ].map(opt => (
                <button key={opt.v} type="button"
                  onClick={() => setReviewForm(f => ({ ...f, decision: opt.v as any }))}
                  className={`p-3 text-left rounded-xl border-2 transition-all ${reviewForm.decision === opt.v
                    ? opt.color === 'sky' ? 'border-sky-500 bg-sky-50' : 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {reviewForm.decision === 'approve_with_followup' && (
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-3">
              <div className="flex items-center justify-between">
                <FL>Follow-up Appointment</FL>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={reviewForm.requireFollowUp}
                    onChange={e => setReviewForm(f => ({ ...f, requireFollowUp: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600" />
                  <span className="text-[11px] text-slate-600 font-medium">Schedule physical visit</span>
                </label>
              </div>
              {reviewForm.requireFollowUp && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" label="Date" value={reviewForm.nextAppointmentDate}
                    onChange={e => setReviewForm(f => ({ ...f, nextAppointmentDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]} required />
                  <Input type="time" label="Time" value={reviewForm.nextAppointmentTime}
                    onChange={e => setReviewForm(f => ({ ...f, nextAppointmentTime: e.target.value }))} />
                </div>
              )}
            </div>
          )}

          <Textarea label="Clinical Notes" rows={4} value={reviewForm.doctorNotes}
            onChange={e => setReviewForm(f => ({ ...f, doctorNotes: e.target.value }))}
            placeholder="Assessment findings, observations, treatment rationale…" />
        </div>
      </Modal>

      {/* ── SCHEDULE VISIT MODAL ── */}
      <Modal open={showScheduleModal} onClose={() => setShowScheduleModal(false)}
        title={`Schedule Visit — Step #${schedulingStep?.stepNumber}`}
        subtitle={schedulingStep?.title}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setShowScheduleModal(false)}>Cancel</Btn>
            <Btn size="sm" onClick={handleSchedule} loading={busy} disabled={busy || !scheduleForm.date || !scheduleForm.time}>
              Confirm Schedule
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <Input type="date" label="Date" value={scheduleForm.date}
            onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]} required />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time Slot</label>
            {slotsLoading ? (
              <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                <Spinner size={12} /> Checking availability…
              </div>
            ) : (
              <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={scheduleForm.time} onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))}
                disabled={!availableSlots.length} required>
                <option value="">Select a time slot…</option>
                {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {scheduleForm.date && !availableSlots.length && !slotsLoading && (
              <p className="mt-1 text-xs text-rose-600">No available slots for this date</p>
            )}
          </div>

          <Textarea label="Patient Instructions" rows={3} value={scheduleForm.notes}
            onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Preparation notes, what to bring…" />
        </div>
      </Modal>

      {/* ── COMPLETE EXAMINATION MODAL ── */}
      <Modal open={showCompleteReModal} onClose={() => setShowCompleteReModal(false)}
        title={`Complete Examination — Step #${completingReStep?.stepNumber}`}
        subtitle={completingReStep?.title}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setShowCompleteReModal(false)}>Cancel</Btn>
            <Btn
              size="sm"
              variant={completeReForm.outcome === 'all_good' ? 'teal' : 'primary'}
              onClick={handleCompleteReExamination}
              loading={busy}
              disabled={busy || !completeReForm.doctorNotes.trim() || (completeReForm.outcome === 'needs_followup' && !completeReForm.followupTitle.trim())}
            >
              {completeReForm.outcome === 'all_good' ? 'Complete & Approve' : 'Complete & Add Follow-up'}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <FL>Examination Outcome</FL>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button type="button"
                onClick={() => setCompleteReForm(f => ({ ...f, outcome: 'all_good' }))}
                className={`p-3 text-left rounded-xl border-2 transition-all ${completeReForm.outcome === 'all_good' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">✓</span>
                  <p className="text-xs font-bold text-slate-900">All Good</p>
                </div>
                <p className="text-[11px] text-slate-500">No issues — approve & close this step</p>
              </button>
              <button type="button"
                onClick={() => setCompleteReForm(f => ({ ...f, outcome: 'needs_followup' }))}
                className={`p-3 text-left rounded-xl border-2 transition-all ${completeReForm.outcome === 'needs_followup' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">＋</span>
                  <p className="text-xs font-bold text-slate-900">Needs Follow-up</p>
                </div>
                <p className="text-[11px] text-slate-500">Issues found — approve & add new treatment step</p>
              </button>
            </div>
          </div>

          <Textarea
            label="Examination Findings *"
            rows={3}
            value={completeReForm.doctorNotes}
            onChange={e => setCompleteReForm(f => ({ ...f, doctorNotes: e.target.value }))}
            placeholder="Document physical examination findings, patient condition, observations…"
          />

          {completeReForm.outcome === 'needs_followup' && (
            <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/40 p-4">
              <div className="flex items-start gap-2 bg-sky-100 rounded-lg px-3 py-2">
                <span className="text-sky-600 mt-0.5 text-sm shrink-0">ℹ</span>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  The current confirmed appointment will remain as-is. A new follow-up treatment step will be added to the plan below it.
                </p>
              </div>

              <div>
                <SL>New Follow-up Step</SL>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Step Title *" value={completeReForm.followupTitle}
                    onChange={e => setCompleteReForm(f => ({ ...f, followupTitle: e.target.value }))}
                    placeholder={`e.g. Follow-up: ${completingReStep?.title || 'Treatment'}`} />
                  <Input label="Description" value={completeReForm.followupDescription}
                    onChange={e => setCompleteReForm(f => ({ ...f, followupDescription: e.target.value }))}
                    placeholder="Brief description of the follow-up treatment…" />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer group mt-3">
                  <input type="checkbox" checked={completeReForm.followupIsPhysicalVisit}
                    onChange={e => setCompleteReForm(f => ({ ...f, followupIsPhysicalVisit: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400" />
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">Requires physical clinic visit</span>
                  {completeReForm.followupIsPhysicalVisit && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">Physical Visit</span>
                  )}
                </label>
              </div>

              <div>
                <SL>Prescriptions</SL>
                <div className="space-y-3">
                  {completeReForm.followupPrescriptions.map((rx, i) => (
                    <div key={i} className="relative bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                      <button
                        onClick={() => setCompleteReForm(f => ({ ...f, followupPrescriptions: f.followupPrescriptions.filter((_, j) => j !== i) }))}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-sm"
                      >×</button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Medication</label>
                          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                            value={availableDrugs.find(d => d.name === rx.medication) ? rx.medication : (rx.medication ? '_custom' : '')}
                            onChange={e => {
                              const n = [...completeReForm.followupPrescriptions];
                              n[i].medication = e.target.value === '_custom' ? '' : e.target.value;
                              setCompleteReForm(f => ({ ...f, followupPrescriptions: n }));
                              setFollowupCustomMode(p => ({ ...p, [`${i}-med`]: e.target.value === '_custom' }));
                            }}>
                            <option value="">Select medication…</option>
                            {availableDrugs.map(d => <option key={d._id} value={d.name}>{d.name}{d.strength ? ` — ${d.strength}` : ''}</option>)}
                            <option value="_custom">Other (enter manually)</option>
                          </select>
                          {(followupCustomMode[`${i}-med`] || (rx.medication && !availableDrugs.find(d => d.name === rx.medication))) && (
                            <Input className="mt-1.5 text-xs" value={rx.medication}
                              onChange={e => { const n = [...completeReForm.followupPrescriptions]; n[i].medication = e.target.value; setCompleteReForm(f => ({ ...f, followupPrescriptions: n })); }}
                              placeholder="Enter medication name" />
                          )}
                        </div>
                        {(['dosage', 'duration', 'instructions'] as const).map(field => {
                          const opts = field === 'dosage' ? DOSAGES : field === 'duration' ? DURATIONS : INSTRUCTIONS;
                          return (
                            <div key={field} className={field === 'instructions' ? 'sm:col-span-2' : ''}>
                              <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{field}</label>
                              <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                                value={opts.includes(rx[field]) ? rx[field] : (rx[field] ? '_custom' : '')}
                                onChange={e => {
                                  const n = [...completeReForm.followupPrescriptions];
                                  n[i][field] = e.target.value === '_custom' ? '' : e.target.value;
                                  setCompleteReForm(f => ({ ...f, followupPrescriptions: n }));
                                  setFollowupCustomMode(p => ({ ...p, [`${i}-${field}`]: e.target.value === '_custom' }));
                                }}>
                                <option value="">Select {field}…</option>
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                                <option value="_custom">Custom…</option>
                              </select>
                              {(followupCustomMode[`${i}-${field}`] || (rx[field] && !opts.includes(rx[field]))) && (
                                <Input className="mt-1.5 text-xs" value={rx[field]}
                                  onChange={e => { const n = [...completeReForm.followupPrescriptions]; n[i][field] = e.target.value; setCompleteReForm(f => ({ ...f, followupPrescriptions: n })); }}
                                  placeholder={`Enter ${field}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <Btn variant="ghost" size="xs"
                    onClick={() => setCompleteReForm(f => ({ ...f, followupPrescriptions: [...f.followupPrescriptions, { medication: '', dosage: '', duration: '', instructions: '' }] }))}>
                    + Add medication
                  </Btn>
                  {!completeReForm.followupPrescriptions.length && (
                    <p className="text-xs text-slate-400 text-center py-1">No medications — leave empty if this is a physical visit only</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            {completeReForm.outcome === 'all_good'
              ? '✓ This step will be approved. The existing appointment remains unchanged.'
              : '→ This step will be approved and a new pending follow-up step will be added for your review. The existing appointment stays as-is.'}
          </p>
        </div>
      </Modal>

      {/* ── ADD / EDIT STEP MODAL ── */}
      {!isCompleted && (
        <Modal open={showStepModal} onClose={() => setShowStepModal(false)}
          title={editingStep ? `Edit Step #${editingStep.stepNumber}` : 'New Treatment Step'}
          size="xl"
          footer={
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" size="sm" onClick={() => setShowStepModal(false)}>Cancel</Btn>
              <Btn size="sm" onClick={handleSaveStep} loading={busy} disabled={busy || !stepForm.title.trim()}>
                {editingStep ? 'Update Step' : 'Create Step'}
              </Btn>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Title *" value={stepForm.title}
                onChange={e => setStepForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Initial Assessment" required />
              <Input label="Description" value={stepForm.description}
                onChange={e => setStepForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this step" />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={stepForm.isPhysicalVisit}
                onChange={e => setStepForm(f => ({ ...f, isPhysicalVisit: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">Requires physical clinic visit</span>
              {stepForm.isPhysicalVisit && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">Physical Visit</span>
              )}
            </label>

            <div>
              <SL>Prescriptions</SL>
              <div className="space-y-3">
                {stepForm.prescriptions.map((rx, i) => (
                  <div key={i} className="relative bg-slate-50 rounded-xl border border-slate-200 p-3">
                    <button onClick={() => setStepForm(f => ({ ...f, prescriptions: f.prescriptions.filter((_, j) => j !== i) }))}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-sm">×</button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Medication</label>
                        <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                          value={availableDrugs.find(d => d.name === rx.medication) ? rx.medication : (rx.medication ? '_custom' : '')}
                          onChange={e => {
                            const n = [...stepForm.prescriptions];
                            n[i].medication = e.target.value === '_custom' ? '' : e.target.value;
                            setStepForm(f => ({ ...f, prescriptions: n }));
                            setCustomMode(p => ({ ...p, [`${i}-med`]: e.target.value === '_custom' }));
                          }}>
                          <option value="">Select medication…</option>
                          {availableDrugs.map(d => <option key={d._id} value={d.name}>{d.name}{d.strength ? ` — ${d.strength}` : ''}</option>)}
                          <option value="_custom">Other (enter manually)</option>
                        </select>
                        {(customMode[`${i}-med`] || (rx.medication && !availableDrugs.find(d => d.name === rx.medication))) && (
                          <Input className="mt-1.5 text-xs" value={rx.medication}
                            onChange={e => { const n = [...stepForm.prescriptions]; n[i].medication = e.target.value; setStepForm(f => ({ ...f, prescriptions: n })); }}
                            placeholder="Enter medication name" />
                        )}
                      </div>
                      {(['dosage', 'duration', 'instructions'] as const).map(field => {
                        const opts = field === 'dosage' ? DOSAGES : field === 'duration' ? DURATIONS : INSTRUCTIONS;
                        return (
                          <div key={field} className={field === 'instructions' ? 'sm:col-span-2' : ''}>
                            <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{field}</label>
                            <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                              value={opts.includes(rx[field]) ? rx[field] : (rx[field] ? '_custom' : '')}
                              onChange={e => {
                                const n = [...stepForm.prescriptions];
                                n[i][field] = e.target.value === '_custom' ? '' : e.target.value;
                                setStepForm(f => ({ ...f, prescriptions: n }));
                                setCustomMode(p => ({ ...p, [`${i}-${field}`]: e.target.value === '_custom' }));
                              }}>
                              <option value="">Select {field}…</option>
                              {opts.map(o => <option key={o} value={o}>{o}</option>)}
                              <option value="_custom">Custom…</option>
                            </select>
                            {(customMode[`${i}-${field}`] || (rx[field] && !opts.includes(rx[field]))) && (
                              <Input className="mt-1.5 text-xs" value={rx[field]}
                                onChange={e => { const n = [...stepForm.prescriptions]; n[i][field] = e.target.value; setStepForm(f => ({ ...f, prescriptions: n })); }}
                                placeholder={`Enter ${field}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <Btn variant="ghost" size="xs"
                  onClick={() => setStepForm(f => ({ ...f, prescriptions: [...f.prescriptions, { medication: '', dosage: '', duration: '', instructions: '' }] }))}>
                  + Add medication
                </Btn>
                {!stepForm.prescriptions.length && (
                  <p className="text-xs text-slate-400 text-center py-2">No medications added yet</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ConsultationDetail;