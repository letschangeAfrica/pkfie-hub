import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  FiMessageCircle, FiStar, FiSend, FiCheckCircle,
  FiAlertCircle, FiX, FiChevronDown, FiChevronUp,
  FiCpu, FiBook, FiCompass, FiUser, FiShield,
} from 'react-icons/fi';

const PRIORITY_META = {
  low:    { label: 'Low',    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'    },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'   },
};

/* ── Star rating widget ── */
const StarRating = ({ value, onChange }) => (
  <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        className={[
          'text-2xl transition-all hover:scale-110 active:scale-95',
          star <= value ? 'text-gold' : 'text-slate-300 dark:text-navy-700',
        ].join(' ')}
      >
        <FiStar
          size={22}
          aria-hidden="true"
          fill={star <= value ? '#FFD700' : 'transparent'}
          stroke={star <= value ? '#FFD700' : 'currentColor'}
        />
      </button>
    ))}
    <span className="ml-2 text-xs font-bold text-slate-500 dark:text-navy-400">
      {value === 0 ? 'Select rating' : `${value} / 5`}
    </span>
  </div>
);

/* ── Single feedback card ── */
const FeedbackCard = ({ fb }) => (
  <div className="flex gap-3 p-4 rounded-2xl
    bg-white dark:bg-navy-800 border border-slate-100 dark:border-navy-700/40">
    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-navy-100 dark:bg-navy-700
      flex items-center justify-center">
      <FiUser size={15} className="text-navy-500 dark:text-navy-300" aria-hidden="true" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
          {fb.user_name || 'You'}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-navy-500 flex-shrink-0">
          {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : ''}
        </span>
      </div>
      {/* Stars */}
      {fb.rating > 0 && (
        <div className="flex items-center gap-0.5 mb-2">
          {[...Array(5)].map((_, i) => (
            <FiStar
              key={i}
              size={12}
              aria-hidden="true"
              fill={i < fb.rating ? '#FFD700' : 'transparent'}
              stroke={i < fb.rating ? '#FFD700' : '#94a3b8'}
            />
          ))}
        </div>
      )}
      {fb.subject && (
        <p className="text-xs font-bold text-slate-700 dark:text-navy-200 mb-1">{fb.subject}</p>
      )}
      <p className="text-sm text-slate-600 dark:text-navy-300 leading-relaxed">{fb.message}</p>

      {/* Admin responses */}
      {fb.responses?.length > 0 && (
        <div className="mt-3 space-y-2">
          {fb.responses.map(resp => (
            <div
              key={resp.id}
              className="flex gap-2 pl-3 border-l-2 border-gold/40"
            >
              <FiShield size={12} className="text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-bold text-gold">
                  Admin
                  <span className="text-navy-500 dark:text-navy-500 font-normal ml-2">
                    {resp.created_at ? new Date(resp.created_at).toLocaleString() : ''}
                  </span>
                </p>
                <p className="text-xs text-slate-600 dark:text-navy-300 mt-0.5">{resp.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Priority badge */}
    {fb.priority && PRIORITY_META[fb.priority] && (
      <span className={`flex-shrink-0 self-start px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase ${PRIORITY_META[fb.priority].color}`}>
        {PRIORITY_META[fb.priority].label}
      </span>
    )}
  </div>
);

const FAQS = [
  {
    q: 'How long does it take to get a response?',
    a: 'We strive to respond to all feedback within 2–3 business days. During peak times it may take slightly longer, but every submission gets a response.',
  },
  {
    q: 'Can I submit feedback anonymously?',
    a: 'Currently you must be logged in to submit feedback. Anonymous feedback may be supported in the future.',
  },
  {
    q: 'How is my feedback used?',
    a: 'Your feedback is reviewed by our product team and used to prioritize improvements and new features across PKFIE-Hub.',
  },
];

const EMPTY_FORM = { category_id: '', subject: '', message: '', rating: 0, priority: 'medium' };

export default function Feedback() {
  const [categories,     setCategories]     = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [allFeedback,    setAllFeedback]    = useState([]);
  const [showModal,      setShowModal]      = useState(false);
  const [formData,       setFormData]       = useState(EMPTY_FORM);
  const [submitted,      setSubmitted]      = useState(false);
  const [activeFaq,      setActiveFaq]      = useState(null);
  const [error,          setError]          = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('feedback/categories/')
      .then(res => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.get('feedback/all/?mine=1&page=1&page_size=3')
      .then(res => setRecentFeedback(Array.isArray(res.data.results) ? res.data.results : []))
      .catch(() => setRecentFeedback([]));
  }, [submitted]);

  const fetchAll = () => {
    api.get('feedback/all/?mine=1&page=1&page_size=100')
      .then(res => setAllFeedback(Array.isArray(res.data.results) ? res.data.results : []))
      .catch(() => setAllFeedback([]));
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('feedback/', formData);
      setSubmitted(true);
      setFormData(EMPTY_FORM);
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      setError('Could not submit feedback. Please make sure you are logged in.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = `w-full px-4 py-3 rounded-xl text-sm
    bg-slate-50 dark:bg-navy-800
    border border-slate-200 dark:border-navy-700/50
    text-slate-900 dark:text-white
    placeholder-slate-400 dark:placeholder-navy-500
    focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/15
    transition-all`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Feedback</h1>
        <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">
          Share your experience to help us improve PKFIE-Hub.
        </p>
      </div>

      {/* ── Toast notifications ── */}
      {submitted && (
        <div className="flex items-center gap-3 mb-6 px-5 py-4 rounded-2xl
          bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30
          text-emerald-700 dark:text-emerald-400 font-semibold animate-fade-up"
          role="alert"
        >
          <FiCheckCircle size={18} className="flex-shrink-0" aria-hidden="true" />
          Thank you! Your feedback has been submitted and is under review.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 mb-6 px-5 py-4 rounded-2xl
          bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30
          text-red-700 dark:text-red-400 font-semibold animate-fade-up"
          role="alert"
        >
          <FiAlertCircle size={18} className="flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: Form ─────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-100 dark:border-navy-700/40 overflow-hidden">

            {/* Gold top bar */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #FFD700, #FFEE66, #FFD700)' }} aria-hidden="true" />

            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #001F5B 0%, #002B80 100%)' }}>
                  <FiMessageCircle size={18} className="text-gold" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    Submit Feedback
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-navy-500">All fields marked * are required</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Category */}
                <div>
                  <label htmlFor="category_id" className="block text-xs font-bold text-slate-700 dark:text-navy-200 mb-1.5 tracking-wide">
                    Category *
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInput}
                    required
                    className={fieldCls}
                  >
                    <option value="">Select a category…</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-xs font-bold text-slate-700 dark:text-navy-200 mb-1.5 tracking-wide">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    placeholder="Brief summary of your feedback"
                    value={formData.subject}
                    onChange={handleInput}
                    required
                    className={fieldCls}
                  />
                </div>

                {/* Rating */}
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-navy-200 mb-2 tracking-wide">
                    Rating
                  </p>
                  <StarRating value={formData.rating} onChange={r => setFormData(f => ({ ...f, rating: r }))} />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-xs font-bold text-slate-700 dark:text-navy-200 mb-1.5 tracking-wide">
                    Your Feedback *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Please provide detailed feedback…"
                    value={formData.message}
                    onChange={handleInput}
                    required
                    className={fieldCls + ' resize-none'}
                  />
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-navy-200 mb-2 tracking-wide">
                    Priority
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(PRIORITY_META).map(([key, { label, color }]) => (
                      <label
                        key={key}
                        className={[
                          'flex items-center justify-center py-2 rounded-xl cursor-pointer',
                          'text-xs font-bold border-2 transition-all',
                          formData.priority === key
                            ? `${color} border-current`
                            : 'border-slate-200 dark:border-navy-700/50 text-slate-500 dark:text-navy-500 hover:border-slate-300',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={key}
                          checked={formData.priority === key}
                          onChange={handleInput}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !formData.category_id || !formData.subject || !formData.message}
                  className="group relative w-full h-12 rounded-xl font-black text-sm text-navy-900
                    overflow-hidden transition-all hover:-translate-y-px active:translate-y-0
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {submitting
                      ? <><span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />Submitting…</>
                      : <><FiSend size={15} aria-hidden="true" />Submit Feedback</>
                    }
                  </span>
                </button>
              </form>

              {/* Quick links */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-navy-700/40">
                <p className="text-[11px] font-bold text-slate-400 dark:text-navy-500 uppercase tracking-widest mb-3">
                  Quick Links
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Ask the Assistant', icon: FiCpu,     path: '/assistant' },
                    { label: 'View Handbook',     icon: FiBook,    path: '/handbook'  },
                    { label: 'Explore Programs',  icon: FiCompass, path: '/pathfinder' },
                  ].map(({ label, icon: Icon, path }) => (
                    <button
                      key={label}
                      onClick={() => navigate(path)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                        text-xs font-bold text-slate-600 dark:text-navy-300
                        bg-slate-50 dark:bg-navy-800
                        border border-slate-200 dark:border-navy-700/40
                        hover:text-gold hover:border-gold/30 transition-all"
                    >
                      <Icon size={12} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-6 bg-white dark:bg-navy-900 rounded-2xl
            border border-slate-100 dark:border-navy-700/40 p-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">
              Feedback FAQs
            </h3>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="rounded-xl border border-slate-100 dark:border-navy-700/40 overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    aria-expanded={activeFaq === i}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5
                      text-left text-sm font-semibold text-slate-800 dark:text-navy-100
                      hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors"
                  >
                    {faq.q}
                    {activeFaq === i
                      ? <FiChevronUp size={14} className="flex-shrink-0 text-gold" aria-hidden="true" />
                      : <FiChevronDown size={14} className="flex-shrink-0 text-slate-400" aria-hidden="true" />
                    }
                  </button>
                  {activeFaq === i && (
                    <p className="px-4 pb-4 text-sm text-slate-600 dark:text-navy-300 leading-relaxed border-t border-slate-50 dark:border-navy-700/30">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Recent feedback ───────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-navy-900 rounded-2xl
            border border-slate-100 dark:border-navy-700/40 overflow-hidden sticky top-4">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700/40 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">My Recent Feedback</h2>
              {recentFeedback.length > 0 && (
                <span className="text-xs font-bold text-navy-400 bg-navy-100 dark:bg-navy-800 px-2 py-0.5 rounded-full">
                  {recentFeedback.length}
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              {recentFeedback.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-800
                    flex items-center justify-center mx-auto mb-3">
                    <FiMessageCircle size={20} className="text-slate-400 dark:text-navy-500" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-navy-400">
                    No feedback submitted yet.
                  </p>
                </div>
              ) : (
                recentFeedback.map(fb => <FeedbackCard key={fb.id} fb={fb} />)
              )}

              {recentFeedback.length >= 3 && (
                <button
                  onClick={() => { fetchAll(); setShowModal(true); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold
                    text-slate-600 dark:text-navy-300 hover:text-gold
                    border border-slate-200 dark:border-navy-700/40 hover:border-gold/30
                    bg-slate-50 dark:bg-navy-800/60 transition-all"
                >
                  View All Feedback
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── All feedback modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="All my feedback"
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-navy-900 rounded-3xl
              border border-slate-200 dark:border-navy-700/40
              shadow-[0_32px_80px_rgba(0,0,0,.4)] overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Gold bar */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #FFD700, #FFEE66, #FFD700)' }} aria-hidden="true" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-navy-700/40">
              <h2 className="text-base font-black text-slate-900 dark:text-white">All My Feedback</h2>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white
                  hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
              >
                <FiX size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {allFeedback.length === 0 ? (
                <p className="text-center text-sm text-slate-400 dark:text-navy-500 py-8">No feedback found.</p>
              ) : (
                allFeedback.map(fb => <FeedbackCard key={fb.id} fb={fb} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
