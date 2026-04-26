import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useNotifications } from '../../contexts/NotificationsContext';
import {
  FiMessageCircle, FiStar, FiSend, FiCheckCircle,
  FiAlertCircle, FiX, FiChevronDown, FiChevronUp,
  FiCpu, FiBook, FiCompass, FiUser, FiShield,
  FiEdit2, FiTrash2, FiPaperclip, FiFilter,
} from 'react-icons/fi';

/* ── Helpers ────────────────────────────────────────── */
const parseApiError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Could not submit feedback. Please try again.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
  const first = Object.entries(data)[0];
  if (first) {
    const msg = Array.isArray(first[1]) ? first[1][0] : first[1];
    return `${first[0]}: ${msg}`;
  }
  return 'Could not submit feedback. Please try again.';
};

/* ── Constants ──────────────────────────────────────── */
const MSG_MAX = 2000;

const PRIORITY_META = {
  low:    { label: 'Low',    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'        },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'        },
};

const STATUS_META = {
  submitted:    { label: 'Submitted',    color: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40' },
  pending:      { label: 'Pending',      color: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40' },
  under_review: { label: 'Under Review', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40' },
  resolved:     { label: 'Resolved',     color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40' },
  closed:       { label: 'Closed',       color: 'text-slate-500 dark:text-navy-400 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700/40' },
};

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

/* ── Star rating widget ─────────────────────────────── */
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

/* ── Feedback card ──────────────────────────────────── */
const FeedbackCard = ({ fb, onDelete, onUpdate }) => {
  const [editing,       setEditing]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [editData,      setEditData]      = useState({ subject: fb.subject || '', message: fb.message || '', priority: fb.priority || 'medium' });
  const [editError,     setEditError]     = useState('');

  const statusMeta   = STATUS_META[fb.status] || STATUS_META.submitted;
  const priorityMeta = fb.priority ? PRIORITY_META[fb.priority] : null;

  const handleSave = async () => {
    if (!editData.subject.trim() || !editData.message.trim()) {
      setEditError('Subject and message are required.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await api.patch(`feedback/${fb.id}/`, editData);
      onUpdate?.(fb.id, editData);
      setEditing(false);
    } catch (err) {
      setEditError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await api.delete(`feedback/${fb.id}/`);
      onDelete?.(fb.id);
    } catch {}
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm
    bg-slate-50 dark:bg-navy-700
    border border-slate-200 dark:border-navy-600/50
    text-slate-900 dark:text-white
    focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
    transition-all`;

  return (
    <div className="flex gap-3 p-4 rounded-2xl
      bg-white dark:bg-navy-800 border border-slate-100 dark:border-navy-700/40">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-navy-100 dark:bg-navy-700
        flex items-center justify-center">
        <FiUser size={15} className="text-navy-500 dark:text-navy-300" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {fb.user_name || 'You'}
            </span>
            {/* Status badge */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[11px] text-slate-400 dark:text-navy-500">
              {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : ''}
            </span>
            {/* Edit/delete — only shown if callbacks provided */}
            {onUpdate && !editing && (
              <button
                onClick={() => { setEditing(true); setConfirmDelete(false); }}
                title="Edit"
                className="p-1 rounded-lg text-slate-400 dark:text-navy-500
                  hover:text-slate-700 dark:hover:text-white
                  hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors ml-1"
              >
                <FiEdit2 size={12} aria-hidden="true" />
              </button>
            )}
            {onDelete && !editing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title={confirmDelete ? 'Confirm delete' : 'Delete'}
                className={`p-1 rounded-lg transition-colors ${
                  confirmDelete
                    ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                    : 'text-slate-400 dark:text-navy-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                } disabled:opacity-40`}
              >
                <FiTrash2 size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {confirmDelete && (
          <p className="text-[11px] text-red-500 mb-2 font-semibold">
            Click the trash icon again to confirm deletion.
          </p>
        )}

        {/* Stars */}
        {fb.rating > 0 && !editing && (
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

        {/* View mode */}
        {!editing ? (
          <>
            {fb.subject && (
              <p className="text-xs font-bold text-slate-700 dark:text-navy-200 mb-1">{fb.subject}</p>
            )}
            <p className="text-sm text-slate-600 dark:text-navy-300 leading-relaxed">{fb.message}</p>

            {/* Attachment */}
            {fb.attachment && (
              <a
                href={fb.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-gold hover:text-gold/80 font-semibold"
              >
                <FiPaperclip size={11} />
                View attachment
              </a>
            )}
          </>
        ) : (
          /* Edit mode */
          <div className="space-y-2 mt-1">
            <input
              type="text"
              value={editData.subject}
              onChange={e => setEditData(p => ({ ...p, subject: e.target.value }))}
              placeholder="Subject"
              className={inputCls}
            />
            <textarea
              rows={3}
              value={editData.message}
              onChange={e => setEditData(p => ({ ...p, message: e.target.value }))}
              placeholder="Your feedback…"
              className={inputCls + ' resize-none'}
            />
            {/* Priority */}
            <div className="flex gap-2">
              {Object.entries(PRIORITY_META).map(([key, { label }]) => (
                <label
                  key={key}
                  className={[
                    'flex-1 text-center py-1 rounded-lg cursor-pointer text-[11px] font-bold border transition-all',
                    editData.priority === key
                      ? `${PRIORITY_META[key].color} border-current`
                      : 'border-slate-200 dark:border-navy-600 text-slate-400 dark:text-navy-500',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name={`priority-edit-${fb.id}`}
                    value={key}
                    checked={editData.priority === key}
                    onChange={e => setEditData(p => ({ ...p, priority: e.target.value }))}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
            {editError && (
              <p className="text-[11px] text-red-500">{editError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-1.5 rounded-lg text-[12px] font-black text-navy-900
                  disabled:opacity-40 transition-all hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FFEE55)' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditError(''); setEditData({ subject: fb.subject || '', message: fb.message || '', priority: fb.priority || 'medium' }); }}
                className="flex-1 py-1.5 rounded-lg text-[12px] font-bold text-slate-500 dark:text-navy-400
                  border border-slate-200 dark:border-navy-700/40 hover:bg-slate-50 dark:hover:bg-navy-700/50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Admin responses */}
        {!editing && fb.responses?.length > 0 && (
          <div className="mt-3 space-y-2">
            {fb.responses.map(resp => (
              <div key={resp.id} className="flex gap-2 pl-3 border-l-2 border-gold/40">
                <FiShield size={12} className="text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-bold text-gold">
                    Admin
                    <span className="text-slate-400 dark:text-navy-500 font-normal ml-2">
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
      {priorityMeta && !editing && (
        <span className={`flex-shrink-0 self-start px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase ${priorityMeta.color}`}>
          {priorityMeta.label}
        </span>
      )}
    </div>
  );
};

/* ── Main page ──────────────────────────────────────── */
export default function Feedback() {
  const { fetchNotifications } = useNotifications();
  const navigate = useNavigate();

  const [categories,        setCategories]        = useState([]);
  const [recentFeedback,    setRecentFeedback]    = useState([]);
  const [recentTotal,       setRecentTotal]       = useState(0);
  const [allFeedback,       setAllFeedback]       = useState([]);
  const [allFeedbackError,  setAllFeedbackError]  = useState('');
  const [allFeedbackLoading,setAllFeedbackLoading]= useState(false);
  const [showModal,         setShowModal]         = useState(false);
  const [filterStatus,      setFilterStatus]      = useState('all');
  const [filterSort,        setFilterSort]        = useState('newest');
  const [formData,          setFormData]          = useState(EMPTY_FORM);
  const [attachment,        setAttachment]        = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [submitted,         setSubmitted]         = useState(false);
  const [activeFaq,         setActiveFaq]         = useState(null);
  const [error,             setError]             = useState('');
  const [submitting,        setSubmitting]        = useState(false);

  const toastTimerRef  = useRef(null);
  const fileInputRef   = useRef(null);

  /* Refresh notification badge when this page is visited */
  useEffect(() => { fetchNotifications(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Fetch categories */
  useEffect(() => {
    api.get('feedback/categories/')
      .then(res => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  /* Fetch recent feedback (3 items) */
  const loadRecent = useCallback(() => {
    api.get('feedback/all/?mine=1&page=1&page_size=3')
      .then(res => {
        const list = Array.isArray(res.data.results) ? res.data.results : [];
        setRecentFeedback(list);
        setRecentTotal(res.data.count ?? list.length);
      })
      .catch(() => { setRecentFeedback([]); setRecentTotal(0); });
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent, submitted]);

  /* Fetch all feedback for modal */
  const fetchAll = useCallback(() => {
    setAllFeedbackLoading(true);
    setAllFeedbackError('');
    api.get('feedback/all/?mine=1&page=1&page_size=100')
      .then(res => setAllFeedback(Array.isArray(res.data.results) ? res.data.results : []))
      .catch(err => setAllFeedbackError(parseApiError(err)))
      .finally(() => setAllFeedbackLoading(false));
  }, []);

  /* Toast helpers */
  const showToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSubmitted(true);
    toastTimerRef.current = setTimeout(() => setSubmitted(false), 4000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSubmitted(false);
  }, []);

  /* File attachment */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAttachment(file);
    const url = URL.createObjectURL(file);
    setAttachmentPreview(url);
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachment(null);
    setAttachmentPreview(null);
  };

  /* Form */
  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let payload = formData;
      let config  = {};
      if (attachment) {
        const fd = new FormData();
        Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
        fd.append('attachment', attachment);
        payload = fd;
        config  = { headers: { 'Content-Type': 'multipart/form-data' } };
      }
      await api.post('feedback/', payload, config);
      setFormData(EMPTY_FORM);
      removeAttachment();
      showToast();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* Feedback list mutation callbacks */
  const handleFeedbackUpdate = useCallback((id, updates) => {
    setRecentFeedback(prev => prev.map(fb => fb.id === id ? { ...fb, ...updates } : fb));
    setAllFeedback(prev =>    prev.map(fb => fb.id === id ? { ...fb, ...updates } : fb));
  }, []);

  const handleFeedbackDelete = useCallback((id) => {
    setRecentFeedback(prev => prev.filter(fb => fb.id !== id));
    setAllFeedback(prev =>    prev.filter(fb => fb.id !== id));
    setRecentTotal(prev => Math.max(0, prev - 1));
  }, []);

  /* Filtered + sorted modal list */
  const displayedAll = allFeedback
    .filter(fb => filterStatus === 'all' || fb.status === filterStatus)
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return filterSort === 'newest' ? tb - ta : ta - tb;
    });

  const fieldCls = `w-full px-4 py-3 rounded-xl text-sm
    bg-slate-50 dark:bg-navy-800
    border border-slate-200 dark:border-navy-700/50
    text-slate-900 dark:text-white
    placeholder-slate-400 dark:placeholder-navy-500
    focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/15
    transition-all`;

  const overLimit = formData.message.length > MSG_MAX;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Feedback</h1>
        <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">
          Share your experience to help us improve PKFIE-Hub.
        </p>
      </div>

      {/* ── Toasts ── */}
      {submitted && (
        <div className="flex items-center gap-3 mb-6 px-5 py-4 rounded-2xl
          bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30
          text-emerald-700 dark:text-emerald-400 font-semibold animate-fade-up"
          role="alert"
        >
          <FiCheckCircle size={18} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">Thank you! Your feedback has been submitted and is under review.</span>
          <button
            onClick={dismissToast}
            aria-label="Dismiss"
            className="flex-shrink-0 p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors"
          >
            <FiX size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 mb-6 px-5 py-4 rounded-2xl
          bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30
          text-red-700 dark:text-red-400 font-semibold animate-fade-up"
          role="alert"
        >
          <FiAlertCircle size={18} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError('')}
            aria-label="Dismiss"
            className="flex-shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/40 transition-colors"
          >
            <FiX size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: Form ─────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-100 dark:border-navy-700/40 overflow-hidden">
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
                  <p className="text-xs font-bold text-slate-700 dark:text-navy-200 mb-2 tracking-wide">Rating</p>
                  <StarRating value={formData.rating} onChange={r => setFormData(f => ({ ...f, rating: r }))} />
                </div>

                {/* Message + character counter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="message" className="block text-xs font-bold text-slate-700 dark:text-navy-200 tracking-wide">
                      Your Feedback *
                    </label>
                    <span className={`text-[10px] font-mono tabular-nums ${
                      overLimit ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-navy-600'
                    }`}>
                      {formData.message.length}/{MSG_MAX}
                    </span>
                  </div>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Please provide detailed feedback…"
                    value={formData.message}
                    onChange={handleInput}
                    required
                    className={`${fieldCls} resize-none ${overLimit ? 'border-red-400 dark:border-red-500 focus:border-red-400' : ''}`}
                  />
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-navy-200 mb-2 tracking-wide">Priority</p>
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

                {/* Attachment */}
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-navy-200 mb-2 tracking-wide">
                    Attachment <span className="font-normal text-slate-400 dark:text-navy-500">(optional · images only)</span>
                  </p>
                  {attachmentPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={attachmentPreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-navy-700/50"
                      />
                      <button
                        type="button"
                        onClick={removeAttachment}
                        aria-label="Remove attachment"
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white
                          flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                      >
                        <FiX size={10} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl
                      border-2 border-dashed border-slate-200 dark:border-navy-700/50
                      text-slate-400 dark:text-navy-500 cursor-pointer
                      hover:border-gold/40 hover:text-gold transition-all">
                      <FiPaperclip size={16} aria-hidden="true" />
                      <span className="text-sm">Click to attach a screenshot</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !formData.category_id || !formData.subject || !formData.message || overLimit}
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
                    { label: 'Ask the Assistant', icon: FiCpu,     path: '/assistant'  },
                    { label: 'View Handbook',     icon: FiBook,    path: '/handbook'   },
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
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">Feedback FAQs</h3>
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
                      ? <FiChevronUp   size={14} className="flex-shrink-0 text-gold" aria-hidden="true" />
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
              {recentTotal > 0 && (
                <span className="text-xs font-bold text-navy-400 bg-navy-100 dark:bg-navy-800 px-2 py-0.5 rounded-full">
                  {recentTotal}
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
                  <p className="text-sm text-slate-500 dark:text-navy-400">No feedback submitted yet.</p>
                </div>
              ) : (
                recentFeedback.map(fb => (
                  <FeedbackCard
                    key={fb.id}
                    fb={fb}
                    onDelete={handleFeedbackDelete}
                    onUpdate={handleFeedbackUpdate}
                  />
                ))
              )}

              {/* Only show "View All" when there are genuinely more items than what's displayed */}
              {recentTotal > recentFeedback.length && (
                <button
                  onClick={() => { fetchAll(); setShowModal(true); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold
                    text-slate-600 dark:text-navy-300 hover:text-gold
                    border border-slate-200 dark:border-navy-700/40 hover:border-gold/30
                    bg-slate-50 dark:bg-navy-800/60 transition-all"
                >
                  View All Feedback ({recentTotal})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── All feedback modal ──────────────────────── */}
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
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #FFD700, #FFEE66, #FFD700)' }} aria-hidden="true" />

            {/* Modal header */}
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

            {/* Filter + sort bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-navy-700/40 flex-wrap">
              <FiFilter size={13} className="text-slate-400 dark:text-navy-500 flex-shrink-0" aria-hidden="true" />
              <div className="flex gap-1.5 flex-wrap flex-1">
                {['all', 'submitted', 'pending', 'under_review', 'resolved'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={[
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all capitalize',
                      filterStatus === s
                        ? 'bg-gold text-navy-900'
                        : 'text-slate-500 dark:text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-700/50',
                    ].join(' ')}
                  >
                    {s === 'under_review' ? 'Under Review' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <select
                value={filterSort}
                onChange={e => setFilterSort(e.target.value)}
                className="text-[11px] font-bold rounded-lg px-2 py-1
                  bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700/40
                  text-slate-600 dark:text-navy-300
                  focus:outline-none focus:border-gold/40 transition-all"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            {/* Modal content */}
            <div className="overflow-y-auto max-h-[55vh] p-4 space-y-3 scrollbar-thin">
              {allFeedbackLoading ? (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-400 dark:text-navy-500">
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              ) : allFeedbackError ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                  bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30
                  text-red-600 dark:text-red-400 text-sm">
                  <FiAlertCircle size={15} className="flex-shrink-0" />
                  {allFeedbackError}
                </div>
              ) : displayedAll.length === 0 ? (
                <p className="text-center text-sm text-slate-400 dark:text-navy-500 py-10">
                  {filterStatus !== 'all' ? `No ${filterStatus.replace('_', ' ')} feedback found.` : 'No feedback found.'}
                </p>
              ) : (
                displayedAll.map(fb => (
                  <FeedbackCard
                    key={fb.id}
                    fb={fb}
                    onDelete={handleFeedbackDelete}
                    onUpdate={handleFeedbackUpdate}
                  />
                ))
              )}
            </div>

            {!allFeedbackLoading && !allFeedbackError && displayedAll.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700/40">
                <p className="text-[11px] text-slate-400 dark:text-navy-500 text-center">
                  {displayedAll.length} item{displayedAll.length !== 1 ? 's' : ''}
                  {filterStatus !== 'all' ? ` · filtered by "${filterStatus.replace('_', ' ')}"` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
