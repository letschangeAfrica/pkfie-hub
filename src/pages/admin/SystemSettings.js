import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
  FiSettings, FiSave, FiRefreshCw, FiSlash,
  FiCpu, FiFile, FiMail, FiZap,
} from 'react-icons/fi';

const TABS = [
  { key: 'general', label: 'General',       icon: FiSettings },
  { key: 'ai',      label: 'AI Settings',   icon: FiCpu      },
  { key: 'files',   label: 'File Settings', icon: FiFile     },
  { key: 'email',   label: 'Email Settings',icon: FiMail     },
];

const detectCategory = (key) => {
  const k = (key || '').toLowerCase();
  if (k.startsWith('ai_')) return 'ai';
  if (k.startsWith('smtp_') || k.startsWith('email_')) return 'email';
  if (k.includes('file') || k.startsWith('max_file') || k.startsWith('allowed_file') || k.startsWith('file_')) return 'files';
  return 'general';
};

const inferType = (key, value) => {
  const k = (key || '').toLowerCase();
  if (k.includes('password')) return 'password';
  if (value === 'true' || value === 'false') return 'boolean';
  if (!Number.isNaN(Number(value)) && value !== '') return 'number';
  return 'string';
};

const EMPTY_GROUPS = { general: [], ai: [], files: [], email: [] };

