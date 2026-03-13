import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRealTimeData } from '../context/RealTimeDataContext';
import { useNavigate } from 'react-router-dom';
import { Consultation } from '../types';
import { getDoctorId, API_BASE_URL, getAvatarUrl, getInitials } from '../utils/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SeverityFilter = 'all' | 'mild' | 'moderate' | 'severe' | 'critical';
type SortOption     = 'updated' | 'severity' | 'patient';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatRelative = (dateStr: string): string => {
  if (!dateStr) return '—';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const severityRank: Record<string, number> = {
  critical: 4, severe: 3, moderate: 2, mild: 1,
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
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const PatientAvatar: React.FC<{ name?: string; avatar?: string }> = ({ name, avatar }) => {
  const avatarUrl  = getAvatarUrl(avatar);
  const hasAvatar  = avatar && avatar !== 'undefined' && avatar !== 'null' && avatar.trim() !== '';
  const initials   = getInitials(name);

  return (
    <div className="size-10 rounded-xl overflow-hidden shrink-0">
      {hasAvatar ? (
        <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url('${avatarUrl}')` }} />
      ) : (
        <div className={`size-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(name || '')}`}>
          <span className="text-sm font-bold">{initials}</span>
        </div>
      )}
    </div>
  );
};

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const map: Record<string, { color: string; bg: string; dot: string }> = {
    mild:     { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20',   dot: 'bg-emerald-400' },
    moderate: { color: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-50 dark:bg-amber-900/20',       dot: 'bg-amber-400' },
    severe:   { color: 'text-orange-700 dark:text-orange-300',   bg: 'bg-orange-50 dark:bg-orange-900/20',     dot: 'bg-orange-500' },
    critical: { color: 'text-red-700 dark:text-red-300',         bg: 'bg-red-50 dark:bg-red-900/20',           dot: 'bg-red-500 animate-pulse' },
  };
  const s = map[severity?.toLowerCase()] ?? map['mild'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${s.color} ${s.bg}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'Unknown'}
    </span>
  );
};

const ConsultationStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; bg: string }> = {
    active:      { color: 'text-sky-700 dark:text-sky-300',     bg: 'bg-sky-50 dark:bg-sky-900/20' },
    'in-progress':{ color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    completed:   { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    resolved:    { color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/60' },
  };
  const s = map[status?.toLowerCase()] ?? { color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/40' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${s.color} ${s.bg}`}>
      {status || 'Unknown'}
    </span>
  );
};

const TreatmentProgress: React.FC<{ consultation: Consultation }> = ({ consultation }) => {
  const plan   = consultation.treatment_plan || [];
  const total  = plan.length;
  if (total === 0) return <span className="text-xs text-slate-400">No plan</span>;

  const done   = plan.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const pct    = Math.round((done / total) * 100);
  const current = plan.find(s => s.status !== 'completed' && s.status !== 'approved');

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Step {done } / {total}
        </span>
        <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-[#224449] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {current?.title && (
        <p className="text-[10px] text-slate-400 truncate max-w-[160px]">↳ {current.title}</p>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const Consultations: React.FC = () => {
  const { notifications, messages } = useRealTimeData() || { notifications: [], messages: [] };
  const navigate  = useNavigate();
  const doctorId  = getDoctorId();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading]             = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sortBy, setSortBy]               = useState<SortOption>('updated');
  const [showSortMenu, setShowSortMenu]   = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────────

  const fetchConsultations = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res   = await fetch(`${API_BASE_URL}/doctors/${doctorId}/consultations`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data  = await res.json();
      if (data.success) setConsultations(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => { fetchConsultations(); }, [fetchConsultations]);

  useEffect(() => {
    const hasNew =
      notifications.some((n: any) => n.type === 'consultation') ||
      messages.some((m: any) => m.type === 'consultation');
    if (hasNew) fetchConsultations();
  }, [notifications, messages, fetchConsultations]);

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    return {
      total:    consultations.length,
      active:   consultations.filter(c => c.status === 'active' || c.consultation_status === 'active').length,
      critical: consultations.filter(c => c.severity === 'critical' || c.severity === 'severe').length,
      doneThisMonth: consultations.filter(c => {
        const d = new Date(c.updated_at);
        return (c.status === 'completed' || c.consultation_status === 'completed') &&
               d.getMonth() === month && d.getFullYear() === year;
      }).length,
    };
  }, [consultations]);

  // ─── Filter + Sort ────────────────────────────────────────────────────────────

  const processed = useMemo(() => {
    let list = consultations.filter(c => {
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        (c.user_id?.name || '').toLowerCase().includes(q) ||
        (c.diagnosis     || '').toLowerCase().includes(q)
      );
    });

    if (severityFilter !== 'all') {
      list = list.filter(c => c.severity?.toLowerCase() === severityFilter);
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'patient')  return (a.user_id?.name || '').localeCompare(b.user_id?.name || '');
      if (sortBy === 'severity') return (severityRank[b.severity?.toLowerCase()] ?? 0) - (severityRank[a.severity?.toLowerCase()] ?? 0);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [consultations, searchQuery, severityFilter, sortBy]);

  // ─── Severity counts for tabs ────────────────────────────────────────────────

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: consultations.length, mild: 0, moderate: 0, severe: 0, critical: 0 };
    consultations.forEach(c => {
      const s = c.severity?.toLowerCase();
      if (s && s in counts) counts[s]++;
    });
    return counts;
  }, [consultations]);

  const severityTabs: { key: SeverityFilter; label: string; urgent?: boolean }[] = [
    { key: 'all',      label: 'All' },
    { key: 'mild',     label: 'Mild' },
    { key: 'moderate', label: 'Moderate' },
    { key: 'severe',   label: 'Severe',   urgent: true },
    { key: 'critical', label: 'Critical', urgent: true },
  ];

  const sortLabels: Record<SortOption, string> = {
    updated:  'Last Updated',
    severity: 'Severity',
    patient:  'Patient Name',
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1619]">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Consultations</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* ── STATS ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label:   'Total Cases',
              value:   stats.total,
              icon:    'folder_open',
              color:   'text-primary',
              bg:      'bg-primary/8 dark:bg-primary/10',
              iconBg:  'bg-primary/10 dark:bg-primary/15',
            },
            {
              label:   'Active',
              value:   stats.active,
              icon:    'stethoscope',
              color:   'text-sky-600 dark:text-sky-400',
              bg:      'bg-sky-50 dark:bg-sky-900/15',
              iconBg:  'bg-sky-100 dark:bg-sky-900/30',
            },
            {
              label:   'Severe / Critical',
              value:   stats.critical,
              icon:    'priority_high',
              color:   'text-red-600 dark:text-red-400',
              bg:      'bg-red-50 dark:bg-red-900/15',
              iconBg:  'bg-red-100 dark:bg-red-900/30',
              alert:   stats.critical > 0,
            },
            {
              label:   'Resolved This Month',
              value:   stats.doneThisMonth,
              icon:    'task_alt',
              color:   'text-emerald-600 dark:text-emerald-400',
              bg:      'bg-emerald-50 dark:bg-emerald-900/15',
              iconBg:  'bg-emerald-100 dark:bg-emerald-900/30',
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
                    <span className="text-[10px] font-black text-red-500 animate-pulse">!</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── CRITICAL ALERT BANNER ────────────────────────────────────────── */}
        {stats.critical > 0 && severityFilter === 'all' && (
          <div
            className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            onClick={() => setSeverityFilter('critical')}
          >
            <span className="material-symbols-outlined text-red-500 text-lg">priority_high</span>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex-1">
              {stats.critical} severe or critical case{stats.critical > 1 ? 's' : ''} require your attention —
              <span className="underline ml-1">review now</span>
            </p>
            <div className="size-2 rounded-full bg-red-500 animate-ping" />
          </div>
        )}

        {/* ── FILTER + SEARCH BAR ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm">

          {/* Severity tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-[#1e3438]">
            {severityTabs.map(tab => {
              const isActive  = severityFilter === tab.key;
              const count     = severityCounts[tab.key] ?? 0;
              const isUrgent  = tab.urgent && count > 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSeverityFilter(tab.key)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all flex-1 justify-center
                    ${isActive
                      ? isUrgent
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                        : 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md'
                      : isUrgent
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a2c2f]'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count > 0 && (
                    <span className={`
                      text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                      ${isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-white'
                        : isUrgent
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 dark:bg-[#1e3438] text-slate-500 dark:text-slate-400'
                      }
                    `}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-3 p-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by patient name or diagnosis..."
                className="w-full bg-slate-50 dark:bg-[#1a2c2f] rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-100 dark:border-[#224449] focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
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

        {/* ── CONSULTATION LIST ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#102023] rounded-2xl border border-slate-100 dark:border-[#1e3438] shadow-sm overflow-hidden">

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_160px_120px_120px_180px_100px_80px] gap-4 px-5 py-3 bg-slate-50 dark:bg-[#1a2c2f] border-b border-slate-100 dark:border-[#1e3438]">
            {['Patient', 'Diagnosis', 'Severity', 'Status', 'Treatment', 'Updated', ''].map(h => (
              <p key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="size-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading consultations...</p>
            </div>
          ) : processed.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
              <div className="size-14 rounded-2xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 text-2xl">
                  {severityFilter !== 'all' ? 'check_circle' : 'folder_open'}
                </span>
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : severityFilter !== 'all'
                    ? `No ${severityFilter} cases`
                    : 'No consultations yet'}
              </p>
              {(searchQuery || severityFilter !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setSeverityFilter('all'); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-[#1a2c2f]">
              {processed.map((item, idx) => {
                const isCritical = item.severity === 'critical';
                const isSevere   = item.severity === 'severe';
                const rowBg      = isCritical
                  ? 'hover:bg-red-50/40 dark:hover:bg-red-900/5'
                  : isSevere
                    ? 'hover:bg-orange-50/40 dark:hover:bg-orange-900/5'
                    : 'hover:bg-slate-50/80 dark:hover:bg-[#1a2c2f]/60';

                // Extract medication from initialStep
                const medication = item.treatment_plan?.[0]?.medication ||
                                   (item as any).initialStep?.medication || '';

                return (
                  <div
                    key={item._id}
                    onClick={() => navigate(`/consultations/${item._id}`)}
                    className={`
                      grid grid-cols-1 md:grid-cols-[1fr_160px_120px_120px_180px_100px_80px]
                      gap-4 items-center px-5 py-4 transition-colors cursor-pointer group
                      ${rowBg}
                      ${idx === processed.length - 1 ? 'rounded-b-2xl' : ''}
                      ${isCritical ? 'border-l-2 border-red-400 dark:border-red-500' : ''}
                    `}
                  >
                    {/* Patient */}
                    <div className="flex items-center gap-3 min-w-0">
                      <PatientAvatar
                        name={item.user_id?.name}
                        avatar={item.user_id?.avatar}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-primary transition-colors truncate">
                          {item.user_id?.name || 'Unknown Patient'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {item.diagnosis || '—'}
                      </p>
                      {medication && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">medication</span>
                          {medication}
                        </p>
                      )}
                    </div>

                    {/* Severity */}
                    <div>
                      <SeverityBadge severity={item.severity || 'mild'} />
                    </div>

                    {/* Status */}
                    <div>
                      <ConsultationStatusBadge status={item.consultation_status || item.status || 'active'} />
                    </div>

                    {/* Treatment progress */}
                    <div>
                      <TreatmentProgress consultation={item} />
                    </div>

                    {/* Last updated */}
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {formatRelative(item.updated_at)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/consultations/${item._id}`); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                      >
                        Open
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
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
                Showing{' '}
                <span className="font-semibold text-slate-600 dark:text-slate-300">{processed.length}</span>
                {' '}of{' '}
                <span className="font-semibold text-slate-600 dark:text-slate-300">{consultations.length}</span>
                {' '}consultations
                {(searchQuery || severityFilter !== 'all') && (
                  <button
                    onClick={() => { setSearchQuery(''); setSeverityFilter('all'); }}
                    className="ml-2 text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-400 inline-block" /> Mild
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-400 inline-block" /> Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-orange-500 inline-block" /> Severe
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-red-500 inline-block animate-pulse" /> Critical
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Consultations;