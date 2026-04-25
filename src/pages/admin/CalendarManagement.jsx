import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FiCalendar,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiSearch,
  FiFilter,
  FiDownload,
  FiUser,
  FiTag,
  FiClock,
  FiMapPin,
  FiEyeOff,
  FiRefreshCw,
  FiLink,
  FiCheckCircle,
  FiX
} from 'react-icons/fi';

// Event Modal Component for Management
function EventModal({ event, onClose, onSave, mode = 'create', setToast }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'academic',
    start_time: '',
    end_time: '',
    location: '',
    organizer: '',
    is_all_day: false,
    priority: 'medium',
    color: '#3B82F6',
    is_public: false
  });
  const [loading, setLoading] = useState(false);

  const eventTypes = [
    { value: 'academic', label: 'Academic', color: 'bg-blue-500' },
    { value: 'social', label: 'Social', color: 'bg-green-500' },
    { value: 'career', label: 'Career', color: 'bg-purple-500' },
    { value: 'workshop', label: 'Workshop', color: 'bg-amber-500' },
    { value: 'personal', label: 'Personal', color: 'bg-rose-500' },
    { value: 'deadline', label: 'Deadline', color: 'bg-red-500' },
    { value: 'holiday', label: 'Holiday', color: 'bg-emerald-500' },
    { value: 'meeting', label: 'Meeting', color: 'bg-indigo-500' },
    { value: 'announcement', label: 'Announcement', color: 'bg-teal-500' },
    { value: 'institutional', label: 'Institutional', color: 'bg-gray-500' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
    { value: 'high', label: 'High', color: 'bg-red-500' }
  ];

  useEffect(() => {
    if (event && mode === 'edit') {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_type: event.event_type || 'academic',
        start_time: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
        end_time: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
        location: event.location || '',
        organizer: event.organizer || currentUser?.first_name || '',
        is_all_day: event.is_all_day || false,
        priority: event.priority || 'medium',
        color: event.color || '#3B82F6',
        is_public: event.is_public || false
      });
    } else {
      // Set default start time to next hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const defaultStart = now.toISOString().slice(0, 16);
      
      // Set default end time to 2 hours after start
      const end = new Date(now);
      end.setHours(end.getHours() + 2);
      const defaultEnd = end.toISOString().slice(0, 16);

      setFormData(prev => ({
        ...prev,
        start_time: defaultStart,
        end_time: defaultEnd,
        organizer: currentUser?.first_name || ''
      }));
    }
  }, [event, mode, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      setToast({
        type: 'success',
        message: `Event ${mode === 'create' ? 'created' : 'updated'} successfully!`
      });
      onClose();
    } catch (error) {
      setToast({
        type: 'error',
        message: `Failed to ${mode === 'create' ? 'create' : 'update'} event: ${error.response?.data?.detail || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <FiCalendar className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {mode === 'create' ? 'Create New Event' : 'Edit Event'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {mode === 'create' ? 'Add a new event to your calendar' : 'Update event details'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter event title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter event description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Event Type
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => handleChange('event_type', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Start Time *
              </label>
              <input
                type={formData.is_all_day ? "date" : "datetime-local"}
                required
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                End Time *
              </label>
              <input
                type={formData.is_all_day ? "date" : "datetime-local"}
                required
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Event location..."
              />
            </div>

            {/* Organizer */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Organizer
              </label>
              <input
                type="text"
                value={formData.organizer}
                onChange={(e) => handleChange('organizer', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Event organizer..."
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_all_day"
                checked={formData.is_all_day}
                onChange={(e) => handleChange('is_all_day', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_all_day" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                All-day event
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => handleChange('is_public', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_public" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Public event
              </label>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Event Color
            </label>
            <div className="flex gap-2">
              {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange('color', color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-slate-800 dark:border-slate-200' : 'border-slate-300 dark:border-slate-600'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <FiCheckCircle className="text-lg" />
                  {mode === 'create' ? 'Create Event' : 'Update Event'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Event Details Modal for Management
function EventDetailsModal({ event, onClose, onEdit, onDelete, setToast }) {
  const { currentUser } = useAuth();

  const eventTypeColors = {
    academic: 'bg-blue-500',
    social: 'bg-green-500',
    career: 'bg-purple-500',
    workshop: 'bg-amber-500',
    personal: 'bg-rose-500',
    deadline: 'bg-red-500',
    holiday: 'bg-emerald-500',
    meeting: 'bg-indigo-500',
    announcement: 'bg-teal-500',
    institutional: 'bg-gray-500'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };

  const sourceLabels = {
    personal: 'Personal Event',
    events_app: 'Institutional Event',
    announcements_app: 'Announcement',
    system: 'System Event'
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await onDelete(event.id);
        setToast({
          type: 'success',
          message: 'Event deleted successfully!'
        });
        onClose();
      } catch (error) {
        setToast({
          type: 'error',
          message: 'Failed to delete event'
        });
      }
    }
  };

  const isEditable = event.source === 'personal' && event.user === currentUser?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="relative p-6 border-b border-slate-200 dark:border-slate-700 text-white"
          style={{ backgroundColor: event.color || '#3B82F6' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <FiCalendar className="text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl font-bold pr-12 break-words">{event.title}</h2>
                <span className={`px-3 py-1 rounded-full text-white font-semibold text-sm ${eventTypeColors[event.event_type]}`}>
                  {event.event_type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-white/90 flex-wrap">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <FiClock className="text-sm" />
                  <span className="text-sm">
                    {event.is_all_day ? 'All Day' : formatDateTime(event.start_time)}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full font-semibold text-sm ${priorityColors[event.priority]}`}>
                  {event.priority} Priority
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-white hover:bg-white/20 rounded-xl transition-all"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Source Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Source:</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium">
              {sourceLabels[event.source] || event.source}
            </span>
            {event.is_auto_generated && (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium">
                Auto-generated
              </span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Description</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date & Time */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <FiClock className="text-blue-500" />
                Date & Time
              </h4>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Starts</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {formatDateTime(event.start_time)}
                  </div>
                </div>
                {event.end_time && (
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Ends</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {formatDateTime(event.end_time)}
                    </div>
                  </div>
                )}
                {event.is_all_day && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    📅 All-day event
                  </div>
                )}
              </div>
            </div>

            {/* Location & Organizer */}
            <div className="space-y-4">
              {event.location && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiMapPin className="text-rose-500" />
                    Location
                  </h4>
                  <div className="text-slate-800 dark:text-slate-200">
                    {event.location}
                  </div>
                </div>
              )}

              {event.organizer && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiUser className="text-green-500" />
                    Organizer
                  </h4>
                  <div className="text-slate-800 dark:text-slate-200">
                    {event.organizer}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Event Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Type</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 capitalize">{event.event_type}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Priority</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 capitalize">{event.priority}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Visibility</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {event.is_public ? 'Public' : 'Private'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Created</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {event.created_at ? new Date(event.created_at).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>
          </div>

          {/* Original Object Link */}
          {event.original_object_url && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Original Event</h4>
              <a 
                href={event.original_object_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline flex items-center gap-2"
              >
                <FiLink className="text-sm" />
                View original event details
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-end gap-3">
            {isEditable && (
              <>
                <button
                  onClick={() => onEdit(event)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  <FiEdit />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition-colors"
                >
                  <FiTrash2 />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarManagement() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [toast, setToast] = useState(null);

  const eventTypes = [
    'academic', 'social', 'career', 'workshop', 
    'personal', 'deadline', 'holiday', 'meeting', 'announcement', 'institutional'
  ];

  const sourceTypes = [
    { value: 'all', label: 'All Sources' },
    { value: 'personal', label: 'Personal' },
    { value: 'events_app', label: 'Institutional Events' },
    { value: 'announcements_app', label: 'Announcements' },
    { value: 'system', label: 'System' }
  ];

  // Toast effect
  React.useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/calendar/events/?page_size=100');
      setEvents(response.data || []);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
      setToast({
        type: 'error',
        message: 'Failed to load events'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || event.event_type === filterType;
    const matchesSource = filterSource === 'all' || event.source === filterSource;
    return matchesSearch && matchesType && matchesSource;
  });

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await api.delete(`/calendar/events/${eventId}/`);
        setEvents(prev => prev.filter(e => e.id !== eventId));
        setToast({
          type: 'success',
          message: 'Event deleted successfully!'
        });
      } catch (error) {
        console.error('Failed to delete event:', error);
        setToast({
          type: 'error',
          message: 'Failed to delete event'
        });
      }
    }
  };

  const handleSaveEvent = async (eventData) => {
    try {
      if (modalMode === 'create') {
        const response = await api.post('/calendar/events/', eventData);
        setEvents(prev => [...prev, response.data]);
      } else {
        const response = await api.put(`/calendar/events/${selectedEvent.id}/`, eventData);
        setEvents(prev => prev.map(e => e.id === selectedEvent.id ? response.data : e));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleAddEvent = () => {
    setModalMode('create');
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setModalMode('edit');
    setShowEventDetails(false);
    setShowEventModal(true);
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const getEventTypeColor = (type) => {
    const colors = {
      academic: 'bg-blue-100 text-blue-800 border border-blue-200',
      social: 'bg-green-100 text-green-800 border border-green-200',
      career: 'bg-purple-100 text-purple-800 border border-purple-200',
      workshop: 'bg-amber-100 text-amber-800 border border-amber-200',
      personal: 'bg-rose-100 text-rose-800 border border-rose-200',
      deadline: 'bg-red-100 text-red-800 border border-red-200',
      holiday: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      meeting: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      announcement: 'bg-teal-100 text-teal-800 border border-teal-200',
      institutional: 'bg-gray-100 text-gray-800 border border-gray-200'
    };
    return colors[type] || colors.academic;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[priority] || colors.medium;
  };

  const getSourceColor = (source) => {
    const colors = {
      personal: 'bg-blue-100 text-blue-800',
      events_app: 'bg-green-100 text-green-800',
      announcements_app: 'bg-purple-100 text-purple-800',
      system: 'bg-amber-100 text-amber-800'
    };
    return colors[source] || colors.personal;
  };

  const handleExportCalendar = () => {
    setToast({
      type: 'info',
      message: 'Export feature coming soon!'
    });
  };

  const handleRefreshEvents = () => {
    loadEvents();
    setToast({
      type: 'info',
      message: 'Refreshing events...'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg ${
          toast.type === "error" 
            ? "bg-rose-50 border border-rose-200 text-rose-700" 
            : toast.type === "info"
            ? "bg-blue-50 border border-blue-200 text-blue-700"
            : "bg-emerald-50 border border-emerald-200 text-emerald-700"
        }`}>
          {toast.type === "error" ? <FiX className="text-xl" /> : 
           toast.type === "info" ? <FiRefreshCw className="text-xl" /> : 
           <FiCheckCircle className="text-xl" />}
          <div className="text-sm font-semibold">{toast.message}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <FiCalendar className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Calendar Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage all calendar events and schedules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefreshEvents}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            <FiRefreshCw className="text-lg" />
            Refresh
          </button>
          <button 
            onClick={handleAddEvent}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
          >
            <FiPlus className="text-lg" />
            Add Event
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Event Types</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sourceTypes.map(source => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportCalendar}
              className="flex items-center gap-2 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
            >
              <FiDownload className="text-lg" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
          <div className="col-span-3">Event</div>
          <div className="col-span-2">Type & Source</div>
          <div className="col-span-2">Date & Time</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3 text-center">Actions</div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading events...
            </div>
          </div>
        )}

        {/* Events List */}
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <FiCalendar className="text-3xl mx-auto mb-3 opacity-50" />
            <div className="text-lg font-semibold">No events found</div>
            <div className="text-sm">Try adjusting your search or filters</div>
          </div>
        )}

        {!loading && filteredEvents.map((event) => (
          <div
            key={event.id}
            className="grid grid-cols-12 gap-4 p-6 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
          >
            {/* Event Info */}
            <div className="col-span-3">
              <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {event.title}
              </div>
              {event.description && (
                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {event.description}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                {event.location && (
                  <div className="flex items-center gap-1">
                    <FiMapPin className="text-xs" />
                    {event.location}
                  </div>
                )}
                {event.organizer && (
                  <div className="flex items-center gap-1">
                    <FiUser className="text-xs" />
                    {event.organizer}
                  </div>
                )}
              </div>
            </div>

            {/* Type & Source */}
            <div className="col-span-2 space-y-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                <FiTag className="mr-1" />
                {event.event_type}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSourceColor(event.source)}`}>
                {event.source === 'personal' ? '👤' : 
                 event.source === 'events_app' ? '🏛️' :
                 event.source === 'announcements_app' ? '📢' : '⚙️'}
                {event.source.replace('_app', '').charAt(0).toUpperCase() + event.source.replace('_app', '').slice(1)}
              </span>
            </div>

            {/* Date & Time */}
            <div className="col-span-2">
              <div className="text-sm text-slate-800 dark:text-slate-100">
                {new Date(event.start_time).toLocaleDateString()}
              </div>
              {!event.is_all_day && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <FiClock className="text-xs" />
                  {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {event.is_all_day && (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  All Day
                </div>
              )}
            </div>

            {/* Status */}
            <div className="col-span-2">
              <div className="space-y-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(event.priority)}`}>
                  {event.priority} Priority
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  {event.is_public ? (
                    <><FiEye className="text-xs" /> Public</>
                  ) : (
                    <><FiEyeOff className="text-xs" /> Private</>
                  )}
                </div>
                {!event.is_active && (
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Inactive
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="col-span-3 flex items-center justify-center gap-2">
              <button
                onClick={() => handleViewEvent(event)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                title="View Details"
              >
                <FiEye className="text-lg" />
              </button>
              
              {event.source === 'personal' && (
                <>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    title="Edit Event"
                  >
                    <FiEdit className="text-lg" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                    title="Delete Event"
                  >
                    <FiTrash2 className="text-lg" />
                  </button>
                </>
              )}
              
              {event.source !== 'personal' && (
                <span className="text-xs text-slate-400 dark:text-slate-500 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                  Read-only
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiCalendar className="text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {events.length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Events
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <FiEye className="text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {events.filter(e => e.is_public).length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Public Events
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiClock className="text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {events.filter(e => new Date(e.start_time) > new Date()).length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Upcoming
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FiUser className="text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {new Set(events.filter(e => e.user).map(e => e.user)).size}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Active Users
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onClose={() => setShowEventModal(false)}
          onSave={handleSaveEvent}
          mode={modalMode}
          setToast={setToast}
        />
      )}

      {showEventDetails && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setShowEventDetails(false)}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          setToast={setToast}
        />
      )}
    </div>
  );
}