import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../services/api';
import {
  FiUsers, FiSearch, FiPlus, FiEdit2, FiTrash2, FiX,
  FiCheck, FiSlash, FiRefreshCw, FiAlertCircle,
  FiCheckCircle, FiAlertTriangle, FiChevronUp, FiChevronDown,
} from 'react-icons/fi';

const PAGE_SIZE = 20;
const ROLES = ['student', 'parent', 'lecturer', 'staff', 'admin'];
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

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function parseApiError(data) {
  if (!data || typeof data !== 'object') return 'Something went wrong. Please try again.';
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
}

function fmtDate(s) {
  if (!s) return 'Never';
  const d    = new Date(s);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

/* ─── Sub-components ────────────────────────────────────────────────────── */
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

function Lbl({ children, required }) {
  return (
    <label className="block text-xs font-bold text-navy-400 mb-1.5 uppercase tracking-wide">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Field({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
        text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50
        disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
    />
  );
}

function Sel({ children, ...props }) {
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

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div className={`fixed top-4 right-4 z-[60] flex items-start gap-3 px-4 py-3.5 rounded-2xl
      shadow-xl border max-w-sm ${ok
        ? 'bg-emerald-950/95 border-emerald-500/30'
        : 'bg-red-950/95 border-red-500/30'}`}>
      {ok
        ? <FiCheckCircle  size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
        : <FiAlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
      }
      <p className={`text-sm font-semibold leading-relaxed whitespace-pre-wrap flex-1
        ${ok ? 'text-emerald-100' : 'text-red-100'}`}>
        {toast.msg}
      </p>
      <button onClick={onDismiss} className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 ml-1">
        <FiX size={13} />
      </button>
    </div>
  );
}

function SortTh({ field, sortField, sortDir, onSort, children, className = '' }) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide
        cursor-pointer select-none hover:text-navy-300 transition-colors
        ${active ? 'text-white' : 'text-navy-500'} ${className}`}
    >
      <span className="flex items-center gap-1">
        {children}
        <span className="flex flex-col leading-none">
          <FiChevronUp   size={8} className={active && sortDir === 'asc'  ? 'text-gold' : 'text-navy-700'} />
          <FiChevronDown size={8} className={active && sortDir === 'desc' ? 'text-gold' : 'text-navy-700'} />
        </span>
      </span>
    </th>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
export default function UserManagement() {
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(false);
  const [toast,         setToast]         = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [editingUser,   setEditingUser]   = useState(null);
  const [formData,      setFormData]      = useState(EMPTY_FORM);
  const [formError,     setFormError]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, userId: null });
  const [confirmToggle, setConfirmToggle] = useState({ show: false, userId: null });
  const [confirmBulk,   setConfirmBulk]  = useState(false);
  const [selectedIds,   setSelectedIds]  = useState(new Set());
  const [bulkAction,    setBulkAction]   = useState('');
  const [searchTerm,    setSearchTerm]   = useState('');
  const [roleFilter,    setRoleFilter]   = useState('all');
  const [statusFilter,  setStatusFilter] = useState('all');
  const [sortField,     setSortField]    = useState('created_at');
  const [sortDir,       setSortDir]      = useState('desc');
  const [page,          setPage]         = useState(1);

  const toastTimer = useRef(null);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await api.get('/users/');
      setUsers(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [searchTerm, roleFilter, statusFilter, sortField, sortDir]);

  /* ── Filter + sort ── */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return users.filter(u => {
      const hit = !q
        || u.first_name?.toLowerCase().includes(q)
        || u.last_name?.toLowerCase().includes(q)
        || u.email?.toLowerCase().includes(q)
        || u.student_id?.toLowerCase().includes(q)
        || u.phone_number?.toLowerCase().includes(q);
      const okRole   = roleFilter   === 'all' || u.role === roleFilter;
      const okStatus = statusFilter === 'all'
        || (statusFilter === 'active'   &&  u.is_active)
        || (statusFilter === 'inactive' && !u.is_active);
      return hit && okRole && okStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sortField === 'name') {
        av = `${a.first_name} ${a.last_name}`.toLowerCase();
        bv = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else if (sortField === 'email') {
        av = a.email?.toLowerCase() || '';
        bv = b.email?.toLowerCase() || '';
      } else if (sortField === 'last_login') {
        av = a.last_login ? new Date(a.last_login).getTime() : 0;
        bv = b.last_login ? new Date(b.last_login).getTime() : 0;
      } else {
        av = new Date(a.created_at || 0).getTime();
        bv = new Date(b.created_at || 0).getTime();
      }
      return av < bv ? (sortDir === 'asc' ? -1 : 1)
           : av > bv ? (sortDir === 'asc' ?  1 : -1)
           : 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const roleCounts = useMemo(() =>
    ROLES.reduce((acc, r) => { acc[r] = users.filter(u => u.role === r).length; return acc; }, {}),
    [users]
  );

  /* ── Sort handler ── */
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  /* ── Selection ── */
  const allPageSelected = paginated.length > 0 && paginated.every(u => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allPageSelected) paginated.forEach(u => n.delete(u.id));
      else                 paginated.forEach(u => n.add(u.id));
      return n;
    });
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── Form ── */
  const closeForm = () => {
    setShowForm(false); setEditingUser(null);
    setFormData(EMPTY_FORM); setFormError('');
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name || '', last_name: user.last_name || '',
      email: user.email || '', role: user.role || 'student',
      student_id: user.student_id || '', phone_number: user.phone_number || '',
      is_active: user.is_active, password: '', password2: '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const pwMatch = !formData.password2 || formData.password === formData.password2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) {
      if (!formData.password) { setFormError('Password is required.'); return; }
      if (!pwMatch) { setFormError('Passwords do not match.'); return; }
      if (formData.role === 'student' && !formData.student_id.trim()) {
        setFormError('Student ID is required for students.'); return;
      }
    }
    setSubmitting(true);
    setFormError('');
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}/`, {
          first_name: formData.first_name, last_name: formData.last_name,
          phone_number: formData.phone_number, student_id: formData.student_id,
          is_active: formData.is_active,
        });
        showToast('success', 'User updated successfully.');
      } else {
        const { password2, ...payload } = formData; // eslint-disable-line no-unused-vars
        await api.post('/users/', payload);
        showToast('success', 'User created successfully.');
      }
      await fetchUsers();
      closeForm();
    } catch (err) {
      setFormError(parseApiError(err.response?.data));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Single confirm actions ── */
  const toggleUser = users.find(u => u.id === confirmToggle.userId);

  const doToggle = async () => {
    const id = confirmToggle.userId;
    const user = users.find(u => u.id === id);
    setConfirmToggle({ show: false, userId: null });
    if (!user) return;
    try {
      await api.patch(`/users/${id}/`, { is_active: !user.is_active });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
      showToast('success', `User ${user.is_active ? 'deactivated' : 'activated'}.`);
    } catch {
      showToast('error', 'Failed to update user status. Try again.');
    }
  };

  const doDelete = async () => {
    const id = confirmDelete.userId;
    setConfirmDelete({ show: false, userId: null });
    try {
      await api.delete(`/users/${id}/`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      showToast('success', 'User deleted.');
    } catch {
      showToast('error', 'Failed to delete user. Try again.');
    }
  };

  /* ── Bulk actions ── */
  const executeBulk = async () => {
    setConfirmBulk(false);
    const ids = [...selectedIds];
    try {
      if (bulkAction === 'activate') {
        await Promise.allSettled(ids.map(id => api.patch(`/users/${id}/`, { is_active: true })));
        setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, is_active: true } : u));
        showToast('success', `${ids.length} user(s) activated.`);
      } else if (bulkAction === 'deactivate') {
        await Promise.allSettled(ids.map(id => api.patch(`/users/${id}/`, { is_active: false })));
        setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, is_active: false } : u));
        showToast('success', `${ids.length} user(s) deactivated.`);
      } else if (bulkAction === 'delete') {
        await Promise.allSettled(ids.map(id => api.delete(`/users/${id}/`)));
        setUsers(prev => prev.filter(u => !ids.includes(u.id)));
        showToast('success', `${ids.length} user(s) deleted.`);
      }
      setSelectedIds(new Set());
      setBulkAction('');
    } catch {
      showToast('error', 'Some actions failed. Refresh and try again.');
    }
  };

  /* ── Loading / error full-page ── */
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-52 bg-navy-700/60 rounded-xl animate-pulse" />
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-10 bg-navy-700/40 rounded-xl animate-pulse ${i === 0 ? 'flex-1' : 'w-32'}`} />
          ))}
        </div>
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-navy-700/30 animate-pulse">
              <div className="w-4 h-4 bg-navy-700/60 rounded flex-shrink-0" />
              <div className="w-8 h-8 bg-navy-700/60 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-navy-700/60 rounded" />
                <div className="h-3 w-20 bg-navy-700/40 rounded" />
              </div>
              <div className="h-3.5 w-40 bg-navy-700/40 rounded" />
              <div className="h-5 w-16 bg-navy-700/60 rounded-lg" />
              <div className="h-5 w-14 bg-navy-700/60 rounded-lg" />
              <div className="h-3 w-16 bg-navy-700/40 rounded" />
              <div className="h-3 w-16 bg-navy-700/40 rounded" />
              <div className="flex gap-1.5">
                {[...Array(3)].map((_, j) => <div key={j} className="w-8 h-8 bg-navy-700/60 rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <FiAlertCircle size={28} className="text-red-400" />
        </div>
        <p className="text-lg font-black text-white">Failed to load users</p>
        <p className="text-sm text-navy-400 mt-1 mb-6">Check that the backend is running.</p>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black
            text-navy-900 transition-all hover:-translate-y-px"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          <FiRefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="space-y-5">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-sm text-navy-400 mt-1">
            {users.length} total · {users.filter(u => u.is_active).length} active ·{' '}
            {users.filter(u => !u.is_active).length} inactive
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm
            text-navy-900 transition-all hover:-translate-y-0.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          <FiPlus size={15} aria-hidden /> Add User
        </button>
      </div>

      {/* Role breakdown pills — each pill doubles as a filter toggle */}
      {users.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ROLES.filter(r => roleCounts[r] > 0).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(prev => prev === r ? 'all' : r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                roleFilter === r
                  ? `${ROLE_COLOR[r]} ring-1 ring-inset ring-current/20`
                  : 'bg-navy-800/60 text-navy-400 border border-navy-700/40 hover:border-navy-600/60'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}s
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black min-w-[16px] text-center ${
                roleFilter === r ? 'bg-black/20' : 'bg-navy-700/60'
              }`}>
                {roleCounts[r]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden />
          <input
            type="text"
            placeholder="Search name, email, student ID, phone…"
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
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
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
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/[0.08] border border-gold/20">
          <span className="text-xs font-black text-gold">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {[
              { action: 'activate',   label: 'Activate',   cls: 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' },
              { action: 'deactivate', label: 'Deactivate', cls: 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'       },
              { action: 'delete',     label: 'Delete',     cls: 'text-red-400 bg-red-500/10 hover:bg-red-500/20'             },
            ].map(({ action, label, cls }) => (
              <button
                key={action}
                onClick={() => { setBulkAction(action); setConfirmBulk(true); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${cls}`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => { setSelectedIds(new Set()); setBulkAction(''); }}
              className="ml-1 text-navy-500 hover:text-white transition-colors"
              aria-label="Clear selection"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-700/60 flex items-center justify-center mx-auto mb-4">
              <FiUsers size={24} className="text-navy-500" aria-hidden />
            </div>
            <p className="text-white font-bold mb-1">No users found</p>
            <p className="text-sm text-navy-500">Try adjusting your search or filters.</p>
            {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setRoleFilter('all'); setStatusFilter('all'); }}
                className="mt-4 text-xs font-bold text-gold hover:text-gold/70 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/40">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded accent-gold cursor-pointer"
                        aria-label="Select all on page"
                      />
                    </th>
                    <SortTh field="name"       sortField={sortField} sortDir={sortDir} onSort={handleSort}>Name</SortTh>
                    <SortTh field="email"      sortField={sortField} sortDir={sortDir} onSort={handleSort}>Email</SortTh>
                    <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">Role</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">Status</th>
                    <SortTh field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Joined</SortTh>
                    <SortTh field="last_login" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Last Login</SortTh>
                    <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/30">
                  {paginated.map(user => {
                    const avatar   = user.profile?.profile_picture_url || null;
                    const selected = selectedIds.has(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={`transition-colors ${selected ? 'bg-gold/[0.04]' : 'hover:bg-navy-700/20'}`}
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(user.id)}
                            className="w-4 h-4 rounded accent-gold cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden
                              flex items-center justify-center bg-navy-700">
                              {avatar
                                ? <img
                                    src={avatar} alt=""
                                    className="w-full h-full object-cover"
                                    onError={e => { e.target.style.display = 'none'; }}
                                  />
                                : <span className="text-[10px] font-black text-gold">
                                    {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                                  </span>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-navy-500 truncate">
                                {user.phone_number || (user.student_id ? `ID: ${user.student_id}` : '—')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-navy-300 text-xs max-w-[180px] truncate">
                          {user.email}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black capitalize
                            ${ROLE_COLOR[user.role] || 'bg-navy-700 text-navy-300'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                            ${user.is_active
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-navy-400 text-xs whitespace-nowrap">
                          {fmtDate(user.created_at)}
                        </td>
                        <td className="px-5 py-3.5 text-navy-400 text-xs whitespace-nowrap">
                          {fmtDate(user.last_login)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(user)}
                              title="Edit user"
                              className="w-8 h-8 rounded-lg flex items-center justify-center
                                bg-navy-700/60 hover:bg-sky-500/20 hover:text-sky-400
                                text-navy-400 transition-colors"
                            >
                              <FiEdit2 size={13} aria-hidden />
                            </button>
                            <button
                              onClick={() => setConfirmToggle({ show: true, userId: user.id })}
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                ${user.is_active
                                  ? 'bg-navy-700/60 hover:bg-amber-500/20 hover:text-amber-400 text-navy-400'
                                  : 'bg-navy-700/60 hover:bg-emerald-500/20 hover:text-emerald-400 text-navy-400'}`}
                            >
                              {user.is_active
                                ? <FiSlash size={13} aria-hidden />
                                : <FiCheck size={13} aria-hidden />
                              }
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ show: true, userId: user.id })}
                              title="Delete user"
                              className="w-8 h-8 rounded-lg flex items-center justify-center
                                bg-navy-700/60 hover:bg-red-500/20 hover:text-red-400
                                text-navy-400 transition-colors"
                            >
                              <FiTrash2 size={13} aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer: count + pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-navy-700/40">
              <p className="text-xs text-navy-500">
                {sorted.length === users.length
                  ? `${users.length} user${users.length !== 1 ? 's' : ''}`
                  : `${sorted.length} of ${users.length} users`
                }
                {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-navy-400
                      border border-navy-700/40 hover:border-navy-600 hover:text-white
                      disabled:opacity-30 transition-colors"
                  >
                    ‹ Prev
                  </button>
                  <span className="text-xs text-navy-500 px-2">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-navy-400
                      border border-navy-700/40 hover:border-navy-600 hover:text-white
                      disabled:opacity-30 transition-colors"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {confirmDelete.show && (
        <ModalOverlay onClose={() => setConfirmDelete({ show: false, userId: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-base font-black text-white text-center mb-1">Delete User</h3>
            <p className="text-sm text-navy-400 text-center mb-6">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete({ show: false, userId: null })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-navy-300
                  bg-navy-700/60 hover:bg-navy-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Toggle confirm ── */}
      {confirmToggle.show && (
        <ModalOverlay onClose={() => setConfirmToggle({ show: false, userId: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-base font-black text-white text-center mb-1">
              {toggleUser?.is_active ? 'Deactivate' : 'Activate'} User
            </h3>
            <p className="text-sm font-bold text-white text-center mt-1">
              {toggleUser?.first_name} {toggleUser?.last_name}
            </p>
            <p className="text-sm text-navy-400 text-center mt-1 mb-6">
              {toggleUser?.is_active
                ? 'This user will no longer be able to log in.'
                : 'This user will be able to log in again.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmToggle({ show: false, userId: null })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-navy-300
                  bg-navy-700/60 hover:bg-navy-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doToggle}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors
                  ${toggleUser?.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {toggleUser?.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Bulk confirm ── */}
      {confirmBulk && (
        <ModalOverlay onClose={() => setConfirmBulk(false)}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-base font-black text-white text-center mb-2 capitalize">
              {bulkAction} {selectedIds.size} user{selectedIds.size !== 1 ? 's' : ''}?
            </h3>
            <p className="text-sm text-navy-400 text-center mb-6">
              {bulkAction === 'delete' ? 'This cannot be undone.' : 'You can reverse this later.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmBulk(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-navy-300
                  bg-navy-700/60 hover:bg-navy-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeBulk}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors
                  ${bulkAction === 'delete'     ? 'bg-red-500 hover:bg-red-600'         :
                    bulkAction === 'activate'   ? 'bg-emerald-500 hover:bg-emerald-600' :
                                                  'bg-amber-500 hover:bg-amber-600'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Create / Edit modal ── */}
      {showForm && (
        <ModalOverlay onClose={closeForm}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40 sticky top-0 bg-navy-800 z-10">
              <h3 className="text-lg font-black text-white">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                  bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors"
              >
                <FiX size={15} aria-hidden />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-5 flex items-start gap-3 px-4 py-3 rounded-xl
                bg-red-500/10 border border-red-500/20">
                <FiAlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-300 leading-relaxed whitespace-pre-wrap">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Lbl required>First Name</Lbl>
                  <Field name="first_name" value={formData.first_name} onChange={handleInput}
                    required placeholder="Jane" />
                </div>
                <div>
                  <Lbl required>Last Name</Lbl>
                  <Field name="last_name" value={formData.last_name} onChange={handleInput}
                    required placeholder="Doe" />
                </div>
              </div>

              <div>
                <Lbl required={!editingUser}>Email</Lbl>
                {editingUser ? (
                  <div className="px-3 py-2.5 rounded-xl bg-navy-900/50 border border-navy-700/40
                    text-navy-400 text-sm flex items-center justify-between">
                    <span>{formData.email}</span>
                    <span className="text-[10px] font-black text-navy-600 uppercase tracking-wide">
                      Read-only
                    </span>
                  </div>
                ) : (
                  <Field type="email" name="email" value={formData.email} onChange={handleInput}
                    required placeholder="jane@example.com" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Lbl required={!editingUser}>Role</Lbl>
                  {editingUser ? (
                    <div className="px-3 py-2.5 rounded-xl bg-navy-900/50 border border-navy-700/40
                      flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black capitalize
                        ${ROLE_COLOR[formData.role] || 'bg-navy-700 text-navy-300'}`}>
                        {formData.role}
                      </span>
                      <span className="text-[10px] font-black text-navy-600 uppercase tracking-wide">
                        Read-only
                      </span>
                    </div>
                  ) : (
                    <Sel name="role" value={formData.role} onChange={handleInput} required>
                      <option value="student">Student</option>
                      <option value="parent">Parent</option>
                      <option value="lecturer">Lecturer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Administrator</option>
                    </Sel>
                  )}
                </div>

                {/* Student ID — only shown for students */}
                {(formData.role === 'student' || editingUser?.role === 'student') && (
                  <div>
                    <Lbl required={!editingUser && formData.role === 'student'}>Student ID</Lbl>
                    <Field name="student_id" value={formData.student_id} onChange={handleInput}
                      placeholder="STU-0001" />
                  </div>
                )}
              </div>

              <div>
                <Lbl>Phone Number</Lbl>
                <Field type="tel" name="phone_number" value={formData.phone_number}
                  onChange={handleInput} placeholder="+237 6XX XXX XXX" />
              </div>

              {!editingUser && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Lbl required>Password</Lbl>
                    <Field type="password" name="password" value={formData.password}
                      onChange={handleInput} required placeholder="••••••••" />
                  </div>
                  <div>
                    <Lbl required>Confirm Password</Lbl>
                    <Field
                      type="password" name="password2" value={formData.password2}
                      onChange={handleInput} required placeholder="••••••••"
                      className={formData.password2 && !pwMatch ? 'border-red-500/60' : ''}
                    />
                    {formData.password2 && !pwMatch && (
                      <p className="text-[10px] text-red-400 mt-1 font-semibold">Passwords do not match</p>
                    )}
                    {formData.password2 && pwMatch && formData.password && (
                      <p className="text-[10px] text-emerald-400 mt-1 font-semibold">✓ Passwords match</p>
                    )}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" name="is_active" checked={formData.is_active}
                    onChange={handleInput} className="sr-only peer" />
                  <div className="w-10 h-5 rounded-full bg-navy-700 peer-checked:bg-gold transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white
                    transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm font-semibold text-navy-300">Active Account</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={closeForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-navy-300
                    bg-navy-700/60 hover:bg-navy-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!editingUser && !!formData.password2 && !pwMatch)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-navy-900 transition-all
                    hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:hover:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  {submitting ? 'Saving…' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
