import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './UserProfile.css';

const UserProfile = () => {
  const { currentUser, updateProfile, setCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    student_id: '',
    profile: {
      date_of_birth: '',
      address: '',
      program_interests: '',
      skills: '',
      career_goals: '',
      bio: ''
    }
  });
  const [profileImage, setProfileImage] = useState(null); // for new image upload
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Sync formData with currentUser whenever it changes
  useEffect(() => {
    if (currentUser) {
      setFormData({
        first_name: currentUser.first_name || '',
        last_name: currentUser.last_name || '',
        phone_number: currentUser.phone_number || '',
        student_id: currentUser.student_id || '',
        profile: {
          date_of_birth: currentUser.profile?.date_of_birth || '',
          address: currentUser.profile?.address || '',
          program_interests: currentUser.profile?.program_interests || '',
          skills: currentUser.profile?.skills || '',
          career_goals: currentUser.profile?.career_goals || '',
          bio: currentUser.profile?.bio || ''
        }
      });
      setProfileImage(null); // reset file input
    }
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (name === 'profile_picture') {
      setProfileImage(e.target.files[0]);
    } else if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: type === "date" && value ? value.slice(0, 10) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const toIsoDate = (dateVal) => {
    if (!dateVal) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
    const d = new Date(dateVal);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        // Do NOT include student_id in update payload (not editable)
        profile: {
          ...formData.profile,
          date_of_birth: toIsoDate(formData.profile?.date_of_birth),
        }
      };
      Object.keys(payload.profile).forEach(
        k => payload.profile[k] == null && delete payload.profile[k]
      );

      let response;
      // --- IMPORTANT: Always use FormData when editing profile, not just for images ---
      const formDataObj = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'profile') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            formDataObj.append(`profile.${subKey}`, subValue ?? "");
          });
        } else {
          formDataObj.append(key, value ?? "");
        }
      });
      if (profileImage) {
        formDataObj.append('profile_picture', profileImage);
      }
      // Call updateProfile with FormData object only (never send JSON for profile update)
      response = await updateProfile(formDataObj);

      // Always get the updated user object from response
      const updatedUser = response.data.user || response.data;
      setCurrentUser(updatedUser);
      setFormData({
        first_name: updatedUser.first_name || '',
        last_name: updatedUser.last_name || '',
        phone_number: updatedUser.phone_number || '',
        student_id: updatedUser.student_id || '',
        profile: {
          date_of_birth: updatedUser.profile?.date_of_birth || '',
          address: updatedUser.profile?.address || '',
          program_interests: updatedUser.profile?.program_interests || '',
          skills: updatedUser.profile?.skills || '',
          career_goals: updatedUser.profile?.career_goals || '',
          bio: updatedUser.profile?.bio || ''
        }
      });

      setMessage('Profile updated successfully!');
      setIsEditing(false);
      setProfileImage(null);
    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        JSON.stringify(error.response?.data) ||
        'Error updating profile. Please try again.'
      );
      console.error('Profile update error:', error.response?.data || error);
    } finally {
      setIsLoading(false);
    }
  };

  // For pretty display of date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!currentUser) {
    return <div className="up-loading">Loading user data...</div>;
  }

  // Prefer the absolute URL field if your backend provides it (e.g. profile_picture_url)
  const avatarUrl = currentUser.profile?.profile_picture_url
    ? currentUser.profile.profile_picture_url
    : (currentUser.profile?.profile_picture
        ? (currentUser.profile.profile_picture.startsWith('http')
            ? currentUser.profile.profile_picture
            : `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
        : null);

  return (
    <div className="up-container">
      <div className="up-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Modern Back Button */}
          <button
            className="up-btn up-btn-back"
            type="button"
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 500,
              background: "#f5f7fa",
              border: "1px solid #d1d5db",
              color: "#003366",
              borderRadius: "6px",
              cursor: "pointer",
              padding: "6px 14px",
              fontSize: "1rem"
            }}
            aria-label="Go back"
          >
            <i className="fas fa-arrow-left"></i>
            <span>Back</span>
          </button>
          <div>
            <h2 style={{marginBottom: 0}}>User Profile</h2>
            <p style={{marginTop: 2}}>Manage your personal information and preferences</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`up-message ${message.includes('successfully') ? 'up-success' : 'up-error'}`}>
          {message}
        </div>
      )}

      <div className="up-content">
        <div className="up-sidebar">
          <div className="up-avatar">
            <div className="up-avatar-img">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${currentUser.first_name} ${currentUser.last_name}`} />
              ) : (
                <i className="fas fa-user-circle"></i>
              )}
            </div>
            <h3>{currentUser.first_name} {currentUser.last_name}</h3>
            <p className="up-role">{currentUser.role}</p>
            {currentUser.student_id && <p className="up-student-id">ID: {currentUser.student_id}</p>}
          </div>

          <div className="up-stats">
            <div className="up-stat">
              <i className="fas fa-calendar"></i>
              <span>Member since {formatDate(currentUser.created_at)}</span>
            </div>
            <div className="up-stat">
              <i className="fas fa-clock"></i>
              <span>Last login: {currentUser.last_login ? formatDate(currentUser.last_login) : 'Never'}</span>
            </div>
          </div>
        </div>

        <div className="up-main">
          {!isEditing ? (
            <div className="up-view-mode">
              <div className="up-section">
                <h3>Personal Information</h3>
                <div className="up-info-grid">
                  <div className="up-info-item">
                    <label>First Name</label>
                    <p>{currentUser.first_name}</p>
                  </div>
                  <div className="up-info-item">
                    <label>Last Name</label>
                    <p>{currentUser.last_name}</p>
                  </div>
                  <div className="up-info-item">
                    <label>Email</label>
                    <p>{currentUser.email}</p>
                  </div>
                  <div className="up-info-item">
                    <label>Phone Number</label>
                    <p>{currentUser.phone_number || 'Not provided'}</p>
                  </div>
                  {currentUser.student_id && (
                    <div className="up-info-item">
                      <label>Student ID</label>
                      <p>{currentUser.student_id}</p>
                    </div>
                  )}
                  {currentUser.profile?.date_of_birth && (
                    <div className="up-info-item">
                      <label>Date of Birth</label>
                      <p>{formatDate(currentUser.profile.date_of_birth)}</p>
                    </div>
                  )}
                </div>
              </div>

              {currentUser.profile && (
                <div className="up-section">
                  <h3>Additional Information</h3>
                  <div className="up-info-grid">
                    {currentUser.profile.address && (
                      <div className="up-info-item up-full-width">
                        <label>Address</label>
                        <p>{currentUser.profile.address}</p>
                      </div>
                    )}
                    {currentUser.profile.bio && (
                      <div className="up-info-item up-full-width">
                        <label>Bio</label>
                        <p>{currentUser.profile.bio}</p>
                      </div>
                    )}
                    {currentUser.profile.program_interests && (
                      <div className="up-info-item">
                        <label>Program Interests</label>
                        <p>{currentUser.profile.program_interests}</p>
                      </div>
                    )}
                    {currentUser.profile.skills && (
                      <div className="up-info-item">
                        <label>Skills</label>
                        <p>{currentUser.profile.skills}</p>
                      </div>
                    )}
                    {currentUser.profile.career_goals && (
                      <div className="up-info-item">
                        <label>Career Goals</label>
                        <p>{currentUser.profile.career_goals}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button 
                className="up-btn up-btn-primary"
                onClick={() => setIsEditing(true)}
              >
                <i className="fas fa-edit"></i> Edit Profile
              </button>
            </div>
          ) : (
            <form className="up-edit-mode" onSubmit={handleSubmit} encType="multipart/form-data">
              <div className="up-section">
                <h3>Personal Information</h3>
                <div className="up-form-grid">
                  <div className="up-form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="up-form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="up-form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={currentUser.email}
                      disabled
                      className="disabled-input"
                    />
                  </div>
                  <div className="up-form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                    />
                  </div>
                  {currentUser.role === 'student' && (
                    <div className="up-form-group">
                      <label>Student ID</label>
                      <input
                        type="text"
                        name="student_id"
                        value={formData.student_id}
                        disabled // <-- make student ID read-only
                        className="disabled-input"
                      />
                    </div>
                  )}
                  <div className="up-form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="profile.date_of_birth"
                      value={formData.profile.date_of_birth}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="up-form-group up-full-width">
                    <label>Profile Image</label>
                    <input
                      type="file"
                      name="profile_picture"
                      accept="image/*"
                      onChange={handleInputChange}
                    />
                    {profileImage && (
                      <div className="up-image-preview">
                        <img src={URL.createObjectURL(profileImage)} alt="Preview" style={{maxWidth: '120px', marginTop: '8px'}} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="up-section">
                <h3>Additional Information</h3>
                <div className="up-form-grid">
                  <div className="up-form-group up-full-width">
                    <label>Address</label>
                    <textarea
                      name="profile.address"
                      value={formData.profile.address}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                  <div className="up-form-group up-full-width">
                    <label>Bio</label>
                    <textarea
                      name="profile.bio"
                      value={formData.profile.bio}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="up-form-group">
                    <label>Program Interests</label>
                    <input
                      type="text"
                      name="profile.program_interests"
                      value={formData.profile.program_interests}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="up-form-group">
                    <label>Skills</label>
                    <input
                      type="text"
                      name="profile.skills"
                      value={formData.profile.skills}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="up-form-group">
                    <label>Career Goals</label>
                    <input
                      type="text"
                      name="profile.career_goals"
                      value={formData.profile.career_goals}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="up-form-actions">
                <button
                  type="button"
                  className="up-btn up-btn-secondary"
                  onClick={() => {
                    setFormData({
                      first_name: currentUser.first_name || '',
                      last_name: currentUser.last_name || '',
                      phone_number: currentUser.phone_number || '',
                      student_id: currentUser.student_id || '',
                      profile: {
                        date_of_birth: currentUser.profile?.date_of_birth || '',
                        address: currentUser.profile?.address || '',
                        program_interests: currentUser.profile?.program_interests || '',
                        skills: currentUser.profile?.skills || '',
                        career_goals: currentUser.profile?.career_goals || '',
                        bio: currentUser.profile?.bio || ''
                      }
                    });
                    setProfileImage(null);
                    setIsEditing(false);
                    setMessage('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="up-btn up-btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;