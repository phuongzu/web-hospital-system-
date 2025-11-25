import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, formatDate } from '../utils/api';

const Patients: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const doctorId = getDoctorId();

  useEffect(() => {
    const fetchPatients = async () => {
      if (!doctorId) return;
      setLoading(true);
      try {
        // Changed endpoint from /patients/all to /patients to use .find() instead of .aggregate()
        // This fixes the issue where string IDs weren't matching ObjectIds in the aggregation pipeline
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/patients?limit=1000`);
        const data = await response.json();
        if (data.success) {
            setPatients(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [doctorId]);

  const filteredPatients = patients.filter(p => 
    (p.name && p.name.toLowerCase().includes(search.toLowerCase())) || 
    (p.phoneNumber && p.phoneNumber.includes(search))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-gray-900 dark:text-white text-3xl font-black leading-tight">Patient List</h1>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg shadow-primary/30">
          <span className="material-symbols-outlined">add</span>
          <span>Add New Patient</span>
        </button>
      </header>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-[#102023] p-4 rounded-xl border border-gray-100 dark:border-[#224449]">
        <div className="flex-grow">
          <div className="relative">
             <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
             <input 
                className="w-full bg-gray-50 dark:bg-[#224449] border-none rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-1 focus:ring-primary"
                placeholder="Search by name, phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-[#224449] text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 whitespace-nowrap text-sm font-medium">
            <span>Blood Group: All</span>
            <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#102023] rounded-xl border border-gray-100 dark:border-[#224449] overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-[#1a2c2f]">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Blood Group</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#224449]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading patients...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No patients found.</td></tr>
              ) : (
                filteredPatients.map((patient) => (
                    <tr 
                        key={patient._id} 
                        className="hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => navigate(`/patients/${patient._id}`)}
                    >
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-cover bg-center bg-gray-100 dark:bg-gray-800" style={{backgroundImage: `url('${getAvatarUrl(patient.avatar)}')`}}>
                            {!patient.avatar && <span className="flex items-center justify-center h-full w-full text-gray-400 material-symbols-outlined text-lg">person</span>}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{patient.name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(patient.dateOfBirth || '')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{patient.gender || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{patient.phoneNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{patient.bloodGroup || 'N/A'}</td>
                    <td className="px-6 py-4">
                        <button 
                            className="text-primary hover:text-primary/80 font-medium text-sm hover:underline"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                navigate(`/patients/${patient._id}`);
                            }}
                        >
                            View Details
                        </button>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="flex items-center justify-center p-4 mt-auto border-t border-gray-100 dark:border-[#224449]">
           <span className="text-sm text-gray-400">Showing {filteredPatients.length} patients</span>
        </div>
      </div>
    </div>
  );
};

export default Patients;