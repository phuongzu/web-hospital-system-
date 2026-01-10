import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { getDoctorId, API_BASE_URL, formatDate, getAvatarUrl } from '../utils/api';

const Patients: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const doctorId = getDoctorId();

  useEffect(() => {
    const fetchPatients = async () => {
      if (!doctorId) {
        setError('Doctor ID not found. Please log in again.');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token') || '';
        
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/patients?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch patients: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Đảm bảo mỗi patient có proper avatar URL - giống như Messages
          const patientsWithAvatars = (data.data || []).map((patient: User) => ({
            ...patient,
            // Sử dụng getAvatarUrl để tạo URL đầy đủ - giống như Messages
            avatarUrl: getAvatarUrl(patient.avatar)
          }));
          setPatients(patientsWithAvatars);
        } else {
          throw new Error(data.message || 'Failed to fetch patients');
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
        setError(error instanceof Error ? error.message : 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, [doctorId]);

  const filteredPatients = patients.filter(p => 
    (p.name && p.name.toLowerCase().includes(search.toLowerCase())) || 
    (p.phoneNumber && p.phoneNumber.includes(search)) ||
    (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  };

  // Function to get initials from name
  const getInitials = (name: string): string => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Function to get background color based on name
  const getAvatarColor = (name: string): string => {
    if (!name) return 'from-blue-100 to-blue-200 text-blue-600 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400';
    
    const colors = [
      'from-blue-100 to-blue-200 text-blue-600 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400',
      'from-purple-100 to-purple-200 text-purple-600 dark:from-purple-900/30 dark:to-purple-800/30 dark:text-purple-400',
      'from-green-100 to-green-200 text-green-600 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400',
      'from-yellow-100 to-yellow-200 text-yellow-600 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400',
      'from-red-100 to-red-200 text-red-600 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-400',
      'from-pink-100 to-pink-200 text-pink-600 dark:from-pink-900/30 dark:to-pink-800/30 dark:text-pink-400',
      'from-indigo-100 to-indigo-200 text-indigo-600 dark:from-indigo-900/30 dark:to-indigo-800/30 dark:text-indigo-400',
      'from-teal-100 to-teal-200 text-teal-600 dark:from-teal-900/30 dark:to-teal-800/30 dark:text-teal-400',
    ];
    
    // Simple hash function to get consistent color for each name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-gray-900 dark:text-white text-3xl font-black leading-tight">Patient List</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and view your patients' information
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Patients</p>
              <p className="text-2xl font-bold mt-1">{patients.length}</p>
            </div>
            <span className="material-symbols-outlined text-3xl opacity-80">group</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Today's Appointments</p>
              <p className="text-2xl font-bold mt-1">12</p>
            </div>
            <span className="material-symbols-outlined text-3xl opacity-80">calendar_today</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Pending Reviews</p>
              <p className="text-2xl font-bold mt-1">5</p>
            </div>
            <span className="material-symbols-outlined text-3xl opacity-80">rate_review</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">New This Month</p>
              <p className="text-2xl font-bold mt-1">8</p>
            </div>
            <span className="material-symbols-outlined text-3xl opacity-80">trending_up</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-[#102023] p-5 rounded-xl border border-gray-100 dark:border-[#224449] shadow-sm">
        <div className="flex-grow">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
            <input 
              className="w-full bg-gray-50 dark:bg-[#224449] border-none rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30 focus:outline-none transition-shadow"
              placeholder="Search patients by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-[#224449] text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 whitespace-nowrap text-sm font-medium transition-colors">
            <span>Blood Group: All</span>
            <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-[#224449] text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 whitespace-nowrap text-sm font-medium transition-colors">
            <span>Sort By: Newest</span>
            <span className="material-symbols-outlined text-sm">sort</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#102023] rounded-xl border border-gray-100 dark:border-[#224449] overflow-hidden flex-1 flex flex-col shadow-sm">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-[#1a2c2f] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Blood Group</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#224449]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading patients...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">person_off</span>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No patients found</p>
                        {search && (
                          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                            No results for "{search}". Try a different search term.
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr 
                    key={patient._id} 
                    className="hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/patients/${patient._id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar Container - giống như Messages */}
                        <div className="relative">
                          {/* Sử dụng inline style với backgroundImage giống Messages */}
                          <div 
                            className="size-12 rounded-full bg-cover bg-center bg-gray-200 border-2 border-gray-200 dark:border-gray-700 group-hover:border-primary/50 transition-colors shadow-sm"
                            style={{ 
                              backgroundImage: patient.avatarUrl && patient.avatarUrl !== '' 
                                ? `url('${patient.avatarUrl}')` 
                                : 'none' 
                            }}
                          >
                            {/* Fallback hiển thị initials khi không có avatar */}
                            {(!patient.avatarUrl || patient.avatarUrl === '') && (
                              <div 
                                className={`flex items-center justify-center h-full w-full rounded-full bg-gradient-to-r ${getAvatarColor(patient.name || '')}`}
                              >
                                <span className="font-bold text-sm">
                                  {getInitials(patient.name || 'Patient')}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Online Status Indicator */}
                          <div className="absolute -bottom-1 -right-1 size-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        </div>
                        
                        {/* Patient Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                              {patient.name}
                            </span>
                            {patient.blood_type && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
                                {patient.blood_type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-gray-400 text-sm">mail</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                              {patient.email || 'No email'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">cake</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'Not provided'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`text-sm px-3 py-1 rounded-full capitalize ${patient.gender === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : patient.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {patient.gender || 'Not specified'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">phone</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {patient.phoneNumber || 'Not provided'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">bloodtype</span>
                        <span className={`text-sm font-bold ${patient.blood_type ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {patient.blood_type || 'N/A'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm rounded-lg transition-colors group-hover:shadow-sm"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/patients/${patient._id}`);
                          }}
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          View
                        </button>
                        
                        <button 
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm rounded-lg transition-colors"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/messages?patient=${patient._id}`);
                          }}
                        >
                          <span className="material-symbols-outlined text-sm">message</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination and Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-[#224449]">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-0">
            Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredPatients.length}</span> of{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{patients.length}</span> patients
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 rounded-lg bg-primary text-white font-medium">1</button>
              <button className="px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">2</button>
              <button className="px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">3</button>
              <span className="px-1 text-gray-500">...</span>
              <button className="px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">10</button>
            </div>
            
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Patients;