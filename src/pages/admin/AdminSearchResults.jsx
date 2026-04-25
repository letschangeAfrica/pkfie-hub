import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowLeft,
  FiSearch,
  FiUsers,
  FiCalendar,
  FiUser,
  FiMessageSquare,
  FiMapPin,
  FiAlertCircle,
  FiClock,
  FiStar,
  FiChevronRight,
  FiBell
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export default function AdminSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const query = params.get('q') || '';

  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
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
    if (!query.trim()) {
      setUsers([]);
      setAnnouncements([]);
      setEvents([]);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    Promise.all([
      axios.get(`${BASE_URL}/api/users/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => {
        console.error('Error fetching users:', err);
        return { data: { results: [], data: [] } };
      }),
      axios.get(`${BASE_URL}/api/announcements/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => {
        console.error('Error fetching announcements:', err);
        return { data: { results: [], data: [] } };
      }),
      axios.get(`${BASE_URL}/api/events/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => {
        console.error('Error fetching events:', err);
        return { data: { results: [], data: [] } };
      }),
    ])
      .then(([userRes, annRes, eventRes]) => {
        setUsers(userRes.data.results || userRes.data || []);
        setAnnouncements(annRes.data.results || annRes.data || []);
        setEvents(eventRes.data.results || eventRes.data || []);
        
        const totalResults = 
          (userRes.data.results || userRes.data || []).length +
          (annRes.data.results || annRes.data || []).length +
          (eventRes.data.results || eventRes.data || []).length;
        
        if (totalResults === 0) {
          setToast({ type: 'info', message: `No results found for "${query}"` });
        } else {
          setToast({ type: 'success', message: `Found ${totalResults} results for "${query}"` });
        }
      })
      .catch((err) => {
        console.error('Search error:', err);
        setToast({ type: 'error', message: 'Failed to load search results' });
        setUsers([]);
        setAnnouncements([]);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [query]);

  const totalResults = users.length + announcements.length + events.length;
  const nothingFound = !loading && totalResults === 0;

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
    .animate-fade-in-up { animation: fadeInUp 0.45s ease-out; }
    .animate-scale-in { animation: scaleIn 0.25s ease-out; }
  `;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'staff': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'student': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
    }
  };

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
                : toast.type === 'info'
                ? 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}
            role="status"
          >
            {toast.type === 'error' ? (
              <FiAlertCircle className="text-xl" />
            ) : toast.type === 'info' ? (
              <FiSearch className="text-xl" />
            ) : (
              <FiSearch className="text-xl" />
            )}
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
            aria-label="Go back"
          >
            <FiArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Search Results</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {query ? `Searching for "${query}"` : 'Enter a search term to find users, announcements, and events'}
            </p>
          </div>
        </div>

        {query && (
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalResults}</div>
            <div className="text-sm text-slate-500">Total Results</div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center animate-fade-in-up">
          <div className="flex flex-col items-center justify-center gap-4">
            <FiSearch className="w-12 h-12 text-slate-400 animate-pulse" />
            <div className="text-lg font-medium text-slate-700 dark:text-slate-300">Searching...</div>
            <div className="text-sm text-slate-500">Looking for users, announcements, and events</div>
          </div>
        </div>
      )}

      {/* No Results */}
      {nothingFound && query && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center animate-fade-in-up">
          <div className="flex flex-col items-center justify-center gap-4">
            <FiSearch className="w-16 h-16 text-slate-400" />
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              No results found for "<span className="text-purple-600">{query}</span>"
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-md">
              Try adjusting your search terms or check for spelling errors. Search across users, announcements, and events.
            </p>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {!loading && totalResults > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Users Section */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FiUsers className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Users</h3>
                    <p className="text-sm text-slate-500">Matching user accounts</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.length}</div>
                  <div className="text-xs text-slate-500">found</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <FiUser className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                  <div className="text-sm text-slate-500">No users found</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {user.first_name} {user.last_name}
                          </div>
                          {user.role && (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 truncate">{user.email}</div>
                        {user.department && (
                          <div className="text-xs text-slate-400 mt-1">{user.department}</div>
                        )}
                      </div>
                      <FiChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Announcements Section */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <FiBell className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Announcements</h3>
                    <p className="text-sm text-slate-500">Matching announcements</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{announcements.length}</div>
                  <div className="text-xs text-slate-500">found</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <FiMessageSquare className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                  <div className="text-sm text-slate-500">No announcements found</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement, index) => (
                    <div
                      key={announcement.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/admin/announcements/${announcement.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                            {announcement.title}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {announcement.content}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(announcement.priority)}`}>
                            {announcement.priority || 'normal'}
                          </span>
                          <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                        {announcement.start_date && (
                          <div className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {formatDate(announcement.start_date)}
                          </div>
                        )}
                        {announcement.status && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            announcement.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {announcement.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Events Section */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
                    <FiCalendar className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Events</h3>
                    <p className="text-sm text-slate-500">Matching events</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{events.length}</div>
                  <div className="text-xs text-slate-500">found</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <FiCalendar className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                  <div className="text-sm text-slate-500">No events found</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/admin/events/${event.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                            {event.title}
                          </div>
                          {event.description && (
                            <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                              {event.description}
                            </div>
                          )}
                        </div>
                        <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors mt-1" />
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                        {event.start_time && (
                          <div className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {formatDate(event.start_time)}
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <FiMapPin className="w-3 h-3" />
                            <span className="truncate max-w-20">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {event.end_time && event.start_time && (
                        <div className="text-xs text-slate-400 mt-1">
                          Duration: {Math.ceil((new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60 * 60))}h
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!loading && query && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 animate-fade-in-up">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate(`/admin/users?search=${encodeURIComponent(query)}`)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <FiUsers className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">View All Users</div>
                  <div className="text-sm text-slate-500">See complete user list</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => navigate(`/admin/announcements?search=${encodeURIComponent(query)}`)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <FiBell className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">View All Announcements</div>
                  <div className="text-sm text-slate-500">See complete announcements</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => navigate(`/admin/events?search=${encodeURIComponent(query)}`)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <FiCalendar className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">View All Events</div>
                  <div className="text-sm text-slate-500">See complete events</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}