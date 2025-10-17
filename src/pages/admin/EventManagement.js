import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AnnouncementManagement.css'; // Reuse the same CSS for consistent look

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

const PAGE_SIZE = 50; // Admin should see up to 50 events per page

const EventManagement = () => {
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
  const [confirmDelete, setConfirmDelete] = useState({ show: false, eventId: null });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, event: null });

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/events/?page_size=${PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle paginated and non-paginated responses
      setEvents(
        Array.isArray(res.data.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (error) {
      setEvents([]);
      console.error('Error fetching events:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_time: event.start_time ? event.start_time.slice(0, 16) : '',
      end_time: event.end_time ? event.end_time.slice(0, 16) : '',
      location: event.location || '',
      organizer: event.organizer || '',
      max_attendees: event.max_attendees || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
      ...formData,
      max_attendees: formData.max_attendees === '' ? null : Number(formData.max_attendees),
    };

    try {
      if (editingEvent) {
        await axios.put(
          `${BASE_URL}/api/events/${editingEvent.id}/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BASE_URL}/api/events/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setShowForm(false);
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
      fetchEvents();
    } catch (error) {
      alert(
        'Error saving event:\n' +
          (error?.response?.data?.detail ||
            JSON.stringify(error?.response?.data) ||
            error.message)
      );
      console.error('Error saving event:', error);
    }
  };

  // Confirm and perform delete
  const handleDelete = (eventId) => {
    setConfirmDelete({ show: true, eventId });
  };
  const confirmDeleteEvent = async () => {
    const id = confirmDelete.eventId;
    setConfirmDelete({ show: false, eventId: null });
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${BASE_URL}/api/events/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch (error) {
      alert('Error deleting event:\n' + (error?.response?.data?.detail || error.message));
      console.error('Error deleting event:', error);
    }
  };

  // Confirm and perform status toggle
  const handleToggleStatus = (event) => {
    setConfirmToggle({ show: true, event });
  };
  const confirmToggleEventStatus = async () => {
    const event = confirmToggle.event;
    setConfirmToggle({ show: false, event: null });
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `${BASE_URL}/api/events/${event.id}/`,
        { is_active: !event.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchEvents();
    } catch (error) {
      alert('Error updating event status:\n' + (error?.response?.data?.detail || error.message));
      console.error('Error updating event status:', error);
    }
  };

  // Filtering and sorting logic
  const filteredEvents = events
    .filter(e => {
      const matchesSearch =
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter ? e.event_type === typeFilter : true;
      const matchesStatus = statusFilter
        ? (statusFilter === 'active'
            ? e.is_active
            : !e.is_active)
        : true;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time);
      } else {
        return new Date(a.created_at || a.start_time) - new Date(b.created_at || b.start_time);
      }
    });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="am-container">
      <div className="am-header">
        <h2>Event Management</h2>
        <p>Create and manage events for your institution</p>
      </div>

      <div className="am-toolbar" style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
        <div className="am-search" style={{flex: 1, minWidth: 250, position: 'relative'}}>
          <i className="fas fa-search" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6c757d'
          }} />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40, width: '100%', border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', height: 41 }}
          />
        </div>
        <div className="am-filters" style={{ display: 'flex', gap: 10 }}>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: 10, border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', background: 'white', minWidth: 120 }}
          >
            {EVENT_TYPES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: 10, border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', background: 'white', minWidth: 120 }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            style={{ padding: 10, border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', background: 'white', minWidth: 140 }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button className="am-btn am-btn-primary" style={{marginLeft: 10}} onClick={openCreateForm}>
          <i className="fas fa-plus"></i> Add Event
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="am-modal-overlay">
          <div className="am-modal am-confirm-modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this event?</p>
            <div className="am-modal-actions">
              <button className="am-btn am-btn-secondary" onClick={() => setConfirmDelete({ show: false, eventId: null })}>
                Cancel
              </button>
              <button className="am-btn am-btn-danger" onClick={confirmDeleteEvent}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {confirmToggle.show && (
        <div className="am-modal-overlay">
          <div className="am-modal am-confirm-modal">
            <h3>Change Event Status</h3>
            <p>
              Are you sure you want to {confirmToggle.event?.is_active ? 'deactivate' : 'activate'} this event?
            </p>
            <div className="am-modal-actions">
              <button className="am-btn am-btn-secondary" onClick={() => setConfirmToggle({ show: false, event: null })}>
                Cancel
              </button>
              <button className="am-btn am-btn-warning" onClick={confirmToggleEventStatus}>
                {confirmToggle.event?.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="am-modal-overlay">
          <div className="am-modal">
            <div className="am-modal-header">
              <h3>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button
                className="am-modal-close"
                onClick={() => {
                  setShowForm(false);
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
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="am-form">
              <div className="am-form-group">
                <label>Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="am-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="am-form-group">
                <label>Event Type</label>
                <select
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="academic">Academic</option>
                  <option value="social">Social</option>
                  <option value="career">Career</option>
                  <option value="workshop">Workshop</option>
                </select>
              </div>
              <div className="am-form-row">
                <div className="am-form-group">
                  <label>Start Time</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="am-form-group">
                  <label>End Time</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="am-form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>
              <div className="am-form-group">
                <label>Organizer</label>
                <input
                  type="text"
                  name="organizer"
                  value={formData.organizer}
                  onChange={handleInputChange}
                />
              </div>
              <div className="am-form-group">
                <label>Max Attendees</label>
                <input
                  type="number"
                  name="max_attendees"
                  value={formData.max_attendees}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="am-modal-actions">
                <button type="button" className="am-btn am-btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="am-btn am-btn-primary">
                  {editingEvent ? 'Update' : 'Create'} Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="am-table-container">
        <table className="am-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Location</th>
              <th>Organizer</th>
              <th>Max</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <tr key={event.id} className="am-table-row">
                  <td>{event.title}</td>
                  <td>
                    <span className={`am-priority am-priority-${event.event_type}`}>
                      {event.event_type}
                    </span>
                  </td>
                  <td>{formatDate(event.start_time)}</td>
                  <td>{formatDate(event.end_time)}</td>
                  <td>{event.location}</td>
                  <td>{event.organizer}</td>
                  <td>{event.max_attendees || '-'}</td>
                  <td>
                    <span className={`am-status am-status-${event.is_active ? 'active' : 'inactive'}`}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="am-actions">
                      <button 
                        className="am-action-btn am-edit"
                        onClick={() => handleEdit(event)}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="am-action-btn am-toggle"
                        title={event.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleStatus(event)}
                      >
                        {event.is_active ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
                      </button>
                      <button 
                        className="am-action-btn am-delete"
                        onClick={() => handleDelete(event.id)}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="am-no-data">
                  <i className="fas fa-calendar"></i>
                  <p>No events found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventManagement;