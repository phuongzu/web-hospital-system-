import React, { useEffect, useState } from 'react';
import { useRealTimeData } from '../context/RealTimeDataContext';
import { useParams, Link } from 'react-router-dom';
import { User, Appointment, Consultation } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, calculateAge, formatDate } from '../utils/api';

const PatientDetail: React.FC = () => {
    const { notifications, messages } = useRealTimeData() || { notifications: [], messages: [] };
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('Personal Info');
  
  // Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const doctorId = getDoctorId();

    // Unified fetch logic for patient details, appointments, and consultations
    const fetchAllPatientData = async () => {
        if (!id || !doctorId) return;
        try {
            setLoading(true);
            // 1. Fetch Patient Details
            const patientRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/patients?limit=1000`);
            const patientData = await patientRes.json();
            if (patientData.success) {
                const found = (patientData.data as User[]).find(p => p._id === id);
                setPatient(found || null);
            }
            // 2. Fetch Appointments
            const apptRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/appointments`);
            const apptData = await apptRes.json();
            if (apptData.success) {
                const patientAppts = (apptData.data as Appointment[]).filter(a => a.user_id?._id === id);
                setAppointments(patientAppts.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()));
            }
            // 3. Fetch Consultations (Medical History & Treatment Plans)
            const consultRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations`);
            const consultData = await consultRes.json();
            if (consultData.success) {
                const patientConsults = (consultData.data as Consultation[]).filter(c => c.user_id?._id === id);
                setConsultations(patientConsults.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllPatientData();
    }, [id, doctorId]);

    useEffect(() => {
        if (
            notifications.some(n => n.type === 'appointment' || n.type === 'consultation' || n.type === 'patient') ||
            messages.some(m => m.type === 'consultation' || m.type === 'patient')
        ) {
            fetchAllPatientData();
        }
    }, [notifications, messages, id, doctorId]);

  if (!patient && !loading) return <div className="p-8 text-center text-gray-500">Patient not found.</div>;
  if (loading && !patient) return <div className="p-8 text-center text-gray-500">Loading patient details...</div>;

  const renderTabContent = () => {
      switch (activeTab) {
        case 'Personal Info':
            return (
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        {[
                            { label: 'Full Name', value: patient?.name },
                            { label: 'Date of Birth', value: formatDate(patient?.dateOfBirth || '') },
                            { label: 'Gender', value: patient?.gender },
                            { label: 'Phone', value: patient?.phoneNumber },
                            { label: 'Email', value: patient?.email },
                            { label: 'Blood Group', value: patient?.blood_type || 'N/A' },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col gap-1 border-b border-gray-100 dark:border-[#224449] pb-3 last:border-0">
                                <span className="text-gray-500 dark:text-gray-400 text-sm">{item.label}</span>
                                <span className="text-gray-900 dark:text-white font-medium capitalize">{item.value || '-'}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Medical Notes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {patient?.allergies && patient.allergies.length > 0 ? (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg p-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                                        <h3 className="font-bold text-red-800 dark:text-red-300">Allergies</h3>
                                    </div>
                                    <p className="text-sm text-red-700 dark:text-red-400">{patient.allergies.join(', ')}</p>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-[#1a2c2f] border border-gray-100 dark:border-[#224449] rounded-lg p-5">
                                    <p className="text-gray-500 dark:text-gray-400">No known allergies recorded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );

        case 'Medical History':
            return (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {consultations.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No medical history found.</div>
                    ) : (
                        consultations.map((record) => (
                            <div key={record._id} className="bg-gray-50 dark:bg-[#1a2c2f] rounded-xl p-5 border border-gray-100 dark:border-[#224449]">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{record.diagnosis}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(record.updated_at)}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                        record.severity === 'critical' || record.severity === 'severe' ? 'bg-red-100 text-red-700' :
                                        record.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                        {record.severity}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{record.notes || 'No additional notes.'}</p>
                                <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-[#224449] flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">medical_information</span>
                                    Status: <span className="capitalize text-gray-700 dark:text-gray-200">{record.status}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            );

        case 'Appointments':
            return (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {appointments.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No appointments found.</div>
                    ) : (
                        appointments.map((ppt) => (
                            <div key={ppt._id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-50 dark:bg-[#1a2c2f] rounded-xl p-5 border border-gray-100 dark:border-[#224449]">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white dark:bg-[#102023] p-3 rounded-lg shadow-sm">
                                        <span className="block text-xs font-bold text-gray-400 uppercase text-center">{new Date(ppt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                        <span className="block text-xl font-bold text-gray-900 dark:text-white text-center">{new Date(ppt.appointment_date).getDate()}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{ppt.reason || 'General Visit'}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            {ppt.time_slot}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${
                                    ppt.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    ppt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                    ppt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {ppt.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            );

        case 'Treatment Plan':
             return (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {consultations.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No treatment plans recorded.</div>
                    ) : (
                        consultations.map((consult) => (
                            <div key={consult._id} className="relative pl-6 border-l-2 border-gray-200 dark:border-[#224449]">
                                <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-primary border-4 border-white dark:border-[#102023]"></div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{consult.diagnosis}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Prescribed on {formatDate(consult.updated_at)}</p>
                                </div>
                                
                                <div className="grid gap-4">
                                    {consult.treatment_plan.map((step) => (
                                        <div key={step.stepNumber} className="bg-gray-50 dark:bg-[#1a2c2f] p-4 rounded-xl border border-gray-100 dark:border-[#224449]">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <span className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{step.stepNumber}</span>
                                                    {step.title}
                                                </h4>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                                                    step.status === 'completed' || step.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {step.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 ml-8 mb-2">{step.description}</p>
                                            {step.medication && (
                                                <div className="ml-8 text-sm bg-white dark:bg-[#102023] p-3 rounded-lg border border-gray-100 dark:border-[#224449]">
                                                    <span className="font-bold text-gray-700 dark:text-gray-200">Rx: </span>
                                                    <span className="text-gray-600 dark:text-gray-300">{step.medication}</span>
                                                    {step.dosage && <span className="text-gray-500 dark:text-gray-400"> • {step.dosage}</span>}
                                                    {step.duration && <span className="text-gray-500 dark:text-gray-400"> • {step.duration}</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            );

        default:
            return null;
      }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <Link to="/patients" className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        <span className="text-sm font-medium">Back to List</span>
      </Link>

      {/* Header Profile Card */}
      <div className="bg-white dark:bg-[#102023] rounded-xl shadow-sm border border-gray-100 dark:border-[#224449] p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-6 items-center">
            <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-24 md:size-32 ring-4 ring-gray-50 dark:ring-[#1a2c2f] bg-gray-100 dark:bg-gray-800 relative" 
                style={{backgroundImage: `url('${getAvatarUrl(patient?.avatar)}')`}}
            >
                {!patient?.avatar && <span className="absolute inset-0 flex items-center justify-center text-gray-400 material-symbols-outlined text-4xl">person</span>}
            </div>
            <div>
              <h1 className="text-gray-900 dark:text-white text-3xl font-bold">{patient?.name}</h1>
              <div className="flex flex-col gap-1 mt-2">
                 <p className="text-gray-500 dark:text-gray-400">
                    {patient?.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} years old` : 'Age N/A'}, {patient?.gender}
                 </p>
                 <p className="text-gray-500 dark:text-gray-400">Blood Group: <span className="font-semibold text-gray-900 dark:text-white">{patient?.blood_type || 'N/A'}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-[#102023] rounded-xl shadow-sm border border-gray-100 dark:border-[#224449] min-h-[500px]">
         {/* Tabs */}
         <div className="flex border-b border-gray-100 dark:border-[#224449] px-6 overflow-x-auto">
            {['Personal Info', 'Medical History', 'Appointments', 'Treatment Plan'].map((tab) => (
                <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${
                        activeTab === tab 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                    }`}
                >
                    {tab}
                </button>
            ))}
         </div>

         {/* Tab Content */}
         <div className="p-8">
            {renderTabContent()}
         </div>
      </div>
    </div>
  );
};

export default PatientDetail;
