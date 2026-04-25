import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FiSearch,
  FiUpload,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiFileText,
  FiFile,
  FiX,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiFolder,
  FiBarChart2,
  FiCalendar
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export default function DocumentManagement() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category_id: '',
    file: null,
  });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, docId: null, docTitle: '' });

  const toastTimerRef = useRef(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [toast]);

  useEffect(() => {
    fetchCategories();
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Robust fetchCategories — call the app-mounted path and normalize the response
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // URL that matches your current project routing (project mounts documents at /api/documents/)
      const url = `${BASE_URL}/api/documents/categories/`;

      const res = await axios.get(url, { headers });
      console.debug('document-categories raw response:', res.status, res.data);

      let raw = res.data;
      if (raw && raw.results && Array.isArray(raw.results)) raw = raw.results;
      else if (raw && raw.data && Array.isArray(raw.data)) raw = raw.data;
      else if (raw && raw.categories && Array.isArray(raw.categories)) raw = raw.categories;
      else if (!Array.isArray(raw)) raw = [];

      const items = raw.map((c) => {
        if (!c) return null;
        if (typeof c === 'string') return { id: c, name: c };
        return { id: c.id ?? c.pk ?? c.slug ?? c.name ?? c.title, name: c.name ?? c.title ?? String(c.id ?? c.pk ?? '') };
      }).filter(Boolean);

      setCategories(items);
    } catch (err) {
      console.error('Error fetching categories:', err, err?.response?.data || err?.message);
      setCategories([]);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setToast({ type: 'error', message: 'Authentication required to load categories' });
      } else {
        setToast({ type: 'error', message: 'Failed to load categories' });
      }
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/documents/`, {
        headers: { 
          Authorization: token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json'
        },
      });
      
      // Handle different response formats
      let documentsData = [];
      if (Array.isArray(res.data)) {
        documentsData = res.data;
      } else if (res.data && Array.isArray(res.data.results)) {
        documentsData = res.data.results;
      } else if (res.data && Array.isArray(res.data.data)) {
        documentsData = res.data.data;
      }
      
      setDocuments(documentsData);
      if (documentsData.length > 0) {
        setToast({ type: 'success', message: `Loaded ${documentsData.length} documents` });
      }
    } catch (err) {
      setDocuments([]);
      setToast({ type: 'error', message: 'Failed to load documents' });
      console.error('Error fetching documents:', err);
    }
  };

  const handleFileChange = (e) =>
    setNewDocument((prev) => ({ ...prev, file: e.target.files && e.target.files[0] ? e.target.files[0] : null }));

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newDocument.file) {
      setToast({ type: 'error', message: 'Please select a file to upload' });
      return;
    }
    if (!newDocument.category_id) {
      setToast({ type: 'error', message: 'Please select a category' });
      return;
    }
    
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newDocument.title);
      formData.append('description', newDocument.description);
      formData.append('category_id', newDocument.category_id);
      formData.append('file', newDocument.file);

      await axios.post(`${BASE_URL}/api/documents/`, formData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          'Content-Type': 'multipart/form-data',
        },
      });

      setShowUploadModal(false);
      setNewDocument({ title: '', description: '', category_id: '', file: null });
      setToast({ type: 'success', message: 'Document uploaded successfully' });
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      let errorMessage = 'Error uploading document';
      if (error.response) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.file) {
          errorMessage = `File error: ${error.response.data.file.join(', ')}`;
        } else if (typeof error.response.data === 'object') {
          errorMessage = Object.values(error.response.data).flat().join(', ');
        }
      }
      setToast({ type: 'error', message: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  const confirmDeleteDocument = (doc) => setConfirmDelete({ 
    show: true, 
    docId: doc.id, 
    docTitle: doc.title 
  });

  const handleDeleteDocument = async () => {
    const { docId } = confirmDelete;
    setConfirmDelete({ show: false, docId: null, docTitle: '' });
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/documents/${docId}/`, {
        headers: { 
          Authorization: token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json'
        },
      });
      await fetchDocuments();
      setToast({ type: 'success', message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      setToast({ type: 'error', message: 'Error deleting document' });
    }
  };

  const handleUpdateStatus = async (documentId, currentStatus) => {
    const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${BASE_URL}/api/documents/${documentId}/set_status/`,
        { status: newStatus },
        { 
          headers: { 
            Authorization: token ? `Bearer ${token}` : undefined,
            'Content-Type': 'application/json'
          } 
        }
      );
      await fetchDocuments();
      setToast({ type: 'success', message: `Document ${newStatus.toLowerCase()} successfully` });
    } catch (error) {
      console.error('Error updating document status:', error);
      setToast({ type: 'error', message: 'Error updating document status' });
    }
  };

  const filteredDocuments = documents.filter((document) => {
    const query = (searchTerm || '').toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      (document.title && document.title.toLowerCase().includes(query)) ||
      (document.description && document.description.toLowerCase().includes(query));
    
    const docCategory = typeof document.category === 'string' ? document.category : document.category?.name;
    const matchesCategory = filterCategory === 'all' || docCategory === filterCategory;
    const matchesStatus = filterStatus === 'all' || (document.status || '').toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getFileIconComponent = (fileType) => {
    const ft = (fileType || '').toLowerCase();
    if (ft.includes('pdf')) return <FiFileText className="w-5 h-5 text-red-600" />;
    if (ft.includes('word') || ft.includes('doc')) return <FiFileText className="w-5 h-5 text-blue-600" />;
    if (ft.includes('excel') || ft.includes('sheet') || ft.includes('xls')) return <FiFileText className="w-5 h-5 text-green-600" />;
    if (ft.includes('txt') || ft.includes('csv')) return <FiFile className="w-5 h-5 text-slate-600" />;
    return <FiFile className="w-5 h-5 text-slate-600" />;
  };

  const getFileTypeColor = (fileType) => {
    const ft = (fileType || '').toLowerCase();
    if (ft.includes('pdf')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (ft.includes('word') || ft.includes('doc')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    if (ft.includes('excel') || ft.includes('sheet') || ft.includes('xls')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300';
  };

  // Stats calculation
  const stats = {
    total: documents.length,
    published: documents.filter(doc => doc.status === 'Published').length,
    draft: documents.filter(doc => doc.status === 'Draft').length,
    categories: [...new Set(documents.map(doc => 
      typeof doc.category === 'string' ? doc.category : doc.category?.name
    ).filter(Boolean))].length,
  };

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
    .animate-fade-in-up { animation: fadeInUp 0.45s ease-out; }
    .animate-scale-in { animation: scaleIn 0.25s ease-out; }
  `;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <style>{customStyles}</style>

      {/* Toast */}
      <div aria-live="polite" className="fixed top-6 right-6 z-50">
        {toast && (
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg ${
              toast.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}
            role="status"
          >
            {toast.type === 'error' ? <FiAlertCircle className="text-xl" /> : <FiCheckCircle className="text-xl" />}
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <FiFileText className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Document Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Upload and manage documents for your institution</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh documents"
            aria-label="Refresh documents"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all font-semibold"
            aria-label="Upload document"
          >
            <FiUpload className="w-5 h-5" /> Upload Document
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Documents</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiFileText className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Published</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.published}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <FiEye className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Draft</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.draft}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiEyeOff className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Categories</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.categories}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FiFolder className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Search documents by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search documents"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FiFileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {documents.length === 0 ? 'No documents available' : 'No documents found'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {documents.length === 0 ? 'Upload your first document to get started' : 'Try adjusting your search or filter criteria'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full table-auto">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Document</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Upload Date</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc, index) => (
                    <tr 
                      key={doc.id} 
                      className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            {getFileIconComponent(doc.file_type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-800 dark:text-slate-100">{doc.title}</div>
                            {doc.description && (
                              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {doc.description}
                              </div>
                            )}
                            <div className="mt-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getFileTypeColor(doc.file_type)}`}>
                                {(doc.file_type || 'File').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
                          {typeof doc.category === 'string' ? doc.category : doc.category?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="w-4 h-4 text-slate-400" />
                          {formatDate(doc.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          doc.status === 'Published' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
                        }`}>
                          {doc.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-2">
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                              title="Download"
                            >
                              <FiDownload className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(doc.id, doc.status)}
                            title={doc.status === 'Published' ? 'Unpublish' : 'Publish'}
                            className={`p-2 rounded-xl transition-all ${
                              doc.status === 'Published'
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                            }`}
                          >
                            {doc.status === 'Published' ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => confirmDeleteDocument(doc)}
                            title="Delete"
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden p-6 space-y-4">
              {filteredDocuments.map((doc, index) => (
                <div 
                  key={doc.id}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {getFileIconComponent(doc.file_type)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">{doc.title}</div>
                          <div className="text-xs text-slate-500">
                            {typeof doc.category === 'string' ? doc.category : doc.category?.name}
                          </div>
                        </div>
                      </div>
                      
                      {doc.description && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                          {doc.description}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-4 h-4" />
                          {formatDate(doc.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        doc.status === 'Published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {doc.status || 'Draft'}
                      </span>
                      <div className="flex items-center gap-1">
                        {doc.file_url && (
                          <a 
                            href={doc.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                          >
                            <FiDownload className="w-4 h-4" />
                          </a>
                        )}
                        <button 
                          onClick={() => handleUpdateStatus(doc.id, doc.status)}
                          className={`p-2 rounded-xl transition-all ${
                            doc.status === 'Published'
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {doc.status === 'Published' ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => confirmDeleteDocument(doc)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <FiUpload className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Upload New Document</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Add a new document to the library</p>
                  </div>
                </div>
                <button 
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  onClick={() => setShowUploadModal(false)}
                >
                  <FiX className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Document Title</label>
                <input
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  rows={4}
                  value={newDocument.description}
                  onChange={(e) => setNewDocument((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the document content..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                  <select
                    required
                    value={newDocument.category_id}
                    onChange={(e) => setNewDocument((prev) => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Document File</label>
                  <div className="mt-1">
                    <label className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all w-full">
                      <FiUpload className="w-5 h-5 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {newDocument.file ? newDocument.file.name : 'Choose file...'}
                      </span>
                      <input
                        required
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-slate-400 mt-2">Supported formats: PDF, DOC, DOCX, TXT, CSV, XLSX, XLS</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploading || !newDocument.title || !newDocument.category_id || !newDocument.file}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete({ show: false, docId: null, docTitle: '' })} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <FiTrash2 className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Document</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to delete <strong>"{confirmDelete.docTitle}"</strong>? This document will be permanently removed.
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setConfirmDelete({ show: false, docId: null, docTitle: '' })}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-medium"
                  onClick={handleDeleteDocument}
                >
                  Delete Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}