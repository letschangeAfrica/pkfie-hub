import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  FiCalendar, FiSearch, FiPlus, FiEdit2, FiTrash2,
  FiEye, FiEyeOff, FiX, FiAlertCircle, FiLink, FiUsers,
} from 'react-icons/fi';

const PAGE_SIZE = 100;

const TYPE_COLOR = {
  academic:    'bg-sky-500/20 text-sky-400',
  social:      'bg-emerald-500/20 text-emerald-400',
  career:      'bg-violet-500/20 text-violet-400',
  workshop:    'bg-amber-500/20 text-amber-400',
  webinar:     'bg-cyan-500/20 text-cyan-400',
  conference:  'bg-indigo-500/20 text-indigo-400',
  competition: 'bg-pink-500/20 text-pink-400',
};

const EVENT_TYPES = [
  { value: 'academic',    label: 'Academic' },
  { value: 'social',      label: 'Social' },
  { value: 'career',      label: 'Career' },
  { value: 'workshop',    label: 'Workshop' },
  { value: 'webinar',     label: 'Webinar' },
  { value: 'conference',  label: 'Conference' },
  { value: 'competition', label: 'Competition' },
];

const EMPTY_FORM = {
  title: '', description: '', event_type: 'academic',
  start_time: '', end_time: '', location: '', organizer: '',
  max_attendees: '', registration_link: '',
};

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

function Label({ children, required }) {
  return (
    <label className="block text-xs font-bold text-navy-400 mb-1.5 uppercase tracking-wide">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

const inputCls = `w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
  text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50 transition-colors`;

function apiErr(err) {
  const d = err?.response?.data;
  if (!d) return err.message;
  if (typeof d === 'string') return d;
  if (d.detail) return d.detail;
  return Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
}

export default function EventManagement() {
  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [editingEvent,  setEditingEvent]  = useState(null);
  const [formData,      setFormData]      = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [sortOrder,     setSortOrder]     = useState('upcoming');
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, event: null });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/?page_size=${PAGE_SIZE}`);
      setEvents(
        Array.isArray(res.data.results) ? res.data.results :
        Array.isArray(res.data)         ? res.data : []
      );
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleInputChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openCreate = () => {
    setEditingEvent(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setFormData({
      title:             ev.title,
      description:       ev.description,
      event_type:        ev.event_type,
      start_time:        ev.start_time ? ev.start_time.slice(0, 16) : '',
      end_time:          ev.end_time   ? ev.end_time.slice(0, 16)   : '',
      location:          ev.location          || '',
      organizer:         ev.organizer         || '',
      max_attendees:     ev.max_attendees      || '',
      registration_link: ev.registration_link || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingEvent(null); setFormData(EMPTY_FORM); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.end_time && formData.start_time && formData.end_time <= formData.start_time) {
      setFormError('End time must be after start time.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      ...formData,
      max_attendees:     formData.max_attendees === '' ? null : Number(formData.max_attendees),
      registration_link: formData.registration_link || null,
    };
    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}/`, payload);
      } else {
        await api.post('/events/', payload);
      }
      closeForm();
      fetchEvents();
    } catch (err) {
      setFormError(apiErr(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteEvent = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ show: false, id: null });
    try {
      await api.delete(`/events/${id}/`);
      fetchEvents();
    } catch { /* silent */ }
  };

  const confirmToggleStatus = async () => {
    const ev = confirmToggle.event;
    setConfirmToggle({ show: false, event: null });
    try {
      await api.patch(`/events/${ev.id}/`, { is_active: !ev.is_active });
      fetchEvents();
    } catch { /* silent */ }
  };

  const formatDate = (s) => s ? new Date(s).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

  const now = new Date();
  const isUpcoming = (ev) => new Date(ev.start_time) >= now;
  const isPast     = (ev) => new Date(ev.end_time || ev.start_time) < now;

  const filtered = events
    .filter(ev => {
      const q = searchQuery.toLowerCase();
      return (
        (!q || ev.title?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) ||
               ev.location?.toLowerCase().includes(q) || ev.organizer?.toLowerCase().includes(q)) &&
        (!typeFilter   || ev.event_type === typeFilter) &&
        (!statusFilter || (statusFilter === 'active' ? ev.is_active : !ev.is_active))
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'upcoming') return new Date(a.start_time) - new Date(b.start_time);
      if (sortOrder === 'newest')   return new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time);
      return new Date(a.created_at || a.start_time) - new Date(b.created_at || b.start_time);
    });

  const selectCls = `px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
    text-white text-sm focus:outline-none focus:border-gold/40 transition-colors`;

  const upcomingCount = events.filter(isUpcoming).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Event Management</h1>
          <p className="text-sm text-navy-400 mt-1">Create and manage events for your institution</p>
        </div>
        <div className="flex gap-4 shrink-0">
          <div className="text-right">
            <p className="text-2xl font-black text-white">{upcomingCount}</p>
            <p className="text-xs text-navy-500">Upcoming</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">{events.length}</p>
            <p className="text-xs text-navy-500">Total</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search events…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
              text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="">All Types</option>
          {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={selectCls}>
          <option value="upcoming">By Date (Upcoming)</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-navy-900
            transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          <FiPlus size={15} aria-hidden="true" />
          Add Event
        </button>
      </div>

      {/* Table */}
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-navy-500">Loading events…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-700/60 flex items-center justify-center mx-auto mb-4">
              <FiCalendar size={24} className="text-navy-500" aria-hidden="true" />
            </div>
            <p className="text-white font-bold mb-1">No events found</p>
            <p className="text-sm text-navy-500">Try adjusting your filters or add a new event.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/40">
                  {['Event', 'Type', 'Start', 'Location', 'Attendees', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/30">
                {filtered.map(ev => (
                  <tr key={ev.id} className={`hover:bg-navy-700/20 transition-colors ${isPast(ev) ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <p className="font-bold text-white truncate mb-0.5">{ev.title}</p>
                      <p className="text-xs text-navy-500 line-clamp-1">{ev.description}</p>
                      {ev.organizer && (
                        <p className="text-[11px] text-navy-600 mt-0.5">by {ev.organizer}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${TYPE_COLOR[ev.event_type] || 'bg-navy-700 text-navy-400'}`}>
                        {ev.event_type}
                      </span>
                      {isUpcoming(ev) && (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-gold/10 text-gold uppercase">
                          Soon
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-navy-400 text-xs whitespace-nowrap">
                      {formatDate(ev.start_time)}
                      {ev.end_time && (
                        <p className="text-navy-600 text-[11px] mt-0.5">→ {formatDate(ev.end_time)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-navy-300 text-xs max-w-[120px]">
                      <p className="truncate">{ev.location || '—'}</p>
                      {ev.registration_link && (
                        <a href={ev.registration_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 mt-0.5 text-[11px]">
                          <FiLink size={10} /> Register
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-navy-400 text-xs">
                        <FiUsers size={12} />
                        <span>{ev.attendees?.length ?? 0}{ev.max_attendees ? `/${ev.max_attendees}` : ''}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                        ${ev.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {ev.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(ev)} title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-sky-500/20 hover:text-sky-400 text-navy-400 transition-colors">
                          <FiEdit2 size={13} aria-hidden="true" />
                        </button>
                        <button onClick={() => setConfirmToggle({ show: true, event: ev })}
                          title={ev.is_active ? 'Deactivate' : 'Activate'}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-amber-500/20 hover:text-amber-400 text-navy-400 transition-colors">
                          {ev.is_active
                            ? <FiEyeOff size={13} aria-hidden="true" />
                            : <FiEye    size={13} aria-hidden="true" />
                          }
                        </button>
                        <button onClick={() => setConfirmDelete({ show: true, id: ev.id })} title="Delete"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-red-500/20 hover:text-red-400 text-navy-400 transition-colors">
                          <FiTrash2 size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-navy-700/30 text-xs text-navy-500">
              Showing {filtered.length} of {events.length} event{events.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {confirmDelete.show && (
        <ModalOverlay onClose={() => setConfirmDelete({ show: false, id: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Confirm Deletion</h3>
            <p className="text-sm text-navy-400 mb-6">This event will be permanently deleted and cannot be recovered.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete({ show: false, id: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDeleteEvent}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Toggle Confirm */}
      {confirmToggle.show && (
        <ModalOverlay onClose={() => setConfirmToggle({ show: false, event: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Change Event Status</h3>
            <p className="text-sm text-navy-400 mb-6">
              Are you sure you want to {confirmToggle.event?.is_active ? 'deactivate' : 'activate'} this event?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmToggle({ show: false, event: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={confirmToggleStatus}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors
                  ${confirmToggle.event?.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                {confirmToggle.event?.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={closeForm}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40">
              <h3 className="text-lg font-black text-white">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button onClick={closeForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors">
                <FiX size={15} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <FiAlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p className="whitespace-pre-line">{formError}</p>
                </div>
              )}

              <div>
                <Label required>Title</Label>
                <input type="text" name="title" required className={inputCls} placeholder="Event title"
                  value={formData.title} onChange={handleInputChange} />
              </div>

              <div>
                <Label required>Description</Label>
                <textarea name="description" rows={3} required className={inputCls + ' resize-none'}
                  placeholder="Describe the event…"
                  value={formData.description} onChange={handleInputChange} />
              </div>

              <div>
                <Label required>Event Type</Label>
                <select name="event_type" required className={inputCls}
                  value={formData.event_type} onChange={handleInputChange}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Start Time</Label>
                  <input type="datetime-local" name="start_time" required className={inputCls}
                    value={formData.start_time} onChange={handleInputChange} />
                </div>
                <div>
                  <Label required>End Time</Label>
                  <input type="datetime-local" name="end_time" required className={inputCls}
                    min={formData.start_time || undefined}
                    value={formData.end_time} onChange={handleInputChange} />
                </div>
              </div>

              <div>
                <Label>Location</Label>
                <input type="text" name="location" className={inputCls} placeholder="Room / building / venue"
                  value={formData.location} onChange={handleInputChange} />
              </div>

              <div>
                <Label>Organizer</Label>
                <input type="text" name="organizer" className={inputCls} placeholder="Organizer name or department"
                  value={formData.organizer} onChange={handleInputChange} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Attendees</Label>
                  <input type="number" name="max_attendees" min="0" className={inputCls}
                    placeholder="Unlimited"
                    value={formData.max_attendees} onChange={handleInputChange} />
                </div>
                <div>
                  <Label>Registration Link</Label>
                  <input type="url" name="registration_link" className={inputCls}
                    placeholder="https://…"
                    value={formData.registration_link} onChange={handleInputChange} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-navy-900 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}>
                  {saving ? 'Saving…' : editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
