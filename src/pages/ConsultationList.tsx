import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Consultation } from '../types';
import { getDoctorId, API_BASE_URL } from '../utils/api';

const Consultations: React.FC = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filter, setFilter] = useState('active');
  const doctorId = getDoctorId();

  useEffect(() => {
    const fetchConsultations = async () => {
      if (!doctorId) return;
      try {
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations`);
        const data = await response.json();
        if (data.success) {
            setConsultations(data.data || []);
        }
      } catch (e) {
          console.error(e);
      }
    };
    fetchConsultations();
  }, [doctorId]);

  const filteredConsultations = filter === 'all' 
    ? consultations 
    : consultations.filter(c => 
        filter === 'active' ? c.status === 'active' : 
        c.consultation_status === filter || c.status === filter
      );

  const getProgress = (c: Consultation) => {
      if (c.treatment_plan.length === 0) return 0;
      const completed = c.treatment_plan.filter(s => s.status === 'completed' || s.status === 'approved').length;
      return (completed / c.treatment_plan.length) * 100;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-1">
            <h1 className="text-gray-900 dark:text-white text-3xl font-black">Consultations</h1>
            <p className="text-gray-500 dark:text-[#8fc4cc]">Manage active and completed consultation cases.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="flex-1 w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
            <input 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#102023] border border-gray-100 dark:border-[#224449] text-gray-900 dark:text-white focus:ring-1 focus:ring-primary text-sm"
                placeholder="Search by patient name or ID..."
            />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
         {['active', 'in-progress', 'completed', 'resolved', 'all'].map(f => (
             <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg font-medium text-sm whitespace-nowrap capitalize transition-colors ${
                    filter === f 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 dark:bg-[#224449] text-gray-600 dark:text-gray-300'
                }`}
             >
                 {f.replace('-', ' ')}
             </button>
         ))}
      </div>

      <div className="bg-white dark:bg-[#102023] rounded-xl border border-gray-100 dark:border-[#224449] overflow-hidden flex-1">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-[#1a2c2f] text-gray-500 dark:text-[#8fc4cc] font-medium uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3">Patient</th>
                        <th className="px-6 py-3">Diagnosis</th>
                        <th className="px-6 py-3">Priority</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Progress</th>
                        <th className="px-6 py-3">Last Updated</th>
                        <th className="px-6 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#224449]">
                    {filteredConsultations.length === 0 ? (
                         <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No consultations found.</td></tr>
                    ) : (
                        filteredConsultations.map((item) => (
                            <tr 
                                key={item._id} 
                                className="hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer" 
                                onClick={() => navigate(`/consultations/${item._id}`)}
                            >
                                <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{item.user_id?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.diagnosis}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                        item.priority === 'urgent' ? 'bg-red-100 text-red-800' : 
                                        item.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {item.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800`}>
                                        {item.consultation_status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 w-48">
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div className="bg-primary h-2 rounded-full" style={{width: `${getProgress(item)}%`}}></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(item.updated_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-primary hover:text-primary/80 font-medium">Details</button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Consultations;