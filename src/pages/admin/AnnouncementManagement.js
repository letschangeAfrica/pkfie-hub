import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AnnouncementManagement.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const PAGE_SIZE = 50;

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal',
    start_date: '',
    end_date: ''
  });
  const [saving, setSaving] = useState(false);

  // Search/filter/sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState({ show: false, announcementId: null });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, announcementId: null });

  // Viewers modal state
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [viewersAnnouncement, setViewersAnnouncement] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      // Always handle pagination!
      const res = await axios.get(`${BASE_URL}/api/announcements/?page_size=${PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(
        Array.isArray(res.data.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (error) {
      setAnnouncements([]);
      console.error('Error fetching announcements:', error);
    }
  };

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setNewAnnouncement({
      title: '',
      content: '',
      priority: 'normal',
      start_date: '',
      end_date: ''
    });
    setShowForm(true);
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setNewAnnouncement({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      start_date: announcement.start_date ? announcement.start_date.slice(0, 10) : '',
      end_date: announcement.end_date ? announcement.end_date.slice(0, 10) : ''
    });
    setShowForm(true);
  };

  const toDateTimeString = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr;
  };

  const handleSaveAnnouncement = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    const payload = {
      ...newAnnouncement,
      start_date: toDateTimeString(newAnnouncement.start_date),
      end_date: newAnnouncement.end_date ? toDateTimeString(newAnnouncement.end_date) : null,
    };
    try {
      if (editingAnnouncement) {
        await axios.put(
          `${BASE_URL}/api/announcements/${editingAnnouncement.id}/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BASE_URL}/api/announcements/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setShowForm(false);
      setEditingAnnouncement(null);
      setNewAnnouncement({
        title: '',
        content: '',
        priority: 'normal',
        start_date: '',
        end_date: ''
      });
      fetchAnnouncements();
    } catch (error) {
      alert(
        'Error saving announcement:\n' +
          (error?.response?.data?.detail ||
            JSON.stringify(error?.response?.data) ||
            error.message)
      );
      console.error('Error saving announcement:', error);
    }
    setSaving(false);
  };

  const handleToggleStatus = (id) => {
    setConfirmToggle({ show: true, announcementId: id });
  };

  const confirmToggleAnnouncementStatus = async () => {
    const id = confirmToggle.announcementId;
    setConfirmToggle({ show: false, announcementId: null });
    const token = localStorage.getItem('token');
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;
    const newStatus = announcement.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.patch(
        `${BASE_URL}/api/announcements/${id}/`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAnnouncements();
    } catch (error) {
      alert('Error updating announcement status:\n' + (error?.response?.data?.detail || error.message));
      console.error('Error updating announcement status:', error);
    }
  };

  const handleDeleteAnnouncement = (id) => {
    setConfirmDelete({ show: true, announcementId: id });
  };

  const confirmDeleteAnnouncement = async () => {
    const id = confirmDelete.announcementId;
    setConfirmDelete({ show: false, announcementId: null });
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${BASE_URL}/api/announcements/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAnnouncements();
    } catch (error) {
      alert('Error deleting announcement:\n' + (error?.response?.data?.detail || error.message));
      console.error('Error deleting announcement:', error);
    }
  };

  const fetchViewers = async (announcementId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(
        `${BASE_URL}/api/announcement-views/?announcement=${announcementId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setViewers(res.data);
      setShowViewers(true);
      setViewersAnnouncement(announcements.find(a => a.id === announcementId));
    } catch (err) {
      alert('Failed to fetch viewers');
      setViewers([]);
      setShowViewers(false);
    }
  };

  const formatDate = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleDateString();
  };

  const filteredAnnouncements = announcements
    .filter(a => {
      const matchesSearch = (
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesPriority = priorityFilter ? a.priority === priorityFilter : true;
      const matchesStatus = statusFilter
        ? (statusFilter === 'active'
            ? a.status === 'active'
            : a.status === 'inactive')
        : true;
      return matchesSearch && matchesPriority && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else {
        return new Date(a.created_at) - new Date(b.created_at);
      }
    });

  return (
    <div className="am-container">
      <div className="am-header">
        <h2>Announcement Management</h2>
        <p>Create and manage announcements for your institution</p>
      </div>
      
      <div className="am-toolbar" style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
        <div className="am-search" style={{flex: 1, minWidth: 250, position: 'relative'}}>
          <i className="fas fa-search" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6c757d'
          }} />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40, width: '100%', border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', height: 41 }}
          />
        </div>
        <div className="am-filters" style={{ display: 'flex', gap: 10 }}>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            style={{ padding: 10, border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', background: 'white', minWidth: 120 }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: 10, border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', background: 'white', minWidth: 120 }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            style={{ padding: 10, border: '1px solid #ced4da', borderRadius: 6, fontSize: '0.9rem', background: 'white', minWidth: 140 }}
          >
            <option value="newest">Newest to Oldest</option>
            <option value="oldest">Oldest to Newest</option>
          </select>
        </div>
        <button className="am-btn am-btn-primary" style={{marginLeft: 10}} onClick={handleCreateAnnouncement}>
          <i className="fas fa-plus"></i> Create Announcement
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="am-modal-overlay">
          <div className="am-modal am-confirm-modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this announcement?</p>
            <div className="am-modal-actions">
              <button className="am-btn am-btn-secondary" onClick={() => setConfirmDelete({ show: false, announcementId: null })}>
                Cancel
              </button>
              <button className="am-btn am-btn-danger" onClick={confirmDeleteAnnouncement}>
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
            <h3>Change Announcement Status</h3>
            <p>
              Are you sure you want to {announcements.find(a => a.id === confirmToggle.announcementId)?.status === "active" ? "deactivate" : "activate"} this announcement?
            </p>
            <div className="am-modal-actions">
              <button className="am-btn am-btn-secondary" onClick={() => setConfirmToggle({ show: false, announcementId: null })}>
                Cancel
              </button>
              <button className="am-btn am-btn-warning" onClick={confirmToggleAnnouncementStatus}>
                {announcements.find(a => a.id === confirmToggle.announcementId)?.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewers Modal */}
      {showViewers && (
        <div className="am-modal-overlay">
          <div className="am-modal">
            <div className="am-modal-header">
              <h3>Viewers for "{viewersAnnouncement?.title}"</h3>
              <button className="am-modal-close" onClick={() => setShowViewers(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              {viewers.length === 0 ? (
                <p>No users have viewed this announcement yet.</p>
              ) : (
                <ul>
                  {viewers.map((view, idx) => (
                    <li key={view.id || idx}>
  {view.user_full_name || view.user_email || view.user} – {new Date(view.viewed_at).toLocaleString()}
</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="am-modal-overlay">
          <div className="am-modal">
            <div className="am-modal-header">
              <h3>{editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}</h3>
              <button className="am-modal-close" onClick={() => setShowForm(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="am-form">
              <div className="am-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  placeholder="Enter announcement title"
                />
              </div>
              <div className="am-form-group">
                <label>Content</label>
                <textarea
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                  rows="5"
                  placeholder="Enter announcement content"
                />
              </div>
              <div className="am-form-group">
                <label>Priority</label>
                <select
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="am-form-row">
                <div className="am-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={newAnnouncement.start_date}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, start_date: e.target.value})}
                  />
                </div>
                <div className="am-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={newAnnouncement.end_date}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="am-modal-actions">
                <button className="am-btn am-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button 
                  className="am-btn am-btn-primary" 
                  onClick={handleSaveAnnouncement}
                  disabled={!newAnnouncement.title || !newAnnouncement.content || saving}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    editingAnnouncement ? 'Update Announcement' : 'Create Announcement'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="am-table-container">
        <table className="am-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Priority</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map(announcement => (
                <tr key={announcement.id} className={`am-table-row ${announcement.status === 'expired' ? 'am-expired' : ''}`}>
                  <td>
                    <div className="am-announcement-title">
                      <strong>{announcement.title}</strong>
                      <p>{announcement.content}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`am-priority am-priority-${announcement.priority}`}>
                      {announcement.priority}
                    </span>
                  </td>
                  <td>{formatDate(announcement.start_date)}</td>
                  <td>{formatDate(announcement.end_date)}</td>
                  <td>
                    <span className={`am-status am-status-${announcement.status}`}>
                      {announcement.status}
                    </span>
                  </td>
                  <td>
                    <div className="am-actions">
                      <button 
                        className="am-action-btn am-edit" 
                        title="Edit"
                        onClick={() => handleEditAnnouncement(announcement)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="am-action-btn am-toggle" 
                        title={announcement.status === 'active' ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleStatus(announcement.id)}
                      >
                        <i className={`fas ${announcement.status === 'active' ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                      <button 
                        className="am-action-btn am-viewers"
                        title="See Viewers"
                        onClick={() => fetchViewers(announcement.id)}
                      >
                        <i className="fas fa-users"></i>
                      </button>
                      <button 
                        className="am-action-btn am-delete" 
                        title="Delete"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="am-no-data">
                  <i className="fas fa-bullhorn"></i>
                  <p>No announcements found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnnouncementManagement;