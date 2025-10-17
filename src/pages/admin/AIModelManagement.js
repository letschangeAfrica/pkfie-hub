import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import './AIModelManagement.css';

/**
 * AIModelManagement (final)
 *
 * - Uses existing users endpoint /api/users/profile/ to detect admin privileges (no backend changes).
 * - Controlled test input, field-level errors, client-side validation.
 * - Shows used_model and request latency after tests.
 */

const DEFAULT_OPENAI_MODEL = {
  id: null,
  name: 'OpenAI (default)',
  provider: 'OpenAI',
  version: 'gpt-3.5-turbo',
  is_active: true,
  config: {
    openai_model: 'gpt-3.5-turbo',
    temperature: 0.7,
    max_tokens: 150,
    top_p: 1.0,
  },
  created_at: null,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const AIModelManagement = () => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [stats, setStats] = useState(null);

  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [testResult, setTestResult] = useState(null);
  const [usedModelInfo, setUsedModelInfo] = useState(null);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Controlled test input
  const [testMessage, setTestMessage] = useState('Give me a short welcome message for new students.');

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Auth / permissions (use existing profile endpoint)
  const [isAdmin, setIsAdmin] = useState(false);
  const [, setCheckingUser] = useState(true); // keep setter, discard unused state variable

  // Confirm modals state
  const [confirmToggle, setConfirmToggle] = useState({ show: false, modelId: null });
  const [confirmReset, setConfirmReset] = useState({ show: false, modelId: null });

  useEffect(() => {
    // Detect admin via existing profile endpoint (no backend changes)
    let mounted = true;
    const fetchProfile = async () => {
      setCheckingUser(true);
      try {
        const res = await api.get('/users/profile/');
        if (!mounted) return;
        const me = res.data || {};
        const admin = !!me.is_staff || !!me.is_superuser || (me.role && (me.role.toLowerCase() === 'admin' || me.role.toLowerCase() === 'staff'));
        setIsAdmin(admin);
      } catch (err) {
        setIsAdmin(false);
      } finally {
        if (mounted) setCheckingUser(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    fetchModels();
    fetchStats();
    // eslint-disable-next-line
  }, []);

  const clearMessagesAfter = (ms = 4500) => {
    if (!ms) return;
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
      setFieldErrors({});
    }, ms);
  };

  const parseFieldErrors = (errData) => {
    const result = {};
    if (!errData) return result;
    if (typeof errData === 'string') {
      result.non_field_errors = errData;
      return result;
    }
    if (Array.isArray(errData)) {
      result.non_field_errors = errData.join(' ');
      return result;
    }
    Object.entries(errData).forEach(([k, v]) => {
      if (k === 'config' && typeof v === 'object') {
        result.config = {};
        Object.entries(v).forEach(([cfgKey, cfgVal]) => {
          if (Array.isArray(cfgVal)) result.config[cfgKey] = cfgVal.join(' ');
          else result.config[cfgKey] = String(cfgVal);
        });
      } else {
        if (Array.isArray(v)) result[k] = v.join(' ');
        else result[k] = String(v);
      }
    });
    return result;
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    setErrorMessage('');
    try {
      const res = await api.get('/models/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setModels(data);
      if (data.length > 0) {
        setSelectedModel(prev => (prev ? (data.find(m => m.id === prev.id) || data[0]) : data[0]));
      } else {
        setSelectedModel(DEFAULT_OPENAI_MODEL);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setModels([]);
      setSelectedModel(DEFAULT_OPENAI_MODEL);
      setErrorMessage('Failed to load AI models (showing default OpenAI configuration).');
      clearMessagesAfter();
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    setErrorMessage('');
    try {
      const res = await api.get('/chat/stats/');
      const s = res.data && res.data.stats ? res.data.stats : res.data;
      setStats(s);
    } catch (err) {
      console.error('Failed to load statistics.', err);
      setStats(null);
      setErrorMessage('Failed to load statistics.');
      clearMessagesAfter();
    } finally {
      setLoadingStats(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try { return new Date(dateString).toLocaleString(); } catch { return dateString; }
  };

  // Toggle active/inactive (only for persisted models)
  const handleToggleClick = (modelId) => {
    if (!isAdmin) {
      setErrorMessage('Only admins can change model activation.');
      clearMessagesAfter();
      return;
    }
    setConfirmToggle({ show: true, modelId });
  };

  const confirmToggleModel = async () => {
    const id = confirmToggle.modelId;
    setConfirmToggle({ show: false, modelId: null });
    const model = models.find(m => m.id === id);
    if (!model) {
      setErrorMessage('Model not found.');
      clearMessagesAfter();
      return;
    }

    const newState = !model.is_active;

    // optimistic update
    setModels(prev => prev.map(m => (m.id === id ? { ...m, is_active: newState } : m)));
    if (selectedModel?.id === id) setSelectedModel(prev => ({ ...prev, is_active: newState }));

    try {
      await api.patch(`/models/${id}/`, { is_active: newState });
      setSuccessMessage(`Model ${newState ? 'activated' : 'deactivated'}.`);
      clearMessagesAfter();
      fetchModels();
    } catch (err) {
      console.error('Failed to toggle model status', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      if (parsed && parsed.non_field_errors) setErrorMessage(parsed.non_field_errors);
      else setErrorMessage('Could not update model status.');
      setFieldErrors(parsed || {});
      clearMessagesAfter();
      // rollback
      setModels(prev => prev.map(m => (m.id === id ? { ...m, is_active: model.is_active } : m)));
      if (selectedModel?.id === id) setSelectedModel(model);
    }
  };

  // Local update of selected model config
  const updateModelConfigLocal = (modelId, key, value) => {
    if (key === 'temperature' || key === 'top_p') {
      value = Number(value);
      if (Number.isNaN(value)) value = 0;
      value = clamp(value, 0, 1);
    }
    if (key === 'max_tokens') {
      value = parseInt(value || 0, 10) || 0;
      if (value < 1) value = 1;
    }

    setFieldErrors(prev => {
      const next = { ...prev };
      if (next.config) next.config = { ...next.config, [key]: undefined };
      return next;
    });

    if (!modelId) {
      setSelectedModel(prev => ({ ...prev, config: { ...(prev.config || {}), [key]: value } }));
      return;
    }
    setModels(prev => prev.map(m => (m.id === modelId ? { ...m, config: { ...(m.config || {}), [key]: value } } : m)));
    if (selectedModel?.id === modelId) setSelectedModel(prev => ({ ...prev, config: { ...(prev.config || {}), [key]: value } }));
  };

  // Client-side validation before sending to server
  const validateConfig = (cfg) => {
    const errors = {};
    if (!cfg) return errors;
    const temp = cfg.temperature;
    const top_p = cfg.top_p;
    const max_tokens = cfg.max_tokens;
    if (typeof temp !== 'number' || temp < 0 || temp > 1) {
      errors.temperature = 'Temperature must be a number between 0 and 1.';
    }
    if (typeof top_p !== 'number' || top_p < 0 || top_p > 1) {
      errors.top_p = 'Top P must be a number between 0 and 1.';
    }
    if (!Number.isInteger(max_tokens) || max_tokens < 1 || max_tokens > 40000) {
      errors.max_tokens = 'Max tokens must be an integer between 1 and 40000.';
    }
    return errors;
  };

  // Save config: PATCH if model exists, POST if creating default on server
  const saveModelConfig = async (modelId) => {
    if (!isAdmin) {
      setErrorMessage('Only admins may save model configurations.');
      clearMessagesAfter();
      return;
    }

    const cfg = selectedModel?.config || {};
    const clientErrors = validateConfig(cfg);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors({ config: clientErrors });
      setErrorMessage('Please fix the highlighted configuration errors.');
      clearMessagesAfter();
      return;
    }

    // creating a persisted model if the selected is the default (id == null)
    if (!modelId) {
      const payload = {
        name: selectedModel.name || 'OpenAI',
        version: selectedModel.version || '',
        provider: selectedModel.provider || 'OpenAI',
        is_active: selectedModel.is_active ?? true,
        config: selectedModel.config || {},
      };
      setSaving(true);
      setFieldErrors({});
      try {
        await api.post('/models/', payload);
        setSuccessMessage('Model created on server and saved.');
        clearMessagesAfter();
        await fetchModels();
      } catch (err) {
        console.error('Failed to create model on server', err);
        const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
        setFieldErrors(parsed || {});
        setErrorMessage(parsed?.non_field_errors || 'Could not create model on server.');
        clearMessagesAfter();
      } finally {
        setSaving(false);
      }
      return;
    }

    const model = models.find(m => m.id === modelId);
    if (!model) {
      setErrorMessage('Model not found.');
      clearMessagesAfter();
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      await api.patch(`/models/${modelId}/`, { config: model.config });
      setSuccessMessage('Configuration saved.');
      clearMessagesAfter();
      fetchModels();
    } catch (err) {
      console.error('Failed to save model config', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      setFieldErrors(parsed || {});
      setErrorMessage(parsed?.non_field_errors || 'Failed to save configuration.');
      clearMessagesAfter();
    } finally {
      setSaving(false);
    }
  };

  // Reset config to server defaults (re-fetch single model)
  const handleResetClick = (modelId) => {
    if (!isAdmin && modelId) {
      setErrorMessage('Only admins may reset server-side configuration.');
      clearMessagesAfter();
      return;
    }
    setConfirmReset({ show: true, modelId });
  };

  const performResetConfirm = async () => {
    const id = confirmReset.modelId;
    setConfirmReset({ show: false, modelId: null });

    if (!id) {
      setSelectedModel(DEFAULT_OPENAI_MODEL);
      setSuccessMessage('Local configuration reset to default OpenAI settings.');
      clearMessagesAfter();
      return;
    }

    try {
      const res = await api.get(`/models/${id}/`);
      const serverModel = res.data;
      setModels(prev => (prev || []).map(m => (m.id === id ? serverModel : m)));
      if (selectedModel?.id === id) setSelectedModel(serverModel);
      setSuccessMessage('Configuration reset to server defaults.');
      clearMessagesAfter();
    } catch (err) {
      console.error('Reset failed', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      setFieldErrors(parsed || {});
      setErrorMessage(parsed?.non_field_errors || 'Could not reset to defaults.');
      clearMessagesAfter();
    }
  };

  // Test model by sending message to /api/chat/ai/ with model_id (or null for default)
  const testModel = async (message) => {
    if (!selectedModel) {
      setErrorMessage('Select a model first.');
      clearMessagesAfter();
      return;
    }
    if (!message || !message.trim()) {
      setErrorMessage('Enter a test message.');
      clearMessagesAfter();
      return;
    }

    setTesting(true);
    setTestResult(null);
    setUsedModelInfo(null);
    setLastLatencyMs(null);
    setErrorMessage('');
    try {
      const payload = { message, model_id: selectedModel.id ?? null };
      const t0 = performance.now();
      const res = await api.post('/chat/ai/', payload);
      const t1 = performance.now();
      setLastLatencyMs(Math.round(t1 - t0));

      const aiMessage = res.data.ai_message || res.data;
      setTestResult(aiMessage);

      // backend may return used_model id
      const usedId = res.data.used_model ?? null;
      if (usedId) {
        const cached = models.find(m => m.id === usedId);
        if (cached) setUsedModelInfo({ id: usedId, name: `${cached.provider} · ${cached.name}` });
        else {
          try {
            const mres = await api.get(`/models/${usedId}/`);
            const m = mres.data;
            setUsedModelInfo({ id: usedId, name: `${m.provider} · ${m.name}` });
          } catch {
            setUsedModelInfo({ id: usedId, name: `Model ${usedId}` });
          }
        }
      } else {
        setUsedModelInfo({ id: null, name: 'OpenAI (server default)' });
      }

      setSuccessMessage('Test completed.');
      clearMessagesAfter();
      fetchStats();
    } catch (err) {
      console.error('Test failed', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      setFieldErrors(parsed || {});
      setErrorMessage(parsed?.non_field_errors || err?.response?.data?.error || 'Test failed. See server logs.');
      clearMessagesAfter();
    } finally {
      setTesting(false);
    }
  };

  // Decide models list to render: server models if any, otherwise a visible default
  const modelsToRender = models.length > 0 ? models : [DEFAULT_OPENAI_MODEL];

  // computed: are save/toggle actions allowed for current selection?
  const canSave = useMemo(() => isAdmin, [isAdmin]);
  const canToggle = useMemo(() => isAdmin, [isAdmin]);

  return (
    <div className="aim-container">
      {/* Inline messages */}
      {successMessage && (
        <div className="aim-success">
          <i className="fas fa-check-circle" /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="aim-error-banner">
          <i className="fas fa-exclamation-circle" /> {errorMessage}
        </div>
      )}

      <div className="aim-header">
        <h2>AI Model Management</h2>
        <p>Configure and monitor your AI assistant's performance</p>
      </div>

      <div className="aim-content">
        {/* Models column */}
        <div className="aim-card aim-models">
          <h3>Available Models</h3>

          {loadingModels ? (
            <div className="aim-loading">Loading models...</div>
          ) : modelsToRender.length === 0 ? (
            <div className="aim-empty">No models available</div>
          ) : (
            <div className="aim-models-list">
              {modelsToRender.map((model) => (
                <div
                  key={model.id ?? 'openai-default'}
                  role="button"
                  tabIndex={0}
                  className={`aim-model-item ${model.is_active ? 'aim-active' : 'aim-inactive'} ${selectedModel?.id === model.id ? 'aim-selected' : ''}`}
                  onClick={() => setSelectedModel(model)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedModel(model)}
                >
                  <div className="aim-model-header">
                    <h4>
                      {model.provider} · {model.name}
                      {model.version ? <small style={{ fontWeight: 400, color: '#6b7b88', marginLeft: 6 }}>v{model.version}</small> : null}
                    </h4>
                    <span className={`aim-status aim-status-${model.is_active ? 'active' : 'inactive'}`}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="aim-model-details">
                    <p><strong>Created:</strong> {formatDate(model.created_at || model.lastUpdated)}</p>
                  </div>

                  <div className="aim-model-actions">
                    <button
                      className={`aim-btn aim-btn-sm ${model.is_active ? 'aim-btn-warning' : 'aim-btn-success'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (model.id) {
                          if (!canToggle) {
                            setErrorMessage('Only admins can activate/deactivate models.');
                            clearMessagesAfter();
                            return;
                          }
                          handleToggleClick(model.id);
                        } else {
                          setErrorMessage('Cannot toggle the default model. Create it on server to manage activation.');
                          clearMessagesAfter();
                        }
                      }}
                      title={!canToggle ? 'Admin only' : undefined}
                      disabled={!canToggle}
                    >
                      {model.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="aim-card aim-detail">
          {selectedModel ? (
            <>
              <h3>Model Configuration: {selectedModel.provider} · {selectedModel.name}</h3>

              <div className="aim-config-section">
                <h4>Parameters</h4>
                <div className="aim-config-params">
                  <div className="aim-param">
                    <label>Temperature</label>
                    <div className="aim-param-controls">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={(selectedModel.config && selectedModel.config.temperature) ?? 0.7}
                        onChange={(e) => updateModelConfigLocal(selectedModel.id, 'temperature', parseFloat(e.target.value))}
                      />
                      <span>{(((selectedModel.config && selectedModel.config.temperature) ?? 0.7)).toFixed(2)}</span>
                    </div>
                    {fieldErrors?.config?.temperature && <div className="aim-field-error">{fieldErrors.config.temperature}</div>}
                    <p className="aim-param-help">Controls randomness: lower = deterministic, higher = creative</p>
                  </div>

                  <div className="aim-param">
                    <label>Max Tokens</label>
                    <div className="aim-param-controls">
                      <input
                        type="number"
                        min="64"
                        max="40000"
                        step="1"
                        value={(selectedModel.config && selectedModel.config.max_tokens) ?? 1000}
                        onChange={(e) => updateModelConfigLocal(selectedModel.id, 'max_tokens', parseInt(e.target.value || '0'))}
                      />
                    </div>
                    {fieldErrors?.config?.max_tokens && <div className="aim-field-error">{fieldErrors.config.max_tokens}</div>}
                    <p className="aim-param-help">Maximum length of the model response.</p>
                  </div>

                  <div className="aim-param">
                    <label>Top P</label>
                    <div className="aim-param-controls">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={(selectedModel.config && selectedModel.config.top_p) ?? 1.0}
                        onChange={(e) => updateModelConfigLocal(selectedModel.id, 'top_p', parseFloat(e.target.value))}
                      />
                      <span>{(((selectedModel.config && selectedModel.config.top_p) ?? 1.0)).toFixed(2)}</span>
                    </div>
                    {fieldErrors?.config?.top_p && <div className="aim-field-error">{fieldErrors.config.top_p}</div>}
                    <p className="aim-param-help">Nucleus sampling. Lower = more focused outputs.</p>
                  </div>
                </div>
              </div>

              <div className="aim-action-buttons">
                <button
                  className="aim-btn aim-btn-primary"
                  disabled={saving || !canSave}
                  onClick={() => saveModelConfig(selectedModel.id)}
                  title={!canSave ? 'Save disabled - admin only' : undefined}
                >
                  {saving ? 'Saving...' : <><i className="fas fa-save" /> Save Changes</>}
                </button>

                <div className="aim-test-control">
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test prompt..."
                    rows={2}
                  />
                  <button
                    className="aim-btn aim-btn-info"
                    disabled={testing}
                    onClick={() => testModel(testMessage)}
                    title="Send a test prompt to the model"
                  >
                    {testing ? 'Testing...' : <><i className="fas fa-play" /> Test Model</>}
                  </button>
                </div>

                <button
                  className="aim-btn aim-btn-secondary"
                  onClick={() => handleResetClick(selectedModel.id)}
                  title={!isAdmin && selectedModel?.id ? 'Admin only' : undefined}
                  disabled={selectedModel?.id ? !isAdmin : false}
                >
                  <i className="fas fa-undo" /> Reset to Defaults
                </button>
              </div>

              {testResult && (
                <div className="aim-test-result" style={{ marginTop: 12 }}>
                  <h4>Last Test Result</h4>
                  <div className="aim-response">
                    <div className="aim-response-header">
                      <div>
                        <strong>Assistant</strong>
                        {usedModelInfo && <span style={{ marginLeft: 12, color: '#345' }}>Used model: {usedModelInfo.name} {usedModelInfo.id !== null ? `(id:${usedModelInfo.id})` : '(server default)'}</span>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {lastLatencyMs !== null && <div style={{ fontSize: 12, color: '#666' }}>Latency: {lastLatencyMs} ms</div>}
                        <div style={{ fontSize: 12, color: '#666' }}>{formatDate(testResult.created_at)}</div>
                      </div>
                    </div>
                    <div className="aim-response-body">
                      {testResult.message_text || testResult.ai_message || JSON.stringify(testResult)}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="aim-no-selection">
              <i className="fas fa-robot" />
              <p>Select a model to view its configuration</p>
            </div>
          )}
        </div>

        {/* Stats column */}
        <div className="aim-card aim-stats">
          <h3>AI Performance Statistics</h3>

          {loadingStats ? (
            <div className="aim-loading">Loading stats...</div>
          ) : stats ? (
            <>
              <div className="aim-stats-grid">
                <div className="aim-stat-card">
                  <div className="aim-stat-icon"><i className="fas fa-comments" /></div>
                  <div className="aim-stat-info">
                    <h3>{(stats.total_messages ?? 0).toLocaleString()}</h3>
                    <p>Total Messages</p>
                  </div>
                </div>

                <div className="aim-stat-card">
                  <div className="aim-stat-icon"><i className="fas fa-clock" /></div>
                  <div className="aim-stat-info">
                    <h3>{(stats.average_response_time ?? '-')}</h3>
                    <p>Avg Response Time (s)</p>
                  </div>
                </div>

                <div className="aim-stat-card">
                  <div className="aim-stat-icon"><i className="fas fa-star" /></div>
                  <div className="aim-stat-info">
                    <h3>{(stats.user_satisfaction_rate ?? '-')}</h3>
                    <p>User Satisfaction</p>
                  </div>
                </div>
              </div>

              <div className="aim-common-questions">
                <h4>Most Common Questions</h4>
                <div className="aim-questions-list">
                  {(stats.common_questions || []).map((q, i) => (
                    <div key={i} className="aim-question-item">
                      <span className="aim-question-text">{q.message_text ?? q.question ?? q.text ?? '—'}</span>
                      <span className="aim-question-count">{q.count ?? q.hits ?? '—'} times</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="aim-empty">No stats available</div>
          )}
        </div>
      </div>

      {/* Confirm Toggle Modal */}
      {confirmToggle.show && (
        <div className="aim-modal-overlay">
          <div className="aim-modal am-confirm-modal">
            <h3>Confirm</h3>
            <p>Are you sure you want to change activation for this model?</p>
            <div className="am-modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="aim-btn aim-btn-secondary" onClick={() => setConfirmToggle({ show: false, modelId: null })}>
                Cancel
              </button>
              <button className="aim-btn aim-btn-warning" onClick={confirmToggleModel}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {confirmReset.show && (
        <div className="aim-modal-overlay">
          <div className="aim-modal am-confirm-modal">
            <h3>Reset Configuration</h3>
            <p>Reset this model's configuration to server defaults?</p>
            <div className="am-modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="aim-btn aim-btn-secondary" onClick={() => setConfirmReset({ show: false, modelId: null })}>
                Cancel
              </button>
              <button className="aim-btn aim-btn-warning" onClick={performResetConfirm}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIModelManagement;