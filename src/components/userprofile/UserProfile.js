import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiArrowLeft, FiEdit2, FiSave, FiX,
  FiCalendar, FiClock, FiUpload, FiSettings,
  FiLinkedin, FiGithub, FiGlobe, FiCheckCircle,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const EMPTY_PROFILE = {
  date_of_birth: '', address: '', program_interests: '',
  skills: '', career_goals: '', bio: '',
};

const ROLE_STYLE = {
  student:  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  lecturer: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  parent:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  admin:    'bg-gold/15 text-gold',
};

function Label({ children }) {
  return (
    <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5 uppercase tracking-wide">
      {children}
    </label>
  );
}

const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm transition-colors
  bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700/60
  text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-navy-600
  focus:outline-none focus:border-navy-400 dark:focus:border-gold/50
  disabled:opacity-50 disabled:cursor-not-allowed`;

const parseApiError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'An error occurred. Please try again.';
  if (typeof data.detail  === 'string') return data.detail;
  if (typeof data.error   === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;
  const msgs = Object.entries(data).flatMap(([k, v]) =>
    Array.isArray(v) ? v.map(m => `${k}: ${m}`) : typeof v === 'string' ? [`${k}: ${v}`] : []
  );
  return msgs.join(' · ') || 'An error occurred. Please try again.';
};

// Skeleton shown while currentUser is not yet loaded
function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-slate-200 dark:bg-navy-700 mb-6" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-navy-700 mx-auto mb-4" />
            <div className="h-5 w-3/4 bg-slate-200 dark:bg-navy-700 rounded mx-auto mb-2" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-navy-700 rounded mx-auto" />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-6">
            <div className="h-4 w-40 bg-slate-200 dark:bg-navy-700 rounded mb-4" />
            <div className="grid sm:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i}>
                  <div className="h-3 w-20 bg-slate-200 dark:bg-navy-700 rounded mb-1.5" />
                  <div className="h-5 w-full bg-slate-200 dark:bg-navy-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { currentUser, updateProfile, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const socialKey = `social_links_${currentUser?.id}`;

  const [isEditing,    setIsEditing]    = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [message,      setMessage]      = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [formData,     setFormData]     = useState({
    first_name: '', last_name: '', phone_number: '', student_id: '',
    profile: { ...EMPTY_PROFILE },
  });
  const [social,     setSocial]     = useState({ linkedin: '', github: '', website: '' });
  const [socialSaved, setSocialSaved] = useState(false);

  // Populate form + social from currentUser
  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      first_name:   currentUser.first_name   || '',
      last_name:    currentUser.last_name    || '',
      phone_number: currentUser.phone_number || '',
      student_id:   currentUser.student_id   || '',
      profile: {
        date_of_birth:     currentUser.profile?.date_of_birth     || '',
        address:           currentUser.profile?.address           || '',
        program_interests: currentUser.profile?.program_interests || '',
        skills:            currentUser.profile?.skills            || '',
        career_goals:      currentUser.profile?.career_goals      || '',
        bio:               currentUser.profile?.bio               || '',
      },
    });
    setProfileImage(null);
    try {
      const stored = JSON.parse(localStorage.getItem(`social_links_${currentUser.id}`) || '{}');
      setSocial({ linkedin: stored.linkedin || '', github: stored.github || '', website: stored.website || '' });
    } catch {
      setSocial({ linkedin: '', github: '', website: '' });
    }
  }, [currentUser]);

  // Profile completion %
  const completion = useMemo(() => {
    if (!currentUser) return 0;
    const checks = [
      currentUser.first_name,
      currentUser.last_name,
      currentUser.phone_number,
      currentUser.profile?.bio,
      currentUser.profile?.address,
      currentUser.profile?.program_interests,
      currentUser.profile?.skills,
      currentUser.profile?.career_goals,
      currentUser.profile?.date_of_birth,
      currentUser.profile?.profile_picture,
    ];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (name === 'profile_picture') {
      setProfileImage(e.target.files[0]);
    } else if (name.startsWith('profile.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: { ...prev.profile, [field]: type === 'date' && value ? value.slice(0, 10) : value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toIsoDate = (v) => {
    if (!v) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  };

  const cancelEdit = () => {
    if (!currentUser) return;
    setFormData({
      first_name:   currentUser.first_name   || '',
      last_name:    currentUser.last_name    || '',
      phone_number: currentUser.phone_number || '',
      student_id:   currentUser.student_id   || '',
      profile: {
        date_of_birth:     currentUser.profile?.date_of_birth     || '',
        address:           currentUser.profile?.address           || '',
        program_interests: currentUser.profile?.program_interests || '',
        skills:            currentUser.profile?.skills            || '',
        career_goals:      currentUser.profile?.career_goals      || '',
        bio:               currentUser.profile?.bio               || '',
      },
    });
    setProfileImage(null);
    setIsEditing(false);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('first_name',   formData.first_name);
      fd.append('last_name',    formData.last_name);
      fd.append('phone_number', formData.phone_number);
      Object.entries({ ...formData.profile, date_of_birth: toIsoDate(formData.profile.date_of_birth) })
        .forEach(([k, v]) => fd.append(`profile.${k}`, v ?? ''));
      if (profileImage) fd.append('profile_picture', profileImage);

      const res    = await updateProfile(fd);
      const updated = res.data.user || res.data;
      setCurrentUser(updated);
      setMessage('Profile updated successfully!');
      setIsEditing(false);
      setProfileImage(null);
    } catch (err) {
      setMessage(parseApiError(err));
    } finally {
      setIsLoading(false); }
  };

  const handleSaveSocial = () => {
    localStorage.setItem(socialKey, JSON.stringify(social));
    setSocialSaved(true);
    setTimeout(() => setSocialSaved(false), 2000);
  };

  const formatDate = (s) =>
    s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  if (!currentUser) return <ProfileSkeleton />;

  const avatarUrl = currentUser.profile?.profile_picture_url
    || (currentUser.profile?.profile_picture
        ? (currentUser.profile.profile_picture.startsWith('http')
            ? currentUser.profile.profile_picture
            : `${BASE_URL}${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
        : null);

  const initials =
    (currentUser.first_name?.charAt(0) || '') +
    (currentUser.last_name?.charAt(0)  || '');

  const infoFields = [
    { label: 'First Name',   value: currentUser.first_name },
    { label: 'Last Name',    value: currentUser.last_name  },
    { label: 'Email',        value: currentUser.email      },
    { label: 'Phone Number', value: currentUser.phone_number || 'Not provided' },
    ...(currentUser.student_id
      ? [{ label: 'Student ID', value: currentUser.student_id, note: 'Cannot be changed' }]
      : []),
    ...(currentUser.profile?.date_of_birth
      ? [{ label: 'Date of Birth', value: formatDate(currentUser.profile.date_of_birth) }]
      : []),
  ];

  const extraFields = [
    { label: 'Address',           value: currentUser.profile?.address,           full: true  },
    { label: 'Bio',               value: currentUser.profile?.bio,               full: true  },
    { label: 'Program Interests', value: currentUser.profile?.program_interests, full: false },
    { label: 'Skills',            value: currentUser.profile?.skills,            full: false },
    { label: 'Career Goals',      value: currentUser.profile?.career_goals,      full: false },
  ].filter(f => f.value);

  const completionColor =
    completion === 100 ? 'bg-gold' :
    completion >= 70   ? 'bg-emerald-400' :
    completion >= 40   ? 'bg-amber-400' :
    'bg-red-400';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* Back + title */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-navy-400
            hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiArrowLeft size={15} aria-hidden="true" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            User Profile
          </h1>
          <p className="text-sm text-slate-400 dark:text-navy-500 mt-0.5">
            Manage your personal information
          </p>
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-semibold border
          ${message.includes('successfully')
            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'}`}>
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Avatar + role card */}
          <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-6 text-center">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden flex items-center justify-center
              bg-slate-100 dark:bg-navy-700 ring-2 ring-gold/20">
              {avatarUrl
                ? <img src={avatarUrl} alt={`${currentUser.first_name} ${currentUser.last_name}`} className="w-full h-full object-cover" />
                : <span className="text-2xl font-black text-navy-600 dark:text-gold">{initials || '?'}</span>
              }
            </div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">
              {currentUser.first_name} {currentUser.last_name}
            </h3>
            <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${ROLE_STYLE[currentUser.role] || ROLE_STYLE.student}`}>
              {currentUser.role}
            </span>
            {currentUser.student_id && (
              <p className="text-xs text-slate-400 dark:text-navy-500 mt-2">ID: {currentUser.student_id}</p>
            )}

            {/* Action buttons */}
            <div className="mt-4 space-y-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                    border border-slate-200 dark:border-navy-700/40 text-slate-600 dark:text-navy-300
                    hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
                >
                  <FiEdit2 size={13} />
                  Edit Profile
                </button>
              )}
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                  border border-slate-200 dark:border-navy-700/40 text-slate-600 dark:text-navy-300
                  hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
              >
                <FiSettings size={13} />
                Settings
              </button>
            </div>
          </div>

          {/* Profile completion */}
          <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 dark:text-navy-200">Profile completion</p>
              <span className={`text-xs font-black ${completion === 100 ? 'text-gold' : 'text-slate-500 dark:text-navy-400'}`}>
                {completion}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-navy-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${completionColor}`}
                style={{ width: `${completion}%` }}
              />
            </div>
            {completion < 100 && (
              <p className="text-[10px] text-slate-400 dark:text-navy-500 mt-1.5">
                {completion < 40 ? 'Add your bio and contact info to get started' :
                 completion < 70 ? 'Almost there — fill in your skills and interests' :
                 'Nearly complete — just a few fields left'}
              </p>
            )}
            {completion === 100 && (
              <p className="text-[10px] text-gold mt-1.5 flex items-center gap-1">
                <FiCheckCircle size={10} /> Your profile is complete!
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <FiCalendar size={14} className="text-gold flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 dark:text-navy-500 uppercase tracking-wide font-bold">Member Since</p>
                <p className="text-sm text-slate-700 dark:text-navy-200 font-semibold">{formatDate(currentUser.created_at) || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FiClock size={14} className="text-gold flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 dark:text-navy-500 uppercase tracking-wide font-bold">Last Login</p>
                <p className="text-sm text-slate-700 dark:text-navy-200 font-semibold">
                  {currentUser.last_login ? formatDate(currentUser.last_login) : 'Never'}
                </p>
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-5">
            <p className="text-xs font-bold text-slate-700 dark:text-navy-200 uppercase tracking-wide mb-3">Links</p>

            {!isEditing ? (
              <div className="space-y-2">
                {[
                  { key: 'linkedin', icon: FiLinkedin, label: 'LinkedIn',  prefix: 'https://linkedin.com/in/' },
                  { key: 'github',   icon: FiGithub,   label: 'GitHub',    prefix: 'https://github.com/' },
                  { key: 'website',  icon: FiGlobe,    label: 'Website',   prefix: '' },
                ].map(({ key, icon: Icon, label, prefix }) =>
                  social[key] ? (
                    <a
                      key={key}
                      href={social[key].startsWith('http') ? social[key] : `${prefix}${social[key]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-gold hover:opacity-80 transition-opacity truncate"
                    >
                      <Icon size={13} className="flex-shrink-0" />
                      {social[key]}
                    </a>
                  ) : (
                    <p key={key} className="flex items-center gap-2 text-xs text-slate-400 dark:text-navy-600">
                      <Icon size={13} className="flex-shrink-0" />
                      {label} not set
                    </p>
                  )
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] text-gold hover:opacity-80 transition-opacity mt-1"
                >
                  Edit links →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { key: 'linkedin', icon: FiLinkedin, placeholder: 'linkedin.com/in/yourname' },
                  { key: 'github',   icon: FiGithub,   placeholder: 'github.com/yourname' },
                  { key: 'website',  icon: FiGlobe,    placeholder: 'yourwebsite.com' },
                ].map(({ key, icon: Icon, placeholder }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Icon size={14} className="text-slate-400 dark:text-navy-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={social[key]}
                      onChange={e => setSocial(s => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-navy-600
                        bg-white dark:bg-navy-700 text-slate-700 dark:text-navy-200 placeholder-slate-400 dark:placeholder-navy-500
                        focus:outline-none focus:border-gold/50"
                    />
                  </div>
                ))}
                <button
                  onClick={handleSaveSocial}
                  className="flex items-center gap-1.5 mt-1 text-xs font-bold text-navy-900
                    px-3 py-1.5 rounded-lg transition-all hover:-translate-y-px"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  {socialSaved ? <FiCheckCircle size={11} /> : <FiSave size={11} />}
                  {socialSaved ? 'Saved!' : 'Save links'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Main panel ── */}
        <div className="lg:col-span-2">
          {!isEditing ? (
            <div className="space-y-5">
              {/* Personal info */}
              <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-6">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide mb-4">
                  Personal Information
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {infoFields.map(({ label, value, note }) => (
                    <div key={label}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-navy-500 uppercase tracking-wide">{label}</p>
                        {note && <span className="text-[9px] text-slate-400 dark:text-navy-600 italic">({note})</span>}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-navy-200 font-semibold">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra info */}
              {extraFields.length > 0 && (
                <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-6">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide mb-4">
                    Additional Information
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {extraFields.map(({ label, value, full }) => (
                      <div key={label} className={full ? 'sm:col-span-2' : ''}>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-navy-500 uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="text-sm text-slate-700 dark:text-navy-200 font-semibold leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Edit form ── */
            <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-5">

              <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-6 space-y-4">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Personal Information
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <input type="text" name="first_name" required className={inputCls}
                      value={formData.first_name} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <input type="text" name="last_name" required className={inputCls}
                      value={formData.last_name} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <input type="email" value={currentUser.email} disabled className={inputCls} />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <input type="tel" name="phone_number" className={inputCls}
                      placeholder="+237 6XX XXX XXX"
                      value={formData.phone_number} onChange={handleInputChange} />
                  </div>
                  {currentUser.role === 'student' && (
                    <div>
                      <Label>Student ID</Label>
                      <input
                        type="text"
                        value={formData.student_id}
                        disabled
                        title="Student ID cannot be changed"
                        className={inputCls}
                      />
                      <p className="text-[10px] text-slate-400 dark:text-navy-600 mt-1">Cannot be changed</p>
                    </div>
                  )}
                  <div>
                    <Label>Date of Birth</Label>
                    <input type="date" name="profile.date_of_birth" className={inputCls}
                      value={formData.profile.date_of_birth} onChange={handleInputChange} />
                  </div>

                  {/* Profile image */}
                  <div className="sm:col-span-2">
                    <Label>Profile Image</Label>
                    <label className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors
                      ${profileImage
                        ? 'border-gold/40 dark:border-gold/30 bg-gold/5'
                        : 'border-slate-200 dark:border-navy-700/60 hover:border-slate-300 dark:hover:border-navy-600'}`}>
                      {profileImage ? (
                        <img src={URL.createObjectURL(profileImage)} alt="Preview"
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                          <FiUpload size={18} className="text-slate-400 dark:text-navy-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-navy-200">
                          {profileImage ? profileImage.name : 'Choose image'}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-navy-500">JPG, PNG up to 5 MB</p>
                      </div>
                      <input type="file" name="profile_picture" accept="image/*"
                        onChange={handleInputChange} className="sr-only" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 p-6 space-y-4">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Additional Information
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <textarea name="profile.address" rows={2} className={inputCls + ' resize-none'}
                      placeholder="Your address…"
                      value={formData.profile.address} onChange={handleInputChange} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Bio</Label>
                    <textarea name="profile.bio" rows={3} className={inputCls + ' resize-none'}
                      placeholder="Tell us about yourself…"
                      value={formData.profile.bio} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label>Program Interests</Label>
                    <input type="text" name="profile.program_interests" className={inputCls}
                      value={formData.profile.program_interests} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label>Skills</Label>
                    <input type="text" name="profile.skills" className={inputCls}
                      value={formData.profile.skills} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label>Career Goals</Label>
                    <input type="text" name="profile.career_goals" className={inputCls}
                      value={formData.profile.career_goals} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                    text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700/40
                    hover:bg-slate-50 dark:hover:bg-navy-700 disabled:opacity-50 transition-colors"
                >
                  <FiX size={14} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-navy-900
                    disabled:opacity-50 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  <FiSave size={14} />
                  {isLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
