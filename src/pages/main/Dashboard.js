import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import pkfievideo from '../../images/pkfievideo.mp4';
import './Dashboard.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Dashboard = () => {
  const navigate = useNavigate();

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  // Events state
  const [events, setEvents] = useState([]);

  // Fetch 3 most urgent or soonest (closest end_date or high priority) announcements
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(
      `${BASE_URL}/api/announcements/?status=active&ordering=-priority,end_date,-created_at&page=1&page_size=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then((res) =>
      setAnnouncements(
        Array.isArray(res.data.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : []
      )
    )
    .catch(() => setAnnouncements([]));
  }, []);

  // Fetch 3 upcoming events ordered by soonest
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(
      `${BASE_URL}/api/events/?upcoming=true&page=1&page_size=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then((res) =>
      setEvents(
        Array.isArray(res.data.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : []
      )
    )
    .catch(() => setEvents([]));
  }, []);

  // When a user clicks an announcement
  const handleAnnouncementClick = async (announcement) => {
    setSelectedAnnouncement(announcement);
    // Record the view (if logged in)
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.post(
          `${BASE_URL}/api/announcement-views/`,
          { announcement: announcement.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        // Ignore duplicate entry errors
      }
    }
  };

  // Close modal
  const closeAnnouncementModal = () => setSelectedAnnouncement(null);

  // Navigation handlers (unchanged)
  const handleExploreResources = () => navigate('/handbook');
  const handleHandbookResources = () => navigate('/handbook');
  const handleAIAssistant = () => navigate('/assistant');
  const handleProgramPathfinder = () => navigate('/pathfinder');
  const handleFeedback = () => navigate('/feedback');
  const handleAskQuestion = () => navigate('/assistant');
  const handleDownloadHandbook = () => window.open('/downloads/PKFokam_Handbook.pdf', '_blank');
  const handleFindPath = () => navigate('/pathfinder');
  const handleGiveFeedback = () => navigate('/feedback');

  // Date helpers
  const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString() : '');
  const getMonth = (dateStr) => (dateStr ? new Date(dateStr).toLocaleString('default', { month: 'short' }).toUpperCase() : '');
  const getDay = (dateStr) => (dateStr ? new Date(dateStr).getDate() : '');
  const getTime = (dateStr) => (dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  // Render announcements
  const renderAnnouncementList = (list) => (
    <div className="announcements">
      {list.length === 0 && (
        <div className="announcement-item">
          <div className="announcement-title">
            <i className="fas fa-bullhorn"></i> No announcements yet.
          </div>
        </div>
      )}
      {list.map((a) => (
        <div
          className="announcement-item announcement-clickable"
          key={a.id}
          style={{ cursor: 'pointer' }}
          onClick={() => handleAnnouncementClick(a)}
        >
          <div className="announcement-title">
            <i className="fas fa-bullhorn"></i> {a.title}
            {a.priority && a.priority !== 'normal' && (
              <span className={`announcement-priority priority-${a.priority}`}>{a.priority}</span>
            )}
          </div>
          <p>{a.content.length > 120 ? a.content.slice(0, 120) + "..." : a.content}</p>
          <div className="announcement-date">
            {a.start_date ? `From: ${formatDate(a.start_date)} ` : ''}
            {a.end_date ? `To: ${formatDate(a.end_date)}` : ''}
            {(!a.start_date && !a.end_date) && `Posted: ${formatDate(a.created_at)}`}
          </div>
        </div>
      ))}
      {/* Modal for announcement details */}
      {selectedAnnouncement && (
        <div className="am-modal-overlay" onClick={closeAnnouncementModal}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-header">
              <h3>{selectedAnnouncement.title}</h3>
              <button className="am-modal-close" onClick={closeAnnouncementModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="am-modal-body">
              <p>{selectedAnnouncement.content}</p>
              <div className="am-modal-meta">
                Priority: <strong>{selectedAnnouncement.priority}</strong> <br/>
                Period: {formatDate(selectedAnnouncement.start_date)} - {formatDate(selectedAnnouncement.end_date)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render events (unchanged)
  const renderEventsList = (list) => (
    <div className="events-grid">
      {list.length === 0 && (
        <div className="event-card">
          <div className="event-details">
            <h4>No upcoming events</h4>
          </div>
        </div>
      )}
      {list.map((event) => (
        <div className="event-card" key={event.id}>
          <div className="event-date">
            <span className="event-day">{getDay(event.start_time)}</span>
            <span className="event-month">{getMonth(event.start_time)}</span>
          </div>
          <div className="event-details">
            <h4>{event.title}</h4>
            <p>{event.description}</p>
            <span className="event-time">
              {getTime(event.start_time)}
              {event.end_time ? ` - ${getTime(event.end_time)}` : ''}
            </span>
            {event.location && (
              <div className="event-location"><i className="fas fa-map-marker-alt"></i> {event.location}</div>
            )}
            {event.registration_link && (
              <div>
                <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                  Register
                </a>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section id="dashboard" className="page-section active">
      {/* Hero Section with ONLY Video */}
      <div className="dashboard-hero video-only">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="dashboard-hero-video"
        >
          <source src={pkfievideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="dashboard-hero-overlay" />
        <div className="hero-content">
          <h1>Welcome to PKFConnect</h1>
          <p>Your gateway to PKFokam Institute of Excellence</p>
          <button className="cta-button" onClick={handleExploreResources}>
            Explore Resources <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="dashboard-section">
        <h3 className="section-title">Dashboard Overview</h3>
        <div className="dashboard-grid">
          <div className="card" onClick={handleHandbookResources} style={{ cursor: 'pointer' }}>
            <div className="card-header">
              <h3 className="card-title">Handbook Resources</h3>
              <div className="card-icon">
                <i className="fas fa-book"></i>
              </div>
            </div>
            <div className="stat-value">128+</div>
            <p className="stat-label">Policies and resources available</p>
          </div>
          <div className="card" onClick={handleAIAssistant} style={{ cursor: 'pointer' }}>
            <div className="card-header">
              <h3 className="card-title">AI Assistant</h3>
              <div className="card-icon">
                <i className="fas fa-robot"></i>
              </div>
            </div>
            <div className="stat-value">24/7</div>
            <p className="stat-label">Instant answers to your questions</p>
          </div>
          <div className="card" onClick={handleProgramPathfinder} style={{ cursor: 'pointer' }}>
            <div className="card-header">
              <h3 className="card-title">Program Pathfinder</h3>
              <div className="card-icon">
                <i className="fas fa-compass"></i>
              </div>
            </div>
            <div className="stat-value">12</div>
            <p className="stat-label">Fields of study to discover</p>
          </div>
          <div className="card" onClick={handleFeedback} style={{ cursor: 'pointer' }}>
            <div className="card-header">
              <h3 className="card-title">Feedback</h3>
              <div className="card-icon">
                <i className="fas fa-comment"></i>
              </div>
            </div>
            <div className="stat-value">98%</div>
            <p className="stat-label">Suggestions reviewed within 48h</p>
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      <div className="announcements-section">
        <h3 className="section-title">Latest Announcements</h3>
        {renderAnnouncementList(announcements)}
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h3 className="section-title">Quick Actions</h3>
        <div className="quick-actions">
          <button className="action-btn" onClick={handleAskQuestion}>
            <i className="fas fa-question-circle"></i>
            <div className="action-label">Ask a Question</div>
          </button>
          <button className="action-btn" onClick={handleDownloadHandbook}>
            <i className="fas fa-download"></i>
            <div className="action-label">Download Handbook</div>
          </button>
          <button className="action-btn" onClick={handleFindPath}>
            <i className="fas fa-road"></i>
            <div className="action-label">Find Your Path</div>
          </button>
          <button className="action-btn" onClick={handleGiveFeedback}>
            <i className="fas fa-comments"></i>
            <div className="action-label">Give Feedback</div>
          </button>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="events-section">
        <h3 className="section-title">Upcoming Events</h3>
        {renderEventsList(events)}
      </div>
    </section>
  );
};

export default Dashboard;