import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  FiMessageSquare, FiSearch, FiX, FiSend,
  FiAlertCircle, FiClock, FiCheckCircle, FiSlash,
  FiStar, FiUser, FiTag, FiCalendar, FiMessageCircle, FiPaperclip,
} from 'react-icons/fi';

const PAGE_SIZE = 20;

const STATUS_COLOR = {
  open:        'bg-orange-500/20 text-orange-400',
  in_progress: 'bg-sky-500/20 text-sky-400',
  resolved:    'bg-emerald-500/20 text-emerald-400',
  closed:      'bg-slate-500/20 text-slate-400',
};

const PRIORITY_COLOR = {
  urgent: 'bg-red-600/20 text-red-400',
  high:   'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low:    'bg-slate-500/20 text-slate-400',
};

const STAT_META = [
  { status: 'open',        label: 'Open',        icon: FiAlertCircle, color: 'bg-orange-500/20 text-orange-400' },
  { status: 'in_progress', label: 'In Progress',  icon: FiClock,       color: 'bg-sky-500/20 text-sky-400'     },
  { status: 'resolved',    label: 'Resolved',     icon: FiCheckCircle, color: 'bg-emerald-500/20 text-emerald-400' },
  { status: 'closed',      label: 'Closed',       icon: FiSlash,       color: 'bg-slate-500/20 text-slate-400' },
];

function ModalOverlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function InlineError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
      <FiAlertCircle size={13} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function FeedbackDetail({ feedbackId, initialFeedback, onClose, onStatusUpdated, addResponse, formatDate, getCategoryName }) {
  const [feedback,     setFeedback]     = useState(initialFeedback);
  const [editing,      setEditing]      = useState(false);
  const [newStatus,    setNewStatus]    = useState(initialFeedback.status);
  const [responseText, setResponseText] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [statusError,  setStatusError]  = useState('');
  const [replyError,   setReplyError]   = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/feedback/${feedbackId}/`)
      .then(res => { setFeedback(res.data); setNewStatus(res.data.status); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [feedbackId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [feedback?.responses]);

  const handleSaveStatus = async () => {
    setLoading(true); setStatusError('');
    try {
      const res = await api.patch(`/feedback/${feedbackId}/`, { status: newStatus });
      setFeedback(res.data);
      setEditing(false);
      onStatusUpdated?.(res.data);
    } catch { setStatusError('Failed to update status. Try again.'); }
    finally { setLoading(false); }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) return;
    setReplyError('');
    const result = await addResponse(feedbackId, responseText.trim());
    if (!result) { setReplyError('Failed to send reply. Try again.'); return; }
    setResponseText('');
    setLoading(true);
    api.get(`/feedback/${feedbackId}/`)
      .then(res => { setFeedback(res.data); setNewStatus(res.data.status); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40 flex-shrink-0">
          <h3 className="text-lg font-black text-white">Feedback Conversation</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors">
            <FiX size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Subject + badges */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h4 className="text-base font-black text-white leading-snug">{feedback.subject}</h4>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${STATUS_COLOR[feedback.status] || 'bg-navy-700 text-navy-400'}`}>
                {feedback.status.replace('_', ' ')}
              </span>
              {feedback.priority && (
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${PRIORITY_COLOR[feedback.priority] || PRIORITY_COLOR.medium}`}>
                  {feedback.priority}
                </span>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: FiUser,     label: 'User',     value: feedback.user_name || feedback.user_email },
              { icon: FiTag,      label: 'Category', value: getCategoryName(feedback.category) },
              { icon: FiCalendar, label: 'Date',     value: formatDate(feedback.created_at) },
              ...(feedback.rating ? [{ icon: FiStar, label: 'Rating', value: `${feedback.rating}/5` }] : []),
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-navy-700/40">
                <Icon size={14} className="text-gold mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-navy-500">{label}</p>
                  <p className="text-sm text-white font-semibold">{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="px-4 py-4 rounded-xl bg-navy-700/40">
            <p className="text-[10px] font-black uppercase tracking-wide text-navy-500 mb-2">Message</p>
            <p className="text-sm text-navy-200 leading-relaxed">{feedback.message}</p>
          </div>

          {/* Attachments */}
          {feedback.attachments?.length > 0 && (
            <div className="px-4 py-3 rounded-xl bg-navy-700/40">
              <p className="text-[10px] font-black uppercase tracking-wide text-navy-500 mb-2">Attachments</p>
              <ul className="space-y-1">
                {feedback.attachments.map(att => (
                  <li key={att.id} className="flex items-center gap-2 text-xs">
                    <FiPaperclip size={12} className="text-navy-400 shrink-0" />
                    {att.url
                      ? <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 truncate">{att.file_name}</a>
                      : <span className="text-navy-300">{att.file_name}</span>
                    }
                    <span className="text-navy-600">({Math.round(att.file_size / 1024)} KB)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Status editor */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold text-navy-400 uppercase tracking-wide">Status:</p>
              {editing ? (
                <>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-xl bg-navy-900 border border-navy-700/60 text-white text-sm
                      focus:outline-none focus:border-gold/50 transition-colors"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button onClick={handleSaveStatus} disabled={loading}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-navy-900 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}>
                    {loading ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setNewStatus(feedback.status); setStatusError(''); }} disabled={loading}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${STATUS_COLOR[feedback.status] || 'bg-navy-700 text-navy-400'}`}>
                    {feedback.status.replace('_', ' ')}
                  </span>
                  <button onClick={() => setEditing(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                    Edit
                  </button>
                </>
              )}
            </div>
            <InlineError message={statusError} />
          </div>

          {/* Threaded chat */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-navy-500 mb-3">Conversation</p>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
              {feedback.responses?.length > 0 ? (
                feedback.responses.map((resp, idx) => (
                  <div
                    key={resp.id || idx}
                    className={`flex flex-col gap-1 px-4 py-3 rounded-xl max-w-[85%]
                      ${resp.admin
                        ? 'ml-auto bg-gold/10 border border-gold/20'
                        : 'bg-navy-700/40 border border-navy-700/40'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${resp.admin ? 'text-gold' : 'text-navy-300'}`}>
                        {resp.admin ? 'Admin' : resp.user_email || 'User'}
                      </span>
                      <span className="text-[10px] text-navy-600">{formatDate(resp.created_at)}</span>
                    </div>
                    <p className="text-sm text-navy-200 leading-relaxed">{resp.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-navy-500 text-center py-6">No conversation yet.</p>
              )}
              <div ref={chatEndRef} />
            </div>

            <InlineError message={replyError} />
            {/* Reply input */}
            <form onSubmit={handleSubmitResponse} className="flex items-end gap-3 mt-2">
              <textarea
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                placeholder="Type your reply…"
                rows={2}
                required
                className="flex-1 px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
                  text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50
                  resize-none transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !responseText.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  disabled:opacity-40 transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
              >
                <FiSend size={15} className="text-navy-900" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function FeedbackManagement() {
  const [feedbacks,         setFeedbacks]         = useState([]);
  const [categories,        setCategories]        = useState([]);
  const [filter,            setFilter]            = useState('all');
  const [priorityFilter,    setPriorityFilter]    = useState('');
  const [categoryFilter,    setCategoryFilter]    = useState('');
  const [selectedFeedback,  setSelectedFeedback]  = useState(null);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [page,              setPage]              = useState(1);
  const [hasMore,           setHasMore]           = useState(true);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState('');
  const [bulkError,         setBulkError]         = useState('');
  const [selectedIds,       setSelectedIds]       = useState([]);
  const [bulkAction,        setBulkAction]        = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const listRef = useRef();

  useEffect(() => {
    api.get('/feedback/categories/')
      .then(res => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/feedback/all/?page=${page}&page_size=${PAGE_SIZE}`)
      .then(res => {
        const items = Array.isArray(res.data.results) ? res.data.results : [];
        setFeedbacks(prev => page === 1 ? items : [...prev, ...items]);
        setHasMore(!!res.data.next);
      })
      .catch(() => setError('Failed to load feedbacks'))
      .finally(() => setLoading(false));
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection whenever the visible filter changes
  useEffect(() => { setSelectedIds([]); }, [filter, priorityFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current || loading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollHeight - scrollTop <= clientHeight + 100) setPage(p => p + 1);
    };
    const ref = listRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => { if (ref) ref.removeEventListener('scroll', handleScroll); };
  }, [hasMore, loading]);

  const getCategoryName = (cat) => {
    if (!cat) return '';
    if (typeof cat === 'object' && cat.name) return cat.name;
    if (typeof cat === 'number') return categories.find(c => c.id === cat)?.name || '';
    return '';
  };

  const filtered = feedbacks.filter(f => {
    const q = searchTerm.toLowerCase();
    return (
      (filter === 'all' || f.status === filter) &&
      (!priorityFilter || f.priority === priorityFilter) &&
      (!categoryFilter || (typeof f.category === 'object' ? f.category?.id : f.category) === Number(categoryFilter)) &&
      (!q || f.subject?.toLowerCase().includes(q) ||
             f.message?.toLowerCase().includes(q)  ||
             f.user_email?.toLowerCase().includes(q) ||
             f.user_name?.toLowerCase().includes(q))
    );
  });

  const toggleSelect  = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  const selectAll     = ()   => setSelectedIds(filtered.map(f => f.id));
  const clearAll      = ()   => setSelectedIds([]);
  const getCount      = (s)  => feedbacks.filter(f => f.status === s).length;

  const performBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setBulkError('');
    if (bulkAction === 'delete') { setShowDeleteConfirm(true); return; }
    try {
      await api.post('/feedback/bulk/', { ids: selectedIds, action: 'status', status: bulkAction });
      setFeedbacks(prev => prev.map(f => selectedIds.includes(f.id) ? { ...f, status: bulkAction } : f));
      setSelectedIds([]);
      setBulkAction('');
    } catch { setBulkError('Bulk action failed. Please try again.'); }
  };

  const confirmBulkDelete = async () => {
    setShowDeleteConfirm(false);
    setBulkError('');
    try {
      await api.post('/feedback/bulk/', { ids: selectedIds, action: 'delete' });
      setFeedbacks(prev => prev.filter(f => !selectedIds.includes(f.id)));
      setSelectedIds([]);
      setBulkAction('');
    } catch { setBulkError('Bulk delete failed. Please try again.'); }
  };

  const addResponse = async (feedbackId, message) => {
    try {
      const res = await api.post(`/feedback/${feedbackId}/responses/`, { message });
      setFeedbacks(prev => prev.map(f =>
        f.id === feedbackId ? { ...f, responses: [...(f.responses || []), res.data] } : f
      ));
      return res.data;
    } catch { return null; }
  };

  const formatDate = (s) => s ? new Date(s).toLocaleString() : '';

  const selectCls = `px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
    text-white text-sm focus:outline-none focus:border-gold/40 transition-colors`;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Feedback Management</h1>
          <p className="text-sm text-navy-400 mt-1">Review and respond to user feedback and inquiries</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-white">{feedbacks.length}</p>
          <p className="text-xs text-navy-500">Loaded</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_META.map(({ status, label, icon: Icon, color }) => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left
              ${filter === status
                ? 'border-gold/40 bg-navy-700/60'
                : 'border-navy-700/40 bg-navy-800/60 hover:border-navy-600/60'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color.split(' ')[0]}`}>
              <Icon size={18} aria-hidden="true" className={color.split(' ')[1]} />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">{getCount(status)}</p>
              <p className="text-xs text-navy-400 font-semibold">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search feedback…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
              text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className={selectCls}>
          <option value="all">All Statuses</option>
          <option value="open">Open ({getCount('open')})</option>
          <option value="in_progress">In Progress ({getCount('in_progress')})</option>
          <option value="resolved">Resolved ({getCount('resolved')})</option>
          <option value="closed">Closed ({getCount('closed')})</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={selectCls}>
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {categories.length > 0 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectCls}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-300 shrink-0">
          <input
            type="checkbox"
            checked={selectedIds.length === filtered.length && filtered.length > 0}
            onChange={e => e.target.checked ? selectAll() : clearAll()}
            className="accent-gold"
          />
          Select All
        </label>
        <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className={selectCls}>
          <option value="">Bulk Actions</option>
          <option value="resolved">Mark Resolved</option>
          <option value="closed">Close</option>
          <option value="delete">Delete</option>
        </select>
        <button
          disabled={!bulkAction || selectedIds.length === 0}
          onClick={performBulkAction}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-navy-900
            disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          Apply ({selectedIds.length})
        </button>
      </div>

      {bulkError && <InlineError message={bulkError} />}

      {/* List */}
      <div ref={listRef} className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {loading && page === 1 ? (
          <div className="py-10 text-center">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-navy-500">Loading feedback…</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-700/60 flex items-center justify-center mx-auto mb-4">
              <FiMessageSquare size={24} className="text-navy-500" aria-hidden="true" />
            </div>
            <p className="text-white font-bold mb-1">No feedback found</p>
            <p className="text-sm text-navy-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filtered.map(fb => (
            <div
              key={fb.id}
              onClick={e => {
                if (e.target.type === 'checkbox') return;
                setSelectedFeedback(fb);
              }}
              className={`flex items-start gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all
                hover:border-navy-600/60
                ${selectedIds.includes(fb.id)
                  ? 'border-gold/30 bg-gold/5'
                  : 'border-navy-700/40 bg-navy-800/60'}`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(fb.id)}
                onChange={() => toggleSelect(fb.id)}
                onClick={e => e.stopPropagation()}
                className="accent-gold mt-1 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-white text-sm">{fb.subject}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${STATUS_COLOR[fb.status] || 'bg-navy-700 text-navy-400'}`}>
                      {fb.status.replace('_', ' ')}
                    </span>
                    {fb.priority && (
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${PRIORITY_COLOR[fb.priority] || PRIORITY_COLOR.medium}`}>
                        {fb.priority}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-navy-400 line-clamp-1 mb-2">{fb.message}</p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-navy-500">
                  <span className="flex items-center gap-1.5">
                    <FiUser size={11} aria-hidden="true" />
                    {fb.user_name || fb.user_email}
                    {fb.user_name && fb.user_email !== fb.user_name && (
                      <span className="text-navy-600">({fb.user_email})</span>
                    )}
                  </span>
                  {fb.category && (
                    <span className="flex items-center gap-1.5">
                      <FiTag size={11} aria-hidden="true" /> {getCategoryName(fb.category)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <FiCalendar size={11} aria-hidden="true" /> {formatDate(fb.created_at)}
                  </span>
                  {fb.rating && (
                    <span className="flex items-center gap-1.5 text-gold">
                      <FiStar size={11} aria-hidden="true" /> {fb.rating}/5
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <FiMessageCircle size={11} aria-hidden="true" /> {fb.responses?.length ?? 0}
                  </span>
                  {fb.attachments?.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <FiPaperclip size={11} aria-hidden="true" /> {fb.attachments.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && page > 1 && (
          <div className="py-4 text-center text-sm text-navy-500">Loading more…</div>
        )}
        {hasMore && !loading && (
          <div className="text-center pt-2">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-5 py-2 rounded-xl text-sm font-bold text-navy-300
                bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Result summary */}
      {!loading && !error && (
        <p className="text-xs text-navy-500 text-center">
          Showing {filtered.length} of {feedbacks.length} loaded item{feedbacks.length !== 1 ? 's' : ''}
          {hasMore ? ' — scroll or click Load More for more' : ''}
        </p>
      )}

      {/* Bulk delete confirm */}
      {showDeleteConfirm && (
        <ModalOverlay onClose={() => setShowDeleteConfirm(false)}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Confirm Bulk Delete</h3>
            <p className="text-sm text-navy-400 mb-1">
              Delete <strong className="text-white">{selectedIds.length}</strong> feedback item{selectedIds.length !== 1 ? 's' : ''}?
            </p>
            <p className="text-xs text-red-400 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={confirmBulkDelete}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Detail modal */}
      {selectedFeedback && (
        <FeedbackDetail
          feedbackId={selectedFeedback.id}
          initialFeedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusUpdated={updated => setFeedbacks(prev => prev.map(f => f.id === updated.id ? updated : f))}
          addResponse={addResponse}
          formatDate={formatDate}
          getCategoryName={getCategoryName}
        />
      )}
    </div>
  );
}
