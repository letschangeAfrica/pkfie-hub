import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'student',
    student_id: '',
    phone_number: '',
    is_active: true,
    password: '',
    password2: ''
  });

  // For confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState({ show: false, userId: null });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, userId: null });

  const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${BASE_URL}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      setUsers([]);
      console.error('Error fetching users:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingUser) {
        // Update existing user (don't send password fields)
        const { password, password2, ...updateData } = formData;
        await axios.put(
          `${BASE_URL}/api/users/${editingUser.id}/`,
          updateData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new user
        await axios.post(
          `${BASE_URL}/api/users/`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      // Refresh users list
      await fetchUsers();
      setShowForm(false);
      setEditingUser(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        role: 'student',
        student_id: '',
        phone_number: '',
        is_active: true,
        password: '',
        password2: ''
      });
    } catch (err) {
      alert(JSON.stringify(err.response?.data));
      console.error(err.response?.data || err);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
      phone_number: user.phone_number,
      is_active: user.is_active,
      password: '',
      password2: ''
    });
    setShowForm(true);
  };

  // Show confirmation modal for status toggle
  const handleToggleStatus = (id) => {
    setConfirmToggle({ show: true, userId: id });
  };

  // Confirm and perform status toggle
  const confirmToggleUserStatus = async () => {
    const id = confirmToggle.userId;
    setConfirmToggle({ show: false, userId: null });
    const token = localStorage.getItem('token');
    const user = users.find(u => u.id === id);
    if (!user) return;
    await axios.patch(
      `${BASE_URL}/api/users/${id}/`,
      { is_active: !user.is_active },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await fetchUsers();
  };

  // Show confirmation modal for delete
  const handleDelete = (id) => {
    setConfirmDelete({ show: true, userId: id });
  };

  // Confirm and perform delete
  const confirmDeleteUser = async () => {
    const id = confirmDelete.userId;
    setConfirmDelete({ show: false, userId: null });
    const token = localStorage.getItem('token');
    await axios.delete(`${BASE_URL}/api/users/${id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setUsers(users.filter(user => user.id !== id));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Filter users based on search term, role, and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="um-container">
      <div className="um-header">
        <h2>User Management</h2>
        <p>Manage user accounts and permissions</p>
      </div>

      <div className="um-toolbar">
        <div className="um-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="um-filters">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button
          className="um-btn um-btn-primary"
          onClick={() => setShowForm(true)}
        >
          <i className="fas fa-plus"></i> Add User
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="um-modal-overlay">
          <div className="um-modal um-confirm-modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this user?</p>
            <div className="um-modal-actions">
              <button className="um-btn um-btn-secondary" onClick={() => setConfirmDelete({ show: false, userId: null })}>
                Cancel
              </button>
              <button className="um-btn um-btn-danger" onClick={confirmDeleteUser}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {confirmToggle.show && (
        <div className="um-modal-overlay">
          <div className="um-modal um-confirm-modal">
            <h3>Change User Status</h3>
            <p>Are you sure you want to {users.find(u => u.id === confirmToggle.userId)?.is_active ? "deactivate" : "activate"} this user?</p>
            <div className="um-modal-actions">
              <button className="um-btn um-btn-secondary" onClick={() => setConfirmToggle({ show: false, userId: null })}>
                Cancel
              </button>
              <button className="um-btn um-btn-warning" onClick={confirmToggleUserStatus}>
                {users.find(u => u.id === confirmToggle.userId)?.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="um-modal-overlay">
          <div className="um-modal">
            <div className="um-modal-header">
              <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button
                className="um-modal-close"
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                  setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    role: 'student',
                    student_id: '',
                    phone_number: '',
                    is_active: true,
                    password: '',
                    password2: ''
                  });
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="um-form">
              <div className="um-form-row">
                <div className="um-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="um-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="um-form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="um-form-row">
                <div className="um-form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="um-form-group">
                  <label>Student ID (if applicable)</label>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    disabled={formData.role !== 'student'}
                  />
                </div>
              </div>
              <div className="um-form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                />
              </div>
              {!editingUser && (
                <>
                  <div className="um-form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="um-form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      name="password2"
                      value={formData.password2}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </>
              )}
              <div className="um-form-group um-checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  Active Account
                </label>
              </div>
              <div className="um-modal-actions">
                <button type="button" className="um-btn um-btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="um-btn um-btn-primary">
                  {editingUser ? 'Update' : 'Create'} User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="um-table-container">
        {filteredUsers.length > 0 ? (
          <table className="um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Student ID</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="um-table-row">
                  <td>
                    <div className="um-user-info">
                      <div className="um-user-avatar">
                        {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                      </div>
                      <div className="um-user-details">
                        <strong>{user.first_name} {user.last_name}</strong>
                        <span>{user.phone_number || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`um-role um-role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.student_id || '-'}</td>
                  <td>
                    <span className={`um-status um-status-${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{formatDate(user.last_login)}</td>
                  <td>
                    <div className="um-actions">
                      <button
                        className="um-action-btn um-edit"
                        onClick={() => handleEdit(user)}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className={`um-action-btn ${user.is_active ? 'um-deactivate' : 'um-activate'}`}
                        onClick={() => handleToggleStatus(user.id)}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? <i className="fas fa-ban"></i> : <i className="fas fa-check"></i>}
                      </button>
                      <button
                        className="um-action-btn um-delete"
                        onClick={() => handleDelete(user.id)}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="um-no-users">
            <i className="fas fa-users"></i>
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;