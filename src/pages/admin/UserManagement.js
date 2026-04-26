import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiUsers, FiSearch, FiPlus, FiEdit2, FiTrash2,
  FiX, FiCheck, FiSlash,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const ROLE_COLOR = {
  admin:    'bg-gold/20 text-gold',
  student:  'bg-sky-500/20 text-sky-400',
  lecturer: 'bg-violet-500/20 text-violet-400',
  parent:   'bg-emerald-500/20 text-emerald-400',
  staff:    'bg-orange-500/20 text-orange-400',
};

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '',
  role: 'student', student_id: '', phone_number: '',
  is_active: true, password: '', password2: '',
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

function Field({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
        text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50
        disabled:opacity-40 transition-colors ${className}`}
    />
  );
}

function SelectField({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
        text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
    >
      {children}
    </select>
  );
}

export default function UserManagement() {
  const [users,         setUsers]         = useState([]);
  const [showForm,      setShowForm]      = useState(false);
  const [editingUser,   setEditingUser]   = useState(null);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [roleFilter,    setRoleFilter]    = useState('all');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [formData,      setFormData]      = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, userId: null });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, userId: null });

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${BASE_URL}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch { setUsers([]); }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingUser) {
        const { password, password2, ...updateData } = formData;
        await axios.put(`${BASE_URL}/api/users/${editingUser.id}/`, updateData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${BASE_URL}/api/users/`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await fetchUsers();
      closeForm();
    } catch (err) {
      alert(JSON.stringify(err.response?.data));
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name, last_name: user.last_name,
      email: user.email, role: user.role,
      student_id: user.student_id, phone_number: user.phone_number,
      is_active: user.is_active, password: '', password2: '',
    });
    setShowForm(true);
  };

  const confirmToggleUserStatus = async () => {
    const id = confirmToggle.userId;
    setConfirmToggle({ show: false, userId: null });
    const token = localStorage.getItem('token');
    const user = users.find(u => u.id === id);
    if (!user) return;
    await axios.patch(`${BASE_URL}/api/users/${id}/`, { is_active: !user.is_active }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchUsers();
  };

  const confirmDeleteUser = async () => {
    const id = confirmDelete.userId;
    setConfirmDelete({ show: false, userId: null });
    const token = localStorage.getItem('token');
    await axios.delete(`${BASE_URL}/api/users/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const formatDate = (s) => s ? new Date(s).toLocaleDateString() : 'Never';

  const filteredUsers = users.filter(user => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      user.first_name?.toLowerCase().includes(q) ||
      user.last_name?.toLowerCase().includes(q)  ||
      user.email?.toLowerCase().includes(q);
    const matchRole   = roleFilter   === 'all' || user.role === roleFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active'   &&  user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const toggleUser = users.find(u => u.id === confirmToggle.userId);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">User Management</h1>
        <p className="text-sm text-navy-400 mt-1">Manage user accounts and permissions</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search users…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
              text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
            text-white text-sm focus:outline-none focus:border-gold/40 transition-colors"
        >
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="parent">Parent</option>
          <option value="lecturer">Lecturer</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
            text-white text-sm focus:outline-none focus:border-gold/40 transition-colors"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-navy-900
            transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          <FiPlus size={15} aria-hidden="true" />
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-700/60 flex items-center justify-center mx-auto mb-4">
              <FiUsers size={24} className="text-navy-500" aria-hidden="true" />
            </div>
            <p className="text-white font-bold mb-1">No users found</p>
            <p className="text-sm text-navy-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/40">
                  {['Name', 'Email', 'Role', 'Student ID', 'Status', 'Created', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/30">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-navy-700/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-navy-700/60 flex items-center justify-center
                          text-xs font-black text-gold flex-shrink-0">
                          {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-navy-500">{user.phone_number || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-navy-300">{user.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${ROLE_COLOR[user.role] || 'bg-navy-700 text-navy-300'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-navy-400">{user.student_id || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                        ${user.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-navy-400 text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-3.5 text-navy-400 text-xs">{formatDate(user.last_login)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(user)}
                          title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center
                            bg-navy-700/60 hover:bg-sky-500/20 hover:text-sky-400
                            text-navy-400 transition-colors"
                        >
                          <FiEdit2 size={13} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setConfirmToggle({ show: true, userId: user.id })}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                            ${user.is_active
                              ? 'bg-navy-700/60 hover:bg-amber-500/20 hover:text-amber-400 text-navy-400'
                              : 'bg-navy-700/60 hover:bg-emerald-500/20 hover:text-emerald-400 text-navy-400'
                            }`}
                        >
                          {user.is_active
                            ? <FiSlash size={13} aria-hidden="true" />
                            : <FiCheck size={13} aria-hidden="true" />
                          }
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ show: true, userId: user.id })}
                          title="Delete"
                          className="w-8 h-8 rounded-lg flex items-center justify-center
                            bg-navy-700/60 hover:bg-red-500/20 hover:text-red-400
                            text-navy-400 transition-colors"
                        >
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

      {/* Delete Confirm Modal */}
      {confirmDelete.show && (
        <ModalOverlay onClose={() => setConfirmDelete({ show: false, userId: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Confirm Deletion</h3>
            <p className="text-sm text-navy-400 mb-6">Are you sure you want to delete this user? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete({ show: false, userId: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300
                  bg-navy-700/60 hover:bg-navy-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white
                  bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Toggle Status Confirm Modal */}
      {confirmToggle.show && (
        <ModalOverlay onClose={() => setConfirmToggle({ show: false, userId: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Change User Status</h3>
            <p className="text-sm text-navy-400 mb-6">
              Are you sure you want to {toggleUser?.is_active ? 'deactivate' : 'activate'} this user?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmToggle({ show: false, userId: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300
                  bg-navy-700/60 hover:bg-navy-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleUserStatus}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors
                  ${toggleUser?.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {toggleUser?.is_active ? 'Deactivate' : 'Activate'}
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
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                  bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors"
              >
                <FiX size={15} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Field name="first_name" value={formData.first_name} onChange={handleInputChange} required placeholder="Jane" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Field name="last_name" value={formData.last_name} onChange={handleInputChange} required placeholder="Doe" />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Field type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="jane@example.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <SelectField name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                  </SelectField>
                </div>
                <div>
                  <Label>Student ID</Label>
                  <Field
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    disabled={formData.role !== 'student'}
                    placeholder="STU-0001"
                  />
                </div>
              </div>

              <div>
                <Label>Phone Number</Label>
                <Field type="tel" name="phone_number" value={formData.phone_number} onChange={handleInputChange} placeholder="+237 6XX XXX XXX" />
              </div>

              {!editingUser && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Password</Label>
                    <Field type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="••••••••" />
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Field type="password" name="password2" value={formData.password2} onChange={handleInputChange} required placeholder="••••••••" />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 rounded-full bg-navy-700 peer-checked:bg-gold transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm font-semibold text-navy-300">Active Account</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300
                    bg-navy-700/60 hover:bg-navy-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold text-navy-900
                    transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  {editingUser ? 'Update' : 'Create'} User
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
