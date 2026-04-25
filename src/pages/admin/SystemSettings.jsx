import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../services/api';
import {
  FiSave,
  FiX,
  FiRefreshCw,
  FiZap,
  FiServer,
  FiMail,
  FiFile,
  FiCpu,
  FiCheckCircle,
  FiAlertCircle,
  FiSettings
} from 'react-icons/fi';
import { FaMagic } from 'react-icons/fa';

const TABS = [
  { id: 'general', name: 'General', icon: FiSettings },
  { id: 'ai', name: 'AI Settings', icon: FiCpu },
  { id: 'files', name: 'File Settings', icon: FiFile },
  { id: 'email', name: 'Email Settings', icon: FiMail }
];

const detectCategory = (key) => {
  const k = (key || '').toLowerCase();
  if (k.startsWith('ai_')) return 'ai';
  if (k.startsWith('smtp_') || k.startsWith('email_')) return 'email';
  if (k.includes('file') || k.startsWith('max_file') || k.startsWith('allowed_file') || k.startsWith('file_')) return 'files';
  return 'general';
};

const inferTypeFromKeyOrValue = (key, value) => {
  const k = (key || '').toLowerCase();
  if (k.includes('password')) return 'password';
  if (value === 'true' || value === 'false') return 'boolean';
  if (!Number.isNaN(Number(value)) && value !== '') return 'number';
  return 'string';
};

