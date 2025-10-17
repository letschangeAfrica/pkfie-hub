import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Feedback.css';

const Feedback = () => {
  const [categories, setCategories] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [showAllModal, setShowAllModal] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    subject: '',
    message: '',
    rating: 0,
    priority: 'medium',
  });
  const [submitted, setSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch categories
  useEffect(() => {
    api.get('feedback/categories/')
      .then(res => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  // Fetch recent feedback (3 only)
  useEffect(() => {
    api.get('feedback/all/?mine=1&page=1&page_size=3')
      .then(res => setRecentFeedback(Array.isArray(res.data.results) ? res.data.results : []))
      .catch(() => setRecentFeedback([]));
  }, [submitted]);

  // Fetch all feedbacks (when modal is opened)
  const fetchAllFeedback = () => {
    api.get('feedback/all/?mine=1&page=1&page_size=100')
      .then(res => setAllFeedback(Array.isArray(res.data.results) ? res.data.results : []))
      .catch(() => setAllFeedback([]));
  };

  // Input Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
  };

  const handleRatingChange = (rating) => {
    setFormData(f => ({ ...f, rating }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('feedback/', formData);
      setSubmitted(true);
      setTimeout(() => {
        setFormData({
          category_id: '',
          subject: '',
          message: '',
          rating: 0,
          priority: 'medium',
        });
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      setError('Could not submit feedback. Please make sure you are logged in.');
    }
  };

  // FAQ toggle
  const toggleFaq = (index) => setActiveFaq(activeFaq === index ? null : index);

  // Navigation shortcuts
  const handleGoToAssistant = () => navigate('/assistant');
  const handleGoToHandbook = () => navigate('/handbook');
  const handleGoToPrograms = () => navigate('/pathfinder');
  const handleGoToDashboard = () => navigate('/');

  // Modal open handler
  const handleOpenAllModal = () => {
    fetchAllFeedback();
    setShowAllModal(true);
  };

  // Modal close handler
  const handleCloseAllModal = () => setShowAllModal(false);

  // Reusable feedback rendering
  const renderFeedbackList = (list) => (
    <div className="feedback-list">
      {list.length === 0 && (
        <div className="feedback-text" style={{color: "#999"}}>No feedback submitted yet.</div>
      )}
      {list.map((fb, idx) => (
        <div className="feedback-item" key={fb.id}>
          <div className="feedback-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="feedback-content">
            <div className="feedback-meta">
              <span className="feedback-author">{fb.user_name || "User"}</span>
              <span className="feedback-date">{fb.created_at ? new Date(fb.created_at).toLocaleDateString() : ""}</span>
            </div>
            <div className="feedback-rating">
              {Array.from({length: fb.rating}, (_, i) => (
                <i className="fas fa-star" key={i}></i>
              ))}
              {Array.from({length: 5 - (fb.rating || 0)}, (_, i) => (
                <i className="far fa-star" key={i}></i>
              ))}
            </div>
            <p className="feedback-text">{fb.message}</p>
            {/* ADMIN RESPONSES */}
            {fb.responses && fb.responses.length > 0 && (
              <div className="feedback-responses">
                <div style={{fontWeight:'bold',color:'#003366',marginBottom:4}}>
                  Admin Response{fb.responses.length > 1 && 's'}:
                </div>
                {fb.responses.map(resp => (
                  <div key={resp.id} className="feedback-response" style={{
                    background:'#f8f9fa',borderLeft:'4px solid #003366',borderRadius:6,marginBottom:6,padding:'8px 12px'
                  }}>
                    <div style={{fontWeight:'bold',fontSize:'0.9em',color:'#003366',marginBottom:2}}>
                      {resp.admin ? "Admin" : (resp.user_email || "User")}
                      <span style={{fontWeight:'normal',marginLeft:8,fontSize:'0.8em',color:'#888'}}>
                        {resp.created_at ? new Date(resp.created_at).toLocaleString() : ""}
                      </span>
                    </div>
                    <div style={{fontSize:'.98em',color:'#444'}}>{resp.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="feedback-container">
      {submitted && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i>
          Thank you for your feedback! We appreciate your input.
        </div>
      )}
      {error && (
        <div className="success-message" style={{background: '#ffd8d8', color: '#a10000', borderLeft: '4px solid #d00000'}}>
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="feedback-intro">
        <h3>Share Your Experience</h3>
        <p>
          We're constantly working to improve PKFConnect, and your feedback is essential to this process.
          Whether you have a suggestion, encountered an issue, or want to share what you love about the platform, we want to hear from you.
        </p>
        <button className="feedback-shortcut-btn" onClick={handleGoToDashboard}>
          <i className="fas fa-home"></i> Back to Dashboard
        </button>
      </div>

      <div className="feedback-content">
        {/* Feedback Form */}
        <div className="feedback-form-container">
          <h3 className="form-title">Submit Feedback</h3>
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="category_id">Feedback Category</label>
              <select
                id="category_id"
                name="category_id"
                className="form-select"
                value={formData.category_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                className="form-input"
                placeholder="Brief summary of your feedback"
                value={formData.subject}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Rating</label>
              <div className="rating-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`rating-star ${star <= formData.rating ? 'active' : ''}`}
                    onClick={() => handleRatingChange(star)}
                  >
                    <i className={star <= formData.rating ? "fas fa-star" : "far fa-star"}></i>
                  </span>
                ))}
              </div>
              <div className="rating-text">
                {formData.rating === 0 ? 'Select a rating' : `${formData.rating} star${formData.rating !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="form-group full-width">
              <label className="form-label" htmlFor="message">Your Feedback</label>
              <textarea
                id="message"
                name="message"
                className="form-textarea"
                placeholder="Please provide detailed feedback..."
                value={formData.message}
                onChange={handleInputChange}
                required
              ></textarea>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                className="form-select"
                value={formData.priority}
                onChange={handleInputChange}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group full-width">
              <button type="submit" className="form-submit">
                <i className="fas fa-paper-plane"></i> Submit Feedback
              </button>
            </div>
          </form>
          {/* Extra quick navigation buttons */}
          <div className="feedback-extra-actions">
            <button className="feedback-action-btn" onClick={handleGoToAssistant}>
              <i className="fas fa-robot"></i> Ask the Assistant
            </button>
            <button className="feedback-action-btn" onClick={handleGoToHandbook}>
              <i className="fas fa-book"></i> View Handbook
            </button>
            <button className="feedback-action-btn" onClick={handleGoToPrograms}>
              <i className="fas fa-compass"></i> Explore Programs
            </button>
          </div>
        </div>
        {/* Recent Feedback */}
        <div className="recent-feedback">
          <h3 className="form-title">Recent Feedback</h3>
          {renderFeedbackList(recentFeedback)}
          {recentFeedback.length >= 3 && (
            <button className="form-submit" style={{margin:'24px auto 0',display:'block'}} onClick={handleOpenAllModal}>
              View All Feedbacks
            </button>
          )}
        </div>
      </div>
      {/* Modal for All Feedbacks */}
      {showAllModal && (
        <div className="feedback-modal-overlay" onClick={handleCloseAllModal}>
          <div className="feedback-modal" onClick={e => e.stopPropagation()}>
            <div className="feedback-modal-header">
              <h2>All My Feedbacks</h2>
              <button className="feedback-modal-close" onClick={handleCloseAllModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{maxHeight: '70vh', overflowY: 'auto', padding: 12}}>
              {renderFeedbackList(allFeedback)}
            </div>
          </div>
        </div>
      )}
      {/* FAQ Section */}
      <div className="faq-section">
        <h3 className="form-title">Feedback FAQs</h3>
        <div className="faq-list">
          {[
            {
              question: "How long does it take to get a response to my feedback?",
              answer: "We strive to respond to all feedback within 2-3 business days. During peak times, it may take slightly longer, but we appreciate your patience and will respond to every submission."
            },
            {
              question: "Can I submit feedback anonymously?",
              answer: "Currently, you must be logged in to submit feedback. Anonymous feedback may be supported in the future."
            },
            {
              question: "How is my feedback used?",
              answer: "Your feedback is reviewed by our product team and used to prioritize improvements and new features."
            }
          ].map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${activeFaq === index ? 'active' : ''}`}
            >
              <div
                className="faq-question"
                onClick={() => toggleFaq(index)}
              >
                {faq.question}
                <span className="faq-toggle">
                  <i className={`fas fa-chevron-${activeFaq === index ? 'up' : 'down'}`}></i>
                </span>
              </div>
              <div className="faq-answer">
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Feedback;