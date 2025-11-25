import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Consultation } from '../types';
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
  stock?: number;
}

interface PrescriptionItem {
  medication: string;
  dosage: string;
  duration: string;
  instructions: string;
}

// Constants (Matching Appointments.tsx)
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

const ConsultationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  
  // Drug Inventory State
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [loadingDrugs, setLoadingDrugs] = useState(false);

  // Form State
  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    prescriptions: [] as PrescriptionItem[]
  });
  
  const doctorId = getDoctorId();

  const fetchConsultation = async () => {
    if (!doctorId || !id) return;
    try {
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations`);
        const data = await response.json();
        if (data.success) {
            const found = (data.data as Consultation[]).find(c => c._id === id);
            setConsultation(found || null);
        }
    } catch (e) { console.error(e); }
  };

  const fetchDrugs = async () => {
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
  };

  useEffect(() => {
    fetchConsultation();
    fetchDrugs();
  }, [id, doctorId]);

  const handleApproveStep = async (stepNumber: number) => {
      if(!id) return;
      try {
        await fetch(`${API_BASE_URL}/doctors/consultations/${id}/steps/${stepNumber}/approve`, {
            method: 'POST'
        });
        fetchConsultation();
      } catch(e) { console.error(e); }
  };

  const handleComplete = async () => {
    if(!id) return;
      try {
        await fetch(`${API_BASE_URL}/doctors/consultations/${id}/complete`, {
            method: 'POST'
        });
        fetchConsultation();
      } catch(e) { console.error(e); }
  };

  const handlePrint = () => {
    window.print();
  };

  // Prescription Handlers
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
      
      // Auto-update title if it's the first medication and title is empty or generic
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

  const handleOpenAddStep = () => {
      setStepForm({
          title: '',
          description: '',
          prescriptions: [{ medication: '', dosage: '', duration: '', instructions: '' }]
      });
      setShowAddStepModal(true);
  };

  const handleAddStep = async () => {
      if (!id || !stepForm.title.trim()) {
          alert("Title is required");
          return;
      }

      // Validate prescriptions
      const hasInvalidPrescription = stepForm.prescriptions.some(p => !p.medication || !p.dosage);
      if (hasInvalidPrescription) {
        alert('Please select medication and dosage for all prescription items.');
        return;
      }

      try {
          // Format prescriptions to strings for backend
          const prescriptions = stepForm.prescriptions;
          const combinedMedication = prescriptions.map(p => p.medication).join(' + ');
          const combinedDosage = prescriptions.map(p => p.dosage ? `${p.medication}: ${p.dosage}` : '').filter(Boolean).join(' | ');
          const combinedDuration = prescriptions.map(p => p.duration ? `${p.medication}: ${p.duration}` : '').filter(Boolean).join(' | ');
          const combinedInstructions = prescriptions.map(p => p.instructions ? `${p.medication}: ${p.instructions}` : '').filter(Boolean).join(' | ');

          const response = await fetch(`${API_BASE_URL}/doctors/consultations/${id}/steps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  title: stepForm.title,
                  description: stepForm.description,
                  medication: combinedMedication,
                  dosage: combinedDosage,
                  duration: combinedDuration,
                  instructions: combinedInstructions
              })
          });
          const data = await response.json();
          if (data.success) {
              setShowAddStepModal(false);
              fetchConsultation();
          } else {
              alert(data.message || 'Failed to add step');
          }
      } catch (e) {
          console.error(e);
          alert('Error adding step');
      }
  };

  if (!consultation) return <div className="p-8">Loading consultation...</div>;

  return (
    <>
    {/* Screen Layout */}
    <div className="p-8 max-w-7xl mx-auto print:hidden">
      {/* Breadcrumb & Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#8fc4cc] mb-4">
            <Link to="/consultations" className="hover:text-primary">Consultations</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Case #{id?.slice(-6)}</span>
        </div>
        <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">Consultation Details</h1>
                <p className="text-gray-500 dark:text-[#8fc4cc] mt-1">{consultation.diagnosis}</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#1a2c2f] text-gray-700 dark:text-white rounded-lg font-bold text-sm hover:bg-gray-200 dark:hover:bg-[#224449] transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">print</span>
                    Print Plan
                </button>
                {consultation.consultation_status !== 'completed' && (
                    <button 
                        onClick={handleComplete}
                        className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30"
                    >
                        Complete Consultation
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline (Left) */}
        <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Treatment Plan</h2>
                {consultation.consultation_status !== 'completed' && (
                    <button 
                        onClick={handleOpenAddStep}
                        className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">add</span> Add Step
                    </button>
                )}
            </div>

            <div className="relative border-l-2 border-gray-200 dark:border-[#224449] ml-3 pl-8 space-y-10">
                {consultation.treatment_plan.map((step) => (
                    <div key={step.stepNumber} className="relative">
                        <span className={`absolute -left-[43px] top-0 flex items-center justify-center size-8 rounded-full border-4 border-white dark:border-[#0f2023] ${
                            step.status === 'approved' || step.status === 'completed' ? 'bg-green-100 dark:bg-green-900' : 
                            step.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                            <span className={`material-symbols-outlined text-sm font-bold ${
                                step.status === 'approved' || step.status === 'completed' ? 'text-green-600' : 
                                step.status === 'in-progress' ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                                {step.status === 'approved' ? 'check' : 'circle'}
                            </span>
                        </span>
                        <div className="bg-white dark:bg-[#102023] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-[#224449]">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{step.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-[#8fc4cc]">Step {step.stepNumber}</p>
                                </div>
                                <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full capitalize">
                                    {step.status.replace('-', ' ')}
                                </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-3">{step.description}</p>
                            
                            {step.medication && (
                                <div className="text-sm mb-2 text-gray-700 dark:text-gray-300">
                                    <strong>Medication:</strong> {step.medication}
                                    {step.dosage && ` (${step.dosage})`}
                                    {step.duration && ` - ${step.duration}`}
                                </div>
                            )}

                            {step.status === 'completed' && (
                                <div className="flex gap-4 mt-4">
                                    <button 
                                        onClick={() => handleApproveStep(step.stepNumber)}
                                        className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">approval</span> Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#102023] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-[#224449]">
                 <div className="flex items-center gap-4">
                     <div className="size-16 rounded-full bg-cover bg-center" style={{backgroundImage: `url('${getAvatarUrl(consultation.user_id?.avatar)}')`}}></div>
                     <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{consultation.user_id?.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{consultation.user_id?.gender}, {consultation.user_id?.phoneNumber}</p>
                     </div>
                 </div>
            </div>

            <div className="bg-white dark:bg-[#102023] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-[#224449]">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Info</h3>
                <div className="space-y-4">
                    <div className="flex justify-between border-t border-gray-100 dark:border-[#224449] pt-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Diagnosis</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{consultation.diagnosis}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-[#224449] pt-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Severity</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{consultation.severity}</span>
                    </div>
                    <div className="border-t border-gray-100 dark:border-[#224449] pt-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Notes</span>
                        <p className="text-sm text-gray-900 dark:text-white">{consultation.notes || 'None'}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Add Step Modal */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-[#102023] rounded-2xl shadow-2xl max-w-4xl w-full my-auto flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-[#224449]">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Treatment Step</h2>
                    <button onClick={() => setShowAddStepModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Step Title <span className="text-red-500">*</span></label>
                            <input 
                                className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] p-3 text-sm dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                placeholder="e.g. Follow-up Checkup"
                                value={stepForm.title}
                                onChange={(e) => setStepForm({...stepForm, title: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                            <textarea 
                                className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f] p-3 text-sm dark:text-white focus:ring-2 focus:ring-primary outline-none resize-none"
                                rows={2}
                                placeholder="Details about this step"
                                value={stepForm.description}
                                onChange={(e) => setStepForm({...stepForm, description: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Prescriptions */}
                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Prescriptions</label>
                        
                        {stepForm.prescriptions.map((item, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-[#1a2c2f] border border-gray-200 dark:border-[#224449] rounded-xl p-4 relative group">
                            {index > 0 && (
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
                                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Medication {index + 1}</label>
                                   <div className="relative">
                                     <select 
                                         className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
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
                                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dosage</label>
                                   <div className="relative">
                                     <select 
                                         className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
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
                                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Duration</label>
                                   <div className="relative">
                                       <select 
                                           className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
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
                                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Instructions</label>
                                   <div className="relative">
                                     <select 
                                         className="w-full rounded-lg border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023] p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
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
                           className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-[#224449] rounded-xl text-gray-500 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                        >
                           <span className="material-symbols-outlined">add_circle</span>
                           Add Another Medication
                        </button>
                    </div>
                </div>
                
                <div className="p-6 border-t border-gray-100 dark:border-[#224449] bg-gray-50 dark:bg-[#1a2c2f]/50 flex justify-end gap-3">
                    <button onClick={() => setShowAddStepModal(false)} className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
                    <button onClick={handleAddStep} className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/30">Add Step</button>
                </div>
            </div>
        </div>
      )}
    </div>
    
    {/* Printable Layout */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 text-black overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-gray-800 pb-6 mb-8">
            <div>
                <h1 className="text-4xl font-black mb-2 text-primary">Medical Prescription</h1>
                <p className="text-sm text-gray-600">Generated by SmartCare System</p>
                <p className="text-sm font-bold mt-2">Dr. ID: {doctorId}</p>
            </div>
            <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Prescription Date</p>
                <p className="font-bold text-xl">{new Date().toLocaleDateString()}</p>
            </div>
        </div>

        {/* Patient Details */}
        <div className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4 border-b border-gray-200 pb-2">Patient Details</h2>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Full Name</p>
                    <p className="font-bold text-lg">{consultation.user_id?.name}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 mb-1">Age / Gender</p>
                    <p className="font-bold text-lg">
                        {consultation.user_id?.dateOfBirth ? calculateAge(consultation.user_id.dateOfBirth) : 'N/A'} Yrs / {consultation.user_id?.gender}
                    </p>
                </div>
                <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Diagnosis</p>
                    <p className="font-bold text-lg">{consultation.diagnosis}</p>
                </div>
            </div>
        </div>

        {/* Prescription List (Rx) */}
        <div className="mb-12">
             <div className="flex items-center gap-2 mb-6">
                <span className="text-4xl font-serif italic font-bold">Rx</span>
                <span className="text-sm text-gray-500 uppercase font-bold tracking-wider mt-2">Treatment Plan</span>
             </div>
             
             <div className="space-y-6">
                 {consultation.treatment_plan.map((step, i) => (
                     <div key={i} className="border-l-4 border-gray-300 pl-4 py-1">
                         <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-lg">{i+1}. {step.medication || step.title}</h3>
                            <span className="font-mono font-bold text-gray-700">{step.dosage}</span>
                         </div>
                         <div className="text-gray-600 mb-1">
                            Duration: <span className="font-medium text-black">{step.duration}</span>
                         </div>
                         {step.instructions && (
                             <div className="text-sm text-gray-500 italic">
                                " {step.instructions} "
                             </div>
                         )}
                     </div>
                 ))}
             </div>
        </div>
        
        {/* Notes */}
        {consultation.notes && (
            <div className="mb-12">
                <h2 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Additional Notes</h2>
                <p className="text-gray-700 bg-yellow-50 p-4 rounded-lg border border-yellow-100">{consultation.notes}</p>
            </div>
        )}

        {/* Footer / Signature */}
        <div className="mt-20 pt-8 flex justify-between items-end">
            <div className="text-xs text-gray-400 max-w-sm">
                <p>This prescription is valid for 30 days from the date of issue unless otherwise specified.</p>
            </div>
            <div className="text-center">
                <div className="w-64 border-t-2 border-black pt-2 mb-1"></div>
                <p className="font-bold text-sm uppercase">Doctor's Signature</p>
            </div>
        </div>
    </div>
    </>
  );
};

export default ConsultationDetail;