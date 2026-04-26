import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiFile, FiSearch, FiUpload, FiTrash2,
  FiEye, FiEyeOff, FiDownload, FiX, FiFolder,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const EMPTY_FORM = { title: '', description: '', category: '', file: null };

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

export default function DocumentManagement() {
  const [documents,      setDocuments]      = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [showUpload,     setShowUpload]     = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [confirmDelete,  setConfirmDelete]  = useState({ show: false, id: null });

  useEffect(() => {
    fetchCategories();
    fetchDocuments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/document-categories/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data);
    } catch { setCategories([]); }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/documents/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(res.data);
    } catch { setDocuments([]); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('category',    form.category);
      fd.append('file',        form.file);
      await axios.post(`${BASE_URL}/api/documents/`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setShowUpload(false);
      setForm(EMPTY_FORM);
      fetchDocuments();
    } catch (err) {
      alert('Error uploading document:\n' + (err?.response?.data?.detail || err.message));
    } finally { setUploading(false); }
  };

  const handleDeleteDocument = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ show: false, id: null });
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/documents/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDocuments();
    } catch (err) {
      alert('Error deleting document:\n' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleUpdateStatus = async (docId, currentStatus) => {
    const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${BASE_URL}/api/documents/${docId}/`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDocuments();
    } catch (err) {
      alert('Error updating status:\n' + (err?.response?.data?.detail || err.message));
    }
  };

  const formatDate = (s) =>
    s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const getCategoryLabel = (cat) =>
    typeof cat === 'string' ? cat : cat?.name || '—';

  const filtered = documents.filter(doc => {
    const q = searchTerm.toLowerCase();
    const matchSearch = doc.title?.toLowerCase().includes(q) || doc.description?.toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || getCategoryLabel(doc.category) === filterCategory;
    const matchStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const selectCls = `px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
    text-white text-sm focus:outline-none focus:border-gold/40 transition-colors`;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Document Management</h1>
        <p className="text-sm text-navy-400 mt-1">Upload and manage documents for your institution</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search documents…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
              text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectCls}>
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
          <option value="all">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-navy-900
            transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          <FiUpload size={15} aria-hidden="true" />
          Upload Document
        </button>
      </div>

      {/* Table */}
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-700/60 flex items-center justify-center mx-auto mb-4">
              <FiFolder size={24} className="text-navy-500" aria-hidden="true" />
            </div>
            <p className="text-white font-bold mb-1">No documents found</p>
            <p className="text-sm text-navy-500">Try adjusting your search or filters, or upload a new document.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/40">
                    {['Document', 'Category', 'Upload Date', 'Status', 'Views', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/30">
                  {filtered.map(doc => (
                    <tr key={doc.id} className="hover:bg-navy-700/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-navy-700/60 flex items-center justify-center flex-shrink-0">
                            <FiFile size={15} className="text-gold" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-bold text-white">{doc.title}</p>
                            {doc.description && (
                              <p className="text-xs text-navy-500 line-clamp-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-navy-700/60 text-navy-300">
                          {getCategoryLabel(doc.category)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-navy-400 text-xs">
                        {formatDate(doc.uploadDate || doc.upload_date || doc.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                          ${doc.status === 'Published'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs text-navy-400">
                          <FiEye size={12} aria-hidden="true" />
                          {doc.views ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={doc.file_url || doc.file || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            title="Download"
                            className="w-8 h-8 rounded-lg flex items-center justify-center
                              bg-navy-700/60 hover:bg-sky-500/20 hover:text-sky-400
                              text-navy-400 transition-colors"
                          >
                            <FiDownload size={13} aria-hidden="true" />
                          </a>
                          <button
                            onClick={() => handleUpdateStatus(doc.id, doc.status)}
                            title={doc.status === 'Published' ? 'Unpublish' : 'Publish'}
                            className="w-8 h-8 rounded-lg flex items-center justify-center
                              bg-navy-700/60 hover:bg-amber-500/20 hover:text-amber-400
                              text-navy-400 transition-colors"
                          >
                            {doc.status === 'Published'
                              ? <FiEyeOff size={13} aria-hidden="true" />
                              : <FiEye    size={13} aria-hidden="true" />
                            }
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ show: true, id: doc.id })}
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
            <div className="px-5 py-3 border-t border-navy-700/40 text-xs text-navy-500">
              Showing {filtered.length} of {documents.length} documents
            </div>
          </>
        )}
      </div>

      {/* Delete Confirm */}
      {confirmDelete.show && (
        <ModalOverlay onClose={() => setConfirmDelete({ show: false, id: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Delete Document</h3>
            <p className="text-sm text-navy-400 mb-6">Are you sure you want to delete this document?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete({ show: false, id: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteDocument}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <ModalOverlay onClose={() => setShowUpload(false)}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40">
              <h3 className="text-lg font-black text-white">Upload New Document</h3>
              <button onClick={() => setShowUpload(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors">
                <FiX size={15} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <Label>Title</Label>
                <input type="text" required className={inputCls} placeholder="Document title"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <Label>Description</Label>
                <textarea rows={3} className={inputCls + ' resize-none'} placeholder="Optional description"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <Label>Category</Label>
                <select required className={inputCls}
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Document File</Label>
                <label className={`flex flex-col items-center justify-center gap-3 px-5 py-8 rounded-xl
                  border-2 border-dashed cursor-pointer transition-colors
                  ${form.file
                    ? 'border-gold/40 bg-gold/5'
                    : 'border-navy-700/60 hover:border-navy-600/80'}`}>
                  <FiUpload size={24} className={form.file ? 'text-gold' : 'text-navy-600'} aria-hidden="true" />
                  <span className="text-sm text-center">
                    {form.file
                      ? <span className="text-gold font-bold">{form.file.name}</span>
                      : <><span className="text-white font-bold">Choose file</span><br /><span className="text-xs text-navy-500">PDF, DOC, DOCX, TXT, CSV, XLSX</span></>
                    }
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                    onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))}
                    required
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !form.title || !form.category || !form.file}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-navy-900
                    transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  {uploading ? 'Uploading…' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
