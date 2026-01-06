import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { DoctorProfile } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl } from '../utils/api';

const navLinks = [
  { to: "/home", icon: "dashboard", label: "Dashboard", end: true },
  { to: "/appointments", icon: "calendar_month", label: "Appointments" },
  { to: "/patients", icon: "groups", label: "My Patients" },
  { to: "/consultations", icon: "clinical_notes", label: "Consultations" },
  { to: "/drugs", icon: "medication", label: "Pharmacy / Drugs" }, // Added useful link for doctors
  { to: "/messages", icon: "forum", label: "Messages" },
];

export const Layout: React.FC = () => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [status, setStatus] = useState<'working' | 'not working' | 'busy'>('not working');
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  const doctorId = getDoctorId();
  const navigate = useNavigate();

  useEffect(() => {
    if (!doctorId) {
      navigate('/');
      return;
    }

    fetch(`${API_BASE_URL}/doctors/profile/${doctorId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.data);
          // Assuming user_id has the status. Fallback to 'working' if undefined for UX
          setStatus(data.data.user_id?.status || 'working');
        }
      })
      .catch(err => console.error("Error fetching profile:", err));

  }, [doctorId, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('doctorId');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const toggleStatus = async () => {
    if (loadingStatus || !doctorId) return;
    
    // Toggle logic: working -> not working -> working
    // You could expand this to include 'busy' if needed
    const newStatus = status === 'working' ? 'not working' : 'working';
    const oldStatus = status;

    // Optimistic update
    setStatus(newStatus);
    setLoadingStatus(true);

    try {
      const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (!data.success) {
        setStatus(oldStatus); // Revert on failure
        console.error("Failed to update status");
      }
    } catch (e) {
      setStatus(oldStatus);
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const avatarUrl = profile?.avatar
    ? getAvatarUrl(profile.avatar)
    : "https://lh3.googleusercontent.com/aida-public/AB6AXuDzGT7gwberGMMlbYPnkoMNOA8qmXTkhXqIBCKvsZx0EM1ksC8Jfgtoaoh8vdBlr9W0ngsc2pkf87T1WhJty8dqmuTRfm2G3_Hzd_T_G_4vlHyxaSkvlmRUYkkpZIwJO9p4eo4FkzbHvN2AdbbHwvHHyxMmCV4gMu4567PLZLQhSsGIXC190ExsQ7dQbejyuRsszhD3Y__YDWJLZKc1BwjeUNmIXRzT1W5ZAZYslyj5WslFz0z6xRdxNl-vKYqdOkctzhJ5P1YrUwG9";

  const name = profile?.user_id?.name || 'Doctor';
  const role = profile?.specialty_id?.name || 'Specialist';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f1a1c]">
      {/* Sidebar */}
      <aside className="flex flex-col w-72 shrink-0 bg-white dark:bg-[#102023] border-r border-gray-200 dark:border-[#224449] h-full sticky top-0 z-20 transition-all shadow-sm">
        <div className="flex flex-col h-full">
          
          {/* Brand / Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
             <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
                <span className="material-symbols-outlined filled">health_and_safety</span>
                <span>MediCare<span className="text-gray-400 font-normal">Doc</span></span>
             </div>
          </div>

          {/* User Profile & Status */}
          <div className="p-4">
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div 
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12 border-2 border-white dark:border-[#102023] shadow-sm"
                    style={{backgroundImage: `url("${avatarUrl}")`}}
                  />
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#102023] ${
                    status === 'working' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <h1 className="text-gray-900 dark:text-white text-sm font-bold truncate">{name}</h1>
                  <p className="text-gray-500 dark:text-[#8fc4cc] text-xs capitalize truncate">{role}</p>
                </div>
              </div>
              
              {/* Status Toggle */}
              <button 
                onClick={toggleStatus}
                disabled={loadingStatus}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  status === 'working' 
                    ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                   <span className="material-symbols-outlined text-sm">
                     {status === 'working' ? 'check_circle' : 'do_not_disturb_on'}
                   </span>
                   {status === 'working' ? 'Available' : 'Offline'}
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${
                   status === 'working' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                   <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${
                     status === 'working' ? 'left-4.5' : 'left-0.5'
                   }`} style={{ left: status === 'working' ? '18px' : '2px' }}></div>
                </div>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu</p>
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                  ${isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined ${isActive ? 'filled' : ''} group-hover:scale-110 transition-transform`}>{link.icon}</span>
                    <p className="text-sm font-medium leading-normal">{link.label}</p>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50"></span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom Links */}
          <div className="p-3 mt-auto border-t border-gray-100 dark:border-gray-800">
            <NavLink
              to="/profile"
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mb-1
                ${isActive ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}
              `}
            >
              <span className="material-symbols-outlined">settings</span>
              <p className="text-sm font-medium leading-normal">Settings</p>
            </NavLink>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all cursor-pointer w-full text-left"
            >
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-medium leading-normal">Sign Out</p>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