export default function SystemSettings() {
  const [settingsRaw,    setSettingsRaw]    = useState([]);
  const [groups,         setGroups]         = useState(EMPTY_GROUPS);
  const [activeTab,      setActiveTab]      = useState('general');
  const [isSaving,       setIsSaving]       = useState(false);
  const [isLoading,      setIsLoading]      = useState(true);
  const [successMsg,     setSuccessMsg]     = useState('');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [fieldErrors,    setFieldErrors]    = useState({});
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [checkingUser,   setCheckingUser]   = useState(true);
  const [originalValues, setOriginalValues] = useState({});

  const modifiedKeys = useMemo(() => {
    const keys = [];
    Object.values(groups).forEach(arr =>
      arr.forEach(s => {
        if (String(s.editValue ?? '') !== String(originalValues[s.key] ?? '')) keys.push(s.key);
      })
    );
    return keys;
  }, [groups, originalValues]);

  const changedSettings = useMemo(() => {
    const set = new Set(modifiedKeys);
    const list = [];
    Object.values(groups).forEach(arr => arr.forEach(s => { if (set.has(s.key)) list.push(s); }));
    return list;
  }, [groups, modifiedKeys]);

  useEffect(() => {
    const handler = (e) => { if (modifiedKeys.length) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [modifiedKeys]);

  const clearAfter = (ms = 4000) =>
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); setFieldErrors({}); }, ms);

  const loadSettings = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res  = await api.get('/settings/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setSettingsRaw(data);

      const grouped = { general: [], ai: [], files: [], email: [] };
      const originals = {};
      data.forEach(s => {
        const cat       = (s.category?.trim()) ? s.category : detectCategory(s.key);
        const editValue = s.value == null ? '' : String(s.value);
        grouped[cat] = grouped[cat] || [];
        grouped[cat].push({ ...s, editValue, inferredType: inferType(s.key, editValue) });
        originals[s.key] = editValue;
      });
      TABS.forEach(({ key }) => {
        grouped[key] = (grouped[key] || []).sort((a, b) => a.key.localeCompare(b.key));
      });
      setGroups(grouped);
      setOriginalValues(originals);
      setFieldErrors({});
    } catch {
      setErrorMsg('Failed to load settings from server.');
      setGroups(EMPTY_GROUPS);
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    (async () => {
      setCheckingUser(true);
      try {
        const prof = await api.get('/users/profile/');
        const p = prof.data || {};
        setIsAdmin(!!(p.is_staff || p.is_superuser || p.role === 'admin' || p.role === 'staff' || p.isAdmin || p.is_admin));
      } catch { setIsAdmin(false); }
      finally { setCheckingUser(false); }
      await loadSettings();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (category, key, val) => {
    setGroups(prev => ({
      ...prev,
      [category]: prev[category].map(s => s.key === key ? { ...s, editValue: val } : s),
    }));
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const saveSettings = async () => {
    if (!isAdmin) { setErrorMsg('Only admins can save settings.'); clearAfter(); return; }
    if (!modifiedKeys.length) { setErrorMsg('No changes to save.'); clearAfter(); return; }

    const localErrors = {};
    changedSettings.forEach(s => {
      if (s.inferredType === 'number' && (s.editValue === '' || Number.isNaN(Number(s.editValue))))
        localErrors[s.key] = 'Must be a valid number';
    });
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setErrorMsg('Fix validation errors before saving.');
      clearAfter();
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFieldErrors({});

    const results = await Promise.all(
      changedSettings.map(async s => {
        try {
          await api.patch(`/settings/${encodeURIComponent(s.key)}/`, { value: String(s.editValue ?? '') });
          return { key: s.key, ok: true };
        } catch (err) {
          return { key: s.key, ok: false, error: err?.response?.data || err?.message };
        }
      })
    );

    const errors = {};
    let anyFailed = false;
    results.forEach(r => {
      if (!r.ok) {
        anyFailed = true;
        const e = r.error;
        errors[r.key] = typeof e === 'object'
          ? (e.value ? [].concat(e.value).join(' ') : e.detail ? String(e.detail) : JSON.stringify(e))
          : String(e);
      }
    });

    if (anyFailed) {
      setFieldErrors(errors);
      setErrorMsg('Some settings failed to save.');
    } else {
      setSuccessMsg('All changes saved.');
    }
    clearAfter();
    await loadSettings();
    setIsSaving(false);
  };

  const discardChanges = () => {
    setGroups(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(cat => {
        copy[cat] = copy[cat].map(s => ({ ...s, editValue: originalValues[s.key] ?? '' }));
      });
      return copy;
    });
    setFieldErrors({});
    setSuccessMsg('Local changes discarded.');
    clearAfter();
  };

  const createDefaults = async () => {
    if (!isAdmin) { setErrorMsg('Only admins can create default settings.'); clearAfter(); return; }
    setIsSaving(true);
    setErrorMsg('');
    try {
      await api.post('/settings/create_defaults/');
      setSuccessMsg('Default settings created.');
      await loadSettings();
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Create defaults endpoint not available.');
    } finally { clearAfter(); setIsSaving(false); }
  };

  const renderInput = (s, category) => {
    const { inferredType: type, editValue: value = '', key } = s;
    const disabled = !isAdmin;
    const modified = String(value) !== String(originalValues[key] ?? '');

    const baseCls = `w-full px-3 py-2.5 rounded-xl bg-navy-900 border text-white text-sm
      placeholder-navy-600 focus:outline-none transition-colors disabled:opacity-40
      ${modified ? 'border-gold/50 bg-gold/5' : 'border-navy-700/60 focus:border-gold/50'}`;

    if (type === 'boolean') {
      const checked = value === 'true' || value === true;
      return (
        <div className="flex items-center gap-3">
          <label className="relative cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => handleChange(category, key, e.target.checked ? 'true' : 'false')}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-10 h-5 rounded-full bg-navy-700 peer-checked:bg-gold transition-colors peer-disabled:opacity-40" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </label>
          {modified && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gold/20 text-gold">
              edited
            </span>
          )}
        </div>
      );
    }

    return (
      <div>
        <input
          type={type === 'password' ? 'password' : type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => handleChange(category, key, e.target.value)}
          disabled={disabled}
          className={baseCls}
        />
        {fieldErrors[key] && (
          <p className="text-xs text-red-400 mt-1">{fieldErrors[key]}</p>
        )}
      </div>
    );
  };

  const tabItems = groups[activeTab] || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-navy-400 mt-1">Configure application-wide settings and preferences</p>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={saveSettings}
          disabled={isSaving || !isAdmin || !modifiedKeys.length}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-navy-900
            disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          <FiSave size={14} aria-hidden="true" />
          {isSaving ? 'Saving…' : 'Save Settings'}
        </button>

        <button
          onClick={discardChanges}
          disabled={!modifiedKeys.length}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-navy-300
            bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FiSlash size={14} aria-hidden="true" />
          Discard Changes
        </button>

        <button
          onClick={loadSettings}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-navy-300
            bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60
            disabled:opacity-40 transition-colors"
        >
          <FiRefreshCw size={14} aria-hidden="true" />
          Reload
        </button>

        {settingsRaw.length === 0 && isAdmin && (
          <button
            onClick={createDefaults}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-navy-300
              bg-navy-800/60 border border-navy-700/40 hover:border-gold/30 hover:text-gold
              disabled:opacity-40 transition-colors"
          >
            <FiZap size={14} aria-hidden="true" />
            Create Default Settings
          </button>
        )}

        {modifiedKeys.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-gold/20 text-gold">
            {modifiedKeys.length} unsaved change{modifiedKeys.length !== 1 ? 's' : ''}
          </span>
        )}

        {!isAdmin && !checkingUser && (
          <span className="text-xs text-navy-500">Saving disabled — admin only</span>
        )}
      </div>

      {/* Toast messages */}
      {(successMsg || errorMsg) && (
        <div>
          {successMsg && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Tabs + content */}
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-navy-700/40 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap transition-colors
                ${activeTab === key
                  ? 'text-gold border-b-2 border-gold bg-gold/5'
                  : 'text-navy-400 hover:text-white border-b-2 border-transparent'}`}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-navy-500">Loading settings…</div>
          ) : tabItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-bold text-white mb-2">No settings found for this category.</p>
              <p className="text-sm text-navy-500">
                {isAdmin
                  ? 'Click "Create Default Settings" to populate recommended values.'
                  : 'No settings are configured yet. Ask an admin to initialize settings.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-navy-700/30">
              {tabItems.map(setting => (
                <div key={setting.key}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 py-5 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white mb-0.5">
                      {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    {setting.description && (
                      <p className="text-xs text-navy-500 leading-relaxed">{setting.description}</p>
                    )}
                  </div>
                  <div className="sm:w-72 flex-shrink-0">
                    {renderInput(setting, activeTab)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
