import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Appointment, Notification, Stat, DoctorProfile } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl } from '../utils/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const doctorId = getDoctorId();

  useEffect(() => {
    if (!doctorId) return;

    const fetchData = async () => {
      try {
        // Fetch Profile
        const profileRes = await fetch(`${API_BASE_URL}/doctors/profile/${doctorId}`);
        const profileData = await profileRes.json();
        if (profileData.success) setProfile(profileData.data);

        // Fetch Stats
        const statsRes = await fetch(`${API_BASE_URL}/doctors/stats/${doctorId}`);
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data || []);

        // Fetch Appointments (Limit to 5 upcoming)
        const aptRes = await fetch(`${API_BASE_URL}/doctors/${doctorId}/appointments`);
        const aptData = await aptRes.json();
        if (aptData.success) {
            const upcoming = (aptData.data as Appointment[])
                .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
                .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                .slice(0, 5);
            setAppointments(upcoming);
        }

        // Fetch Notifications
        const notifRes = await fetch(`${API_BASE_URL}/doctors/notifications/${doctorId}`);
        const notifData = await notifRes.json();
        if (notifData.success) setNotifications(notifData.data || []);

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [doctorId]);

  const totalAppointments = stats.reduce((acc, curr) => acc + curr.count, 0);
  const pendingCount = stats.find(s => s._id === 'pending')?.count || 0;

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-gray-900 dark:text-white text-3xl font-black leading-tight">Overview</h1>
          <p className="text-gray-500 dark:text-[#8fc4cc] text-base">Welcome back, Dr. {profile?.user_id?.name || 'Doctor'}</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative">
                 <input 
                    type="text" 
                    placeholder="Quick search..." 
                    className="pl-10 pr-4 py-2 rounded-full bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none w-64 transition-all text-gray-900 dark:text-white"
                />
                <span className="material-symbols-outlined absolute left-3 top-2 text-gray-400 text-sm">search</span>
            </div>
             <button className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] relative hover:bg-gray-50 dark:hover:bg-[#1a2c2f] transition-colors">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">notifications</span>
                {notifications.some(n => !n.isRead) && <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border border-white dark:border-[#102023]"></span>}
            </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex justify-between items-start">
             <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Appointments</p>
             <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">groups</span>
          </div>
          <p className="text-gray-900 dark:text-white text-4xl font-bold mt-2">{totalAppointments}</p>
          <p className="text-green-500 text-xs font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span> All time
          </p>
        </div>
        
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex justify-between items-start">
             <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Requests</p>
             <span className="material-symbols-outlined text-purple-500 bg-purple-500/10 p-2 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">calendar_today</span>
          </div>
          <p className="text-gray-900 dark:text-white text-4xl font-bold mt-2">{pendingCount}</p>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-2">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{width: `${(pendingCount / (totalAppointments || 1)) * 100}%`}}></div>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex justify-between items-start">
             <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">New Notifications</p>
             <span className="material-symbols-outlined text-orange-500 bg-orange-500/10 p-2 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">mark_chat_unread</span>
          </div>
          <p className="text-gray-900 dark:text-white text-4xl font-bold mt-2">{notifications.filter(n => !n.isRead).length}</p>
          <Link to="/messages" className="text-orange-500 text-xs font-medium hover:underline">View all</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-gray-900 dark:text-white text-xl font-bold">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-primary text-sm font-semibold hover:underline">View All</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {appointments.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-[#102023] rounded-xl border border-gray-200 dark:border-[#224449] text-gray-500">No upcoming appointments</div>
            ) : (
                appointments.map((app) => (
                <div key={app._id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] hover:border-primary/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                    <div 
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12" 
                        style={{backgroundImage: `url('${getAvatarUrl(app.user_id?.avatar) || 'https://via.placeholder.com/150'}')`}}
                    ></div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{app.user_id?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{app.reason || 'General Checkup'}</p>
                    </div>
                    </div>
                    <div className="text-center">
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{app.time_slot}</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{new Date(app.appointment_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                            app.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                        }`}>
                            {app.status}
                        </span>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="flex flex-col gap-4">
          <h2 className="text-gray-900 dark:text-white text-xl font-bold">Notifications</h2>
          <div className="p-4 rounded-xl bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] h-full min-h-[300px]">
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#224449]">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">No notifications</p>
              ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div key={notif._id} className="py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer px-2 rounded-lg flex gap-3">
                        <div className={`size-2 mt-2 rounded-full shrink-0 ${notif.isRead ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                  ))
              )}
            </div>
            {notifications.length > 0 && (
                <Link to="/messages" className="block w-full mt-4 py-2 text-sm text-center text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors">View All</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;