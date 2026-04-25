import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiCalendar,
  FiX,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiMapPin,
  FiUsers,
  FiUser,
  FiClock
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const EVENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'academic', label: 'Academic' },
  { value: 'social', label: 'Social' },
  { value: 'career', label: 'Career' },
  { value: 'workshop', label: 'Workshop' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest to Oldest' },
  { value: 'oldest', label: 'Oldest to Newest' },
];

const PAGE_SIZE = 50;

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'academic',
    start_time: '',
    end_time: '',
    location: '',
    organizer: '',
    max_attendees: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, eventId: null, eventTitle: '' });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, event: null });

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
    fetchEvents(); 
    // eslint-disable-next-line 
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/events/?page_size=${PAGE_SIZE}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined }
      });
      const list = Array.isArray(res.data.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
      setEvents(list);
      setToast({ type: 'success', message: `Loaded ${list.length} events` });
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents([]);
      setToast({ type: 'error', message: 'Failed to load events' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateForm = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      event_type: 'academic',
      start_time: '',
      end_time: '',
      location: '',
      organizer: '',
      max_attendees: ''
    });
    setShowForm(true);
  };

  const handleEdit = (ev) => {
    setEditingEvent(ev);
    setFormData({
      title: ev.title || '',
      description: ev.description || '',
      event_type: ev.event_type || 'academic',
      start_time: ev.start_time ? ev.start_time.slice(0, 16) : '',
      end_time: ev.end_time ? ev.end_time.slice(0, 16) : '',
      location: ev.location || '',
      organizer: ev.organizer || '',
      max_attendees: ev.max_attendees || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = { 
      ...formData, 
      max_attendees: formData.max_attendees === '' ? null : Number(formData.max_attendees) 
    };
    
    try {
      if (editingEvent) {
        await axios.put(`${BASE_URL}/api/events/${editingEvent.id}/`, payload, { 
          headers: { Authorization: token ? `Bearer ${token}` : undefined } 
        });
        setToast({ type: 'success', message: 'Event updated successfully' });
      } else {
        await axios.post(`${BASE_URL}/api/events/`, payload, { 
          headers: { Authorization: token ? `Bearer ${token}` : undefined } 
        });
        setToast({ type: 'success', message: 'Event created successfully' });
      }
      setShowForm(false);
      setEditingEvent(null);
      setFormData({
        title: '', description: '', event_type: 'academic', start_time: '', end_time: '', location: '', organizer: '', max_attendees: ''
      });
      await fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      setToast({ 
        type: 'error', 
        message: 'Error saving event: ' + (error?.response?.data?.detail || JSON.stringify(error?.response?.data) || error.message) 
      });
    }
  };

  const handleDelete = (event) => setConfirmDelete({ 
    show: true, 
    eventId: event.id, 
    eventTitle: event.title 
  });

  const confirmDeleteEvent = async () => {
    const { eventId } = confirmDelete;
    setConfirmDelete({ show: false, eventId: null, eventTitle: '' });
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${BASE_URL}/api/events/${eventId}/`, { 
        headers: { Authorization: token ? `Bearer ${token}` : undefined } 
      });
      await fetchEvents();
      setToast({ type: 'success', message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting event:', error);
      setToast({ type: 'error', message: 'Error deleting event' });
    }
  };

  const handleToggleStatus = (event) => setConfirmToggle({ show: true, event });
  
  const confirmToggleEventStatus = async () => {
    const ev = confirmToggle.event;
    setConfirmToggle({ show: false, event: null });
    const token = localStorage.getItem('token');
    try {
      await axios.patch(`${BASE_URL}/api/events/${ev.id}/`, { 
        is_active: !ev.is_active 
      }, { 
        headers: { Authorization: token ? `Bearer ${token}` : undefined } 
      });
      await fetchEvents();
      setToast({ 
        type: 'success', 
        message: `Event ${!ev.is_active ? 'activated' : 'deactivated'} successfully` 
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      setToast({ type: 'error', message: 'Error updating event status' });
    }
  };

  const filteredEvents = events
    .filter(e => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch = q === '' || 
        (e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
      const matchesType = typeFilter ? e.event_type === typeFilter : true;
      const matchesStatus = statusFilter ? 
        (statusFilter === 'active' ? !!e.is_active : !e.is_active) : true;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      const aDate = new Date(a.created_at || a.start_time);
      const bDate = new Date(b.created_at || b.start_time);
      return sortOrder === 'newest' ? bDate - aDate : aDate - bDate;
    });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Stats calculation
  const stats = {
    total: events.length,
    active: events.filter(e => e.is_active).length,
    upcoming: events.filter(e => new Date(e.start_time) > new Date()).length,
    past: events.filter(e => new Date(e.end_time) < new Date()).length,
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
            <FiCalendar className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Event Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Create and manage events for your institution</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEvents}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh events"
            aria-label="Refresh events"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all font-semibold"
            aria-label="Add event"
          >
            <FiPlus className="w-5 h-5" /> Add Event
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Events</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiCalendar className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Active Events</div>
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
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Upcoming Events</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.upcoming}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiClock className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Past Events</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.past}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <FiCalendar className="text-2xl" />
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
                placeholder="Search events by title or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search events"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                aria-label="Filter by type"
              >
                {EVENT_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                aria-label="Sort events"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiCalendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No events found
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
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Event Details</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Date & Time</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Location</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Organizer</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Capacity</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event, index) => (
                    <tr 
                      key={event.id} 
                      className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            <FiCalendar className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100">{event.title}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {event.description}
                            </div>
                            <div className="mt-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                event.event_type === 'academic' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                  : event.event_type === 'social'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                  : event.event_type === 'career'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
                              }`}>
                                {event.event_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <FiCalendar className="w-4 h-4 text-slate-400" />
                            {formatDate(event.start_time)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                        {event.location ? (
                          <div className="flex items-center gap-2">
                            <FiMapPin className="w-4 h-4 text-slate-400" />
                            {event.location}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                        {event.organizer ? (
                          <div className="flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-slate-400" />
                            {event.organizer}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                        {event.max_attendees ? (
                          <div className="flex items-center gap-2">
                            <FiUsers className="w-4 h-4 text-slate-400" />
                            {event.max_attendees}
                          </div>
                        ) : (
                          <span className="text-slate-400">Unlimited</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          event.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}>
                          {event.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(event)}
                            title="Edit"
                            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(event)}
                            title={event.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-2 rounded-xl transition-all ${
                              event.is_active
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                            }`}
                          >
                            {event.is_active ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(event)}
                            title="Delete"
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden p-6 space-y-4">
              {filteredEvents.map((event, index) => (
                <div 
                  key={event.id}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <FiCalendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">{event.title}</div>
                          <div className="text-xs text-slate-500">{event.event_type}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <FiClock className="w-4 h-4" />
                          {formatDate(event.start_time)}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <FiMapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                        {event.organizer && (
                          <div className="flex items-center gap-2">
                            <FiUser className="w-4 h-4" />
                            {event.organizer}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        event.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {event.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(event)} 
                          className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(event)} 
                          className={`p-2 rounded-xl transition-all ${
                            event.is_active
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {event.is_active ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDelete(event)} 
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete({ show: false, eventId: null, eventTitle: '' })} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <FiTrash2 className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Event</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to delete <strong>"{confirmDelete.eventTitle}"</strong>? All event data will be permanently removed.
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setConfirmDelete({ show: false, eventId: null, eventTitle: '' })}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-medium"
                  onClick={confirmDeleteEvent}
                >
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {confirmToggle.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmToggle({ show: false, event: null })} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  confirmToggle.event?.is_active 
                    ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                    : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}>
                  {confirmToggle.event?.is_active ? <FiEyeOff className="text-xl" /> : <FiEye className="text-xl" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {confirmToggle.event?.is_active ? 'Deactivate Event' : 'Activate Event'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {confirmToggle.event?.is_active ? 'Temporarily hide event' : 'Make event visible to users'}
                  </p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to {confirmToggle.event?.is_active ? 'deactivate' : 'activate'} <strong>"{confirmToggle.event?.title}"</strong>?
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setConfirmToggle({ show: false, event: null })}
                >
                  Cancel
                </button>
                <button 
                  className={`flex-1 px-4 py-3 rounded-xl text-white transition-all font-medium ${
                    confirmToggle.event?.is_active
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  onClick={confirmToggleEventStatus}
                >
                  {confirmToggle.event?.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <FiCalendar className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {editingEvent ? 'Edit Event' : 'Create New Event'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {editingEvent ? 'Update event information' : 'Add a new event to the calendar'}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Event Title</label>
                <input 
                  required 
                  name="title" 
                  value={formData.title} 
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <textarea 
                  required 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Describe the event..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Event Type</label>
                  <select 
                    required 
                    name="event_type" 
                    value={formData.event_type} 
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="academic">Academic</option>
                    <option value="social">Social</option>
                    <option value="career">Career</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Location</label>
                  <input 
                    name="location" 
                    value={formData.location} 
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter event location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start Time</label>
                  <input 
                    required 
                    type="datetime-local" 
                    name="start_time" 
                    value={formData.start_time} 
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End Time</label>
                  <input 
                    required 
                    type="datetime-local" 
                    name="end_time" 
                    value={formData.end_time} 
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Organizer</label>
                  <input 
                    name="organizer" 
                    value={formData.organizer} 
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter organizer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Max Attendees</label>
                  <input 
                    type="number" 
                    min="0" 
                    name="max_attendees" 
                    value={formData.max_attendees} 
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Leave empty for unlimited"
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
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg transition-all font-medium"
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}