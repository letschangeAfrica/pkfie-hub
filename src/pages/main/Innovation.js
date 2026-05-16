import { useRef, useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import innovationVideo from '../../images/innovation.mp4';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiPlus, FiUsers, FiZap, FiCode, FiExternalLink,
  FiClock, FiAward, FiCheckCircle, FiAlertCircle,
  FiX, FiBox, FiBookOpen, FiTrendingUp, FiSearch, FiStar,
  FiCalendar, FiArrowUpRight,
} from 'react-icons/fi';

/* ─── constants ─────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'projects',   label: 'Projects',              icon: FiZap      },
  { id: 'challenges', label: 'Innovation Challenges', icon: FiAward    },
  { id: 'resources',  label: 'Resources',             icon: FiBookOpen },
  { id: 'community',  label: 'Community',             icon: FiUsers    },
];

const STATUS_META = {
  planning:      { label: 'Planning',    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'         },
  'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed:     { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

const DEFAULT_FORM = {
  title: '', description: '', category: '', team: '',
  status: 'planning', image: null, code_link: '', details_link: '',
};

const inputCls = `w-full px-4 py-3 rounded-xl text-sm
  bg-slate-50 dark:bg-navy-800
  border border-slate-200 dark:border-navy-700/50
  text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-navy-500
  focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/15
  transition-all`;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/* ─── helpers ───────────────────────────────────────────────────────────── */

const formatDeadline = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 864e5);
  return diff;
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return null; }
};

const apiError = (err, fallback) =>
  err?.response?.data?.detail ||
  err?.response?.data?.message ||
  (typeof err?.response?.data === 'string' ? err.response.data : null) ||
  err?.message ||
  fallback;

