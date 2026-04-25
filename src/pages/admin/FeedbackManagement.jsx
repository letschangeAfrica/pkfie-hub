import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  FiSearch,
  FiUser,
  FiTag,
  FiCalendar,
  FiStar,
  FiMessageCircle,
  FiCheckSquare,
  FiTrash2,
  FiX,
  FiSend,
  FiEdit2,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiMail,
  FiPhone,
  FiFilter,
  FiDownload
} from 'react-icons/fi';

export default function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const listRef = useRef();
  const chatEndRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [toast]);

  useEffect(() => {
    api.get('/feedback/categories/')
      .then(res => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/feedback/all/?page=${page}&page_size=20`)
      .then(res => {
        const pageFeedbacks = Array.isArray(res.data.results) ? res.data.results : [];
        setFeedbacks(prev => page === 1 ? pageFeedbacks : [...prev, ...pageFeedbacks]);
        setHasMore(!!res.data.next);
        setToast(null);
      })
      .catch(() => {
        setToast({ type: 'error', message: 'Failed to load feedbacks' });
      })
      .finally(() => setLoading(false));
  }, [page]);

  // Infinite scroll inside listRef
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (loading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop <= clientHeight + 120) {
        setPage(p => (hasMore ? p + 1 : p));
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, loading]);

  const getCategoryName = (categoryObj) => {
    if (!categoryObj) return '';
    if (typeof categoryObj === 'object' && categoryObj.name) return categoryObj.name;
    if (typeof categoryObj === 'number') {
      const found = categories.find(c => c.id === categoryObj);
      return found ? found.name : '';
    }
    return '';
  };

  const filteredFeedbacks = (feedbacks || []).filter(fb => {
    const matchesFilter = filter === 'all' || fb.status === filter;
    const q = (searchTerm || '').toLowerCase().trim();
    const matchesSearch = q === '' || 
      (fb.subject && fb.subject.toLowerCase().includes(q)) ||
      (fb.message && fb.message.toLowerCase().includes(q)) ||
      (fb.user_email && fb.user_email.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const toggleSelect = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  const selectAll = () => setSelectedIds(filteredFeedbacks.map(f => f.id));
  const clearAll = () => setSelectedIds([]);

  const performBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === 'delete') {
      setShowDeleteConfirm(true);
      return;
    }
    try {
      await api.post('/feedback/bulk/', { ids: selectedIds, action: 'status', status: bulkAction });
      setFeedbacks(prev => prev.map(f => selectedIds.includes(f.id) ? { ...f, status: bulkAction } : f));
      setSelectedIds([]);
      setBulkAction('');
      setToast({ type: 'success', message: `Updated status for ${selectedIds.length} feedback items` });
    } catch {
      setToast({ type: 'error', message: 'Bulk action failed. Please try again.' });
    }
  };

  const confirmBulkDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.post('/feedback/bulk/', { ids: selectedIds, action: 'delete' });
      setFeedbacks(prev => prev.filter(f => !selectedIds.includes(f.id)));
      setSelectedIds([]);
      setBulkAction('');
      setToast({ type: 'success', message: `Deleted ${selectedIds.length} feedback items` });
    } catch {
      setToast({ type: 'error', message: 'Bulk delete failed. Please try again.' });
    }
  };

  const addResponse = async (feedbackId, message) => {
    try {
      const res = await api.post(`/feedback/${feedbackId}/responses/`, { message });
      setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, responses: [...(f.responses || []), res.data] } : f));
      return res.data;
    } catch {
      setToast({ type: 'error', message: 'Failed to send response' });
      return null;
    }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedFeedback?.responses]);

  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '';

  const getStatusCount = (status) => (feedbacks || []).filter(f => f.status === status).length;

  const bulkOptions = [
    { value: '', label: 'Bulk Actions' },
    { value: 'resolved', label: 'Mark as Resolved' },
    { value: 'closed', label: 'Close' },
    { value: 'delete', label: 'Delete' },
  ];

  const stats = {
    total: feedbacks.length,
    open: getStatusCount('open'),
    in_progress: getStatusCount('in_progress'),
    resolved: getStatusCount('resolved'),
    closed: getStatusCount('closed'),
  };

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
    .animate-fade-in-up { animation: fadeInUp 0.45s ease-out; }
    .animate-scale-in { animation: scaleIn 0.25s ease-out; }
  `;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <style>{customStyles}</style>

      {/* Toast */}
      <div aria-live="polite" className="fixed top-6 right-6 z-50">
        {toast && (
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg ${
              toast.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}
            role="status"
          >
            {toast.type === 'error' ? <FiAlertCircle className="text-xl" /> : <FiCheckCircle className="text-xl" />}
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <FiMessageCircle className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Feedback Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Review and respond to user feedback and inquiries</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh feedback"
            aria-label="Refresh feedback"
          >
            <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Feedback</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiMessageCircle className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Open</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.open}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiAlertCircle className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">In Progress</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.in_progress}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <FiRefreshCw className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Resolved</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.resolved}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <FiCheckCircle className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Closed</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.closed}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <FiX className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Search feedback by subject, message, or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                aria-label="Search feedback"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                aria-label="Filter by status"
              >
                <option value="all">All Status ({feedbacks.length})</option>
                <option value="open">Open ({stats.open})</option>
                <option value="in_progress">In Progress ({stats.in_progress})</option>
                <option value="resolved">Resolved ({stats.resolved})</option>
                <option value="closed">Closed ({stats.closed})</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredFeedbacks.length && filteredFeedbacks.length > 0}
                onChange={e => e.target.checked ? selectAll() : clearAll()}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select All ({selectedIds.length} selected)
              </span>
            </div>

            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              {bulkOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <button
              onClick={performBulkAction}
              disabled={!bulkAction || selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all font-semibold disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <FiRefreshCw className="w-6 h-6 animate-spin" />
              <div className="text-lg font-medium">Loading feedback...</div>
            </div>
          </div>
        ) : filteredFeedbacks.length > 0 ? (
          <div
            ref={listRef}
            className="max-h-[600px] overflow-y-auto"
          >
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredFeedbacks.map((fb, index) => (
                <div 
                  key={fb.id}
                  className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fade-in-up ${
                    selectedIds.includes(fb.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={(e) => {
                    if (e.target.type === 'checkbox' || e.target.closest('input[type="checkbox"]')) return;
                    setSelectedFeedback(fb);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(fb.id)}
                      onChange={() => toggleSelect(fb.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 mt-1 text-blue-600 rounded focus:ring-blue-500"
                      aria-label={`Select feedback ${fb.id}`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            {fb.subject}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                            {fb.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            fb.status === 'open' 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' 
                              : fb.status === 'in_progress' 
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                              : fb.status === 'resolved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                          }`}>
                            {fb.status.replace('_', ' ')}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            fb.priority === 'high' 
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                              : fb.priority === 'low'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
                          }`}>
                            {fb.priority || 'medium'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <FiUser className="w-4 h-4" />
                            {fb.user_email}
                          </div>
                          <div className="flex items-center gap-1">
                            <FiTag className="w-4 h-4" />
                            {getCategoryName(fb.category)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FiCalendar className="w-4 h-4" />
                            {formatDate(fb.created_at)}
                          </div>
                          {fb.rating && (
                            <div className="flex items-center gap-1">
                              <FiStar className="w-4 h-4" />
                              {fb.rating}/5
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <FiMessageCircle className="w-4 h-4" />
                            {fb.responses ? fb.responses.length : 0} responses
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedFeedback(fb); }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                          >
                            <FiEdit2 className="w-4 h-4" />
                            View & Respond
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && page > 1 && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Loading more...
                </div>
              </div>
            )}
            
            {!loading && hasMore && (
              <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setPage(p => p + 1)}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                >
                  Load More Feedback
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiMessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No feedback found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <FiTrash2 className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Feedback</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to delete <strong>{selectedIds.length}</strong> feedback item{selectedIds.length !== 1 ? 's' : ''}? All associated data will be permanently removed.
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-medium"
                  onClick={confirmBulkDelete}
                >
                  Delete Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <FeedbackDetail
          feedbackId={selectedFeedback.id}
          initialFeedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusUpdated={updated => setFeedbacks(prev => prev.map(f => f.id === updated.id ? updated : f))}
          addResponse={addResponse}
          formatDate={formatDate}
          getCategoryName={getCategoryName}
          chatEndRef={chatEndRef}
          setToast={setToast}
        />
      )}
    </div>
  );
}

function FeedbackDetail({
  feedbackId,
  initialFeedback,
  onClose,
  onStatusUpdated,
  addResponse,
  formatDate,
  getCategoryName,
  chatEndRef,
  setToast
}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [editing, setEditing] = useState(false);
  const [newStatus, setNewStatus] = useState(initialFeedback.status);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/feedback/${feedbackId}/`)
      .then(res => {
        setFeedback(res.data);
        setNewStatus(res.data.status);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [feedbackId]);

  const handleEditStatus = () => setEditing(true);
  const handleCancel = () => { setEditing(false); setNewStatus(feedback.status); };

  const handleSaveStatus = async () => {
    try {
      setLoading(true);
      const res = await api.patch(`/feedback/${feedbackId}/`, { status: newStatus });
      setFeedback(res.data);
      onStatusUpdated && onStatusUpdated(res.data);
      setEditing(false);
      setToast({ type: 'success', message: 'Status updated successfully' });
    } catch {
      setToast({ type: 'error', message: 'Failed to update status' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) return;
    const result = await addResponse(feedbackId, responseText.trim());
    if (result) {
      setResponseText('');
      setLoading(true);
      api.get(`/feedback/${feedbackId}/`)
        .then(res => {
          setFeedback(res.data);
          setNewStatus(res.data.status);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 animate-scale-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                <FiMessageCircle className="text-lg" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Feedback Conversation
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {feedback.user_email} • {formatDate(feedback.created_at)}
                </p>
              </div>
            </div>
            <button 
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              onClick={onClose}
            >
              <FiX className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Feedback Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject</h4>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {feedback.subject}
              </div>
              
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-4 mb-2">Message</h4>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {feedback.message}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</h4>
                <div className="flex items-center gap-3">
                  {editing ? (
                    <>
                      <select 
                        value={newStatus} 
                        onChange={e => setNewStatus(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        disabled={loading}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button 
                        onClick={handleSaveStatus}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button 
                        onClick={handleCancel}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        feedback.status === 'open' 
                          ? 'bg-amber-100 text-amber-800' 
                          : feedback.status === 'in_progress' 
                          ? 'bg-sky-100 text-sky-800'
                          : feedback.status === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {feedback.status.replace('_', ' ')}
                      </span>
                      <button 
                        onClick={handleEditStatus}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</h4>
                <div className="text-slate-900 dark:text-slate-100">
                  {getCategoryName(feedback.category)}
                </div>
              </div>

              {feedback.rating && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Rating</h4>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <FiStar className="w-4 h-4 text-amber-500" />
                    {feedback.rating}/5
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  feedback.priority === 'high' 
                    ? 'bg-rose-100 text-rose-800'
                    : feedback.priority === 'low'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {feedback.priority || 'medium'}
                </span>
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Conversation</h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 max-h-80 overflow-y-auto">
              {feedback.responses && feedback.responses.length > 0 ? (
                <div className="space-y-4">
                  {feedback.responses.map((r, idx) => (
                    <div 
                      key={r.id || idx} 
                      className={`p-4 rounded-2xl ${
                        r.admin 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 ml-8' 
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            r.admin 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-slate-500 text-white'
                          }`}>
                            {r.admin ? 'A' : 'U'}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {r.admin ? 'Admin' : r.user_email || 'User'}
                          </span>
                        </div>
                        <span className="text-sm text-slate-500">
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {r.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FiMessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No conversation yet.</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmitResponse} className="mt-4">
              <div className="flex gap-3">
                <textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  rows={3}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Type your response..."
                  required
                />
                <button 
                  type="submit" 
                  disabled={loading || !responseText.trim()}
                  className="self-end inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all font-semibold disabled:opacity-50"
                >
                  <FiSend className="w-4 h-4" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}