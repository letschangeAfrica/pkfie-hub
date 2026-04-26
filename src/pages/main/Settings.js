import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  FiMoon, FiSun, FiBell, FiLock, FiGlobe,
  FiSave, FiCheckCircle, FiShield, FiEye, FiEyeOff,
  FiUser, FiAlertTriangle,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const ROLE_STYLE = {
  student:  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  lecturer: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  parent:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  admin:    'bg-gold/15 text-gold',
};

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 overflow-hidden shadow-sm dark:shadow-none">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-navy-700/40">
      <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-gold" />
      </div>
      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
    </div>
    <div className="px-5 py-4 space-y-4">{children}</div>
  </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-800 dark:text-white">{label}</p>
      {description && <p className="text-xs text-slate-500 dark:text-navy-400 mt-0.5">{description}</p>}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200',
        checked ? 'bg-gold' : 'bg-slate-200 dark:bg-navy-600',
      ].join(' ')}
    >
      <span className={[
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0.5',
      ].join(' ')} />
    </button>
  </div>
);

function PasswordField({ label, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-navy-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-9 rounded-xl text-xs border border-slate-200 dark:border-navy-600
            bg-white dark:bg-navy-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-navy-500
            focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-navy-500 hover:text-slate-600 dark:hover:text-navy-300 transition-colors"
        >
          {show ? <FiEyeOff size={13} /> : <FiEye size={13} />}
        </button>
      </div>
    </div>
  );
}

const parseApiError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'An error occurred. Please try again.';
  if (typeof data.error === 'string')   return data.error;
  if (Array.isArray(data.error))        return data.error.join(' ');
  if (typeof data.detail === 'string')  return data.detail;
  if (typeof data.message === 'string') return data.message;
  const msgs = Object.entries(data).flatMap(([k, v]) =>
    Array.isArray(v) ? v.map(m => `${k}: ${m}`) : typeof v === 'string' ? [`${k}: ${v}`] : []
  );
  return msgs.join(' · ') || 'An error occurred. Please try again.';
};

