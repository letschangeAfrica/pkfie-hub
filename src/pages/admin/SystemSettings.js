import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import './SystemSettings.css';

/**
 * SystemSettings — connects to backend SystemSetting API
 * - GET  /api/settings/                 -> list all settings
 * - PATCH /api/settings/{key}/          -> update a setting (lookup_field = key)
 * - POST /api/settings/create_defaults/ -> optional admin convenience endpoint
 * - Uses /api/users/profile/ to detect admin
 *
 * Notes:
 * - Prefers server-provided "category" when present, otherwise infers by key.
 * - Handles empty-state, unsaved changes, and provides a Create Defaults fallback.
 */

const TABS = ['general', 'ai', 'files', 'email'];

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

const SystemSettings = () => {
  const [settingsRaw, setSettingsRaw] = useState([]); // raw list from server
  const [groups, setGroups] = useState({ general: [], ai: [], files: [], email: [] });
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // keyed by setting.key

  // admin detection
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  // For change tracking: map key -> original server value (string)
  const [originalValues, setOriginalValues] = useState({});

  // Compute modified keys & lists
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

  // Warn on unload if there are unsaved changes
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

  const clearMessagesAfter = (ms = 4000) => {
    if (!ms) return;
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
      setFieldErrors({});
    }, ms);
  };

  const loadSettingsFromServer = async () => {
    setIsLoading(true);
    setErrorMessage('');
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
        grouped[t] = grouped[t] || [];
        grouped[t].sort((a, b) => a.key.localeCompare(b.key));
      });

      setGroups(grouped);
      setOriginalValues(originals);
      setFieldErrors({});
    } catch (err) {
      console.error('Failed to load settings', err);
      setErrorMessage('Failed to load settings from server.');
      setGroups({ general: [], ai: [], files: [], email: [] });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial boot: fetch profile (to determine admin) then load settings
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

  const parseFieldErrors = (errData) => {
    if (!errData) return {};
    if (typeof errData === 'string') return { non_field_errors: errData };
    if (Array.isArray(errData)) return { non_field_errors: errData.join(' ') };
    const out = {};
    if (errData.detail) out.non_field_errors = String(errData.detail);
    Object.entries(errData).forEach(([k, v]) => {
      if (Array.isArray(v)) out[k] = v.join(' ');
      else out[k] = String(v);
    });
    return out;
  };

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
      setErrorMessage('Only admins can save settings.');
      clearMessagesAfter();
      return;
    }
    if (modifiedCount === 0) {
      setErrorMessage('No changes to save.');
      clearMessagesAfter();
      return;
    }

    // client-side validation
    const localErrors = {};
    changedSettingsList.forEach((s) => {
      const e = validateSingle(s);
      if (e) localErrors[s.key] = e;
    });
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setErrorMessage('Please fix validation errors before saving.');
      clearMessagesAfter();
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    setFieldErrors({});

    // Only patch changed settings
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
      setErrorMessage('Some settings failed to save. See inline errors.');
      clearMessagesAfter();
      await loadSettingsFromServer();
    } else {
      setSuccessMessage('All changes saved.');
      clearMessagesAfter();
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
    setSuccessMessage('Local changes discarded.');
    clearMessagesAfter();
  };

  const resetSettings = async () => {
    if (!isAdmin) {
      setErrorMessage('Only admins can reset server-side defaults; reloading server values instead.');
      await loadSettingsFromServer();
      clearMessagesAfter();
      return;
    }
    if (!window.confirm('Are you sure you want to reset settings to server values?')) return;
    await loadSettingsFromServer();
    setSuccessMessage('Settings reloaded from server.');
    clearMessagesAfter();
  };

  const createDefaults = async () => {
    if (!isAdmin) {
      setErrorMessage('Only admins can create default settings.');
      clearMessagesAfter();
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.post('/settings/create_defaults/');
      setSuccessMessage('Default settings created.');
      await loadSettingsFromServer();
    } catch (err) {
      const parsed = err?.response?.data || err?.message || 'Create defaults failed';
      setErrorMessage(parsed?.detail || 'Create defaults endpoint not available.');
    } finally {
      clearMessagesAfter();
      setIsSaving(false);
    }
  };

  const renderSettingInput = (s, category) => {
    const type = s.inferredType;
    const value = s.editValue ?? '';
    const disabled = !isAdmin;
    const modified = (originalValues[s.key] ?? '') !== (s.editValue ?? '');

    const commonProps = {
      className: `ss-input ${modified ? 'ss-modified' : ''}`,
      disabled,
    };

    if (type === 'boolean') {
      const checked = value === 'true' || value === true;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="ss-switch">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => handleLocalChange(category, s.key, e.target.checked ? 'true' : 'false')}
              disabled={disabled}
            />
            <span className="ss-slider" />
          </label>
          {modified && <span className="ss-modified-pill">edited</span>}
        </div>
      );
    }
    if (type === 'number') {
      return (
        <>
          <input type="number" value={value} onChange={(e) => handleLocalChange(category, s.key, e.target.value)} {...commonProps} />
          {fieldErrors[s.key] && <div className="ss-field-error">{fieldErrors[s.key]}</div>}
        </>
      );
    }
    if (type === 'password') {
      return (
        <>
          <input type="password" value={value} onChange={(e) => handleLocalChange(category, s.key, e.target.value)} {...commonProps} />
          {fieldErrors[s.key] && <div className="ss-field-error">{fieldErrors[s.key]}</div>}
        </>
      );
    }
    return (
      <>
        <input type="text" value={value} onChange={(e) => handleLocalChange(category, s.key, e.target.value)} {...commonProps} />
        {fieldErrors[s.key] && <div className="ss-field-error">{fieldErrors[s.key]}</div>}
      </>
    );
  };

  const tabLists = groups;

  return (
    <div className="admin-page ss-container">
      <div className="ss-header">
        <h2>System Settings</h2>
        <p>Configure application-wide settings and preferences</p>
      </div>

      <div className="ss-actions">
        <button
          className="ss-btn ss-btn-primary"
          onClick={saveSettings}
          disabled={isSaving || !isAdmin || modifiedCount === 0}
          title={!isAdmin ? 'Saving disabled - admin only' : modifiedCount === 0 ? 'No changes to save' : 'Save all changes'}
        >
          <i className="fas fa-save" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>

        <button className="ss-btn ss-btn-secondary" onClick={discardChanges} disabled={modifiedCount === 0}>
          <i className="fas fa-ban" /> Discard Changes
        </button>

        <button className="ss-btn ss-btn-secondary" onClick={resetSettings} disabled={isLoading}>
          <i className="fas fa-undo" /> Reset / Reload
        </button>

        {settingsRaw.length === 0 && isAdmin && (
          <button className="ss-btn ss-btn-primary" style={{ marginLeft: 8 }} onClick={createDefaults} disabled={isSaving}>
            <i className="fas fa-magic" /> Create Default Settings
          </button>
        )}

        <div style={{ marginLeft: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
          {modifiedCount > 0 && <div className="ss-unsaved-badge">{modifiedCount} unsaved</div>}
          {!isAdmin && checkingUser === false && <div style={{ fontSize: 13, color: '#666' }}>Saving disabled: admin only</div>}
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div style={{ marginTop: 12 }}>
          {successMessage && <div className="ss-success">{successMessage}</div>}
          {errorMessage && <div className="ss-error">{errorMessage}</div>}
        </div>
      )}

      <div className="ss-tabs">
        <div className="ss-tab-buttons">
          <button className={`ss-tab-btn ${activeTab === 'general' ? 'ss-active' : ''}`} onClick={() => setActiveTab('general')}>
            <i className="fas fa-cog" /> General
          </button>
          <button className={`ss-tab-btn ${activeTab === 'ai' ? 'ss-active' : ''}`} onClick={() => setActiveTab('ai')}>
            <i className="fas fa-robot" /> AI Settings
          </button>
          <button className={`ss-tab-btn ${activeTab === 'files' ? 'ss-active' : ''}`} onClick={() => setActiveTab('files')}>
            <i className="fas fa-file" /> File Settings
          </button>
          <button className={`ss-tab-btn ${activeTab === 'email' ? 'ss-active' : ''}`} onClick={() => setActiveTab('email')}>
            <i className="fas fa-envelope" /> Email Settings
          </button>
        </div>

        <div className="ss-tab-content">
          {isLoading ? (
            <div className="ss-loading">Loading settings…</div>
          ) : (tabLists[activeTab] || []).length === 0 ? (
            <div style={{ padding: 20, color: '#6b7b88' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>No settings found for this category.</p>
              {isAdmin ? (
                <p style={{ marginTop: 8 }}>Click "Create Default Settings" to populate recommended values.</p>
              ) : (
                <p style={{ marginTop: 8 }}>No settings are configured yet. Ask an admin to initialize settings.</p>
              )}
            </div>
          ) : (
            (tabLists[activeTab] || []).map((setting) => (
              <div key={setting.key} className="ss-setting-item">
                <div className="ss-setting-info">
                  <label className="ss-setting-label">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</label>
                  <p className="ss-setting-description">{setting.description}</p>
                </div>
                <div className="ss-setting-control">{renderSettingInput(setting, activeTab)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;