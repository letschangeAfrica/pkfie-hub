import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminSearchResults.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const AdminSearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const query = params.get('q') || '';

  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setUsers([]);
      setAnnouncements([]);
      setEvents([]);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('token');
    Promise.all([
      axios.get(`${BASE_URL}/api/users/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${BASE_URL}/api/announcements/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${BASE_URL}/api/events/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
    ])
      .then(([userRes, annRes, eventRes]) => {
        setUsers(userRes.data.results || userRes.data || []);
        setAnnouncements(annRes.data.results || annRes.data || []);
        setEvents(eventRes.data.results || eventRes.data || []);
        setLoading(false);
      })
      .catch(() => {
        setUsers([]);
        setAnnouncements([]);
        setEvents([]);
        setLoading(false);
      });
  }, [query]);

  // Optionally, show a "no results at all" message
  const nothingFound = !loading && users.length === 0 && announcements.length === 0 && events.length === 0;

  return (
    <div className="admin-search-results-container">
      <button
        type="button"
        className="admin-back-btn"
        onClick={() => navigate(-1)}
        aria-label="Back to previous page"
      >
        ← Back
      </button>
      <h2>
        Admin Search Results {query && <span>&quot;{query}&quot;</span>}
      </h2>
      {loading && <p>Loading...</p>}
      {nothingFound && (
        <p className="admin-no-results">
          No users, announcements, or events found for <b>&quot;{query}&quot;</b>.
        </p>
      )}
      {!loading && (
        <>
          {/* Users Section */}
          <h3>Users</h3>
          {users.length === 0 ? (
            <p className="admin-no-results">No users found.</p>
          ) : (
            <ul className="admin-search-list">
              {users.map(user => (
                <li key={user.id}>
                  <span className="admin-result-title">{user.first_name} {user.last_name}</span>
                  <span className="admin-result-meta">({user.email})</span>
                  {user.role && (
                    <span className="admin-user-role">{user.role}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Announcements Section */}
          <h3>Announcements</h3>
          {announcements.length === 0 ? (
            <p className="admin-no-results">No announcements found.</p>
          ) : (
            <ul className="admin-search-list">
              {announcements.map(a => (
                <li key={a.id}>
                  <span className="admin-result-title">{a.title}</span>
                  <span className="admin-result-meta">
                    {a.content.slice(0, 70)}{a.content.length > 70 ? "..." : ""}
                  </span>
                  <span className="admin-announcement-priority">{a.priority || "normal"}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Events Section */}
          <h3>Events</h3>
          {events.length === 0 ? (
            <p className="admin-no-results">No events found.</p>
          ) : (
            <ul className="admin-search-list">
              {events.map(event => (
                <li key={event.id}>
                  <span className="admin-result-title">{event.title}</span>
                  {event.start_time && (
                    <span className="admin-result-date">
                      {new Date(event.start_time).toLocaleDateString()}
                      {event.end_time ? ` - ${new Date(event.end_time).toLocaleDateString()}` : ""}
                    </span>
                  )}
                  {event.description && (
                    <span className="admin-result-description">
                      {event.description.slice(0, 60)}{event.description.length > 60 ? "..." : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSearchResults;