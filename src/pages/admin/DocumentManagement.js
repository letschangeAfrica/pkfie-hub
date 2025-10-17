import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DocumentManagement.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: '',
    file: null
  });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, docId: null });

  // Fetch categories and documents from backend
  useEffect(() => {
    fetchCategories();
    fetchDocuments();
    // eslint-disable-next-line
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/document-categories/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      setCategories([]);
      console.error('Error fetching categories:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/documents/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (err) {
      setDocuments([]);
      console.error('Error fetching documents:', err);
    }
  };

  const handleFileChange = (e) => {
    setNewDocument({
      ...newDocument,
      file: e.target.files[0]
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newDocument.title);
      formData.append('description', newDocument.description);
      formData.append('category', newDocument.category);
      formData.append('file', newDocument.file);

      await axios.post(`${BASE_URL}/api/documents/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setShowUploadModal(false);
      setNewDocument({
        title: '',
        description: '',
        category: '',
        file: null
      });
      fetchDocuments();
    } catch (error) {
      alert('Error uploading document:\n' + (error?.response?.data?.detail || error.message));
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  const confirmDeleteDocument = (docId) => {
    setConfirmDelete({ show: true, docId });
  };

  const handleDeleteDocument = async () => {
    const docId = confirmDelete.docId;
    setConfirmDelete({ show: false, docId: null });
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/documents/${docId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments();
    } catch (error) {
      alert('Error deleting document:\n' + (error?.response?.data?.detail || error.message));
      console.error('Error deleting document:', error);
    }
  };

  const handleUpdateStatus = async (documentId, currentStatus) => {
    const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${BASE_URL}/api/documents/${documentId}/`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments();
    } catch (error) {
      alert('Error updating status:\n' + (error?.response?.data?.detail || error.message));
      console.error('Error updating document status:', error);
    }
  };

  // Filter documents based on search term, category, and status
  const filteredDocuments = documents.filter(document => {
    const matchesSearch = document.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         document.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || document.category === filterCategory || document.category?.name === filterCategory;
    const matchesStatus = filterStatus === 'all' || document.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'pdf': return 'fas fa-file-pdf';
      case 'docx':
      case 'doc': return 'fas fa-file-word';
      case 'xlsx':
      case 'xls': return 'fas fa-file-excel';
      case 'txt': return 'fas fa-file-alt';
      default: return 'fas fa-file';
    }
  };

  return (
    <div className="dm-container">
      <div className="dm-header">
        <h2>Document Management</h2>
        <p>Upload and manage documents for your institution</p>
      </div>
      
      <div className="dm-toolbar">
        <div className="dm-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="dm-filters">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <button className="dm-btn dm-btn-primary" onClick={() => setShowUploadModal(true)}>
          <i className="fas fa-upload"></i> Upload Document
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="dm-modal-overlay">
          <div className="dm-modal">
            <div className="dm-modal-header">
              <h3>Upload New Document</h3>
              <button className="dm-modal-close" onClick={() => setShowUploadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form className="dm-form" onSubmit={handleUpload}>
              <div className="dm-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                  placeholder="Enter document title"
                  required
                />
              </div>
              <div className="dm-form-group">
                <label>Description</label>
                <textarea
                  value={newDocument.description}
                  onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                  rows="3"
                  placeholder="Enter document description"
                />
              </div>
              <div className="dm-form-group">
                <label>Category</label>
                <select
                  value={newDocument.category}
                  onChange={(e) => setNewDocument({...newDocument, category: e.target.value})}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="dm-form-group">
                <label>Document File</label>
                <div className="dm-file-upload">
                  <label className="dm-file-label">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <span>{newDocument.file ? newDocument.file.name : 'Choose file'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                      onChange={handleFileChange}
                      hidden
                      required
                    />
                  </label>
                </div>
                <p className="dm-file-help">Supported formats: PDF, DOC, DOCX, TXT, CSV, XLSX</p>
              </div>
              <div className="dm-modal-actions">
                <button type="button" className="dm-btn dm-btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button 
                  className="dm-btn dm-btn-primary" 
                  type="submit"
                  disabled={uploading || !newDocument.title || !newDocument.category || !newDocument.file}
                >
                  {uploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Uploading...
                    </>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="dm-modal-overlay">
          <div className="dm-modal dm-confirm-modal">
            <h3>Delete Document</h3>
            <p>Are you sure you want to delete this document?</p>
            <div className="dm-modal-actions">
              <button className="dm-btn dm-btn-secondary" onClick={() => setConfirmDelete({ show: false, docId: null })}>
                Cancel
              </button>
              <button className="dm-btn dm-btn-danger" onClick={handleDeleteDocument}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dm-table-container">
        {filteredDocuments.length > 0 ? (
          <table className="dm-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Upload Date</th>
                <th>Status</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map(document => (
                <tr key={document.id} className="dm-table-row">
                  <td>
                    <div className="dm-document-info">
                      <div className={`dm-file-icon ${document.fileType}`}>
                        <i className={getFileIcon(document.fileType)}></i>
                      </div>
                      <div className="dm-document-details">
                        <strong>{document.title}</strong>
                        {document.description && <p>{document.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="dm-category">{typeof document.category === 'string' ? document.category : document.category?.name}</span>
                  </td>
                  <td>{formatDate(document.uploadDate || document.upload_date || document.created_at)}</td>
                  <td>
                    <span className={`dm-status dm-status-${document.status?.toLowerCase()}`}>
                      {document.status}
                    </span>
                  </td>
                  <td>
                    <div className="dm-views">
                      <i className="fas fa-eye"></i>
                      {document.views}
                    </div>
                  </td>
                  <td>
                    <div className="dm-actions">
                      <a
                        className="dm-action-btn dm-download"
                        title="Download"
                        href={document.file_url || document.file || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <i className="fas fa-download"></i>
                      </a>
                      {/* Optionally, add edit functionality here */}
                      <button 
                        className="dm-action-btn dm-toggle" 
                        title={document.status === 'Published' ? 'Unpublish' : 'Publish'}
                        onClick={() => handleUpdateStatus(document.id, document.status)}
                      >
                        <i className={`fas ${document.status === 'Published' ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                      <button 
                        className="dm-action-btn dm-delete" 
                        title="Delete"
                        onClick={() => confirmDeleteDocument(document.id)}
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
          <div className="dm-no-documents">
            <i className="fas fa-folder-open"></i>
            <h3>No documents found</h3>
            <p>Try adjusting your search or filters, or upload a new document.</p>
          </div>
        )}
      </div>

      {filteredDocuments.length > 0 && (
        <div className="dm-summary">
          <p>Showing {filteredDocuments.length} of {documents.length} documents</p>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;