export default function SystemSettings() {
  const [settingsRaw, setSettingsRaw] = useState([]);
  const [groups, setGroups] = useState({ general: [], ai: [], files: [], email: [] });
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  const [originalValues, setOriginalValues] = useState({});

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

  const modifiedKeys = useMemo(() => {
    const keys = [];
    Object.values(groups).forEach((arr) => {
      arr.forEach((s) => {
        const orig = originalValues[s.key] ?? '';
        const cur = s.editValue ?? '';
        if (String(cur) !== String(orig)) keys.push(s.key);
      });
    });
    return keys;
  }, [groups, originalValues]);

  const modifiedCount = modifiedKeys.length;

  const changedSettingsList = useMemo(() => {
    const keysSet = new Set(modifiedKeys);
    const list = [];
    Object.values(groups).forEach((arr) => {
      arr.forEach((s) => {
        if (keysSet.has(s.key)) list.push(s);
      });
    });
    return list;
  }, [groups, modifiedKeys]);

  useEffect(() => {
    const handler = (e) => {
      if (modifiedCount > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [modifiedCount]);

  const loadSettingsFromServer = async () => {
    setIsLoading(true);
    setToast(null);
    try {
      const res = await api.get('/settings/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setSettingsRaw(data);

      const grouped = { general: [], ai: [], files: [], email: [] };
      const originals = {};
      data.forEach((s) => {
        const cat = (s.category && s.category.trim()) ? s.category : detectCategory(s.key);
        const editValue = s.value === null || s.value === undefined ? '' : String(s.value);
        grouped[cat] = grouped[cat] || [];
        grouped[cat].push({
          ...s,
          editValue,
          inferredType: inferTypeFromKeyOrValue(s.key, editValue),
        });
        originals[s.key] = editValue;
      });

      TABS.forEach((t) => {
        grouped[t.id] = grouped[t.id] || [];
        grouped[t.id].sort((a, b) => a.key.localeCompare(b.key));
      });

      setGroups(grouped);
      setOriginalValues(originals);
      setFieldErrors({});
    } catch (err) {
      console.error('Failed to load settings', err);
      setToast({ type: 'error', message: 'Failed to load settings from server.' });
      setGroups({ general: [], ai: [], files: [], email: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const loadInitial = async () => {
    setCheckingUser(true);
    try {
      const prof = await api.get('/users/profile/');
      const p = prof.data || {};
      const admin = !!(p.is_staff || p.is_superuser || p.role === 'admin' || p.role === 'staff' || p.isAdmin || p.is_admin);
      setIsAdmin(admin);
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingUser(false);
    }
    await loadSettingsFromServer();
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocalChange = (category, key, newValue) => {
    setGroups((prev) => {
      const copy = { ...prev };
      copy[category] = copy[category].map((s) => (s.key === key ? { ...s, editValue: newValue } : s));
      return copy;
    });
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateSingle = (setting) => {
    const type = setting.inferredType;
    const v = setting.editValue;
    if (type === 'number') {
      if (v === '') return 'Must be a number';
      if (Number.isNaN(Number(v))) return 'Invalid number';
    }
    return null;
  };

  const saveSettings = async () => {
    if (!isAdmin) {
      setToast({ type: 'error', message: 'Only admins can save settings.' });
      return;
    }
    if (modifiedCount === 0) {
      setToast({ type: 'error', message: 'No changes to save.' });
      return;
    }

    const localErrors = {};
    changedSettingsList.forEach((s) => {
      const e = validateSingle(s);
      if (e) localErrors[s.key] = e;
    });
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setToast({ type: 'error', message: 'Please fix validation errors before saving.' });
      return;
    }

    setIsSaving(true);
    setToast(null);
    setFieldErrors({});

    const promises = changedSettingsList.map(async (s) => {
      const payload = { value: s.editValue === null || s.editValue === undefined ? '' : String(s.editValue) };
      try {
        await api.patch(`/settings/${encodeURIComponent(s.key)}/`, payload);
        return { key: s.key, ok: true };
      } catch (err) {
        const parsed = err?.response?.data || err?.message || 'Save error';
        return { key: s.key, ok: false, error: parsed };
      }
    });

    const results = await Promise.all(promises);
    const errors = {};
    let anyFailed = false;
    results.forEach((r) => {
      if (!r.ok) {
        anyFailed = true;
        const e = r.error;
        if (typeof e === 'object') {
          if (e.value) errors[r.key] = Array.isArray(e.value) ? e.value.join(' ') : String(e.value);
          else if (e.detail) errors[r.key] = String(e.detail);
          else errors[r.key] = JSON.stringify(e);
        } else errors[r.key] = String(e);
      }
    });

    if (anyFailed) {
      setFieldErrors(errors);
      setToast({ type: 'error', message: 'Some settings failed to save. See inline errors.' });
      await loadSettingsFromServer();
    } else {
      setToast({ type: 'success', message: 'All changes saved successfully!' });
      await loadSettingsFromServer();
    }

    setIsSaving(false);
  };

  const discardChanges = () => {
    setGroups((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((cat) => {
        copy[cat] = copy[cat].map((s) => ({ ...s, editValue: originalValues[s.key] ?? '' }));
      });
      return copy;
    });
    setFieldErrors({});
    setToast({ type: 'success', message: 'Local changes discarded.' });
  };

  const resetSettings = async () => {
    if (!isAdmin) {
      setToast({ type: 'error', message: 'Only admins can reset server-side defaults.' });
      await loadSettingsFromServer();
      return;
    }
    if (!window.confirm('Are you sure you want to reset settings to server values?')) return;
    await loadSettingsFromServer();
    setToast({ type: 'success', message: 'Settings reloaded from server.' });
  };

  const createDefaults = async () => {
    if (!isAdmin) {
      setToast({ type: 'error', message: 'Only admins can create default settings.' });
      return;
    }
    setIsSaving(true);
    setToast(null);
    try {
      await api.post('/settings/create_defaults/');
      setToast({ type: 'success', message: 'Default settings created successfully!' });
      await loadSettingsFromServer();
    } catch (err) {
      const parsed = err?.response?.data || err?.message || 'Create defaults failed';
      setToast({ type: 'error', message: parsed?.detail || 'Create defaults endpoint not available.' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSettingInput = (s, category) => {
    const type = s.inferredType;
    const value = s.editValue ?? '';
    const disabled = !isAdmin;
    const modified = (originalValues[s.key] ?? '') !== (s.editValue ?? '');

    if (type === 'boolean') {
      const checked = value === 'true' || value === true;
      return (
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => handleLocalChange(category, s.key, e.target.checked ? 'true' : 'false')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          {modified && (
            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
              edited
            </span>
          )}
        </div>
      );
    }

    const commonClasses = `w-full px-4 py-3 rounded-2xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
      modified 
        ? 'border-amber-300 ring-2 ring-amber-500/20' 
        : 'border-slate-200 dark:border-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

    if (type === 'number') {
      return (
        <div className="w-full">
          <input
            type="number"
            value={value}
            onChange={(e) => handleLocalChange(category, s.key, e.target.value)}
            disabled={disabled}
            className={commonClasses}
          />
          {fieldErrors[s.key] && (
            <div className="text-sm text-rose-600 mt-2 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4" />
              {fieldErrors[s.key]}
            </div>
          )}
        </div>
      );
    }

    if (type === 'password') {
      return (
        <div className="w-full">
          <input
            type="password"
            value={value}
            onChange={(e) => handleLocalChange(category, s.key, e.target.value)}
            disabled={disabled}
            className={commonClasses}
            placeholder="••••••••"
          />
          {fieldErrors[s.key] && (
            <div className="text-sm text-rose-600 mt-2 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4" />
              {fieldErrors[s.key]}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => handleLocalChange(category, s.key, e.target.value)}
          disabled={disabled}
          className={commonClasses}
        />
        {fieldErrors[s.key] && (
          <div className="text-sm text-rose-600 mt-2 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4" />
            {fieldErrors[s.key]}
          </div>
        )}
      </div>
    );
  };

  const tabLists = groups;

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
    .animate-fade-in-up { animation: fadeInUp 0.45s ease-out; }
    .animate-scale-in { animation: scaleIn 0.25s ease-out; }
  `;

  // Stats for the header
  const stats = {
    total: settingsRaw.length,
    general: groups.general?.length || 0,
    ai: groups.ai?.length || 0,
    files: groups.files?.length || 0,
    email: groups.email?.length || 0,
  };

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
            <FiSettings className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">System Settings</h1>
            <p className="text-slate-600 dark:text-slate-400">Configure application-wide settings and preferences</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSettingsFromServer}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh settings"
            aria-label="Refresh settings"
          >
            <FiRefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {settingsRaw.length === 0 && isAdmin && (
            <button
              onClick={createDefaults}
              disabled={isSaving}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg hover:shadow-xl transition-all font-semibold disabled:opacity-50"
            >
              <FaMagic className="w-5 h-5" /> Create Defaults
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Settings</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiSettings className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">General</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.general}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <FiSettings className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">AI Settings</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.ai}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FiCpu className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">File Settings</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.files}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <FiFile className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Email Settings</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.email}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <FiMail className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={saveSettings}
                disabled={isSaving || !isAdmin || modifiedCount === 0}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all font-semibold disabled:opacity-50"
                title={!isAdmin ? 'Saving disabled - admin only' : modifiedCount === 0 ? 'No changes to save' : 'Save all changes'}
              >
                <FiSave className="w-5 h-5" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                onClick={discardChanges}
                disabled={modifiedCount === 0}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                <FiX className="w-4 h-4" /> Discard
              </button>

              <button
                onClick={resetSettings}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <FiRefreshCw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {modifiedCount > 0 && (
              <div className="px-3 py-2 bg-amber-100 text-amber-800 rounded-xl font-semibold">
                {modifiedCount} unsaved change{modifiedCount !== 1 ? 's' : ''}
              </div>
            )}
            {!isAdmin && !checkingUser && (
              <div className="text-slate-500 dark:text-slate-400">
                Saving disabled: admin only
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
        <div className="flex flex-col lg:flex-row">
          {/* Tabs Sidebar */}
          <div className="lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Categories</h3>
              <nav className="space-y-2">
                {TABS.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings List */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <FiRefreshCw className="w-6 h-6 animate-spin" />
                  <div className="text-lg font-medium">Loading settings...</div>
                </div>
              </div>
            ) : (tabLists[activeTab] || []).length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <FiSettings className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No settings found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  {isAdmin 
                    ? 'Click "Create Defaults" to populate recommended values for this category.'
                    : 'No settings are configured yet. Ask an admin to initialize settings.'
                  }
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {(tabLists[activeTab] || []).map((setting, index) => (
                  <div 
                    key={setting.key}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                      <div className="lg:col-span-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                              {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </label>
                            {setting.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {setting.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                              {setting.type || setting.inferredType}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-1">
                        {renderSettingInput(setting, activeTab)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}