const inferResourceType = (link) => {
  if (!link) return { label: 'Resource', color: 'bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-navy-300' };
  const l = link.toLowerCase();
  if (l.includes('youtube') || l.includes('youtu.be') || l.includes('vimeo'))
    return { label: 'Video', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  if (l.includes('github') || l.includes('gitlab'))
    return { label: 'Code', color: 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-navy-300' };
  if (l.includes('docs') || l.includes('pdf') || l.includes('notion') || l.includes('confluence'))
    return { label: 'Docs', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' };
  if (l.includes('tool') || l.includes('figma') || l.includes('canva') || l.includes('miro'))
    return { label: 'Tool', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' };
  return { label: 'Article', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
};

/* ─── count-up hook ─────────────────────────────────────────────────────── */
function useCountUp(target, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    let current = 0;
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

/* ─── Stat card with count-up ───────────────────────────────────────────── */
function StatCard({ value, label, icon: Icon, color }) {
  const animated = useCountUp(value);
  return (
    <div className="flex items-center gap-5 bg-white dark:bg-navy-900 rounded-2xl p-6
      border border-slate-100 dark:border-navy-700/40">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-navy-800
        flex items-center justify-center flex-shrink-0">
        <Icon size={24} className={color} aria-hidden="true" />
      </div>
      <div>
        <p className={`text-4xl font-black ${color} leading-none tabular-nums`}>{animated}</p>
        <p className="text-sm text-slate-500 dark:text-navy-400 font-semibold mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function InnovationHub() {
  /* ── data state ── */
  const [activeTab,      setActiveTab]      = useState('projects');
  const [projects,       setProjects]       = useState([]);
  const [challenges,     setChallenges]     = useState([]);
  const [resources,      setResources]      = useState([]);
  const [communityStats, setCommunityStats] = useState({});
  const [loading,        setLoading]        = useState(false);

  /* ── ui state ── */
  const [toast,          setToast]          = useState(null);
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState(DEFAULT_FORM);
  const [formLoading,    setFormLoading]    = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);

  /* ── projects filter/sort ── */
  const [projectSearch,  setProjectSearch]  = useState('');
  const [projectFilter,  setProjectFilter]  = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [projectSort,    setProjectSort]    = useState('newest');

  /* ── challenges ── */
  const [participated,   setParticipated]   = useState(new Set());

  /* ── resources ── */
  const [resourceSearch, setResourceSearch] = useState('');

  /* ── community / join ── */
  const [showJoinModal,  setShowJoinModal]  = useState(false);
  const [joinAgreed,     setJoinAgreed]     = useState(false);
  const [joinLoading,    setJoinLoading]    = useState(false);
  const [isMember,       setIsMember]       = useState(false);

  const videoRef = useRef(null);
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'student';

  /* persist membership across refreshes */
  useEffect(() => {
    if (!currentUser?.id) return;
    if (localStorage.getItem(`ih_member_${currentUser.id}`)) setIsMember(true);
  }, [currentUser]);

  /* fetch on tab change */
  useEffect(() => {
    setLoading(true);
    const endpoints = {
      projects:   '/innovation/projects/',
      challenges: '/innovation/challenges/',
      resources:  '/innovation/resources/',
      community:  '/innovation/community/',
    };
    const setters = {
      projects:  setProjects,
      challenges: setChallenges,
      resources: setResources,
      community: setCommunityStats,
    };
    api.get(endpoints[activeTab])
      .then(res => setters[activeTab](res.data))
      .catch(err => {
        setters[activeTab](activeTab === 'community' ? {} : []);
        showToast(apiError(err, `Failed to load ${activeTab}.`), 'error');
      })
      .finally(() => setLoading(false));
  }, [activeTab, showToast]);

  /* toast auto-dismiss */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── form handlers ── */
  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      const file = files[0];
      if (file && file.size > MAX_FILE_BYTES) {
        showToast('Image must be under 5 MB.', 'error');
        e.target.value = '';
        return;
      }
      setForm(p => ({ ...p, [name]: file }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== null && v !== undefined && fd.append(k, v));
      await api.post('/innovation/projects/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setUploadProgress(0);
      showToast('Project submitted! It will appear once reviewed.');
      setActiveTab('projects');
      api.get('/innovation/projects/').then(res => setProjects(res.data));
    } catch (err) {
      showToast(apiError(err, 'Failed to submit project. Please try again.'), 'error');
      setUploadProgress(0);
    } finally {
      setFormLoading(false);
    }
  };

  /* ── challenge handlers ── */
  const handleParticipate = async (id) => {
    try {
      await api.post(`/innovation/challenges/${id}/participate/`);
      setParticipated(p => new Set([...p, id]));
      showToast('Registered! Check your email for challenge details.');
      api.get('/innovation/challenges/').then(res => setChallenges(res.data));
    } catch (err) {
      showToast(apiError(err, 'Failed to register. Please try again.'), 'error');
    }
  };

  /* ── community join handlers ── */
  const openJoinModal = () => {
    if (isMember) { showToast("You're already a community member!"); return; }
    setJoinAgreed(false);
    setShowJoinModal(true);
  };

  const handleJoinCommunity = async () => {
    if (!joinAgreed) return;
    setJoinLoading(true);
    try {
      const res = await api.post('/innovation/community/join/');
      setShowJoinModal(false);
      setIsMember(true);
      if (currentUser?.id) localStorage.setItem(`ih_member_${currentUser.id}`, '1');
      if (res.data?.already_member) {
        showToast("You're already a community member!");
      } else {
        showToast('Welcome! A congratulations email has been sent to your inbox.');
      }
      api.get('/innovation/community/').then(r => setCommunityStats(r.data));
    } catch (err) {
      showToast(apiError(err, 'Failed to join. Please try again.'), 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  /* ── derived data ── */
  const categories = [...new Set(projects.map(p => p.category).filter(Boolean))].sort();

  const filteredProjects = projects
    .filter(p => {
      const q = projectSearch.toLowerCase();
      const matchSearch = !q ||
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.team?.toLowerCase().includes(q);
      const matchFilter =
        projectFilter === 'all'      ? true :
        projectFilter === 'featured' ? !!p.is_featured :
        p.status === projectFilter;
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchFilter && matchCategory;
    })
    .sort((a, b) => {
      if (projectSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (projectSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      return a.title?.localeCompare(b.title);
    });

  const filteredResources = resources.filter(r => {
    const q = resourceSearch.toLowerCase();
    return !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
  });

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="bg-slate-50 dark:bg-navy-950 min-h-full">

      {/* ── Toast ── */}
      {toast && (
        <div
          role="alert"
          className={[
            'fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl',
            'text-sm font-semibold shadow-xl border max-w-sm',
            toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
          ].join(' ')}
        >
          {toast.type === 'error'
            ? <FiAlertCircle size={17} className="flex-shrink-0" aria-hidden="true" />
            : <FiCheckCircle size={17} className="flex-shrink-0" aria-hidden="true" />
          }
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss"
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
            <FiX size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Project detail modal ── */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4
            bg-navy-950/85 backdrop-blur-sm"
          onClick={() => setSelectedProject(null)}
          role="dialog" aria-modal="true" aria-label="Project details"
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-navy-900 rounded-3xl overflow-hidden
              border border-slate-200 dark:border-navy-700/40
              shadow-[0_32px_80px_rgba(0,0,0,.6)] max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} />

            {/* Image or placeholder */}
            <div className="relative h-52 bg-slate-100 dark:bg-navy-800 flex-shrink-0 overflow-hidden">
              {selectedProject.image_url || selectedProject.image ? (
                <img
                  src={selectedProject.image_url || selectedProject.image}
                  alt={selectedProject.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiBox size={40} className="text-slate-300 dark:text-navy-700" aria-hidden="true" />
                </div>
              )}
              {/* Overlay badges */}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                {selectedProject.category && (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-black
                    bg-navy-900/70 text-gold backdrop-blur-sm">
                    {selectedProject.category}
                  </span>
                )}
                {selectedProject.is_featured && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg
                    text-[11px] font-black bg-gold text-navy-900">
                    <FiStar size={9} aria-hidden="true" /> Featured
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center
                  bg-navy-900/60 text-white hover:bg-navy-900/90 transition-colors backdrop-blur-sm"
              >
                <FiX size={15} aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-wrap items-start gap-3 mb-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex-1 leading-tight">
                  {selectedProject.title}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-black flex-shrink-0
                  ${STATUS_META[selectedProject.status]?.color || ''}`}>
                  {STATUS_META[selectedProject.status]?.label || selectedProject.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 mb-5 text-xs text-slate-500 dark:text-navy-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <FiUsers size={12} aria-hidden="true" />
                  {selectedProject.team}
                </span>
                {selectedProject.created_at && (
                  <span className="flex items-center gap-1.5 font-semibold">
                    <FiCalendar size={12} aria-hidden="true" />
                    Submitted {formatDate(selectedProject.created_at)}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 dark:text-navy-300 leading-relaxed mb-6">
                {selectedProject.description}
              </p>

              {(selectedProject.details_link || selectedProject.code_link) && (
                <div className="flex flex-wrap gap-3">
                  {selectedProject.details_link && (
                    <a
                      href={selectedProject.details_link}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-navy-900
                        transition-all hover:-translate-y-px"
                      style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                    >
                      <FiArrowUpRight size={14} aria-hidden="true" />
                      View Demo
                    </a>
                  )}
                  {selectedProject.code_link && (
                    <a
                      href={selectedProject.code_link}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm
                        text-slate-700 dark:text-navy-200
                        border border-slate-200 dark:border-navy-700/40
                        hover:border-gold/40 hover:text-gold transition-all"
                    >
                      <FiCode size={14} aria-hidden="true" />
                      View Code
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Project submission modal ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4
            bg-navy-950/80 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
          role="dialog" aria-modal="true" aria-label="Submit new project"
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-navy-900 rounded-3xl overflow-hidden
              border border-slate-200 dark:border-navy-700/40 shadow-[0_32px_80px_rgba(0,0,0,.5)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-700/40">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Submit a New Project</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white
                  hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                <FiX size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {[
                { name: 'title',        placeholder: 'Project Title',                        required: true },
                { name: 'category',     placeholder: 'Category (e.g. AI, Web, Mobile)',      required: true },
                { name: 'team',         placeholder: 'Team Name',                            required: true },
                { name: 'code_link',    placeholder: 'Code / Repo Link (optional)',          type: 'url'    },
                { name: 'details_link', placeholder: 'Demo / Details Link (optional)',       type: 'url'    },
              ].map(({ name, placeholder, required, type = 'text' }) => (
                <input key={name} name={name} type={type} placeholder={placeholder}
                  value={form[name]} onChange={handleFormChange} required={required}
                  className={inputCls} />
              ))}

              <textarea
                name="description"
                placeholder="Describe your project — what it does, why it matters, how it works…"
                value={form.description} onChange={handleFormChange}
                required rows={3} className={inputCls + ' resize-none'}
              />

              <select name="status" value={form.status} onChange={handleFormChange}
                required className={inputCls}>
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5">
                  Project Image — optional, max 5 MB
                </label>
                <input name="image" type="file" accept="image/*" onChange={handleFormChange}
                  className="w-full text-sm text-slate-600 dark:text-navy-300
                    file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:text-xs file:font-bold file:bg-gold file:text-navy-900
                    hover:file:bg-gold/80 transition-all" />
              </div>

              {formLoading && uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-navy-400 mb-1">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#FFD700,#FFEE55)' }} />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading}
                  className="flex-1 h-11 rounded-xl font-black text-sm text-navy-900
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-px
                    flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}>
                  {formLoading
                    ? <><span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" /> Submitting…</>
                    : 'Submit Project'
                  }
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 h-11 rounded-xl font-black text-sm
                    text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700/40
                    hover:bg-slate-50 dark:hover:bg-navy-800 transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Join Community T&C Modal ── */}
      {showJoinModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4
            bg-navy-950/80 backdrop-blur-sm"
          onClick={() => setShowJoinModal(false)}
          role="dialog" aria-modal="true" aria-label="Community terms and conditions"
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-navy-900 rounded-3xl overflow-hidden
              border border-slate-200 dark:border-navy-700/40 shadow-[0_32px_80px_rgba(0,0,0,.5)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} />

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-700/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
                  <FiUsers size={17} className="text-gold" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Join the Innovation Community
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-navy-500">Please read the terms before joining</p>
                </div>
              </div>
              <button onClick={() => setShowJoinModal(false)} aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white
                  hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                <FiX size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="px-6 pt-5 pb-2 max-h-64 overflow-y-auto space-y-4 text-sm
              text-slate-600 dark:text-navy-300 leading-relaxed">
              {[
                ['1. Purpose & Eligibility', 'The PKFokam Innovation Hub Community is open to all registered PKFokam students, faculty, and staff. By joining you confirm that you are an active member of the PKFokam academic community.'],
                ['2. Respectful Collaboration', 'Members are expected to engage respectfully, constructively, and inclusively. Harassment, discrimination, or any form of misconduct will result in immediate removal from the community.'],
                ['3. Intellectual Property', 'You retain ownership of any project or idea you submit. By showcasing your work on this platform, you grant PKFokam a non-exclusive licence to feature it in promotional, academic, or community materials with proper attribution.'],
                ['4. Originality & Integrity', 'All projects and submissions must be your own original work or clearly acknowledge all collaborators and sources. Plagiarism or misrepresentation will lead to disqualification and disciplinary action.'],
                ['5. Community Activities', 'As a member you may be invited to workshops, hackathons, and innovation fairs. Participation is voluntary. PKFokam reserves the right to update or cancel activities at any time.'],
                ['6. Data & Privacy', 'Your name and submitted projects may be visible to other community members. Your personal contact information will never be shared with third parties without your explicit consent.'],
                ['7. Changes to Terms', 'PKFokam may update these terms at any time. Continued participation after notification of changes constitutes your acceptance of the updated terms.'],
              ].map(([title, body]) => (
                <div key={title}>
                  <p className="font-black text-slate-800 dark:text-white mb-1">{title}</p>
                  <p>{body}</p>
                </div>
              ))}
            </div>

            <div className="px-6 py-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input type="checkbox" checked={joinAgreed}
                    onChange={e => setJoinAgreed(e.target.checked)} className="sr-only" />
                  <div className={[
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                    joinAgreed
                      ? 'bg-gold border-gold'
                      : 'border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 group-hover:border-gold/60',
                  ].join(' ')}>
                    {joinAgreed && (
                      <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3" aria-hidden="true">
                        <path d="M1 5l3.5 3.5L11 1" stroke="#001F5B" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-700 dark:text-navy-200 leading-snug">
                  I have read and agree to the{' '}
                  <span className="font-bold text-gold">Community Terms & Conditions</span>.
                  I understand that a congratulations email will be sent to my registered address.
                </span>
              </label>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={handleJoinCommunity} disabled={!joinAgreed || joinLoading}
                className="flex-1 h-11 rounded-xl font-black text-sm text-navy-900
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-px
                  flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}>
                {joinLoading
                  ? <><span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" /> Joining…</>
                  : <><FiUsers size={14} aria-hidden="true" /> Join Now</>
                }
              </button>
              <button type="button" onClick={() => setShowJoinModal(false)}
                className="flex-1 h-11 rounded-xl font-black text-sm
                  text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700/40
                  hover:bg-slate-50 dark:hover:bg-navy-800 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ HERO ════════════════ */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #000D2E 0%, #001F5B 60%, #001840 100%)' }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%),
              repeating-linear-gradient(-45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%)`,
            backgroundSize: '32px 32px',
          }} />

        <div className="relative max-w-6xl mx-auto px-6 py-14 lg:py-16 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
              border border-gold/25 bg-gold/8 text-[11px] font-black tracking-widest uppercase text-gold mb-5">
              <FiZap size={11} aria-hidden="true" />
              Innovation Hub
            </span>
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
              Transform Your{' '}
              <span className="text-gold">Ideas Into</span>{' '}
              Reality
            </h1>
            <p className="text-white/60 text-base leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Showcase projects, collaborate with peers, and bring innovative ideas to life.
              Your space to create, compete, and inspire.
            </p>
            {isStudent && (
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <button
                  onClick={() => { setForm(DEFAULT_FORM); setShowForm(true); }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-navy-900
                    transition-all hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  <FiPlus size={15} aria-hidden="true" />
                  Submit Project
                </button>
                <button
                  onClick={openJoinModal}
                  disabled={isMember}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white
                    border border-white/20 hover:bg-white/10 transition-all hover:-translate-y-0.5
                    disabled:opacity-70 disabled:cursor-default"
                >
                  {isMember
                    ? <><FiCheckCircle size={15} aria-hidden="true" /> You're a Member</>
                    : <><FiUsers size={15} aria-hidden="true" /> Join Community</>
                  }
                </button>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 w-full lg:w-auto max-w-md lg:max-w-none">
            <div className="relative rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 24px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(255,215,0,.1)' }}>
              <video ref={videoRef} src={innovationVideo} autoPlay loop muted playsInline
                aria-label="Innovation hub showcase video"
                className="w-full lg:w-[440px] object-cover" />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,13,46,.6) 0%, transparent 60%)' }}
                aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════ TAB BAR ════════════════ */}
      <div className="sticky top-0 z-10 bg-white dark:bg-navy-900
        border-b border-slate-200 dark:border-navy-700/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-thin">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                className={[
                  'flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-all',
                  activeTab === id
                    ? 'border-gold text-gold'
                    : 'border-transparent text-slate-500 dark:text-navy-400 hover:text-slate-800 dark:hover:text-white',
                ].join(' ')}>
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════ TAB CONTENT ════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Loading skeleton */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-navy-900 rounded-2xl overflow-hidden
                border border-slate-100 dark:border-navy-700/40">
                <div className="h-44 bg-slate-100 dark:bg-navy-800 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-100 dark:bg-navy-800 rounded-lg animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-100 dark:bg-navy-800 rounded-lg animate-pulse" />
                  <div className="h-4 bg-slate-100 dark:bg-navy-800 rounded-lg animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ PROJECTS ══════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'projects' && (
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
              <div className="flex-1">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Student Projects</h2>
                <p className="text-xs text-slate-400 dark:text-navy-500 mt-0.5">
                  {projects.length} total · {projects.filter(p => p.is_featured).length} featured
                  {filteredProjects.length !== projects.length && ` · ${filteredProjects.length} shown`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Sort */}
                <select
                  value={projectSort}
                  onChange={e => setProjectSort(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold
                    bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/40
                    text-slate-700 dark:text-navy-200 focus:outline-none focus:border-gold/60 transition-all"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">A → Z</option>
                </select>
                {isStudent && (
                  <button
                    onClick={() => { setForm(DEFAULT_FORM); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black
                      text-navy-900 transition-all hover:-translate-y-px whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}>
                    <FiPlus size={14} aria-hidden="true" />
                    Submit
                  </button>
                )}
              </div>
            </div>

            {/* Search + status filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <FiSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search by title, category, team…"
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
                    bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/40
                    text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-navy-500
                    focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/15 transition-all"
                />
              </div>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold
                  bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/40
                  text-slate-700 dark:text-navy-200 focus:outline-none focus:border-gold/60 transition-all"
              >
                <option value="all">All statuses</option>
                <option value="featured">Featured only</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="planning">Planning</option>
              </select>
            </div>

            {/* Category chip filters */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                    !categoryFilter
                      ? 'bg-gold text-navy-900'
                      : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/40 text-slate-600 dark:text-navy-300 hover:border-gold/40',
                  ].join(' ')}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(c => c === cat ? '' : cat)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                      categoryFilter === cat
                        ? 'bg-gold text-navy-900'
                        : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/40 text-slate-600 dark:text-navy-300 hover:border-gold/40',
                    ].join(' ')}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-navy-500">
                <FiBox size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="text-sm font-semibold">
                  {projects.length === 0 ? 'No projects yet.' : 'No projects match your filters.'}
                </p>
                {(projectSearch || projectFilter !== 'all' || categoryFilter) && (
                  <button
                    onClick={() => { setProjectSearch(''); setProjectFilter('all'); setCategoryFilter(''); }}
                    className="mt-3 text-xs font-bold text-gold hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map(project => (
                  <article
                    key={project.id}
                    className="group bg-white dark:bg-navy-900 rounded-2xl overflow-hidden
                      border border-slate-100 dark:border-navy-700/40
                      hover:shadow-lg dark:hover:shadow-navy-950/50 transition-all hover:-translate-y-0.5
                      cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
                    {/* Image */}
                    <div className="relative h-44 bg-slate-100 dark:bg-navy-800 overflow-hidden">
                      {project.image_url || project.image ? (
                        <img src={project.image_url || project.image} alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBox size={32} className="text-slate-300 dark:text-navy-700" aria-hidden="true" />
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/40
                        transition-all duration-300 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-all duration-300
                          flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 dark:bg-navy-900/90
                          text-xs font-black text-slate-900 dark:text-white backdrop-blur-sm
                          translate-y-2 group-hover:translate-y-0">
                          <FiArrowUpRight size={12} aria-hidden="true" />
                          View Details
                        </span>
                      </div>

                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg
                        text-[11px] font-black tracking-wide bg-navy-900/70 text-gold backdrop-blur-sm">
                        {project.category}
                      </span>
                      {project.is_featured && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg
                          text-[10px] font-black bg-gold text-navy-900">
                          <FiStar size={9} aria-hidden="true" /> Featured
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5 leading-snug">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-4 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-navy-400 font-semibold">
                          <FiUsers size={12} aria-hidden="true" />
                          {project.team}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black
                          ${STATUS_META[project.status]?.color || ''}`}>
                          {STATUS_META[project.status]?.label || project.status}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CHALLENGES ════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'challenges' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Innovation Challenges</h2>
                <p className="text-xs text-slate-400 dark:text-navy-500 mt-0.5">
                  {challenges.length} active challenge{challenges.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {challenges.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-navy-500">
                <FiAward size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="text-sm font-semibold">No active challenges at the moment.</p>
                <p className="text-xs mt-1">Check back soon — new challenges are added regularly.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {challenges.map(ch => {
                  const deadline = formatDeadline(ch.deadline);
                  const days = daysUntil(ch.deadline);
                  const isUrgent = days !== null && days >= 0 && days <= 7;
                  const isExpired = days !== null && days < 0;
                  const hasJoined = participated.has(ch.id);
                  const participantCount = ch.participants_count ?? ch.participants ?? null;

                  return (
                    <div key={ch.id}
                      className={[
                        'bg-white dark:bg-navy-900 rounded-2xl p-6',
                        'border transition-all hover:shadow-md',
                        isUrgent && !isExpired
                          ? 'border-orange-200 dark:border-orange-500/30'
                          : 'border-slate-100 dark:border-navy-700/40',
                      ].join(' ')}>

                      {/* Title + deadline */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug">
                          {ch.title}
                        </h3>
                        {deadline && (
                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            <span className={[
                              'flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg',
                              isExpired
                                ? 'bg-slate-100 text-slate-500 dark:bg-navy-800 dark:text-navy-400'
                                : isUrgent
                                ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
                            ].join(' ')}>
                              <FiClock size={11} aria-hidden="true" />
                              {deadline}
                            </span>
                            {!isExpired && days !== null && (
                              <span className={`text-[10px] font-black ${isUrgent ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-navy-500'}`}>
                                {days === 0 ? 'Ends today!' : `${days}d remaining`}
                              </span>
                            )}
                            {isExpired && (
                              <span className="text-[10px] font-black text-slate-400 dark:text-navy-500">
                                Closed
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-4">
                        {ch.description}
                      </p>

                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-gold">
                            <FiAward size={14} aria-hidden="true" />
                            {ch.prize}
                          </span>
                          {participantCount !== null && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-navy-400 font-semibold">
                              <FiUsers size={12} aria-hidden="true" />
                              {participantCount} participant{participantCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {isStudent && !isExpired && (
                          hasJoined ? (
                            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black
                              bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400
                              border border-emerald-200 dark:border-emerald-500/30">
                              <FiCheckCircle size={12} aria-hidden="true" />
                              Registered
                            </span>
                          ) : (
                            <button
                              onClick={() => handleParticipate(ch.id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black
                                text-navy-900 transition-all hover:-translate-y-0.5"
                              style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                            >
                              <FiZap size={12} aria-hidden="true" />
                              Participate
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ RESOURCES ═════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'resources' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Innovation Resources</h2>
                <p className="text-xs text-slate-400 dark:text-navy-500 mt-0.5">
                  {resources.length} resource{resources.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="relative sm:w-64">
                <FiSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search resources…"
                  value={resourceSearch}
                  onChange={e => setResourceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
                    bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/40
                    text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-navy-500
                    focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/15 transition-all"
                />
              </div>
            </div>

            {filteredResources.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-navy-500">
                <FiBookOpen size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="text-sm font-semibold">
                  {resources.length === 0 ? 'No resources available yet.' : 'No resources match your search.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredResources.map(res => {
                  const typeInfo = inferResourceType(res.link);
                  return (
                    <div key={res.id}
                      className="group bg-white dark:bg-navy-900 rounded-2xl p-6
                        border border-slate-100 dark:border-navy-700/40
                        hover:border-gold/30 hover:shadow-md transition-all flex flex-col">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-11 h-11 rounded-2xl bg-navy-100 dark:bg-navy-800
                          flex items-center justify-center flex-shrink-0">
                          <FiBookOpen size={18} className="text-navy-600 dark:text-gold" aria-hidden="true" />
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base mb-2">
                        {res.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-4 flex-1">
                        {res.description}
                      </p>
                      {res.link ? (
                        <a href={res.link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-bold text-gold hover:underline mt-auto">
                          <FiExternalLink size={13} aria-hidden="true" />
                          Explore Resource
                        </a>
                      ) : (
                        <span className="text-sm font-bold text-slate-300 dark:text-navy-600 mt-auto">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ COMMUNITY ═════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'community' && (
          <div className="space-y-6">

            {/* Member banner */}
            {isMember && (
              <div className="flex items-center gap-4 p-5 rounded-2xl
                bg-emerald-50 dark:bg-emerald-900/20
                border border-emerald-200 dark:border-emerald-500/30">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40
                  flex items-center justify-center flex-shrink-0">
                  <FiCheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-black text-emerald-800 dark:text-emerald-300 text-sm">
                    You're a Community Member
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    You have full access to all community benefits and events.
                  </p>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6 items-start">
              {/* Left: description + join */}
              <div className="bg-white dark:bg-navy-900 rounded-2xl p-8
                border border-slate-100 dark:border-navy-700/40">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                  Collaborate. Create. Innovate.
                </h2>
                <p className="text-slate-500 dark:text-navy-400 leading-relaxed mb-6">
                  Join a growing community of students transforming ideas into impactful solutions.
                  Share knowledge, find collaborators, and get feedback on your projects.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Weekly innovation workshops and hands-on sessions',
                    'Networking events with industry leaders and alumni',
                    'Access to prototyping lab equipment and resources',
                    'Opportunities to showcase at PKFokam innovation fairs',
                    'Collaboration with talented peers across all programs',
                  ].map(benefit => (
                    <li key={benefit} className="flex items-start gap-3 text-sm text-slate-700 dark:text-navy-200">
                      <FiCheckCircle size={16} className="flex-shrink-0 text-emerald-500 mt-0.5" aria-hidden="true" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                {isStudent && (
                  <button
                    onClick={openJoinModal}
                    disabled={isMember}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-navy-900
                      transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-default"
                    style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                  >
                    {isMember
                      ? <><FiCheckCircle size={15} aria-hidden="true" /> Already a Member</>
                      : <><FiUsers size={15} aria-hidden="true" /> Join Now</>
                    }
                  </button>
                )}
              </div>

              {/* Right: animated stats */}
              <div className="grid grid-cols-1 gap-4">
                <StatCard
                  value={communityStats.members ?? 0}
                  label="Community Members"
                  icon={FiUsers}
                  color="text-sky-500"
                />
                <StatCard
                  value={communityStats.active_projects ?? 0}
                  label="Active Projects"
                  icon={FiZap}
                  color="text-gold"
                />
                <StatCard
                  value={communityStats.completed_solutions ?? 0}
                  label="Completed Solutions"
                  icon={FiTrendingUp}
                  color="text-emerald-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