export default function Settings({ theme, setTheme }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Guard against missing props (e.g. if rendered without Layout)
  const safeTheme    = theme    || 'dark';
  const safeSetTheme = setTheme || (() => {});

  const token = localStorage.getItem('token');

  // Notification preferences (localStorage only — no backend persistence yet)
  const [notifEmail,    setNotifEmail]    = useState(true);
  const [notifPush,     setNotifPush]     = useState(true);
  const [notifAnnounce, setNotifAnnounce] = useState(true);
  const [notifEvents,   setNotifEvents]   = useState(true);
  const [language,      setLanguage]      = useState('en');
  const [prefSaved,     setPrefSaved]     = useState(false);

  // Password change
  const [pw,        setPw]        = useState({ current: '', next: '', confirm: '' });
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    setNotifEmail   (localStorage.getItem('settings_notif_email')    !== 'false');
    setNotifPush    (localStorage.getItem('settings_notif_push')     !== 'false');
    setNotifAnnounce(localStorage.getItem('settings_notif_announce') !== 'false');
    setNotifEvents  (localStorage.getItem('settings_notif_events')   !== 'false');
    setLanguage     (localStorage.getItem('settings_language')       || 'en');
  }, []);

  const handleSavePrefs = () => {
    localStorage.setItem('settings_notif_email',    notifEmail);
    localStorage.setItem('settings_notif_push',     notifPush);
    localStorage.setItem('settings_notif_announce', notifAnnounce);
    localStorage.setItem('settings_notif_events',   notifEvents);
    localStorage.setItem('settings_language',       language);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pw.next !== pw.confirm) { setPwError('New passwords do not match.'); return; }
    if (pw.next.length < 8)    { setPwError('Password must be at least 8 characters.'); return; }
    setPwLoading(true);
    try {
      await axios.post(
        `${BASE_URL}/api/auth/change-password/`,
        { current_password: pw.current, new_password: pw.next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPwSuccess('Password updated successfully.');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(parseApiError(err));
    } finally {
      setPwLoading(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-navy-400 mt-0.5">
          Manage your preferences and account security
        </p>
      </div>

      {/* Account overview */}
      <Section icon={FiUser} title="Account">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center flex-shrink-0 shadow-gold-sm">
            <span className="text-navy-900 text-base font-black">
              {(currentUser?.first_name?.[0] || '') + (currentUser?.last_name?.[0] || '') || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {currentUser?.first_name} {currentUser?.last_name}
            </p>
            <p className="text-xs text-slate-500 dark:text-navy-400 truncate">{currentUser?.email}</p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
              border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-navy-300
              hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
          >
            <FiUser size={12} />
            Edit profile
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl bg-slate-50 dark:bg-navy-700/40 px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-400 dark:text-navy-500 uppercase tracking-wide mb-1">Role</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${ROLE_STYLE[currentUser?.role] || ROLE_STYLE.student}`}>
              {currentUser?.role || 'student'}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-navy-700/40 px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-400 dark:text-navy-500 uppercase tracking-wide mb-1">Member since</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-navy-200">{formatDate(currentUser?.created_at)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-navy-700/40 px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-400 dark:text-navy-500 uppercase tracking-wide mb-1">Last login</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-navy-200">{formatDate(currentUser?.last_login)}</p>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section icon={safeTheme === 'dark' ? FiMoon : FiSun} title="Appearance">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-white">Theme</p>
            <p className="text-xs text-slate-500 dark:text-navy-400 mt-0.5">Choose your preferred color scheme</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-navy-700/50">
            {['light', 'dark'].map(t => (
              <button
                key={t}
                onClick={() => safeSetTheme(t)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  safeTheme === t
                    ? 'bg-white dark:bg-navy-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-navy-400 hover:text-slate-700 dark:hover:text-white',
                ].join(' ')}
              >
                {t === 'light' ? <FiSun size={12} /> : <FiMoon size={12} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Notification preferences */}
      <Section icon={FiBell} title="Notifications">
        <Toggle label="Email notifications"   description="Receive important updates via email"                checked={notifEmail}    onChange={setNotifEmail}    />
        <Toggle label="Push notifications"    description="Get alerts in your browser"                        checked={notifPush}     onChange={setNotifPush}     />
        <Toggle label="Announcements"         description="Be notified of new campus announcements"           checked={notifAnnounce} onChange={setNotifAnnounce} />
        <Toggle label="Event reminders"       description="Reminders for upcoming calendar events"            checked={notifEvents}   onChange={setNotifEvents}   />

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-slate-400 dark:text-navy-500 italic">Saved to this device</p>
          <button
            onClick={handleSavePrefs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
              text-navy-900 transition-all hover:-translate-y-px active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
          >
            {prefSaved ? <FiCheckCircle size={13} /> : <FiSave size={13} />}
            {prefSaved ? 'Saved!' : 'Save preferences'}
          </button>
        </div>
      </Section>

      {/* Language */}
      <Section icon={FiGlobe} title="Language & Region">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-white">Language</p>
            <p className="text-xs text-slate-500 dark:text-navy-400 mt-0.5">Interface display language (saved to this device)</p>
          </div>
          <select
            value={language}
            onChange={e => { setLanguage(e.target.value); localStorage.setItem('settings_language', e.target.value); }}
            className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-navy-600
              bg-white dark:bg-navy-700 text-slate-800 dark:text-white
              focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </Section>

      {/* Security */}
      <Section icon={FiShield} title="Security">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-navy-700/30 border border-slate-200 dark:border-navy-700/40">
          <FiAlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600 dark:text-navy-300 leading-relaxed">
            Your account uses email + password authentication.
            Never share your password or access token with anyone.
          </p>
        </div>
      </Section>

      {/* Change Password */}
      <Section icon={FiLock} title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-3">
          <PasswordField
            label="Current password"
            placeholder="Enter your current password"
            value={pw.current}
            onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
          />
          <PasswordField
            label="New password"
            placeholder="At least 8 characters"
            value={pw.next}
            onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
          />
          <PasswordField
            label="Confirm new password"
            placeholder="Repeat new password"
            value={pw.confirm}
            onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
          />

          {/* Strength hint */}
          {pw.next.length > 0 && (
            <div className="space-y-1">
              <div className="h-1 rounded-full bg-slate-100 dark:bg-navy-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    pw.next.length < 8 ? 'w-1/4 bg-red-400' :
                    pw.next.length < 12 ? 'w-2/4 bg-amber-400' :
                    'w-full bg-emerald-400'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-navy-500">
                {pw.next.length < 8 ? 'Too short' : pw.next.length < 12 ? 'Fair' : 'Strong'}
              </p>
            </div>
          )}

          {pwError   && <p className="text-xs text-red-400 font-medium">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-emerald-400 font-medium">{pwSuccess}</p>}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={pwLoading || !pw.current || !pw.next || !pw.confirm}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                text-navy-900 transition-all hover:-translate-y-px active:translate-y-0
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
            >
              <FiLock size={13} />
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </Section>

    </div>
  );
}
