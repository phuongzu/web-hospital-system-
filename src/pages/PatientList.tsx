import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { getDoctorId, API_BASE_URL, formatDate, getAvatarUrl } from '../utils/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PatientWithMeta extends User {
  avatarUrl?: string;
  lastVisitDate?: string;
  lastDiagnosis?: string;
  conditionTags?: string[];
  totalVisits?: number;
  isNewPatient?: boolean;
  daysSinceLastVisit?: number;
}

type FilterTab = 'all' | 'active' | 'needs-followup' | 'new';
type SortOption = 'last-visit' | 'name' | 'newest';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name: string): string => {
  if (!name) return 'P';
  return name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().substring(0, 2);
};

const getAvatarColor = (name: string): string => {
  const palette = [
    'from-sky-100 to-sky-200 text-sky-700 dark:from-sky-900/40 dark:to-sky-800/40 dark:text-sky-300',
    'from-violet-100 to-violet-200 text-violet-700 dark:from-violet-900/40 dark:to-violet-800/40 dark:text-violet-300',
    'from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/40 dark:to-emerald-800/40 dark:text-emerald-300',
    'from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900/40 dark:to-amber-800/40 dark:text-amber-300',
    'from-rose-100 to-rose-200 text-rose-700 dark:from-rose-900/40 dark:to-rose-800/40 dark:text-rose-300',
    'from-cyan-100 to-cyan-200 text-cyan-700 dark:from-cyan-900/40 dark:to-cyan-800/40 dark:text-cyan-300',
    'from-indigo-100 to-indigo-200 text-indigo-700 dark:from-indigo-900/40 dark:to-indigo-800/40 dark:text-indigo-300',
    'from-teal-100 to-teal-200 text-teal-700 dark:from-teal-900/40 dark:to-teal-800/40 dark:text-teal-300',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const daysSince = (dateStr?: string): number => {
  if (!dateStr) return 9999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const formatRelativeDate = (dateStr?: string): string => {
  if (!dateStr) return 'Never';
  const days = daysSince(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const PatientAvatar: React.FC<{ patient: PatientWithMeta; size?: 'sm' | 'md' }> = ({ patient, size = 'md' }) => {
  const dim = size === 'md' ? 'size-11' : 'size-8';
  const text = size === 'md' ? 'text-sm' : 'text-xs';
  const hasAvatar = patient.avatarUrl && patient.avatarUrl.trim() !== '' && !patient.avatarUrl.includes('undefined');

  return (
    <div className={`${dim} rounded-xl overflow-hidden shrink-0 relative`}>
      {hasAvatar ? (
        <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url('${patient.avatarUrl}')` }} />
      ) : (
        <div className={`size-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(patient.name || '')}`}>
          <span className={`${text} font-bold`}>{getInitials(patient.name || 'P')}</span>
        </div>
      )}
    </div>
  );
};

const FollowUpBadge: React.FC<{ days: number }> = ({ days }) => {
  if (days === 9999) return <span className="text-xs text-slate-400">No visits yet</span>;
  if (days > 90) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30">
      <span className="size-1.5 rounded-full bg-red-400 inline-block" />
      Overdue
    </span>
  );
  if (days > 60) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30">
      <span className="size-1.5 rounded-full bg-amber-400 inline-block" />
      Due soon
    </span>
  );
  return null;
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const Patients: React.FC = () => {
  const navigate = useNavigate();
  const doctorId = getDoctorId();

  const [patients, setPatients]   = useState<PatientWithMeta[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy]       = useState<SortOption>('last-visit');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!doctorId) { setError('Doctor ID not found. Please log in again.'); return; }
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/patients?limit=1000`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch patients');

        const now = new Date();
        const enriched: PatientWithMeta[] = (data.data || []).map((p: User & any) => {
          const avatarUrl = getAvatarUrl(p.avatar);
          const lastVisitDate: string | undefined =
            p.lastConsultation?.created_at ||
            p.lastAppointment?.appointment_date ||
            p.appointments?.slice(-1)[0]?.appointment_date;
          const days = daysSince(lastVisitDate);
          const createdAt = new Date(p.created_at || now);
          const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          return {
            ...p,
            avatarUrl,
            lastVisitDate,
            lastDiagnosis: p.lastConsultation?.diagnosis || p.lastDiagnosis,
            conditionTags: p.conditions || p.tags || [],
            totalVisits: p.totalConsultations || p.appointments?.length || 0,
            isNewPatient: daysOld <= 30,
            daysSinceLastVisit: days,
          };
        });

        setPatients(enriched);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [doctorId]);

  // ─── Stats (computed from real data) ─────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const activeCount      = patients.filter(p => (p.daysSinceLastVisit ?? 9999) <= 180).length;
    const followUpCount    = patients.filter(p => (p.daysSinceLastVisit ?? 9999) > 90 && (p.daysSinceLastVisit ?? 9999) !== 9999).length;
    const newThisMonth     = patients.filter(p => {
      const d = new Date(p.created_at as any || now);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: patients.length, active: activeCount, followUp: followUpCount, newThisMonth };
  }, [patients]);

  // ─── Filter + Sort ────────────────────────────────────────────────────────────

  const processed = useMemo(() => {
    let list = patients.filter(p => {
      const q = search.toLowerCase();
      return !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.phoneNumber || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q);
    });

    switch (filterTab) {
      case 'active':
        list = list.filter(p => (p.daysSinceLastVisit ?? 9999) <= 180);
        break;
      case 'needs-followup':
        list = list.filter(p => (p.daysSinceLastVisit ?? 9999) > 90 && (p.daysSinceLastVisit ?? 9999) !== 9999);
        break;
      case 'new':
        list = list.filter(p => p.isNewPatient);
        break;
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'last-visit') return (a.daysSinceLastVisit ?? 9999) - (b.daysSinceLastVisit ?? 9999);
      // newest: by created_at desc
      return new Date(b.created_at as any || 0).getTime() - new Date(a.created_at as any || 0).getTime();
    });
  }, [patients, search, filterTab, sortBy]);

  // ─── Tabs ─────────────────────────────────────────────────────────────────────

  const tabs: { key: FilterTab; label: string; count: number; icon: string }[] = [
    { key: 'all',           label: 'All Patients',    count: patients.length,    icon: 'group' },
    { key: 'active',        label: 'Active',          count: stats.active,       icon: 'check_circle' },
    { key: 'needs-followup',label: 'Needs Follow-up', count: stats.followUp,     icon: 'schedule' },
    { key: 'new',           label: 'New This Month',  count: stats.newThisMonth, icon: 'person_add' },
  ];

  const sortLabels: Record<SortOption, string> = {
    'last-visit': 'Last Visit',
    'name':       'Name (A–Z)',
    'newest':     'Newest First',
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1619]">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Patients</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── STATS ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Patients',
              value: stats.total,
              icon: 'group',
              color: 'text-primary',
              bg: 'bg-primary/8 dark:bg-primary/10',
              iconBg: 'bg-primary/10 dark:bg-primary/15',
            },
            {
              label: 'Active (6 months)',
              value: stats.active,
              icon: 'check_circle',
              color: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-50 dark:bg-emerald-900/15',
              iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            },
            {
              label: 'Needs Follow-up',
              value: stats.followUp,
              icon: 'schedule',
              color: 'text-amber-600 dark:text-amber-400',
              bg: 'bg-amber-50 dark:bg-amber-900/15',
              iconBg: 'bg-amber-100 dark:bg-amber-900/30',
              alert: stats.followUp > 0,
            },
            {
              label: 'New This Month',
              value: stats.newThisMonth,
              icon: 'person_add',
              color: 'text-violet-600 dark:text-violet-400',
              bg: 'bg-violet-50 dark:bg-violet-900/15',
              iconBg: 'bg-violet-100 dark:bg-violet-900/30',
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`${s.bg} rounded-2xl p-4 border border-white/60 dark:border-white/5 shadow-sm flex items-center gap-4`}
            >
              <div className={`${s.iconBg} p-2.5 rounded-xl shrink-0`}>
                <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{s.label}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  {(s as any).alert && s.value > 0 && (
                    <span className="text-[10px] font-bold text-amber-500 animate-pulse">!</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTER + SEARCH BAR ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm">

          {/* Tab bar */}
          <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-[#1e3438]">
            {tabs.map(tab => {
              const isActive = filterTab === tab.key;
              const isAlert = tab.key === 'needs-followup' && tab.count > 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all flex-1 justify-center
                    ${isActive
                      ? isAlert
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md'
                      : isAlert
                        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a2c2f]'
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`
                      text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                      ${isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-white'
                        : isAlert
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-[#1e3438] text-slate-500 dark:text-slate-400'
                      }
                    `}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + sort row */}
          <div className="flex items-center gap-3 p-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full bg-slate-50 dark:bg-[#1a2c2f] rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-100 dark:border-[#224449] focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#224449] text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#1a2c2f] transition-colors whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base text-slate-400">sort</span>
                {sortLabels[sortBy]}
                <span className="material-symbols-outlined text-sm text-slate-400">expand_more</span>
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#102023] rounded-xl border border-slate-100 dark:border-[#1e3438] shadow-xl z-20 min-w-[160px] overflow-hidden">
                    {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                        className={`
                          w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                          ${sortBy === key
                            ? 'text-primary font-semibold bg-primary/5'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a2c2f]'
                          }
                        `}
                      >
                        {sortBy === key && <span className="material-symbols-outlined text-sm text-primary">check</span>}
                        <span className={sortBy !== key ? 'ml-5' : ''}>{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── ERROR ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/30 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* ── NEEDS FOLLOW-UP ALERT BANNER ─────────────────────────────────── */}
        {filterTab === 'all' && stats.followUp > 0 && (
          <div
            className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
            onClick={() => setFilterTab('needs-followup')}
          >
            <span className="material-symbols-outlined text-amber-500">schedule</span>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex-1">
              {stats.followUp} patient{stats.followUp > 1 ? 's' : ''} haven't visited in over 3 months —
              <span className="underline ml-1 cursor-pointer">review them</span>
            </p>
            <span className="material-symbols-outlined text-amber-400 text-sm">chevron_right</span>
          </div>
        )}

        {/* ── PATIENT TABLE ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_130px_160px_100px] gap-4 px-5 py-3 bg-slate-50 dark:bg-[#1a2c2f] border-b border-slate-100 dark:border-[#1e3438]">
            {['Patient', 'Last Visit', 'Contact', 'Status', 'Actions'].map(h => (
              <p key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {/* Table body */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading patients...</p>
            </div>
          ) : processed.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="size-14 rounded-2xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 text-2xl">
                  {filterTab === 'needs-followup' ? 'check_circle' : 'person_search'}
                </span>
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
                {filterTab === 'needs-followup' ? 'All patients are up to date' :
                 filterTab === 'new' ? 'No new patients this month' :
                 search ? `No results for "${search}"` : 'No patients found'}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-[#1a2c2f]">
              {processed.map((patient, idx) => {
                const days = patient.daysSinceLastVisit ?? 9999;
                const isOverdue = days > 90 && days !== 9999;
                const isDueSoon = days > 60 && days <= 90;
                const rowHighlight = isOverdue
                  ? 'hover:bg-amber-50/50 dark:hover:bg-amber-900/5'
                  : 'hover:bg-slate-50/80 dark:hover:bg-[#1a2c2f]/60';

                return (
                  <div
                    key={patient._id}
                    className={`grid grid-cols-[1fr_140px_130px_160px_100px] gap-4 items-center px-5 py-3.5 transition-colors cursor-pointer group ${rowHighlight}
                      ${idx === processed.length - 1 ? 'rounded-b-2xl' : ''}
                    `}
                    onClick={() => navigate(`/patients/${patient._id}`)}
                  >
                    {/* Patient column */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <PatientAvatar patient={patient} size="md" />
                        {patient.isNewPatient && (
                          <span className="absolute -top-1 -right-1 text-[8px] font-black bg-violet-500 text-white rounded-full px-1 leading-4">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-primary transition-colors truncate">
                          {patient.name || 'Unknown Patient'}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-slate-400 text-xs">mail</span>
                          <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {patient.email || 'No email'}
                          </p>
                        </div>
                        {/* Condition tags */}
                        {patient.conditionTags && patient.conditionTags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {patient.conditionTags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 dark:bg-[#1e3438] text-slate-500 dark:text-slate-400 rounded">
                                {tag}
                              </span>
                            ))}
                            {patient.conditionTags.length > 2 && (
                              <span className="text-[10px] text-slate-400">+{patient.conditionTags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Last Visit column */}
                    <div>
                      <p className={`text-sm font-semibold ${
                        isOverdue  ? 'text-amber-600 dark:text-amber-400' :
                        days === 9999 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {formatRelativeDate(patient.lastVisitDate)}
                      </p>
                      {patient.lastDiagnosis && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[130px] mt-0.5">
                          {patient.lastDiagnosis}
                        </p>
                      )}
                      {(isOverdue || isDueSoon) && <FollowUpBadge days={days} />}
                    </div>

                    {/* Contact column */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-slate-400 text-xs">phone</span>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {patient.phoneNumber || '—'}
                        </p>
                      </div>
                      <p className={`text-[11px] mt-0.5 font-medium capitalize px-2 py-0.5 rounded-full w-fit ${
                        patient.gender === 'male'
                          ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'
                          : patient.gender === 'female'
                            ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400'
                            : 'text-slate-400 pl-0'
                      }`}>
                        {patient.gender || 'Not specified'}
                      </p>
                    </div>

                    {/* Status column */}
                    <div className="flex flex-col gap-1">
                      {days === 9999 ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1e3438] text-slate-500 w-fit">
                          No visits
                        </span>
                      ) : days <= 30 ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 w-fit">
                          Active
                        </span>
                      ) : days <= 90 ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 w-fit">
                          Regular
                        </span>
                      ) : days <= 180 ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 w-fit">
                          Inactive
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 w-fit">
                          Lost
                        </span>
                      )}
                      {patient.totalVisits != null && patient.totalVisits > 0 && (
                        <p className="text-[10px] text-slate-400 pl-1">
                          {patient.totalVisits} visit{patient.totalVisits !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Actions column */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/patients/${patient._id}`); }}
                        className="size-8 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        title="View profile"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/messages?patient=${patient._id}`); }}
                        className="size-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1e3438] hover:bg-slate-200 dark:hover:bg-[#224449] text-slate-500 dark:text-slate-400 transition-colors"
                        title="Send message"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && processed.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-[#1e3438] rounded-b-2xl">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-600 dark:text-slate-300">{processed.length}</span>
                {' '}of <span className="font-semibold text-slate-600 dark:text-slate-300">{patients.length}</span> patients
                {filterTab !== 'all' && (
                  <button
                    onClick={() => setFilterTab('all')}
                    className="ml-2 text-primary hover:underline"
                  >
                    Show all
                  </button>
                )}
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span className="size-2 rounded-full bg-emerald-400 inline-block" /> Active
                <span className="size-2 rounded-full bg-amber-400 inline-block ml-3" /> Inactive
                <span className="size-2 rounded-full bg-red-400 inline-block ml-3" /> Lost
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Patients;