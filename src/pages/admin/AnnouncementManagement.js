import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiBell, FiSearch, FiPlus, FiEdit2, FiTrash2,
  FiEye, FiEyeOff, FiUsers, FiX,
} from 'react-icons/fi';

const BASE_URL  = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const PAGE_SIZE = 50;

const PRIORITY_COLOR = {
  urgent: 'bg-red-500/20 text-red-400',
  high:   'bg-orange-500/20 text-orange-400',
  normal: 'bg-sky-500/20 text-sky-400',
  low:    'bg-slate-500/20 text-slate-400',
};

const STATUS_COLOR = {
  active:   'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-slate-500/20 text-slate-400',
  expired:  'bg-red-500/20 text-red-400',
};

const EMPTY_FORM = { title: '', content: '', priority: 'normal', start_date: '', end_date: '' };

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

export default function AnnouncementManagement() {
  const [announcements,      setAnnouncements]      = useState([]);
  const [showForm,           setShowForm]           = useState(false);
  const [editingAnnouncement,setEditingAnnouncement]= useState(null);
  const [form,               setForm]               = useState(EMPTY_FORM);
  const [saving,             setSaving]             = useState(false);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [priorityFilter,     setPriorityFilter]     = useState('');
  const [statusFilter,       setStatusFilter]       = useState('');
  const [sortOrder,          setSortOrder]          = useState('newest');
  const [confirmDelete,      setConfirmDelete]      = useState({ show: false, id: null });
  const [confirmToggle,      setConfirmToggle]      = useState({ show: false, id: null });
  const [showViewers,        setShowViewers]        = useState(false);
  const [viewers,            setViewers]            = useState([]);
  const [viewersTarget,      setViewersTarget]      = useState(null);

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/announcements/?page_size=${PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(
        Array.isArray(res.data.results) ? res.data.results :
        Array.isArray(res.data)         ? res.data : []
      );
    } catch { setAnnouncements([]); }
  };

  const openCreate = () => {
    setEditingAnnouncement(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingAnnouncement(a);
    setForm({
      title:      a.title,
      content:    a.content,
      priority:   a.priority,
      start_date: a.start_date ? a.start_date.slice(0, 10) : '',
      end_date:   a.end_date   ? a.end_date.slice(0, 10)   : '',
    });
    setShowForm(true);
  };

  const toDateTime = (s) => (!s ? null : s.length === 10 ? s + 'T00:00:00' : s);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    const payload = {
      ...form,
      start_date: toDateTime(form.start_date),
      end_date:   form.end_date ? toDateTime(form.end_date) : null,
    };
    try {
      if (editingAnnouncement) {
        await axios.put(`${BASE_URL}/api/announcements/${editingAnnouncement.id}/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${BASE_URL}/api/announcements/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowForm(false);
      setEditingAnnouncement(null);
      setForm(EMPTY_FORM);
      fetchAnnouncements();
    } catch (err) {
      alert('Error saving announcement:\n' +
        (err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message));
    }
    setSaving(false);
  };

  const confirmToggleStatus = async () => {
    const id = confirmToggle.id;
    setConfirmToggle({ show: false, id: null });
    const token = localStorage.getItem('token');
    const a = announcements.find(x => x.id === id);
    if (!a) return;
    try {
      await axios.patch(`${BASE_URL}/api/announcements/${id}/`,
        { status: a.status === 'active' ? 'inactive' : 'active' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAnnouncements();
    } catch (err) {
      alert('Error updating status:\n' + (err?.response?.data?.detail || err.message));
    }
  };

  const confirmDeleteAnnouncement = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ show: false, id: null });
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${BASE_URL}/api/announcements/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAnnouncements();
    } catch (err) {
      alert('Error deleting:\n' + (err?.response?.data?.detail || err.message));
    }
  };

  const fetchViewers = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${BASE_URL}/api/announcement-views/?announcement=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setViewers(res.data);
      setViewersTarget(announcements.find(a => a.id === id));
      setShowViewers(true);
    } catch { alert('Failed to fetch viewers'); }
  };

  const formatDate = (s) => s ? new Date(s).toLocaleDateString() : '—';

  const filtered = announcements
    .filter(a => {
      const q = searchQuery.toLowerCase();
      return (
        (!q || a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q)) &&
        (!priorityFilter || a.priority === priorityFilter) &&
        (!statusFilter   || a.status   === statusFilter)
      );
    })
    .sort((a, b) =>
      sortOrder === 'newest'
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at)
    );

  const toggleAnn = announcements.find(a => a.id === confirmToggle.id);
  const selectCls = `px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
    text-white text-sm focus:outline-none focus:border-gold/40 transition-colors`;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Announcement Management</h1>
        <p className="text-sm text-navy-400 mt-1">Create and manage announcements for your institution</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search announcements…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
              text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={selectCls}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
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
          Create Announcement
        </button>
      </div>

      {/* Table */}
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-700/60 flex items-center justify-center mx-auto mb-4">
              <FiBell size={24} className="text-navy-500" aria-hidden="true" />
            </div>
            <p className="text-white font-bold mb-1">No announcements found</p>
            <p className="text-sm text-navy-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/40">
                  {['Title', 'Priority', 'Start Date', 'End Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/30">
                {filtered.map(a => (
                  <tr key={a.id} className={`hover:bg-navy-700/20 transition-colors ${a.status === 'expired' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="font-bold text-white mb-0.5">{a.title}</p>
                      <p className="text-xs text-navy-500 line-clamp-1">{a.content}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${PRIORITY_COLOR[a.priority] || PRIORITY_COLOR.normal}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-navy-400 text-xs">{formatDate(a.start_date)}</td>
                    <td className="px-5 py-3.5 text-navy-400 text-xs">{formatDate(a.end_date)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${STATUS_COLOR[a.status] || 'bg-navy-700 text-navy-400'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(a)} title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-sky-500/20 hover:text-sky-400 text-navy-400 transition-colors">
                          <FiEdit2 size={13} aria-hidden="true" />
                        </button>
                        <button onClick={() => setConfirmToggle({ show: true, id: a.id })}
                          title={a.status === 'active' ? 'Deactivate' : 'Activate'}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-amber-500/20 hover:text-amber-400 text-navy-400 transition-colors">
                          {a.status === 'active'
                            ? <FiEyeOff size={13} aria-hidden="true" />
                            : <FiEye    size={13} aria-hidden="true" />
                          }
                        </button>
                        <button onClick={() => fetchViewers(a.id)} title="See Viewers"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-violet-500/20 hover:text-violet-400 text-navy-400 transition-colors">
                          <FiUsers size={13} aria-hidden="true" />
                        </button>
                        <button onClick={() => setConfirmDelete({ show: true, id: a.id })} title="Delete"
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
            <p className="text-sm text-navy-400 mb-6">Are you sure you want to delete this announcement?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete({ show: false, id: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDeleteAnnouncement}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Toggle Confirm */}
      {confirmToggle.show && (
        <ModalOverlay onClose={() => setConfirmToggle({ show: false, id: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Change Announcement Status</h3>
            <p className="text-sm text-navy-400 mb-6">
              Are you sure you want to {toggleAnn?.status === 'active' ? 'deactivate' : 'activate'} this announcement?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmToggle({ show: false, id: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={confirmToggleStatus}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors
                  ${toggleAnn?.status === 'active' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                {toggleAnn?.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Viewers Modal */}
      {showViewers && (
        <ModalOverlay onClose={() => setShowViewers(false)}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40">
              <h3 className="text-base font-black text-white">Viewers — {viewersTarget?.title}</h3>
              <button onClick={() => setShowViewers(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors">
                <FiX size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {viewers.length === 0 ? (
                <p className="text-sm text-navy-500 text-center py-8">No users have viewed this announcement yet.</p>
              ) : (
                <ul className="space-y-2">
                  {viewers.map((v, i) => (
                    <li key={v.id || i}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-navy-700/40 text-sm">
                      <span className="font-semibold text-white">{v.user_full_name || v.user_email || v.user}</span>
                      <span className="text-xs text-navy-500">{new Date(v.viewed_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={() => setShowForm(false)}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40">
              <h3 className="text-lg font-black text-white">
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors">
                <FiX size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label>Title</Label>
                <input type="text" className={inputCls} placeholder="Enter announcement title"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <Label>Content</Label>
                <textarea rows={5} className={inputCls + ' resize-none'} placeholder="Enter announcement content"
                  value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>

              <div>
                <Label>Priority</Label>
                <select className={inputCls} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <input type="date" className={inputCls}
                    value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <input type="date" className={inputCls}
                    value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.title || !form.content || saving}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-navy-900 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  {saving ? 'Saving…' : editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
