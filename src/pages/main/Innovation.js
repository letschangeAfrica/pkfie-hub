import React, { useRef, useState, useEffect } from 'react';
import api from '../../services/api';
import innovationVideo from '../../images/innovation.mp4';
import './Innovation.css';
import { useAuth } from '../../contexts/AuthContext'; // <- useAuth not AuthContext

// Animation helpers
const fadeDuration = 450; // ms

const TabTransition = ({ activeTab, children }) => {
  const [visibleTab, setVisibleTab] = useState(activeTab);
  const [fadeState, setFadeState] = useState('fade-in');

  useEffect(() => {
    setFadeState('fade-out');
    const timeout = setTimeout(() => {
      setVisibleTab(activeTab);
      setFadeState('fade-in');
    }, fadeDuration);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  return (
    <div className={`tab-transition ${fadeState}`}>
      {children(visibleTab)}
    </div>
  );
};

const defaultProjectForm = {
  title: '',
  description: '',
  category: '',
  team: '',
  status: 'planning',
  image: null,
  code_link: '',
  details_link: '',
};

const InnovationHub = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [resources, setResources] = useState([]);
  const [communityStats, setCommunityStats] = useState({});
  const [loading, setLoading] = useState(false);

  // Action message state for modern toast
  const [actionMessage, setActionMessage] = useState('');
  const [showAction, setShowAction] = useState(false);
  const [actionType, setActionType] = useState('success'); // or 'error'

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const [formLoading, setFormLoading] = useState(false);

  // For video dimensions (optional, can be removed if not needed)
  const videoRef = useRef(null);

  // Get current user from useAuth hook
  const { user } = useAuth();

  // Fetch projects/resources/etc
  useEffect(() => {
    setLoading(true);
    let fetcher;
    if (activeTab === 'projects')
      fetcher = api.get('/innovation/projects/').then(res => setProjects(res.data)).catch(() => setProjects([]));
    else if (activeTab === 'challenges')
      fetcher = api.get('/innovation/challenges/').then(res => setChallenges(res.data)).catch(() => setChallenges([]));
    else if (activeTab === 'resources')
      fetcher = api.get('/innovation/resources/').then(res => setResources(res.data)).catch(() => setResources([]));
    else if (activeTab === 'community')
      fetcher = api.get('/innovation/community/').then(res => setCommunityStats(res.data)).catch(() => setCommunityStats({}));
    Promise.resolve(fetcher).finally(() => setLoading(false));
  }, [activeTab]);

  // Show/hide the toast when actionMessage changes
  useEffect(() => {
    if (actionMessage) {
      setShowAction(true);
      const timer = setTimeout(() => setShowAction(false), 3500); // Hide after 3.5s
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Button handlers
  const handleSubmitProject = () => {
    setProjectForm(defaultProjectForm);
    setShowProjectForm(true);
    setActionMessage('');
  };

  const handleProjectFormChange = (e) => {
    const { name, value, files } = e.target;
    setProjectForm(prev =>
      files
        ? { ...prev, [name]: files[0] }
        : { ...prev, [name]: value }
    );
  };

  const handleProjectFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setActionMessage('');
    setActionType('success');
    try {
      const formData = new FormData();
      Object.entries(projectForm).forEach(([key, value]) => {
        if (value !== null && value !== undefined) formData.append(key, value);
      });
      await api.post('/innovation/projects/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowProjectForm(false);
      setActionType('success');
      setActionMessage('Project submitted!');
      setActiveTab('projects');
      // Refresh projects
      api.get('/innovation/projects/').then(res => setProjects(res.data));
    } catch {
      setActionType('error');
      setActionMessage('Failed to submit project. Please try again.');
    }
    setFormLoading(false);
  };

  const handleParticipateChallenge = async (challengeId) => {
    setActionType('success');
    setActionMessage('');
    try {
      await api.post(`/innovation/challenges/${challengeId}/participate/`);
      setActionType('success');
      setActionMessage("Participation registered! Watch your email for updates.");
      // Optionally, refresh challenges
      api.get('/innovation/challenges/').then(res => setChallenges(res.data));
    } catch {
      setActionType('error');
      setActionMessage("Failed to participate. Please try again.");
    }
  };

  const handleJoinCommunity = async () => {
    setActionType('success');
    setActionMessage('');
    try {
      await api.post('/innovation/community/join/');
      setActionType('success');
      setActionMessage("Welcome to the community! Check your email for next steps.");
      // Optionally, refresh community stats
      api.get('/innovation/community/').then(res => setCommunityStats(res.data));
    } catch {
      setActionType('error');
      setActionMessage("Failed to join. Please try again.");
    }
  };

  return (
    <div className="innovation-section">
      {/* Modern toast/alert for action messages */}
      {actionMessage && (
        <div className={`action-message${showAction ? '' : ' hide'}${actionType === 'error' ? ' error' : ''}`}>
          {actionType === 'success' && <span style={{fontSize:"1.5rem"}}>✅</span>}
          {actionType === 'error' && <span style={{fontSize:"1.5rem"}}>❌</span>}
          {actionMessage}
        </div>
      )}

      {/* Project submission modal */}
      {showProjectForm && (
        <div className="modal-backdrop">
          <div className="modal-form">
            <h3>Submit a New Project</h3>
            <form onSubmit={handleProjectFormSubmit} encType="multipart/form-data">
              <input
                name="title"
                value={projectForm.title}
                onChange={handleProjectFormChange}
                placeholder="Project Title"
                required
              />
              <textarea
                name="description"
                value={projectForm.description}
                onChange={handleProjectFormChange}
                placeholder="Description"
                required
                rows={3}
              />
              <input
                name="category"
                value={projectForm.category}
                onChange={handleProjectFormChange}
                placeholder="Category"
                required
              />
              <input
                name="team"
                value={projectForm.team}
                onChange={handleProjectFormChange}
                placeholder="Team"
                required
              />
              <select
                name="status"
                value={projectForm.status}
                onChange={handleProjectFormChange}
                required
              >
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <input
                name="image"
                type="file"
                accept="image/*"
                onChange={handleProjectFormChange}
              />
              <input
                name="code_link"
                value={projectForm.code_link}
                onChange={handleProjectFormChange}
                placeholder="Code Link"
                type="url"
              />
              <input
                name="details_link"
                value={projectForm.details_link}
                onChange={handleProjectFormChange}
                placeholder="Details Link"
                type="url"
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="cta-button" disabled={formLoading}>
                  {formLoading ? "Submitting..." : "Submit"}
                </button>
                <button type="button" className="cta-button secondary" onClick={() => setShowProjectForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="innovation-hero">
        <div className="hero-content">
          <h3>Transform Your Ideas Into Reality</h3>
          <p>
            The Innovation Hub is your platform to showcase projects, collaborate with peers, and bring your innovative ideas to life. Whether you're building apps, designing solutions, or conducting research, this is your space to create and inspire.
          </p>
          <div className="hero-actions">
            {/* SHOW Submit Project if user is NOT a parent */}
            {user?.role !== "parent" && (
              <button className="cta-button" onClick={handleSubmitProject}>
                <i className="fas fa-plus"></i> Submit Project
              </button>
            )}
            {/* SHOW Join Community if user is NOT a parent */}
            {user?.role !== "parent" && (
              <button className="cta-button secondary" onClick={handleJoinCommunity}>
                <i className="fas fa-users"></i> Join Community
              </button>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <video
            ref={videoRef}
            src={innovationVideo}
            autoPlay
            loop
            muted
            playsInline
            className="innovation-hero-video"
            style={{ width: '600px', borderRadius: '1rem', boxShadow: '0 2px 18px rgba(20,55,90,0.08)' }}
            aria-label="Innovation video"
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button className={`tab-button ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
          Featured Projects
        </button>
        <button className={`tab-button ${activeTab === 'challenges' ? 'active' : ''}`} onClick={() => setActiveTab('challenges')}>
          Innovation Challenges
        </button>
        <button className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>
          Resources
        </button>
        <button className={`tab-button ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>
          Community
        </button>
      </div>

      {/* Tab Content with smooth transition */}
      <TabTransition activeTab={activeTab}>
        {(visibleTab) => (
          <div className="tab-content">
            {loading && <div className="loading-indicator">Loading...</div>}
            {visibleTab === 'projects' && (
              <div className="featured-projects">
                <h3 className="section-title">Featured Projects</h3>
                <div className="projects-grid">
                  {projects
                    .filter(project => project.is_featured) // Only show featured projects!
                    .map(project => (
                      <div key={project.id} className="project-card">
                        <div className="project-image">
                          <img src={project.image_url || project.image} alt={project.title} />
                          <div className="project-category">{project.category}</div>
                        </div>
                        <div className="project-content">
                          <h4>{project.title}</h4>
                          <p>{project.description}</p>
                          <div className="project-meta">
                            <span className="project-team">
                              <i className="fas fa-users"></i> {project.team}
                            </span>
                            <span className={`project-status ${project.status}`}>
                              {project.status.replace('-', ' ')}
                            </span>
                          </div>
                          <div className="project-actions">
                            {project.details_link && (
                              <a
                                href={project.details_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="project-btn"
                              >
                                <i className="fas fa-eye"></i> View Details
                              </a>
                            )}
                            {project.code_link && (
                              <a
                                href={project.code_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="project-btn"
                              >
                                <i className="fas fa-code"></i> View Code
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {visibleTab === 'challenges' && (
              <div className="innovation-challenges">
                <h3 className="section-title">Current Innovation Challenges</h3>
                <div className="challenges-container">
                  {challenges.map(challenge => (
                    <div key={challenge.id} className="challenge-card">
                      <div className="challenge-header">
                        <h4>{challenge.title}</h4>
                        <span className="challenge-deadline">
                          <i className="fas fa-clock"></i> Deadline: {challenge.deadline}
                        </span>
                      </div>
                      <p>{challenge.description}</p>
                      <div className="challenge-prize">
                        <i className="fas fa-trophy"></i> Prize: {challenge.prize}
                      </div>
                      <button
                        className="cta-button small"
                        onClick={() => handleParticipateChallenge(challenge.id)}
                      >
                        <i className="fas fa-rocket"></i> Participate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {visibleTab === 'resources' && (
              <div className="innovation-resources">
                <h3 className="section-title">Innovation Resources</h3>
                <div className="resources-grid">
                  {resources.map(resource => (
                    <div key={resource.id} className="resource-card">
                      <div className="resource-icon">
                        <i className={resource.icon}></i>
                      </div>
                      <h4>{resource.title}</h4>
                      <p>{resource.description}</p>
                      {resource.link ? (
                        <a
                          href={resource.link}
                          className="resource-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Explore Resources <i className="fas fa-arrow-right"></i>
                        </a>
                      ) : (
                        <span className="resource-link disabled">
                          Explore Resources <i className="fas fa-ban"></i>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {visibleTab === 'community' && (
              <div className="innovation-community">
                <h3 className="section-title">Join the Innovation Community</h3>
                <div className="community-content">
                  <div className="community-text">
                    <h4>Collaborate. Create. Innovate.</h4>
                    <p>Join hundreds of students who are transforming their ideas into impactful solutions. Share knowledge, find collaborators, and get feedback on your projects.</p>
                    <ul className="community-benefits">
                      <li><i className="fas fa-check-circle"></i> Weekly innovation workshops</li>
                      <li><i className="fas fa-check-circle"></i> Networking events with industry leaders</li>
                      <li><i className="fas fa-check-circle"></i> Access to prototyping lab equipment</li>
                      <li><i className="fas fa-check-circle"></i> Opportunities to showcase at innovation fairs</li>
                    </ul>
                    {/* SHOW Join Now if user is NOT a parent */}
                    {user?.role !== "parent" && (
                      <button className="cta-button" onClick={handleJoinCommunity}>
                        <i className="fas fa-sign-in-alt"></i> Join Now
                      </button>
                    )}
                  </div>
                  <div className="community-visual">
                    <div className="community-stats">
                      <div className="stat">
                        <div className="stat-number">{communityStats.active_projects || 0}</div>
                        <div className="stat-label">Active Projects</div>
                      </div>
                      <div className="stat">
                        <div className="stat-number">{communityStats.members || 0}</div>
                        <div className="stat-label">Community Members</div>
                      </div>
                      <div className="stat">
                        <div className="stat-number">{communityStats.completed_solutions || 0}</div>
                        <div className="stat-label">Completed Solutions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </TabTransition>
    </div>
  );
};

export default InnovationHub;