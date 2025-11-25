import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { DoctorProfile } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl } from '../utils/api';

const navLinks = [
{ to: "/home", icon: "dashboard", label: "Overview", end: true },
{ to: "/appointments", icon: "calendar_month", label: "Appointments" },
{ to: "/patients", icon: "groups", label: "Patients" },
{ to: "/consultations", icon: "chat_bubble", label: "Consultations" },
{ to: "/messages", icon: "forum", label: "Messages" },
];

export const Layout: React.FC = () => {
const [profile, setProfile] = useState<DoctorProfile | null>(null);
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
    if (data.success) setProfile(data.data);
  })
  .catch(err => console.error("Error fetching profile:", err));

}, [doctorId, navigate]);

const handleLogout = () => {
localStorage.removeItem('token');
localStorage.removeItem('doctorId');
localStorage.removeItem('userId');
navigate('/');
};

const avatarUrl = profile?.avatar
? getAvatarUrl(profile.avatar)
: "[https://lh3.googleusercontent.com/aida-public/AB6AXuDzGT7gwberGMMlbYPnkoMNOA8qmXTkhXqIBCKvsZx0EM1ksC8Jfgtoaoh8vdBlr9W0ngsc2pkf87T1WhJty8dqmuTRfm2G3_Hzd_T_G_4vlHyxaSkvlmRUYkkpZIwJO9p4eo4FkzbHvN2AdbbHwvHHyxMmCV4gMu4567PLZLQhSsGIXC190ExsQ7dQbejyuRsszhD3Y__YDWJLZKc1BwjeUNmIXRzT1W5ZAZYslyj5WslFz0z6xRdxNl-vKYqdOkctzhJ5P1YrUwG9](https://lh3.googleusercontent.com/aida-public/AB6AXuDzGT7gwberGMMlbYPnkoMNOA8qmXTkhXqIBCKvsZx0EM1ksC8Jfgtoaoh8vdBlr9W0ngsc2pkf87T1WhJty8dqmuTRfm2G3_Hzd_T_G_4vlHyxaSkvlmRUYkkpZIwJO9p4eo4FkzbHvN2AdbbHwvHHyxMmCV4gMu4567PLZLQhSsGIXC190ExsQ7dQbejyuRsszhD3Y__YDWJLZKc1BwjeUNmIXRzT1W5ZAZYslyj5WslFz0z6xRdxNl-vKYqdOkctzhJ5P1YrUwG9)";

const name = profile?.user_id?.name || 'Doctor';
const role = profile?.specialty_id?.name || 'Specialist';

return ( <div className="flex h-screen">
{/* Sidebar */} <aside className="flex flex-col w-64 shrink-0 bg-white dark:bg-[#102023] border-r border-gray-200 dark:border-[#224449] h-full sticky top-0 z-20 transition-colors"> <div className="flex flex-col gap-4 p-4 h-full">
{/* User Profile */} <div className="flex items-center gap-3 px-2 pt-2 pb-4 border-b border-gray-100 dark:border-gray-800 mb-2">
<div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 h-10 border border-gray-200"
style={{backgroundImage: `url("${avatarUrl}")`}}
/> <div className="flex flex-col overflow-hidden"> <h1 className="text-gray-900 dark:text-white text-sm font-semibold truncate">{name}</h1> <p className="text-gray-500 dark:text-[#8fc4cc] text-xs capitalize">{role}</p> </div> </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">
        {navLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-lg transition-all
              ${isActive ? 'bg-primary/20 text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}
            `}
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined ${isActive ? 'fill' : ''}`}>{link.icon}</span>
                <p className="text-sm font-medium leading-normal">{link.label}</p>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Links */}
      <div className="mt-auto flex flex-col gap-2">
        <NavLink
          to="/profile"
          className={({ isActive }) => `
            flex items-center gap-3 px-3 py-2 rounded-lg transition-all
            ${isActive ? 'bg-primary/20 text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}
          `}
        >
          {({ isActive }) => (
            <>
              <span className={`material-symbols-outlined ${isActive ? 'fill' : ''}`}>person</span>
              <p className="text-sm font-medium leading-normal">Profile</p>
            </>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <p className="text-sm font-medium leading-normal">Sign Out</p>
        </button>
      </div>
    </div>
  </aside>

  {/* Main Content */}
  <main className="flex-1 overflow-x-hidden overflow-y-auto">
    <Outlet />
  </main>
</div>
);
};

export default Layout;
