import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api'; // your axios instance with auth
import './FeedbackManagement.css';

const PAGE_SIZE = 20;

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch categories
  useEffect(() => {
    api.get('/feedback/categories/')
      .then(res => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  // Fetch feedbacks with pagination
  useEffect(() => {
    setLoading(true);
    api.get(`/feedback/all/?page=${page}&page_size=${PAGE_SIZE}`)
      .then(res => {
        const pageFeedbacks = Array.isArray(res.data.results) ? res.data.results : [];
        setFeedbacks(prev => page === 1 ? pageFeedbacks : [...prev, ...pageFeedbacks]);
        setHasMore(!!res.data.next);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load feedbacks');
        setLoading(false);
      });
    // eslint-disable-next-line
  }, [page]);

  // Infinite scroll
  const listRef = useRef();
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current || loading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollHeight - scrollTop <= clientHeight + 100) {
        setPage(prev => hasMore ? prev + 1 : prev);
      }
    };
    const ref = listRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => {
      if (ref) ref.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loading]);

  // Helper to get category name
  const getCategoryName = (categoryObj) => {
    if (!categoryObj) return '';
    if (typeof categoryObj === 'object' && categoryObj.name) return categoryObj.name;
    if (typeof categoryObj === 'number') {
      const found = categories.find(c => c.id === categoryObj);
      return found ? found.name : '';
    }
    return '';
  };

  // Filter feedbacks
  const filteredFeedbacks = (feedbacks || []).filter(feedback => {
    const matchesFilter = filter === 'all' || feedback.status === filter;
    const matchesSearch =
      feedback.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Bulk select helpers
  const toggleSelect = (id) => setSelectedIds(ids =>
    ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  const selectAll = () => setSelectedIds(filteredFeedbacks.map(f => f.id));
  const clearAll = () => setSelectedIds([]);

  // Bulk actions with confirmation for delete
  const performBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === 'delete') {
      setShowDeleteConfirm(true);
      return;
    }
    try {
      await api.post('/feedback/bulk/', { ids: selectedIds, action: 'status', status: bulkAction });
      setFeedbacks(prev => prev.map(f =>
        selectedIds.includes(f.id) ? { ...f, status: bulkAction } : f
      ));
      setSelectedIds([]);
      setBulkAction('');
    } catch {
      alert('Bulk action failed. Try again.');
    }
  };

  const confirmBulkDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.post('/feedback/bulk/', { ids: selectedIds, action: 'delete' });
      setFeedbacks(prev => prev.filter(f => !selectedIds.includes(f.id)));
      setSelectedIds([]);
      setBulkAction('');
    } catch {
      alert('Bulk delete failed. Try again.');
    }
  };

  // Add response (threaded, as chat)
  // Returns the new response object for local update if needed
  const addResponse = async (feedbackId, message) => {
    try {
      const res = await api.post(`/feedback/${feedbackId}/responses/`, { message });
      setFeedbacks(prev => prev.map(f =>
        f.id === feedbackId
          ? { ...f, responses: [...(f.responses || []), res.data] }
          : f
      ));
      return res.data;
    } catch {
      alert('Failed to send response');
      return null;
    }
  };

  // Scroll to bottom of chat when opening detail modal or new response added
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedFeedback?.responses]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusCount = (status) => (feedbacks || []).filter(f => f.status === status).length;

  // Bulk action UI options
  const bulkOptions = [
    { value: '', label: 'Bulk Actions' },
    { value: 'resolved', label: 'Mark as Resolved' },
    { value: 'closed', label: 'Close' },
    { value: 'delete', label: 'Delete' },
  ];

  return (
    <div className="fm-container">
      <div className="fm-header">
        <h2>Feedback Management</h2>
        <p>Review and respond to user feedback and inquiries</p>
      </div>
      <div className="fm-controls">
        <div className="fm-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="fm-filters">
          <div className="fm-filter-group">
            <label>Filter by status:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All ({feedbacks.length})</option>
              <option value="open">Open ({getStatusCount('open')})</option>
              <option value="in_progress">In Progress ({getStatusCount('in_progress')})</option>
              <option value="resolved">Resolved ({getStatusCount('resolved')})</option>
              <option value="closed">Closed ({getStatusCount('closed')})</option>
            </select>
          </div>
          <div className="fm-bulk-group">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredFeedbacks.length && filteredFeedbacks.length > 0}
              onChange={e => e.target.checked ? selectAll() : clearAll()}
            />
            <span style={{marginRight: 8}}>Select All</span>
            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              style={{marginRight: 8, minWidth: 120}}
            >
              {bulkOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="fm-btn fm-btn-primary"
              disabled={!bulkAction || selectedIds.length === 0}
              onClick={performBulkAction}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="fm-stats">
        <div className="fm-stat-card">
          <div className="fm-stat-icon fm-stat-open">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className="fm-stat-info">
            <h3>{getStatusCount('open')}</h3>
            <p>Open</p>
          </div>
        </div>
        <div className="fm-stat-card">
          <div className="fm-stat-icon fm-stat-progress">
            <i className="fas fa-clock"></i>
          </div>
          <div className="fm-stat-info">
            <h3>{getStatusCount('in_progress')}</h3>
            <p>In Progress</p>
          </div>
        </div>
        <div className="fm-stat-card">
          <div className="fm-stat-icon fm-stat-resolved">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="fm-stat-info">
            <h3>{getStatusCount('resolved')}</h3>
            <p>Resolved</p>
          </div>
        </div>
        <div className="fm-stat-card">
          <div className="fm-stat-icon fm-stat-closed">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="fm-stat-info">
            <h3>{getStatusCount('closed')}</h3>
            <p>Closed</p>
          </div>
        </div>
      </div>

      <div className="fm-list" ref={listRef} style={{maxHeight: 500, overflowY: 'auto'}}>
        {loading && page === 1 ? (
          <div className="fm-loading">Loading feedbacks...</div>
        ) : error ? (
          <div className="fm-error">{error}</div>
        ) : filteredFeedbacks.length > 0 ? (
          filteredFeedbacks.map(feedback => (
            <div 
              key={feedback.id} 
              className={`fm-item fm-item-${feedback.status} fm-priority-${feedback.priority || 'medium'} ${selectedIds.includes(feedback.id) ? 'fm-selected' : ''}`}
              onClick={e => {
                // Prevent modal open if clicking checkbox
                if (e.target && (e.target.type === 'checkbox' || e.target.className === 'fm-checkbox')) return;
                setSelectedFeedback(feedback);
              }}
            >
              <input
                type="checkbox"
                className="fm-checkbox"
                checked={selectedIds.includes(feedback.id)}
                onChange={() => toggleSelect(feedback.id)}
                style={{marginRight: 8}}
                onClick={e => e.stopPropagation()}
              />
              <div className="fm-item-header">
                <h3>{feedback.subject}</h3>
                <div className="fm-item-badges">
                  <span className={`fm-status fm-status-${feedback.status}`}>
                    {feedback.status.replace('_', ' ')}
                  </span>
                  <span className={`fm-priority fm-priority-${feedback.priority}`}>
                    {feedback.priority}
                  </span>
                </div>
              </div>
              <div className="fm-meta">
                <span><i className="fas fa-user"></i> {feedback.user_email}</span>
                <span><i className="fas fa-tag"></i> {getCategoryName(feedback.category)}</span>
                <span><i className="fas fa-calendar"></i> {formatDate(feedback.created_at)}</span>
                {feedback.rating && (
                  <span className="fm-rating">
                    <i className="fas fa-star"></i> {feedback.rating}/5
                  </span>
                )}
              </div>
              <p className="fm-message">{feedback.message}</p>
              <div className="fm-response-count">
                <i className="fas fa-comments"></i> {feedback.responses ? feedback.responses.length : 0} responses
              </div>
            </div>
          ))
        ) : (
          <div className="fm-no-feedback">
            <i className="fas fa-comment-slash"></i>
            <h3>No feedback found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
        {loading && page > 1 && <div className="fm-loading">Loading more...</div>}
        {hasMore && !loading && (
          <button className="fm-btn fm-btn-secondary" style={{margin: 20}} onClick={() => setPage(p => p + 1)}>
            Load More
          </button>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fm-modal-overlay">
          <div className="fm-modal am-confirm-modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to <b>delete {selectedIds.length} feedback(s)</b>?<br />
              <span style={{color: 'red'}}>This action cannot be undone.</span>
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="fm-btn" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="fm-btn fm-btn-primary" style={{background:'#c62828'}} onClick={confirmBulkDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedFeedback && (
        <FeedbackDetail 
          feedbackId={selectedFeedback.id}
          initialFeedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusUpdated={updatedFeedback => setFeedbacks(prev => prev.map(f => f.id === updatedFeedback.id ? updatedFeedback : f))}
          addResponse={addResponse}
          formatDate={formatDate}
          getCategoryName={getCategoryName}
          chatEndRef={chatEndRef}
        />
      )}
    </div>
  );
};

// Modal with explicit Edit, Save, Cancel logic for status
const FeedbackDetail = ({
  feedbackId,
  initialFeedback,
  onClose,
  onStatusUpdated,
  addResponse,
  formatDate,
  getCategoryName,
  chatEndRef
}) => {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [editing, setEditing] = useState(false);
  const [newStatus, setNewStatus] = useState(initialFeedback.status);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch latest feedback info (for new responses)
  useEffect(() => {
    setLoading(true);
    api.get(`/feedback/${feedbackId}/`)
      .then(res => {
        setFeedback(res.data);
        setNewStatus(res.data.status);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line
  }, [feedbackId]);

  const handleEditStatus = () => setEditing(true);
  const handleCancelEdit = () => {
    setEditing(false);
    setNewStatus(feedback.status);
  };

  const handleSaveStatus = async () => {
    try {
      setLoading(true);
      const res = await api.patch(`/feedback/${feedbackId}/`, { status: newStatus });
      setFeedback(res.data);
      setEditing(false);
      onStatusUpdated && onStatusUpdated(res.data);
      setLoading(false);
    } catch {
      setLoading(false);
      alert('Failed to update status');
    }
  };

  // --- RECOMMENDED FIX: Fetch conversation after sending ---
  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (responseText.trim()) {
      await addResponse(feedbackId, responseText.trim());
      setResponseText('');
      // Fetch updated feedback so the new message appears immediately
      setLoading(true);
      api.get(`/feedback/${feedbackId}/`)
        .then(res => {
          setFeedback(res.data);
          setNewStatus(res.data.status);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  };

  return (
    <div className="fm-modal-overlay">
      <div className="fm-modal">
        <div className="fm-modal-header">
          <h3>Feedback Conversation</h3>
          <button className="fm-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="fm-detail" style={{maxHeight: 600, overflowY: 'auto'}}>
          <div className="fm-detail-header">
            <h3>{feedback.subject}</h3>
            <div className="fm-detail-badges">
              <span className={`fm-status fm-status-${feedback.status}`}>
                {feedback.status.replace('_', ' ')}
              </span>
              <span className={`fm-priority fm-priority-${feedback.priority}`}>
                {feedback.priority}
              </span>
            </div>
          </div>
          <div className="fm-detail-meta">
            <div className="fm-meta-item">
              <i className="fas fa-user"></i>
              <div>
                <strong>User</strong>
                <p>{feedback.user_email}</p>
              </div>
            </div>
            <div className="fm-meta-item">
              <i className="fas fa-tag"></i>
              <div>
                <strong>Category</strong>
                <p>{getCategoryName(feedback.category)}</p>
              </div>
            </div>
            <div className="fm-meta-item">
              <i className="fas fa-calendar"></i>
              <div>
                <strong>Date</strong>
                <p>{formatDate(feedback.created_at)}</p>
              </div>
            </div>
            {feedback.rating && (
              <div className="fm-meta-item">
                <i className="fas fa-star"></i>
                <div>
                  <strong>Rating</strong>
                  <p>{feedback.rating}/5</p>
                </div>
              </div>
            )}
          </div>
          <div className="fm-detail-message">
            <h4>Message</h4>
            <div className="fm-message-content">
              <p>{feedback.message}</p>
            </div>
          </div>

          {/* Editable Status Section */}
          <div className="fm-status-controls">
            <label>Status:</label>
            {editing ? (
              <>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} disabled={loading}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button className="fm-btn fm-btn-primary" style={{marginLeft: 5}} onClick={handleSaveStatus} disabled={loading}>
                  Save
                </button>
                <button className="fm-btn" style={{marginLeft: 5}} onClick={handleCancelEdit} disabled={loading}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span style={{marginLeft: 8, marginRight: 8}}>{feedback.status.replace('_', ' ')}</span>
                <button className="fm-btn fm-btn-primary" style={{marginLeft: 5}} onClick={handleEditStatus}>
                  Edit
                </button>
              </>
            )}
          </div>

          {/* Threaded chat */}
          <div className="fm-threaded-chat">
            <h4>Conversation</h4>
            <div className="fm-chat-messages" style={{maxHeight: 280, overflowY: 'auto', background: '#f8f9fa', borderRadius: 6, padding: 10, marginBottom: 12}}>
              {feedback.responses && feedback.responses.length > 0 ? (
                feedback.responses.map((resp, idx) => (
                  <div
                    key={resp.id || idx}
                    className={`fm-chat-bubble ${resp.admin ? 'fm-chat-admin' : 'fm-chat-user'}`}
                  >
                    <div className="fm-chat-meta">
                      <strong>{resp.admin ? 'Admin' : resp.user_email || 'User'}</strong>
                      <span style={{marginLeft: 12, fontSize: 12, color: '#888'}}>{formatDate(resp.created_at)}</span>
                    </div>
                    <div className="fm-chat-text">{resp.message}</div>
                  </div>
                ))
              ) : (
                <p className="fm-no-responses">No conversation yet.</p>
              )}
              <div ref={chatEndRef}></div>
            </div>
            <form onSubmit={handleSubmitResponse} className="fm-response-form" style={{display: 'flex', gap: 8}}>
              <textarea
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                style={{flex: 1, resize: 'none'}}
                required
              />
              <button type="submit" className="fm-btn fm-btn-primary" disabled={loading || !responseText.trim()}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackManagement;