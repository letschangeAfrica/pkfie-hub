import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiUsers,
  FiTrash2,
  FiX,
  FiCalendar,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
  FiBarChart2
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const PAGE_SIZE = 50;

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal',
    start_date: '',
    end_date: '',
    status_write: 'active'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true); // Added loading state

  // Search/filter/sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState({ show: false, announcementId: null, announcementTitle: '' });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, announcementId: null, announcementTitle: '', currentStatus: '' });

  // Viewers modal state
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [viewersAnnouncement, setViewersAnnouncement] = useState(null);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null);
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
    fetchAnnouncements();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements/`, {
        headers: { ...getAuthHeaders() },
        params: { page_size: PAGE_SIZE }
      });
      
      // Handle different response formats - FIXED
      let data = [];
      if (res.data && Array.isArray(res.data.results)) {
        data = res.data.results;
      } else if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else if (res.data) {
        // If it's an object with announcements, try to extract array
        data = res.data.announcements || [];
      }
      
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
      setToast({ type: 'error', message: 'Failed to load announcements' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    // Set default start date to current datetime - FIXED
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    setNewAnnouncement({
      title: '',
      content: '',
      priority: 'normal',
      start_date: localDateTime,
      end_date: '',
      status_write: 'active'
    });
    setShowForm(true);
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    
    // Convert dates to local datetime format - FIXED
    const startDate = announcement.start_date ? 
      new Date(announcement.start_date).toISOString().slice(0, 16) : '';
    const endDate = announcement.end_date ? 
      new Date(announcement.end_date).toISOString().slice(0, 16) : '';
    
    setNewAnnouncement({
      title: announcement.title || '',
      content: announcement.content || '',
      priority: announcement.priority || 'normal',
      start_date: startDate,
      end_date: endDate,
      status_write: announcement.is_active ? 'active' : 'inactive' // Use is_active instead of status - FIXED
    });
    setShowForm(true);
  };

  const toDateTimeString = (dateStr) => {
    if (!dateStr) return null;
    // Ensure proper datetime format for backend - FIXED
    if (dateStr.length === 16) {
      return dateStr + ':00'; // Add seconds if missing
    }
    return dateStr;
  };

  const handleSaveAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      setToast({ type: 'error', message: 'Title and content are required' });
      return;
    }

    setSaving(true);
    
    // Prepare payload according to backend expectations - FIXED
    const payload = {
      title: newAnnouncement.title.trim(),
      content: newAnnouncement.content.trim(),
      priority: newAnnouncement.priority,
      start_date: toDateTimeString(newAnnouncement.start_date),
      status_write: newAnnouncement.status_write
    };

    // Only include end_date if provided and valid - FIXED
    if (newAnnouncement.end_date && newAnnouncement.end_date.trim()) {
      payload.end_date = toDateTimeString(newAnnouncement.end_date);
    } else {
      payload.end_date = null; // Explicitly set to null if empty
    }

    try {
      if (editingAnnouncement) {
        await axios.patch(
          `${BASE_URL}/api/announcements/${editingAnnouncement.id}/`,
          payload,
          { headers: { ...getAuthHeaders() } }
        );
        setToast({ type: 'success', message: 'Announcement updated successfully' });
      } else {
        await axios.post(
          `${BASE_URL}/api/announcements/`,
          payload,
          { headers: { ...getAuthHeaders() } }
        );
        setToast({ type: 'success', message: 'Announcement created successfully' });
      }
      setShowForm(false);
      setEditingAnnouncement(null);
      setNewAnnouncement({ 
        title: '', 
        content: '', 
        priority: 'normal', 
        start_date: '', 
        end_date: '', 
        status_write: 'active' 
      });
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      let errorMsg = 'Error saving announcement';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.detail) {
          errorMsg = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          // Handle field errors
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          errorMsg = fieldErrors || JSON.stringify(error.response.data);
        }
      } else {
        errorMsg = error.message;
      }
      
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (announcement) => {
    // Use is_active field directly from backend - FIXED
    const currentStatus = announcement.is_active;
    setConfirmToggle({ 
      show: true, 
      announcementId: announcement.id, 
      announcementTitle: announcement.title,
      currentStatus: currentStatus ? 'active' : 'inactive' // Convert to string for display
    });
  };

  const confirmToggleAnnouncementStatus = async () => {
    const { announcementId, currentStatus } = confirmToggle;
    setConfirmToggle({ show: false, announcementId: null, announcementTitle: '', currentStatus: '' });
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      await axios.patch(
        `${BASE_URL}/api/announcements/${announcementId}/`,
        { status_write: newStatus },
        { headers: { ...getAuthHeaders() } }
      );
      await fetchAnnouncements();
      setToast({ type: 'success', message: `Announcement ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
      console.error('Error updating announcement status:', error);
      setToast({ type: 'error', message: 'Error updating announcement status' });
    }
  };

  const handleDeleteAnnouncement = (announcement) => {
    setConfirmDelete({ 
      show: true, 
      announcementId: announcement.id, 
      announcementTitle: announcement.title 
    });
  };

  const confirmDeleteAnnouncement = async () => {
    const { announcementId } = confirmDelete;
    setConfirmDelete({ show: false, announcementId: null, announcementTitle: '' });
    
    try {
      await axios.delete(`${BASE_URL}/api/announcements/${announcementId}/`, {
        headers: { ...getAuthHeaders() }
      });
      await fetchAnnouncements();
      setToast({ type: 'success', message: 'Announcement deleted successfully' });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setToast({ type: 'error', message: 'Error deleting announcement' });
    }
  };
  
  const fetchViewers = async (announcementId) => {
    setLoadingViewers(true);
    
    try {
      const res = await axios.get(
        `${BASE_URL}/api/announcements/views/`,
        { 
          headers: { ...getAuthHeaders() },
          params: { announcement: announcementId }
        }
      );
      
      // Handle different response formats
      let viewersData = [];
      if (res.data && Array.isArray(res.data.results)) {
        viewersData = res.data.results;
      } else if (Array.isArray(res.data)) {
        viewersData = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        viewersData = res.data.data;
      }
      
      setViewers(Array.isArray(viewersData) ? viewersData : []);
      setShowViewers(true);
      setViewersAnnouncement(announcements.find(a => a.id === announcementId));
    } catch (err) {
      console.error('fetchViewers error:', err);
      if (err.response?.status === 404) {
        setToast({ type: 'error', message: 'Viewers endpoint not found. Please check backend configuration.' });
      } else if (err.response?.status === 403) {
        setToast({ type: 'error', message: 'Permission denied. You need staff privileges to view readers.' });
      } else if (err.response?.status === 400) {
        setToast({ type: 'error', message: 'Bad request. Please check the announcement ID.' });
      } else {
        setToast({ type: 'error', message: 'Failed to fetch viewers. Please try again.' });
      }
      setViewers([]);
    } finally {
      setLoadingViewers(false);
    }
  };

  const formatDate = (str) => {
    if (!str) return 'Not set';
    try {
      return new Date(str).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Calculate stats - FIXED to use proper status calculation
  const calculateStatus = (announcement) => {
    if (!announcement.is_active) return 'inactive';
    
    const now = new Date();
    const startDate = new Date(announcement.start_date);
    const endDate = announcement.end_date ? new Date(announcement.end_date) : null;
    
    if (startDate > now) return 'inactive';
    if (endDate && endDate < now) return 'inactive';
    
    return 'active';
  };

  const stats = {
    total: announcements.length,
    active: announcements.filter(a => calculateStatus(a) === 'active').length,
    inactive: announcements.filter(a => calculateStatus(a) === 'inactive').length,
    highPriority: announcements.filter(a => a.priority === 'high').length,
  };

  const filteredAnnouncements = announcements
    .filter(a => {
      const q = searchQuery?.toLowerCase() || '';
      const matchesSearch = q === '' || 
        (a.title?.toLowerCase().includes(q) || 
         a.content?.toLowerCase().includes(q) ||
         a.author_email?.toLowerCase().includes(q));
      const matchesPriority = priorityFilter ? a.priority === priorityFilter : true;
      
      // Use calculated status for filtering - FIXED
      const announcementStatus = calculateStatus(a);
      const matchesStatus = statusFilter ? announcementStatus === statusFilter : true;
      
      return matchesSearch && matchesPriority && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      return new Date(a.created_at) - new Date(b.created_at);
    });

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
    .animate-fade-in-up { animation: fadeInUp 0.45s ease-out; }
    .animate-scale-in { animation: scaleIn 0.25s ease-out; }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <style>{customStyles}</style>

      {/* Toast Notification */}
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
            <FiBarChart2 className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Announcement Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Create and manage announcements for your institution</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnnouncements}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh announcements"
            disabled={loading}
          >
            <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCreateAnnouncement}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all font-semibold"
            disabled={loading}
          >
            <FiPlus className="w-5 h-5" /> Create Announcement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Announcements</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiBarChart2 className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Active</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.active}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <FiEye className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Inactive</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.inactive}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiEyeOff className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">High Priority</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.highPriority}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400">
              <FiAlertCircle className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Search announcements by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="newest">Newest to Oldest</option>
                <option value="oldest">Oldest to Newest</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <FiRefreshCw className="w-6 h-6 animate-spin" />
              <div className="text-lg font-medium">Loading announcements...</div>
            </div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiBarChart2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {announcements.length === 0 ? 'No announcements' : 'No matching announcements'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {announcements.length === 0 
                ? 'Get started by creating your first announcement' 
                : 'Try adjusting your search or filter criteria'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full table-auto">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Announcement</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Author</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Priority</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Start Date</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">End Date</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map((announcement, index) => {
                    const effectiveStatus = calculateStatus(announcement);
                    return (
                      <tr 
                        key={announcement.id} 
                        className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-800 dark:text-slate-100">{announcement.title}</div>
                            {announcement.content && (
                              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {announcement.content}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-slate-600 dark:text-slate-400">
                          {announcement.author_email || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            announcement.priority === 'high' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : announcement.priority === 'low'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {announcement.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="w-4 h-4 text-slate-400" />
                            {formatDate(announcement.start_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="w-4 h-4 text-slate-400" />
                            {formatDate(announcement.end_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            effectiveStatus === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                            {effectiveStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditAnnouncement(announcement)}
                              className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(announcement)}
                              className={`p-2 rounded-xl transition-all ${
                                announcement.is_active
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                  : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                              }`}
                              title={announcement.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {announcement.is_active ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => fetchViewers(announcement.id)}
                              className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
                              title="Viewers"
                            >
                              <FiUsers className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(announcement)}
                              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden p-6 space-y-4">
              {filteredAnnouncements.map((announcement, index) => {
                const effectiveStatus = calculateStatus(announcement);
                return (
                  <div 
                    key={announcement.id}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">{announcement.title}</div>
                            <div className="text-xs text-slate-500 mt-1">By: {announcement.author_email || 'Unknown'}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                announcement.priority === 'high' 
                                  ? 'bg-red-100 text-red-800'
                                  : announcement.priority === 'low'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {announcement.priority}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                effectiveStatus === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {effectiveStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {announcement.content && (
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                            {announcement.content}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <FiCalendar className="w-4 h-4" />
                            {formatDate(announcement.start_date)}
                          </div>
                          {announcement.end_date && (
                            <div className="flex items-center gap-1">
                              <FiCalendar className="w-4 h-4" />
                              {formatDate(announcement.end_date)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEditAnnouncement(announcement)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(announcement)}
                            className={`p-2 rounded-xl transition-all ${
                              announcement.is_active
                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {announcement.is_active ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => fetchViewers(announcement.id)}
                            className="p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all"
                          >
                            <FiUsers className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAnnouncement(announcement)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Announcement Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <FiPlus className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {editingAnnouncement ? 'Update the announcement details' : 'Add a new announcement to the system'}
                    </p>
                  </div>
                </div>
                <button 
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  onClick={() => setShowForm(false)}
                >
                  <FiX className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                <input
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Enter announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Content *</label>
                <textarea
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  rows={4}
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Enter announcement content"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
                  <select
                    value={newAnnouncement.priority}
                    onChange={(e) => setNewAnnouncement((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                  <select
                    value={newAnnouncement.status_write}
                    onChange={(e) => setNewAnnouncement((p) => ({ ...p, status_write: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newAnnouncement.start_date}
                    onChange={(e) => setNewAnnouncement((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    value={newAnnouncement.end_date}
                    onChange={(e) => setNewAnnouncement((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAnnouncement}
                  disabled={!newAnnouncement.title.trim() || !newAnnouncement.content.trim() || !newAnnouncement.start_date || saving}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (editingAnnouncement ? 'Update Announcement' : 'Create Announcement')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete({ show: false, announcementId: null, announcementTitle: '' })} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <FiTrash2 className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Announcement</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to delete <strong>"{confirmDelete.announcementTitle}"</strong>? This announcement will be permanently removed.
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setConfirmDelete({ show: false, announcementId: null, announcementTitle: '' })}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-medium"
                  onClick={confirmDeleteAnnouncement}
                >
                  Delete Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {confirmToggle.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmToggle({ show: false, announcementId: null, announcementTitle: '', currentStatus: '' })} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  confirmToggle.currentStatus === 'active' 
                    ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                    : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}>
                  {confirmToggle.currentStatus === 'active' ? <FiEyeOff className="text-xl" /> : <FiEye className="text-xl" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {confirmToggle.currentStatus === 'active' ? 'Deactivate Announcement' : 'Activate Announcement'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {confirmToggle.currentStatus === 'active' ? 'Temporarily hide announcement' : 'Make announcement visible'}
                  </p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to {confirmToggle.currentStatus === 'active' ? 'deactivate' : 'activate'} <strong>"{confirmToggle.announcementTitle}"</strong>?
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setConfirmToggle({ show: false, announcementId: null, announcementTitle: '', currentStatus: '' })}
                >
                  Cancel
                </button>
                <button 
                  className={`flex-1 px-4 py-3 rounded-xl text-white transition-all font-medium ${
                    confirmToggle.currentStatus === 'active'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                  onClick={confirmToggleAnnouncementStatus}
                >
                  {confirmToggle.currentStatus === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewers Modal */}
      {showViewers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowViewers(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <FiUsers className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Viewers for "{viewersAnnouncement?.title}"
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Users who have viewed this announcement
                    </p>
                  </div>
                </div>
                <button 
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  onClick={() => setShowViewers(false)}
                >
                  <FiX className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {loadingViewers ? (
                <div className="text-center py-8">
                  <FiRefreshCw className="w-8 h-8 mx-auto text-slate-400 mb-4 animate-spin" />
                  <p className="text-slate-500 dark:text-slate-400">Loading viewers...</p>
                </div>
              ) : viewers.length === 0 ? (
                <div className="text-center py-8">
                  <FiUsers className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No users have viewed this announcement yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {viewers.map((view, idx) => (
                    <li key={view.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {view.user_email || view.user_full_name || `User ${view.user}`}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Viewed {formatDate(view.viewed_at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}