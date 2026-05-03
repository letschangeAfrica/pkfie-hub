import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FiCalendar, FiSearch, FiPlus, FiEdit2, FiTrash2,
  FiEye, FiEyeOff, FiX,
} from 'react-icons/fi';

const PAGE_SIZE = 50;

const TYPE_COLOR = {
  academic: 'bg-sky-500/20 text-sky-400',
  social:   'bg-emerald-500/20 text-emerald-400',
  career:   'bg-violet-500/20 text-violet-400',
  workshop: 'bg-amber-500/20 text-amber-400',
};

const EMPTY_FORM = {
  title: '', description: '', event_type: 'academic',
  start_time: '', end_time: '', location: '', organizer: '', max_attendees: '',
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

function Label({ children }) {
  return (
    <label className="block text-xs font-bold text-navy-400 mb-1.5 uppercase tracking-wide">
      {children}
    </label>
  );
}

const inputCls = `w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
  text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50 transition-colors`;

export default function EventManagement() {
  const [events,         setEvents]         = useState([]);
  const [showForm,       setShowForm]       = useState(false);
  const [editingEvent,   setEditingEvent]   = useState(null);
  const [formData,       setFormData]       = useState(EMPTY_FORM);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [typeFilter,     setTypeFilter]     = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [sortOrder,      setSortOrder]      = useState('newest');
  const [confirmDelete,  setConfirmDelete]  = useState({ show: false, id: null });
  const [confirmToggle,  setConfirmToggle]  = useState({ show: false, event: null });

  useEffect(() => { fetchEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvents = async () => {
    try {
      const res = await api.get(`/events/?page_size=${PAGE_SIZE}`);
      setEvents(
        Array.isArray(res.data.results) ? res.data.results :
        Array.isArray(res.data)         ? res.data : []
      );
    } catch { setEvents([]); }
  };

  const handleInputChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openCreate = () => { setEditingEvent(null); setFormData(EMPTY_FORM); setShowForm(true); };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setFormData({
      title:         ev.title,
      description:   ev.description,
      event_type:    ev.event_type,
      start_time:    ev.start_time ? ev.start_time.slice(0, 16) : '',
      end_time:      ev.end_time   ? ev.end_time.slice(0, 16)   : '',
      location:      ev.location      || '',
      organizer:     ev.organizer     || '',
      max_attendees: ev.max_attendees || '',
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingEvent(null); setFormData(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      max_attendees: formData.max_attendees === '' ? null : Number(formData.max_attendees),
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
      alert('Error saving event:\n' +
        (err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message));
    }
  };

  const confirmDeleteEvent = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ show: false, id: null });
    try {
      await api.delete(`/events/${id}/`);
      fetchEvents();
    } catch (err) {
      alert('Error deleting event:\n' + (err?.response?.data?.detail || err.message));
    }
  };

  const confirmToggleStatus = async () => {
    const ev = confirmToggle.event;
    setConfirmToggle({ show: false, event: null });
    try {
      await api.patch(`/events/${ev.id}/`, { is_active: !ev.is_active });
      fetchEvents();
    } catch (err) {
      alert('Error updating status:\n' + (err?.response?.data?.detail || err.message));
    }
  };

  const formatDate = (s) => s ? new Date(s).toLocaleString() : '—';

  const filtered = events
    .filter(ev => {
      const q = searchQuery.toLowerCase();
      return (
        (!q || ev.title?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q)) &&
        (!typeFilter   || ev.event_type === typeFilter) &&
        (!statusFilter || (statusFilter === 'active' ? ev.is_active : !ev.is_active))
      );
    })
    .sort((a, b) =>
      sortOrder === 'newest'
        ? new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time)
        : new Date(a.created_at || a.start_time) - new Date(b.created_at || b.start_time)
    );

  const selectCls = `px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
    text-white text-sm focus:outline-none focus:border-gold/40 transition-colors`;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Event Management</h1>
        <p className="text-sm text-navy-400 mt-1">Create and manage events for your institution</p>
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
          <option value="academic">Academic</option>
          <option value="social">Social</option>
          <option value="career">Career</option>
          <option value="workshop">Workshop</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={selectCls}>
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
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-700/60 flex items-center justify-center mx-auto mb-4">
              <FiCalendar size={24} className="text-navy-500" aria-hidden="true" />
            </div>
            <p className="text-white font-bold mb-1">No events found</p>
            <p className="text-sm text-navy-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/40">
                  {['Title', 'Type', 'Start', 'End', 'Location', 'Organizer', 'Max', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/30">
                {filtered.map(ev => (
                  <tr key={ev.id} className="hover:bg-navy-700/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white max-w-[160px]">
                      <p className="truncate">{ev.title}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${TYPE_COLOR[ev.event_type] || 'bg-navy-700 text-navy-400'}`}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-navy-400 text-xs whitespace-nowrap">{formatDate(ev.start_time)}</td>
                    <td className="px-4 py-3.5 text-navy-400 text-xs whitespace-nowrap">{formatDate(ev.end_time)}</td>
                    <td className="px-4 py-3.5 text-navy-300 text-xs">{ev.location || '—'}</td>
                    <td className="px-4 py-3.5 text-navy-300 text-xs">{ev.organizer || '—'}</td>
                    <td className="px-4 py-3.5 text-navy-400 text-xs text-center">{ev.max_attendees || '—'}</td>
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
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {confirmDelete.show && (
        <ModalOverlay onClose={() => setConfirmDelete({ show: false, id: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Confirm Deletion</h3>
            <p className="text-sm text-navy-400 mb-6">Are you sure you want to delete this event?</p>
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
              <div>
                <Label>Title</Label>
                <input type="text" name="title" required className={inputCls} placeholder="Event title"
                  value={formData.title} onChange={handleInputChange} />
              </div>

              <div>
                <Label>Description</Label>
                <textarea name="description" rows={4} required className={inputCls + ' resize-none'}
                  placeholder="Describe the event…"
                  value={formData.description} onChange={handleInputChange} />
              </div>

              <div>
                <Label>Event Type</Label>
                <select name="event_type" required className={inputCls}
                  value={formData.event_type} onChange={handleInputChange}>
                  <option value="academic">Academic</option>
                  <option value="social">Social</option>
                  <option value="career">Career</option>
                  <option value="workshop">Workshop</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <input type="datetime-local" name="start_time" required className={inputCls}
                    value={formData.start_time} onChange={handleInputChange} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <input type="datetime-local" name="end_time" required className={inputCls}
                    value={formData.end_time} onChange={handleInputChange} />
                </div>
              </div>

              <div>
                <Label>Location</Label>
                <input type="text" name="location" className={inputCls} placeholder="Room / venue"
                  value={formData.location} onChange={handleInputChange} />
              </div>

              <div>
                <Label>Organizer</Label>
                <input type="text" name="organizer" className={inputCls} placeholder="Organizer name"
                  value={formData.organizer} onChange={handleInputChange} />
              </div>

              <div>
                <Label>Max Attendees</Label>
                <input type="number" name="max_attendees" min="0" className={inputCls} placeholder="Leave blank for unlimited"
                  value={formData.max_attendees} onChange={handleInputChange} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold text-navy-900 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}>
                  {editingEvent ? 'Update' : 'Create'} Event
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
