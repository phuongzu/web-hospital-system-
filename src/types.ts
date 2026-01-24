export interface DoctorProfile {
  _id: string;
  user_id?: {
    _id?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    status?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  specialty_id?: {
    _id?: string;
    name?: string;
    description?: string;
  };
  license_number?: string;
  years_of_experience?: number;
  consultation_fee?: number;
  status?: string;
  avatar?: string;
  isAvailable?: boolean;
  education?: string[];
  certifications?: string[];
  bio?: string;
}

export interface Appointment {
  _id: string;
  user_id?: {
    _id: string;
    name: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    avatar?: string;
  };
  doctor_id?: string;
  specialty_id?: any;
  appointment_date: string;
  time_slot: string;
  reason?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface Patient {
  _id: string;
  name?: string;
  phoneNumber?: string;
  blood_type?: string;
  allergies?: string[];
  dateOfBirth?: string;
  gender?: string;
  avatar?: string;
}

export interface Stat {
  _id: string;
  count: number;
}

export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'approved' | 'rejected' | 'scheduled';

export interface TreatmentStep {
  stepNumber: number;
  title: string;
  description: string;
  medication?: string;
  dosage?: string;
  duration?: string;
  instructions?: string;
  status: StepStatus;
  completedAt?: Date | string;
  approvedAt?: Date | string;
  startedAt?: Date | string;
  approval_requested?: boolean;
  requires_followup?: boolean;
  followup_reason?: string;
  condition_description?: string;
  patient_message?: string;
  doctorNotes?: string;
  isPhysicalVisit: boolean;
  scheduledAt?: string;
  reExaminationScheduled: boolean;
  needsReExamination: boolean;
  _id?: string;
}

export interface MedicalRecord {
  _id: string;
  user_id: any;
  doctor_id: string;
  appointment_id: string;
  diagnosis: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  notes?: string;
  treatment_plan: TreatmentStep[];
  consultation_status: 'in-progress' | 'completed' | 'cancelled';
  status: 'active' | 'resolved' | 'follow_up' | 'chronic';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  isActive?: boolean;
}

export interface Message {
  _id: string;
  sender_id: {
    _id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  receiver_id: {
    _id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  conversation_id: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  message: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  read: boolean;
  read_at?: string;
  timestamp: string;
  isMe?: boolean; // Helper for UI
  text?: string; // Helper for UI
  time?: string; // Helper for UI
}

export interface Conversation {
  _id: string;
  participant: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  last_message?: Message;
  last_message_at: string;
  unread_count: number;
}

export interface Notification {
  _id: string;
  user_id: string;
  doctor_id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    action_url?: string;
    action_label?: string;
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  date: string;
  messageCount: number;
  category: string;
  isSearchResult?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  category?: string;
}

export interface ChatSessionDetail {
  session_id: string;
  title: string;
  messages: ChatMessage[];
  category: string;
  is_active: boolean;
  last_activity: string;
}

export interface Specialty {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  doctor: DoctorProfile;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  specialtyId: string;
    licenseNumber: string;
    yearsOfExperience: number;
    consultationFee: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}
export interface UpdateProfileData {
  name?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  specialtyId?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  education?: string[];
  certifications?: string[];
  bio?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateAppointmentData {
  appointmentDate?: string;
  timeSlot?: string;
  reason?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface UpdateMedicalRecordData {
  diagnosis?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  notes?: string;
  treatment_plan?: TreatmentStep[];
  consultation_status?: 'in-progress' | 'completed' | 'cancelled';
  status?: 'active' | 'resolved' | 'follow_up' | 'chronic';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SendMessageData {
  receiverId: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  message: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}
export interface CreateChatSessionData {
  title: string;
  category: string;
}

export interface SendChatMessageData {
  sessionId: string;
  content: string;
}


export interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  _id: string;
  genericName: string;
  brandNames: string[];
  drugClass: string;
  indications: string[];
  dosageForms: string[];
  strength: string;
  administrationRoutes: string[];
  sideEffects: string[];
  contraindications: string[];
  interactions: string[];
  specialPrecautions: string[];
  vietnameseInfo?: {
    commonName: string;
    indications: string[];
    precautions: string[];
    dosageInstructions: string;
  };
}
export interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;
  avatar?: string;
  avatarUrl?: string;
  address: string;
  blood_type?: string; // Từ UserInformation (mới)
  allergies?: string[];
  status?: string;
}

export interface Consultation {
  _id: string;
  user_id: User;
  doctor_id: string;
  appointment_id: string | Appointment;
  diagnosis: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  notes?: string;
  treatment_plan: TreatmentStep[];
  consultation_status: 'in-progress' | 'completed' | 'cancelled';
  status: 'active' | 'resolved' | 'follow_up' | 'chronic';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  isActive?: boolean;
  next_appointment?: string;
  follow_up_instructions?: string;
}


export interface MedicationSearchResult {
  medications: Medication[];
}
export interface MedicationClassResult {
  drugClass: string;
  medications: Medication[];
}

export interface DrugSpecialtyIndication {
  specialty_name: string;
  indication: string;
  notes?: string;
  is_contraindicated: boolean;
}

export interface Drug {
  _id: string;
  name: string;
  generic_name: string;
  brand_name?: string;
  description?: string;
  price: number;
  currency: string;
  stock_quantity: number;
  form: string;
  strength: string;
  manufacturer?: string;
  specialty_data: DrugSpecialtyIndication[];
  created_at: string;
  updated_at: string;
}
