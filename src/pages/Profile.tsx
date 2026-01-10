import React, { useEffect, useState, useRef } from 'react';
import { API_BASE_URL, getDoctorId, getAvatarUrl } from '../utils/api';
import { DoctorProfile } from '../types';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const doctorId = getDoctorId();

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors/profile/${doctorId}`);
      const data = await res.json();
      console.log('🔍 Profile data:', data); // DEBUG
      if (data.success) {
        setProfile(data.data);
      } else {
        setError(data.message || 'Failed to load profile');
      }
    } catch (e) { 
      console.error('Error fetching profile:', e);
      setError('Network error loading profile');
    }
  };

  useEffect(() => { 
    if (doctorId) fetchProfile(); 
  }, [doctorId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files?.[0]) return;
     if (!doctorId) {
       setError('Doctor ID not found');
       return;
     }
     
     setUploading(true);
     setError(null);
     
     const formData = new FormData();
     formData.append('avatar', e.target.files[0]);
     
     console.log('📤 Uploading avatar for doctor:', doctorId);
     console.log('📤 File:', e.target.files[0].name, e.target.files[0].size);
     
     try {
        const response = await fetch(`${API_BASE_URL}/doctors/avatar?doctorId=${doctorId}`, { 
          method: 'POST', 
          body: formData 
        });
        
        console.log('📥 Upload response status:', response.status);
        
        const data = await response.json();
        console.log('📥 Upload response data:', data);
        
        if (!response.ok || !data.success) {
          throw new Error(data.message || `Upload failed with status ${response.status}`);
        }
        
        // Refresh profile
        await fetchProfile();
        
     } catch (err: any) { 
        console.error('❌ Avatar upload error:', err);
        setError(err.message || 'Failed to upload avatar');
     } finally { 
        setUploading(false); 
        // Reset file input
        if (fileRef.current) {
          fileRef.current.value = '';
        }
     }
  };

  const toggleAvailability = async () => {
      if (!profile || !doctorId) return;
      try {
         const response = await fetch(`${API_BASE_URL}/doctors/availability`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ doctorId, isAvailable: !profile.isAvailable })
         });
         
         const data = await response.json();
         if (data.success) {
           setProfile({ ...profile, isAvailable: !profile.isAvailable });
         } else {
           console.error('Toggle availability failed:', data.message);
         }
      } catch (e) { 
        console.error('Toggle availability error:', e);
        setError('Failed to update availability');
      }
  };

  const avatarUrl = profile?.avatar ? getAvatarUrl(profile.avatar) : '';

  if (!profile) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
       {/* Error Alert */}
       {error && (
         <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500">error</span>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
         </div>
       )}
       
       <div className="bg-white dark:bg-[#1a2c2f] rounded-2xl shadow-sm border border-gray-200 dark:border-[#224449] overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-primary"></div>
          <div className="px-8 pb-8">
             <div className="flex flex-col md:flex-row justify-between items-end -mt-12 mb-6">
                <div className="flex items-end gap-6">
                   <div className="relative">
                      <div className="w-32 h-32 rounded-2xl bg-white dark:bg-[#1a2c2f] p-1 shadow-lg overflow-hidden">
                         {avatarUrl ? (
                           <img 
                             src={avatarUrl}
                             alt={profile.user_id?.name || 'Doctor'}
                             className="w-full h-full rounded-xl object-cover"
                             onError={(e) => {
                               const target = e.target as HTMLImageElement;
                               target.style.display = 'none';
                               // Hiển thị fallback
                               const parent = target.parentElement;
                               if (parent) {
                                 const fallback = document.createElement('div');
                                 fallback.className = 'w-full h-full rounded-xl bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center';
                                 fallback.innerHTML = `<span class="text-3xl font-bold text-blue-600">${profile.user_id?.name?.charAt(0) || 'D'}</span>`;
                                 parent.appendChild(fallback);
                               }
                             }}
                           />
                         ) : (
                           <div className="w-full h-full rounded-xl bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
                             <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                               {profile.user_id?.name?.charAt(0) || 'D'}
                             </span>
                           </div>
                         )}
                      </div>
                      <button 
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-2 right-2 bg-white dark:bg-[#102023] p-1.5 rounded-lg shadow-md hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-sm">
                           {uploading ? 'sync' : 'edit'}
                         </span>
                      </button>
                      <input 
                        type="file" 
                        hidden 
                        ref={fileRef} 
                        onChange={handleUpload} 
                        accept="image/*"
                        disabled={uploading}
                      />
                   </div>
                   <div className="mb-2">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.user_id?.name}</h1>
                      <p className="text-gray-500 dark:text-gray-400">{profile.specialty_id?.name}</p>
                   </div>
                </div>
                <div className="flex gap-3 mb-2 md:mb-0">
                    <button 
                      onClick={toggleAvailability} 
                      disabled={uploading}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${profile.isAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'} disabled:opacity-50`}
                    >
                       {profile.isAvailable ? 'Available' : 'Set Busy'}
                    </button>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                       Edit Profile
                    </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                   <section>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                         <span className="material-symbols-outlined text-primary">person</span> Personal Info
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                         <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#102023]">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Email</p>
                            <p className="font-medium text-gray-900 dark:text-white">{profile.user_id?.email || 'Not provided'}</p>
                         </div>
                         <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#102023]">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                            <p className="font-medium text-gray-900 dark:text-white">{profile.user_id?.phoneNumber || 'Not provided'}</p>
                         </div>
                         <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#102023]">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Gender</p>
                            <p className="font-medium text-gray-900 dark:text-white">{profile.user_id?.gender || 'Not specified'}</p>
                         </div>
                         <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#102023]">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Experience</p>
                            <p className="font-medium text-gray-900 dark:text-white">{profile.years_of_experience || '0'} Years</p>
                         </div>
                      </div>
                   </section>

                   <section>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                         <span className="material-symbols-outlined text-primary">school</span> Education & Bio
                      </h3>
                      <div className="bg-gray-50 dark:bg-[#102023] p-5 rounded-xl space-y-4">
                          <div>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">About</p>
                             <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{profile.bio || 'No bio provided.'}</p>
                          </div>
                          {profile.education && profile.education.length > 0 && (
                             <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Education</p>
                                <ul className="list-disc list-inside text-sm text-gray-800 dark:text-gray-200">
                                   {profile.education.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                             </div>
                          )}
                      </div>
                   </section>
                </div>
                
                <div className="space-y-6">
                   <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl">
                      <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Consultation Fee</h4>
                      <p className="text-3xl font-bold text-primary">${profile.consultation_fee || '0'}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">Per session (approx 30 mins)</p>
                   </div>

                   <div className="bg-white dark:bg-[#1a2c2f] border border-gray-200 dark:border-[#224449] rounded-xl p-5">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4">License</h4>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#102023] rounded-lg">
                         <span className="material-symbols-outlined text-gray-400">badge</span>
                         <div>
                            <p className="text-xs text-gray-500">Number</p>
                            <p className="font-mono text-sm font-bold">{profile.license_number || 'Not provided'}</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Profile;