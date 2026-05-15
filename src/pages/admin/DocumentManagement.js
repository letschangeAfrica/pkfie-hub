import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../../services/api';
import {
  FiFile, FiFileText, FiSearch, FiUpload, FiTrash2,
  FiEye, FiEyeOff, FiDownload, FiX, FiFolder,
  FiRefreshCw, FiCheckCircle, FiAlertTriangle,
  FiAlertCircle, FiFilter, FiEdit2,
} from 'react-icons/fi';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const EMPTY_FORM      = { title: '', description: '', category_id: '', file: null };
const EMPTY_EDIT_FORM = { title: '', description: '', category_id: '' };

const FILE_META = {
  pdf:  { label: 'PDF',  bg: 'bg-red-500/20',    fg: 'text-red-400'    },
  doc:  { label: 'DOC',  bg: 'bg-sky-500/20',     fg: 'text-sky-400'    },
  docx: { label: 'DOCX', bg: 'bg-sky-500/20',     fg: 'text-sky-400'    },
  xls:  { label: 'XLS',  bg: 'bg-emerald-500/20', fg: 'text-emerald-400'},
  xlsx: { label: 'XLSX', bg: 'bg-emerald-500/20', fg: 'text-emerald-400'},
  csv:  { label: 'CSV',  bg: 'bg-violet-500/20',  fg: 'text-violet-400' },
  txt:  { label: 'TXT',  bg: 'bg-slate-500/20',   fg: 'text-slate-400'  },
};

const SORT_OPTIONS = [
  { value: 'date-desc',     label: 'Newest first'  },
  { value: 'date-asc',      label: 'Oldest first'  },
  { value: 'title-asc',     label: 'Title A → Z'   },
  { value: 'title-desc',    label: 'Title Z → A'   },
  { value: 'status-asc',    label: 'Status'        },
  { value: 'category-asc',  label: 'Category'      },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function getFileMeta(doc) {
  const raw = (doc.file_type || doc.file || '').toLowerCase().split('.').pop();
  return FILE_META[raw] || { label: (raw || 'FILE').toUpperCase(), bg: 'bg-navy-700/60', fg: 'text-navy-400' };
}

function parseApiError(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || 'Something went wrong.';
  if (typeof d === 'string') return d;
  if (d.detail) return d.detail;
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getCategoryLabel(cat) {
  if (!cat) return '—';
  if (typeof cat === 'string') return cat;
  return cat.name || '—';
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

const fieldCls = `w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
  text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50
  disabled:opacity-40 disabled:cursor-not-allowed transition-colors`;

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

const Sk = ({ className = '' }) => (
  <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

/* ─── Main ──────────────────────────────────────────────────────────────── */
export default function DocumentManagement() {
  const [documents,      setDocuments]      = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [fetchError,     setFetchError]     = useState(false);
  const [toast,          setToast]          = useState(null);

  // Upload
  const [showUpload,     setShowUpload]     = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [formError,      setFormError]      = useState('');

  // Edit
  const [editingDoc,     setEditingDoc]     = useState(null);
  const [editForm,       setEditForm]       = useState(EMPTY_EDIT_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError,      setEditError]      = useState('');

  // Filters & sort
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [sort,           setSort]           = useState('date-desc');

  // Selection + bulk
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [bulkAction,     setBulkAction]     = useState('');
  const [confirmBulk,    setConfirmBulk]    = useState(false);

  // Confirm delete
  const [confirmDelete,  setConfirmDelete]  = useState({ show: false, id: null, title: '' });
  const [togglingId,     setTogglingId]     = useState(null);

  const toastTimer = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setFetchError(false);
    try {
      const [catRes, docRes] = await Promise.allSettled([
        api.get('/document-categories/'),
        api.get('/documents/'),
      ]);
      if (catRes.status === 'fulfilled') {
        const raw = catRes.value.data;
        setCategories(Array.isArray(raw) ? raw : (raw?.results ?? []));
      }
      if (docRes.status === 'fulfilled') {
        const raw = docRes.value.data;
        setDocuments(Array.isArray(raw) ? raw : (raw?.results ?? []));
      } else {
        setFetchError(true);
      }
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [searchTerm, filterCategory, filterStatus]);

  /* ── Sort config ── */
  const [sortField, sortDir] = sort.split('-');

  /* ── Filtered + sorted list ── */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return documents.filter(doc => {
      const matchSearch = !q
        || doc.title?.toLowerCase().includes(q)
        || doc.description?.toLowerCase().includes(q);
      const matchCat    = filterCategory === 'all' || getCategoryLabel(doc.category) === filterCategory;
      const matchStatus = filterStatus   === 'all' || doc.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [documents, searchTerm, filterCategory, filterStatus]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sortField === 'title') {
        av = a.title?.toLowerCase() || '';
        bv = b.title?.toLowerCase() || '';
      } else if (sortField === 'category') {
        av = getCategoryLabel(a.category)?.toLowerCase() || '';
        bv = getCategoryLabel(b.category)?.toLowerCase() || '';
      } else if (sortField === 'status') {
        av = a.status?.toLowerCase() || '';
        bv = b.status?.toLowerCase() || '';
      } else {
        av = new Date(a.upload_date || a.created_at || 0).getTime();
        bv = new Date(b.upload_date || b.created_at || 0).getTime();
      }
      return av < bv ? (sortDir === 'asc' ? -1 : 1)
           : av > bv ? (sortDir === 'asc' ?  1 : -1)
           : 0;
    });
  }, [filtered, sortField, sortDir]);

  /* ── Derived stats ── */
  const stats = {
    total:      documents.length,
    published:  documents.filter(d => d.status === 'Published').length,
    draft:      documents.filter(d => d.status === 'Draft').length,
    categories: categories.length,
  };

  const hasActiveFilter = searchTerm || filterCategory !== 'all' || filterStatus !== 'all';
  const clearFilters = () => { setSearchTerm(''); setFilterCategory('all'); setFilterStatus('all'); };

  /* ── Selection ── */
  const allSelected = sorted.length > 0 && sorted.every(d => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allSelected) sorted.forEach(d => n.delete(d.id));
      else             sorted.forEach(d => n.add(d.id));
      return n;
    });
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── Edit ── */
  const openEdit = (doc) => {
    setEditingDoc(doc);
    setEditForm({
      title:       doc.title       || '',
      description: doc.description || '',
      category_id: doc.category?.id || '',
    });
    setEditError('');
  };

  const closeEdit = () => { setEditingDoc(null); setEditForm(EMPTY_EDIT_FORM); setEditError(''); };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim())  { setEditError('Title is required.');    return; }
    if (!editForm.category_id)   { setEditError('Category is required.'); return; }
    setEditSubmitting(true);
    setEditError('');
    try {
      const fd = new FormData();
      fd.append('title',       editForm.title.trim());
      fd.append('description', editForm.description || '');
      fd.append('category_id', editForm.category_id);
      const res = await api.patch(`/documents/${editingDoc.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments(prev => prev.map(d => d.id === editingDoc.id
        ? { ...d, title: editForm.title.trim(), description: editForm.description, category: res.data.category ?? d.category }
        : d
      ));
      showToast('success', 'Document updated.');
      closeEdit();
    } catch (err) {
      setEditError(parseApiError(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ── Upload ── */
  const closeUpload = () => { setShowUpload(false); setForm(EMPTY_FORM); setFormError(''); setUploadProgress(0); };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file)        { setFormError('Please select a file.'); return; }
    if (!form.category_id) { setFormError('Please select a category.'); return; }
    setFormError('');
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('category_id', form.category_id);
      fd.append('file',        form.file);
      await api.post('/documents/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      closeUpload();
      showToast('success', 'Document uploaded successfully.');
      fetchAll(true);
    } catch (err) {
      setFormError(parseApiError(err));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /* ── Status toggle (single) ── */
  const handleToggleStatus = async (doc) => {
    setTogglingId(doc.id);
    const newStatus = doc.status === 'Published' ? 'Draft' : 'Published';
    try {
      await api.patch(`/documents/${doc.id}/set_status/`, { status: newStatus });
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: newStatus } : d));
      showToast('success', `Document ${newStatus === 'Published' ? 'published' : 'unpublished'}.`);
    } catch (err) {
      showToast('error', parseApiError(err));
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Bulk status toggle ── */
  const executeBulk = async () => {
    setConfirmBulk(false);
    const ids       = [...selectedIds];
    const newStatus = bulkAction === 'publish' ? 'Published' : 'Draft';
    const results   = await Promise.allSettled(
      ids.map(id => api.patch(`/documents/${id}/set_status/`, { status: newStatus }))
    );
    const succeeded = ids.filter((_, i) => results[i].status === 'fulfilled');
    const failed    = ids.length - succeeded.length;
    if (succeeded.length > 0) {
      setDocuments(prev => prev.map(d => succeeded.includes(d.id) ? { ...d, status: newStatus } : d));
    }
    showToast(
      failed === 0 ? 'success' : 'error',
      failed === 0
        ? `${succeeded.length} document(s) ${newStatus === 'Published' ? 'published' : 'unpublished'}.`
        : `${succeeded.length} succeeded, ${failed} failed.`
    );
    setSelectedIds(new Set());
    setBulkAction('');
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ show: false, id: null, title: '' });
    try {
      await api.delete(`/documents/${id}/`);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      showToast('success', 'Document deleted.');
    } catch (err) {
      showToast('error', parseApiError(err));
    }
  };

  const selectCls = `px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
    text-white text-sm focus:outline-none focus:border-gold/40 transition-colors`;

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="space-y-5">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <div className="flex items-center justify-between">
        <Sk className="h-8 w-56" />
        <Sk className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Sk key={i} className="h-24" />)}
      </div>
      <div className="flex gap-3">
        <Sk className="h-10 flex-1" />
        <Sk className="h-10 w-36" />
        <Sk className="h-10 w-32" />
        <Sk className="h-10 w-32" />
      </div>
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-navy-700/30 animate-pulse">
            <Sk className="w-4 h-4 flex-shrink-0" />
            <Sk className="w-9 h-9 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3.5 w-40" />
              <Sk className="h-3 w-24" />
            </div>
            <Sk className="h-5 w-16" />
            <Sk className="h-5 w-16" />
            <Sk className="h-5 w-12" />
            <div className="flex gap-1.5">
              {[...Array(4)].map((_, j) => <Sk key={j} className="w-8 h-8" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Fetch error ── */
  if (fetchError) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <FiAlertCircle size={28} className="text-red-400" />
      </div>
      <p className="text-lg font-black text-white">Failed to load documents</p>
      <p className="text-sm text-navy-400 mt-1 mb-6">Check that the backend is running.</p>
      <button
        onClick={() => fetchAll()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black
          text-navy-900 transition-all hover:-translate-y-px"
        style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
      >
        <FiRefreshCw size={14} /> Retry
      </button>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="space-y-5">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Document Management</h1>
          <p className="text-sm text-navy-400 mt-1">Upload and manage documents for your institution</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            aria-label="Refresh"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold
              text-navy-300 border border-navy-700/40 hover:border-navy-600/60 hover:text-white
              disabled:opacity-40 transition-all"
          >
            <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm
              text-navy-900 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
          >
            <FiUpload size={15} aria-hidden /> Upload Document
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: stats.total,      icon: FiFile,   bg: 'bg-sky-500/20',     fg: 'text-sky-400'     },
          { label: 'Published',  value: stats.published,  icon: FiEye,    bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },
          { label: 'Draft',      value: stats.draft,      icon: FiEyeOff, bg: 'bg-amber-500/20',   fg: 'text-amber-400'   },
          { label: 'Categories', value: stats.categories, icon: FiFolder, bg: 'bg-violet-500/20',  fg: 'text-violet-400'  },
        ].map(({ label, value, icon: Icon, bg, fg }) => (
          <div key={label}
            className="bg-navy-800/60 rounded-2xl border border-navy-700/40 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon size={15} className={fg} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-white tabular-nums leading-none">{value}</p>
              <p className="text-xs text-navy-500 font-semibold mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden />
          <input
            type="text"
            placeholder="Search title or description…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
              text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectCls}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
          <option value="all">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className={selectCls}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold
              text-navy-400 border border-navy-700/40 hover:text-white hover:border-navy-600/60 transition-all"
          >
            <FiFilter size={12} /> Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/[0.08] border border-gold/20">
          <span className="text-xs font-black text-gold">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {[
              { action: 'publish',   label: 'Publish All',   cls: 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' },
              { action: 'unpublish', label: 'Unpublish All', cls: 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'       },
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
              onClick={() => setSelectedIds(new Set())}
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
              <FiFolder size={24} className="text-navy-500" aria-hidden />
            </div>
            <p className="text-white font-bold mb-1">
              {documents.length === 0 ? 'No documents yet' : 'No documents found'}
            </p>
            <p className="text-sm text-navy-500">
              {documents.length === 0
                ? 'Upload your first document to get started.'
                : 'Try adjusting your search or filters.'}
            </p>
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="mt-4 text-xs font-bold text-gold hover:text-gold/70 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/40">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded accent-gold cursor-pointer"
                        aria-label="Select all"
                      />
                    </th>
                    {['Document', 'Category', 'Type', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wide text-navy-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/30">
                  {sorted.map(doc => {
                    const meta       = getFileMeta(doc);
                    const isToggling = togglingId === doc.id;
                    const selected   = selectedIds.has(doc.id);
                    return (
                      <tr key={doc.id} className={`transition-colors ${selected ? 'bg-gold/[0.04]' : 'hover:bg-navy-700/20'}`}>
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(doc.id)}
                            className="w-4 h-4 rounded accent-gold cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 max-w-[260px]">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                              <FiFileText size={14} className={meta.fg} aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{doc.title}</p>
                              {doc.description && (
                                <p className="text-xs text-navy-500 line-clamp-1 mt-0.5">{doc.description}</p>
                              )}
                              {fmtSize(doc.file_size) && (
                                <p className="text-[10px] text-navy-600 mt-0.5">{fmtSize(doc.file_size)}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-navy-700/60 text-navy-300">
                            {getCategoryLabel(doc.category)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${meta.bg} ${meta.fg}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-navy-400 text-xs whitespace-nowrap">
                          {fmtDate(doc.upload_date || doc.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                            ${doc.status === 'Published'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'}`}>
                            {doc.status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {(doc.file_url || doc.file) && (
                              <a
                                href={doc.file_url || doc.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download"
                                className="w-8 h-8 rounded-lg flex items-center justify-center
                                  bg-navy-700/60 hover:bg-sky-500/20 hover:text-sky-400
                                  text-navy-400 transition-colors"
                              >
                                <FiDownload size={13} aria-hidden />
                              </a>
                            )}
                            <button
                              onClick={() => openEdit(doc)}
                              title="Edit document"
                              className="w-8 h-8 rounded-lg flex items-center justify-center
                                bg-navy-700/60 hover:bg-violet-500/20 hover:text-violet-400
                                text-navy-400 transition-colors"
                            >
                              <FiEdit2 size={13} aria-hidden />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(doc)}
                              disabled={isToggling}
                              title={doc.status === 'Published' ? 'Unpublish' : 'Publish'}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                disabled:opacity-40
                                ${doc.status === 'Published'
                                  ? 'bg-navy-700/60 hover:bg-amber-500/20 hover:text-amber-400 text-navy-400'
                                  : 'bg-navy-700/60 hover:bg-emerald-500/20 hover:text-emerald-400 text-navy-400'}`}
                            >
                              {isToggling
                                ? <FiRefreshCw size={13} className="animate-spin" />
                                : doc.status === 'Published'
                                  ? <FiEyeOff size={13} aria-hidden />
                                  : <FiEye    size={13} aria-hidden />
                              }
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ show: true, id: doc.id, title: doc.title })}
                              title="Delete"
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

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-navy-700/30">
              {sorted.map(doc => {
                const meta       = getFileMeta(doc);
                const isToggling = togglingId === doc.id;
                return (
                  <div key={doc.id} className="p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                      <FiFileText size={15} className={meta.fg} aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{doc.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-navy-700/60 text-navy-300">
                          {getCategoryLabel(doc.category)}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${meta.bg} ${meta.fg}`}>
                          {meta.label}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase
                          ${doc.status === 'Published'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'}`}>
                          {doc.status || 'Draft'}
                        </span>
                      </div>
                      <p className="text-[10px] text-navy-600 mt-1">{fmtDate(doc.upload_date || doc.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(doc.file_url || doc.file) && (
                        <a href={doc.file_url || doc.file} target="_blank" rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-sky-500/20 hover:text-sky-400 text-navy-400 transition-colors">
                          <FiDownload size={13} aria-hidden />
                        </a>
                      )}
                      <button onClick={() => openEdit(doc)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-violet-500/20 hover:text-violet-400 text-navy-400 transition-colors">
                        <FiEdit2 size={13} aria-hidden />
                      </button>
                      <button disabled={isToggling} onClick={() => handleToggleStatus(doc)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40
                          ${doc.status === 'Published'
                            ? 'bg-navy-700/60 hover:bg-amber-500/20 hover:text-amber-400 text-navy-400'
                            : 'bg-navy-700/60 hover:bg-emerald-500/20 hover:text-emerald-400 text-navy-400'}`}>
                        {isToggling ? <FiRefreshCw size={13} className="animate-spin" /> : doc.status === 'Published' ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                      </button>
                      <button onClick={() => setConfirmDelete({ show: true, id: doc.id, title: doc.title })}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700/60 hover:bg-red-500/20 hover:text-red-400 text-navy-400 transition-colors">
                        <FiTrash2 size={13} aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-navy-700/40 flex items-center justify-between text-xs text-navy-500">
              <span>
                {sorted.length === documents.length
                  ? `${documents.length} document${documents.length !== 1 ? 's' : ''}`
                  : `${sorted.length} of ${documents.length} documents`}
              </span>
              {selectedIds.size > 0 && (
                <span className="text-gold font-bold">{selectedIds.size} selected</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {confirmDelete.show && (
        <ModalOverlay onClose={() => setConfirmDelete({ show: false, id: null, title: '' })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-base font-black text-white text-center mb-1">Delete Document</h3>
            <p className="text-sm text-navy-400 text-center mb-1">Are you sure you want to delete</p>
            <p className="text-sm font-bold text-white text-center mb-6 truncate px-4">"{confirmDelete.title}"</p>
            <p className="text-xs text-red-400/80 text-center mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete({ show: false, id: null, title: '' })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-navy-300
                  bg-navy-700/60 hover:bg-navy-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Bulk confirm ── */}
      {confirmBulk && (
        <ModalOverlay onClose={() => setConfirmBulk(false)}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-base font-black text-white text-center mb-2">
              {bulkAction === 'publish' ? 'Publish' : 'Unpublish'} {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''}?
            </h3>
            <p className="text-sm text-navy-400 text-center mb-6">You can reverse this later.</p>
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
                  ${bulkAction === 'publish' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Edit modal ── */}
      {editingDoc && (
        <ModalOverlay onClose={closeEdit}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40">
              <h3 className="text-lg font-black text-white">Edit Document</h3>
              <button
                onClick={closeEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                  bg-navy-700/60 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors"
              >
                <FiX size={15} aria-hidden />
              </button>
            </div>

            {editError && (
              <div className="mx-6 mt-5 flex items-start gap-3 px-4 py-3 rounded-xl
                bg-red-500/10 border border-red-500/20">
                <FiAlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-300 leading-relaxed whitespace-pre-wrap">{editError}</p>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <Lbl required>Title</Lbl>
                <input
                  type="text" required className={fieldCls} placeholder="Document title"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <Lbl>Description</Lbl>
                <textarea
                  rows={3} className={fieldCls + ' resize-none'} placeholder="Optional description…"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <Lbl required>Category</Lbl>
                <select
                  required className={fieldCls}
                  value={editForm.category_id}
                  onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))}
                >
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <p className="text-[11px] text-navy-600">
                To replace the file, delete this document and re-upload.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={closeEdit}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-navy-300
                    bg-navy-700/60 hover:bg-navy-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-navy-900 transition-all
                    hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:hover:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  {editSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* ── Upload modal ── */}
      {showUpload && (
        <ModalOverlay onClose={closeUpload}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40 sticky top-0 bg-navy-800 z-10">
              <h3 className="text-lg font-black text-white">Upload Document</h3>
              <button
                onClick={closeUpload}
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

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <Lbl required>Title</Lbl>
                <input
                  type="text" required className={fieldCls} placeholder="Document title"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <Lbl>Description</Lbl>
                <textarea
                  rows={3} className={fieldCls + ' resize-none'} placeholder="Optional description…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <Lbl required>Category</Lbl>
                <select
                  required className={fieldCls}
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                >
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <Lbl required>File</Lbl>
                <label className={`flex flex-col items-center justify-center gap-3 px-5 py-8 rounded-xl
                  border-2 border-dashed cursor-pointer transition-colors
                  ${form.file ? 'border-gold/40 bg-gold/5' : 'border-navy-700/60 hover:border-navy-600/80'}`}>
                  <FiUpload size={24} className={form.file ? 'text-gold' : 'text-navy-600'} aria-hidden />
                  <div className="text-sm text-center">
                    {form.file ? (
                      <>
                        <p className="text-gold font-bold truncate max-w-[280px]">{form.file.name}</p>
                        {form.file.size && (
                          <p className="text-xs text-navy-500 mt-0.5">{fmtSize(form.file.size)}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-white font-bold">Choose file</p>
                        <p className="text-xs text-navy-500 mt-0.5">PDF, DOC, DOCX, TXT, CSV, XLSX, XLS</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                    onChange={e => setForm(f => ({ ...f, file: e.target.files[0] || null }))}
                    className="sr-only"
                  />
                </label>
                {form.file && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, file: null }))}
                    className="mt-1.5 text-xs text-navy-500 hover:text-red-400 transition-colors"
                  >
                    Remove file
                  </button>
                )}
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-navy-400">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-navy-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={closeUpload}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-navy-300
                    bg-navy-700/60 hover:bg-navy-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !form.title || !form.category_id || !form.file}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-navy-900 transition-all
                    hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:hover:translate-y-0"
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
