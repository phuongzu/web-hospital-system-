
import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { DoctorProfile } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl } from '../utils/api';

const navLinks = [
  { to: "/home", icon: "dashboard", label: "Dashboard", end: true },
  { to: "/appointments", icon: "calendar_month", label: "Appointments" },
  { to: "/patients", icon: "groups", label: "My Patients" },
  { to: "/consultations", icon: "clinical_notes", label: "Consultations" },
  { to: "/drugs", icon: "medication", label: "Pharmacy / Drugs" }, 
  { to: "/messages", icon: "forum", label: "Messages" },
  { to: "/profile", icon: "person", label: "Profile" },
];

export const Layout: React.FC = () => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [status, setStatus] = useState<'working' | 'not working' | 'busy'>('not working');
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const doctorId = getDoctorId();
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    if (!doctorId) {
      navigate('/login');
    }
  }, [doctorId, navigate]);

  // Fetch real data from API
  useEffect(() => {
    if (!doctorId) return;

    fetch(`${API_BASE_URL}/doctors/profile/${doctorId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.data);
          setStatus(data.data.user_id?.status || 'working');
        }
      })
      .catch(err => console.error("Error fetching profile:", err));
  }, [doctorId]);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    navigate('/login');
  }, [navigate]);

  const toggleStatus = async () => {
    if (loadingStatus || !doctorId) return;
    const newStatus = status === 'working' ? 'not working' : 'working';
    const oldStatus = status;
    
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
        setStatus(oldStatus);
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
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a]">
      {/* Sidebar */}
      <aside className="flex flex-col w-72 shrink-0 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 h-full sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col h-full">
          
          {/* Brand */}
          <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-800/50">
             <div className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
                <span className="material-symbols-outlined filled text-3xl">health_and_safety</span>
                <span>MediCare<span className="text-sky-400 font-light">Doc</span></span>
             </div>
          </div>

          {/* Profile & Status */}
          <div className="p-4">
            <div className="bg-sky-50 dark:bg-sky-900/10 rounded-2xl p-4 border border-sky-100 dark:border-sky-900/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <img 
                    src={avatarUrl}
                    alt={name}
                    className="rounded-xl w-14 h-14 object-cover border-2 border-white dark:border-gray-800 shadow-md"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                    status === 'working' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <h1 className="text-gray-900 dark:text-white text-base font-bold truncate leading-tight">{name}</h1>
                  <p className="text-sky-600 dark:text-sky-400 text-xs font-medium uppercase tracking-wider truncate mt-0.5">{role}</p>
                </div>
              </div>
              
              {/* Status Switch */}
              <button 
                onClick={toggleStatus}
                disabled={loadingStatus}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  status === 'working' 
                    ? 'bg-white text-green-700 shadow-sm border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                    : 'bg-gray-200/50 text-gray-600 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                   <span className="material-symbols-outlined text-[18px]">
                     {status === 'working' ? 'fiber_manual_record' : 'do_not_disturb_on'}
                   </span>
                   {status === 'working' ? 'Available' : 'Offline'}
                </div>
                <div className={`w-9 h-5 rounded-full relative transition-colors duration-300 flex items-center ${
                   status === 'working' ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
                }`}>
                   <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-300 ${
                     status === 'working' ? 'translate-x-[18px]' : 'translate-x-[4px]'
                   }`}></div>
                </div>
              </button>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto mt-2">
            <p className="px-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">Main Menu</p>
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative
                  ${isActive 
                    ? 'bg-primary text-white shadow-lg shadow-sky-200 dark:shadow-none font-semibold' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-sky-900/10 hover:text-sky-600 dark:hover:text-sky-300'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined text-[22px] ${isActive ? 'filled' : ''} group-hover:scale-110 transition-transform duration-200`}>
                      {link.icon}
                    </span>
                    <p className="text-sm font-medium tracking-tight">{link.label}</p>
                    {isActive && <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full"></div>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer Sidebar Actions */}
          <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-800/50">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer w-full text-left font-semibold"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
              <p className="text-sm">Sign Out</p>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto relative bg-gray-50 dark:bg-[#0f172a]">
        {/* Top Header removed per user request to provide a cleaner dashboard feel */}
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 w-full max-w-[400px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-rose-500 text-4xl font-light">logout</span>
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Ready to leave?
            </h2>
            <p className="text-base text-gray-500 dark:text-gray-400 mb-8 px-4">
              Your session will be ended securely when you sign out.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-3.5 text-sm font-bold rounded-2xl border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="px-6 py-3.5 text-sm font-bold rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
