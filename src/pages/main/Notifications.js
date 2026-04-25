import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FiSearch,
  FiEye,
  FiEyeOff,
  FiUsers,
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
  
  // Search/filter/sort state (read-only for non-admin)
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

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

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/announcements/?page_size=${PAGE_SIZE}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined }
      });
      const data = Array.isArray(res.data.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
      setAnnouncements(data);
      setToast({ type: 'success', message: `Loaded ${data.length} announcements` });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
      setToast({ type: 'error', message: 'Failed to load announcements' });
    }
  };

  const formatDate = (str) => str ? new Date(str).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : '';

  // Calculate stats (read-only view)
  const stats = {
    total: announcements.length,
    active: announcements.filter(a => a.status === 'active').length,
    inactive: announcements.filter(a => a.status === 'inactive').length,
    highPriority: announcements.filter(a => a.priority === 'high').length,
  };

  const filteredAnnouncements = announcements
    .filter(a => {
      const q = searchQuery?.toLowerCase() || '';
      const matchesSearch = q === '' || (a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q));
      const matchesPriority = priorityFilter ? a.priority === priorityFilter : true;
      const matchesStatus = statusFilter ? (statusFilter === 'active' ? a.status === 'active' : a.status === 'inactive') : true;
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

      {/* Header - Removed Create Announcement button */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <FiBarChart2 className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Announcements</h1>
            <p className="text-slate-600 dark:text-slate-400">View institutional announcements and updates</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnnouncements}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh announcements"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards - Read Only */}
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

      {/* Filters - Read Only */}
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

      {/* Announcements Table - Read Only View */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiBarChart2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No announcements found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search or filter criteria
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
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Priority</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Start Date</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">End Date</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map((announcement, index) => (
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
                          announcement.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                          {announcement.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden p-6 space-y-4">
              {filteredAnnouncements.map((announcement, index) => (
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
                              announcement.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {announcement.status}
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
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}