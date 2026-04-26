import { useRef, useState, useEffect } from 'react';
import api from '../../services/api';
import innovationVideo from '../../images/innovation.mp4';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiPlus, FiUsers, FiZap, FiCode, FiExternalLink,
  FiClock, FiAward, FiCheckCircle, FiAlertCircle,
  FiX, FiBox, FiBookOpen, FiTrendingUp,
} from 'react-icons/fi';

const TABS = [
  { id: 'projects',   label: 'Featured Projects',       icon: FiZap      },
  { id: 'challenges', label: 'Innovation Challenges',   icon: FiAward    },
  { id: 'resources',  label: 'Resources',               icon: FiBookOpen },
  { id: 'community',  label: 'Community',               icon: FiUsers    },
];

const STATUS_META = {
  planning:     { label: 'Planning',     color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'       },
  'in-progress':{ label: 'In Progress',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'},
  completed:    { label: 'Completed',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
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

export default function InnovationHub() {
  const [activeTab,      setActiveTab]      = useState('projects');
  const [projects,       setProjects]       = useState([]);
  const [challenges,     setChallenges]     = useState([]);
  const [resources,      setResources]      = useState([]);
  const [communityStats, setCommunityStats] = useState({});
  const [loading,        setLoading]        = useState(false);
  const [toast,          setToast]          = useState(null);  // { msg, type }
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState(DEFAULT_FORM);
  const [formLoading,    setFormLoading]    = useState(false);

  const videoRef = useRef(null);
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'student';

  /* fetch on tab change */
  useEffect(() => {
    setLoading(true);
    const endpoints = {
      projects:   '/innovation/projects/',
      challenges: '/innovation/challenges/',
      resources:  '/innovation/resources/',
      community:  '/innovation/community/',
    };
    const setters = { projects: setProjects, challenges: setChallenges, resources: setResources, community: setCommunityStats };
    api.get(endpoints[activeTab])
      .then(res => setters[activeTab](res.data))
      .catch(() => setters[activeTab](activeTab === 'community' ? {} : []))
      .finally(() => setLoading(false));
  }, [activeTab]);

  /* toast auto-dismiss */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    setForm(p => files ? { ...p, [name]: files[0] } : { ...p, [name]: value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== null && v !== undefined && fd.append(k, v));
      await api.post('/innovation/projects/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      showToast('Project submitted successfully!');
      setActiveTab('projects');
      api.get('/innovation/projects/').then(res => setProjects(res.data));
    } catch {
      showToast('Failed to submit project. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleParticipate = async (id) => {
    try {
      await api.post(`/innovation/challenges/${id}/participate/`);
      showToast('Participation registered! Watch your email for updates.');
      api.get('/innovation/challenges/').then(res => setChallenges(res.data));
    } catch {
      showToast('Failed to participate. Please try again.', 'error');
    }
  };

  const handleJoinCommunity = async () => {
    try {
      await api.post('/innovation/community/join/');
      showToast('Welcome to the community! Check your email for next steps.');
      api.get('/innovation/community/').then(res => setCommunityStats(res.data));
    } catch {
      showToast('Failed to join. Please try again.', 'error');
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-navy-950 min-h-full">

      {/* ── Toast ── */}
      {toast && (
        <div
          role="alert"
          className={[
            'fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl',
            'text-sm font-semibold shadow-lg border animate-fade-up',
            toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
          ].join(' ')}
        >
          {toast.type === 'error'
            ? <FiAlertCircle size={17} aria-hidden="true" />
            : <FiCheckCircle size={17} aria-hidden="true" />
          }
          {toast.msg}
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <FiX size={14} aria-hidden="true" />
          </button>
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
              border border-slate-200 dark:border-navy-700/40
              shadow-[0_32px_80px_rgba(0,0,0,.5)] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} aria-hidden="true" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-700/40">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Submit a New Project</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                <FiX size={16} aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {[
                { name: 'title',       placeholder: 'Project Title',   required: true  },
                { name: 'category',    placeholder: 'Category',        required: true  },
                { name: 'team',        placeholder: 'Team Name',       required: true  },
                { name: 'code_link',   placeholder: 'Code Link',       type: 'url'     },
                { name: 'details_link',placeholder: 'Details Link',    type: 'url'     },
              ].map(({ name, placeholder, required, type = 'text' }) => (
                <input
                  key={name}
                  name={name}
                  type={type}
                  placeholder={placeholder}
                  value={form[name]}
                  onChange={handleFormChange}
                  required={required}
                  className={inputCls}
                />
              ))}
              <textarea
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleFormChange}
                required
                rows={3}
                className={inputCls + ' resize-none'}
              />
              <select name="status" value={form.status} onChange={handleFormChange} required className={inputCls}>
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5">
                  Project Image (optional)
                </label>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFormChange}
                  className="w-full text-sm text-slate-600 dark:text-navy-300 file:mr-3 file:py-2 file:px-4
                    file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gold file:text-navy-900
                    hover:file:bg-gold/80 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading}
                  className="flex-1 h-11 rounded-xl font-black text-sm text-navy-900
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-px"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}>
                  {formLoading ? 'Submitting…' : 'Submit Project'}
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

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #000D2E 0%, #001F5B 60%, #001840 100%)' }}
      >
        {/* Adinkra grid */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%),
              repeating-linear-gradient(-45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%)`,
            backgroundSize: '32px 32px',
          }}
        />
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
                  onClick={handleJoinCommunity}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white
                    border border-white/20 hover:bg-white/10 transition-all hover:-translate-y-0.5"
                >
                  <FiUsers size={15} aria-hidden="true" />
                  Join Community
                </button>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 w-full lg:w-auto max-w-md lg:max-w-none">
            <div className="relative rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 24px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(255,215,0,.1)' }}>
              <video
                ref={videoRef}
                src={innovationVideo}
                autoPlay loop muted playsInline
                aria-label="Innovation hub showcase video"
                className="w-full lg:w-[440px] object-cover"
              />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,13,46,.6) 0%, transparent 60%)' }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-navy-900
        border-b border-slate-200 dark:border-navy-700/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-thin">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                className={[
                  'flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap',
                  'border-b-2 transition-all',
                  activeTab === id
                    ? 'border-gold text-gold'
                    : 'border-transparent text-slate-500 dark:text-navy-400 hover:text-slate-800 dark:hover:text-white',
                ].join(' ')}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Loading skeleton */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-navy-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-navy-700/40">
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

        {/* ── Projects ── */}
        {!loading && activeTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Featured Projects</h2>
              {isStudent && (
                <button
                  onClick={() => { setForm(DEFAULT_FORM); setShowForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-navy-900
                    transition-all hover:-translate-y-px"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  <FiPlus size={14} aria-hidden="true" />
                  Submit Project
                </button>
              )}
            </div>
            {projects.filter(p => p.is_featured).length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-navy-500">
                <FiBox size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="text-sm">No featured projects yet. Be the first to submit one.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.filter(p => p.is_featured).map(project => (
                  <article key={project.id}
                    className="group bg-white dark:bg-navy-900 rounded-2xl overflow-hidden
                      border border-slate-100 dark:border-navy-700/40
                      hover:shadow-lg dark:hover:shadow-navy-950/50 transition-all hover:-translate-y-0.5">
                    {/* Image */}
                    <div className="relative h-44 bg-slate-100 dark:bg-navy-800 overflow-hidden">
                      {project.image_url || project.image ? (
                        <img
                          src={project.image_url || project.image}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBox size={32} className="text-slate-300 dark:text-navy-700" aria-hidden="true" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg
                        text-[11px] font-black tracking-wide bg-navy-900/70 text-gold backdrop-blur-sm">
                        {project.category}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5 leading-snug">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-4 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-navy-400 font-semibold">
                          <FiUsers size={12} aria-hidden="true" />
                          {project.team}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${STATUS_META[project.status]?.color || ''}`}>
                          {STATUS_META[project.status]?.label || project.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {project.details_link && (
                          <a href={project.details_link} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                              text-xs font-bold border border-slate-200 dark:border-navy-700/50
                              text-slate-600 dark:text-navy-300 hover:border-gold/40 hover:text-gold transition-all">
                            <FiExternalLink size={12} aria-hidden="true" />
                            View
                          </a>
                        )}
                        {project.code_link && (
                          <a href={project.code_link} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                              text-xs font-bold border border-slate-200 dark:border-navy-700/50
                              text-slate-600 dark:text-navy-300 hover:border-gold/40 hover:text-gold transition-all">
                            <FiCode size={12} aria-hidden="true" />
                            Code
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Challenges ── */}
        {!loading && activeTab === 'challenges' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              Current Innovation Challenges
            </h2>
            {challenges.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-navy-500">
                <FiAward size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="text-sm">No active challenges at the moment. Check back soon.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {challenges.map(ch => (
                  <div key={ch.id}
                    className="bg-white dark:bg-navy-900 rounded-2xl p-6
                      border border-slate-100 dark:border-navy-700/40
                      hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug">
                        {ch.title}
                      </h3>
                      <span className="flex-shrink-0 flex items-center gap-1.5
                        text-[11px] font-bold text-orange-600 dark:text-orange-400
                        bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-lg">
                        <FiClock size={11} aria-hidden="true" />
                        {ch.deadline}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-4">
                      {ch.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-gold">
                        <FiAward size={14} aria-hidden="true" />
                        {ch.prize}
                      </span>
                      {isStudent && (
                        <button
                          onClick={() => handleParticipate(ch.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-navy-900
                            transition-all hover:-translate-y-0.5"
                          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                        >
                          <FiZap size={12} aria-hidden="true" />
                          Participate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Resources ── */}
        {!loading && activeTab === 'resources' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              Innovation Resources
            </h2>
            {resources.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-navy-500">
                <FiBookOpen size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="text-sm">No resources available yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {resources.map(res => (
                  <div key={res.id}
                    className="group bg-white dark:bg-navy-900 rounded-2xl p-6
                      border border-slate-100 dark:border-navy-700/40
                      hover:border-gold/30 hover:shadow-md transition-all">
                    <div className="w-11 h-11 rounded-2xl bg-navy-100 dark:bg-navy-800
                      flex items-center justify-center mb-4">
                      <FiBookOpen size={18} className="text-navy-600 dark:text-gold" aria-hidden="true" />
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base mb-2">
                      {res.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-4 flex-1">
                      {res.description}
                    </p>
                    {res.link ? (
                      <a href={res.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-bold text-gold
                          hover:underline transition-all">
                        <FiExternalLink size={13} aria-hidden="true" />
                        Explore Resource
                      </a>
                    ) : (
                      <span className="text-sm font-bold text-slate-300 dark:text-navy-600">
                        Coming Soon
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Community ── */}
        {!loading && activeTab === 'community' && (
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left: description */}
            <div className="bg-white dark:bg-navy-900 rounded-2xl p-8
              border border-slate-100 dark:border-navy-700/40">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Collaborate. Create. Innovate.
              </h2>
              <p className="text-slate-500 dark:text-navy-400 leading-relaxed mb-6">
                Join hundreds of students who are transforming their ideas into impactful solutions.
                Share knowledge, find collaborators, and get feedback on your projects.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Weekly innovation workshops',
                  'Networking events with industry leaders',
                  'Access to prototyping lab equipment',
                  'Opportunities to showcase at innovation fairs',
                ].map(benefit => (
                  <li key={benefit} className="flex items-center gap-3 text-sm text-slate-700 dark:text-navy-200">
                    <FiCheckCircle size={16} className="flex-shrink-0 text-emerald-500" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
              {isStudent && (
                <button
                  onClick={handleJoinCommunity}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-navy-900
                    transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  <FiUsers size={15} aria-hidden="true" />
                  Join Now
                </button>
              )}
            </div>

            {/* Right: stats */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { value: communityStats.active_projects   ?? 0, label: 'Active Projects',    icon: FiZap,         color: 'text-gold'         },
                { value: communityStats.members           ?? 0, label: 'Community Members',  icon: FiUsers,       color: 'text-sky-500'      },
                { value: communityStats.completed_solutions ?? 0, label: 'Completed Solutions', icon: FiTrendingUp, color: 'text-emerald-500' },
              ].map(({ value, label, icon: Icon, color }) => (
                <div key={label}
                  className="flex items-center gap-5 bg-white dark:bg-navy-900 rounded-2xl p-6
                    border border-slate-100 dark:border-navy-700/40">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-navy-800
                    flex items-center justify-center flex-shrink-0">
                    <Icon size={24} className={color} aria-hidden="true" />
                  </div>
                  <div>
                    <p className={`text-4xl font-black ${color} leading-none tabular-nums`}>
                      {value}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-navy-400 font-semibold mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
