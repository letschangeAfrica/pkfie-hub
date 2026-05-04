import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  FiCpu, FiSave, FiPlay, FiRefreshCw,
  FiMessageSquare, FiClock, FiStar, FiCopy,
} from 'react-icons/fi';

const DEFAULT_MODEL = {
  id: null,
  name: 'OpenAI (default)',
  provider: 'OpenAI',
  version: 'gpt-3.5-turbo',
  is_active: true,
  config: { openai_model: 'gpt-3.5-turbo', temperature: 0.7, max_tokens: 150, top_p: 1.0 },
  created_at: null,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const parseFieldErrors = (errData) => {
  const out = {};
  if (!errData) return out;
  if (typeof errData === 'string') return { non_field_errors: errData };
  if (Array.isArray(errData))      return { non_field_errors: errData.join(' ') };
  Object.entries(errData).forEach(([k, v]) => {
    if (k === 'config' && typeof v === 'object') {
      out.config = {};
      Object.entries(v).forEach(([ck, cv]) => { out.config[ck] = [].concat(cv).join(' '); });
    } else {
      out[k] = [].concat(v).join(' ');
    }
  });
  return out;
};

function ModalOverlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function Sk({ className = '' }) {
  return <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />;
}

export default function AIModelManagement() {
  const [models,         setModels]         = useState([]);
  const [selectedModel,  setSelectedModel]  = useState(null);
  const [stats,          setStats]          = useState(null);
  const [loadingModels,  setLoadingModels]  = useState(false);
  const [loadingStats,   setLoadingStats]   = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [testing,        setTesting]        = useState(false);
  const [testResult,     setTestResult]     = useState(null);
  const [usedModelInfo,  setUsedModelInfo]  = useState(null);
  const [latencyMs,      setLatencyMs]      = useState(null);
  const [successMsg,     setSuccessMsg]     = useState('');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [testMessage,    setTestMessage]    = useState('Give me a short welcome message for new students.');
  const [fieldErrors,    setFieldErrors]    = useState({});
  const [confirmToggle,  setConfirmToggle]  = useState({ show: false, id: null });
  const [confirmReset,   setConfirmReset]   = useState({ show: false, id: null });
  const toastTimer = useRef(null);

  const clearAfter = (ms = 4500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setSuccessMsg(''); setErrorMsg(''); setFieldErrors({});
    }, ms);
  };

  const toast = (msg, isError = false) => {
    if (isError) setErrorMsg(msg); else setSuccessMsg(msg);
    clearAfter();
  };

  useEffect(() => {
    fetchModels();
    fetchStats();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const res  = await api.get('/models/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setModels(data);
      setSelectedModel(prev =>
        data.length > 0
          ? (prev ? (data.find(m => m.id === prev.id) || data[0]) : data[0])
          : DEFAULT_MODEL
      );
    } catch {
      setModels([]);
      setSelectedModel(DEFAULT_MODEL);
      toast('Failed to load AI models (showing default OpenAI configuration).', true);
    } finally { setLoadingModels(false); }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/chat/stats/');
      setStats(res.data?.stats ?? res.data);
    } catch {
      setStats(null);
    } finally { setLoadingStats(false); }
  };

  const formatDate = (s) => { try { return s ? new Date(s).toLocaleString() : '—'; } catch { return s; } };

  const updateConfig = (modelId, key, rawVal) => {
    let val = rawVal;
    if (key === 'temperature' || key === 'top_p') {
      val = clamp(isNaN(Number(val)) ? 0 : Number(val), 0, 1);
    }
    if (key === 'max_tokens') {
      val = Math.max(1, parseInt(val || 0, 10) || 1);
    }
    setFieldErrors(prev => ({ ...prev, config: { ...(prev.config || {}), [key]: undefined } }));
    if (!modelId) {
      setSelectedModel(prev => ({ ...prev, config: { ...(prev.config || {}), [key]: val } }));
      return;
    }
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, config: { ...(m.config || {}), [key]: val } } : m));
    if (selectedModel?.id === modelId)
      setSelectedModel(prev => ({ ...prev, config: { ...(prev.config || {}), [key]: val } }));
  };

  const validateConfig = (cfg) => {
    const e = {};
    if (!cfg) return e;
    if (typeof cfg.temperature !== 'number' || cfg.temperature < 0 || cfg.temperature > 1)
      e.temperature = 'Must be between 0 and 1.';
    if (typeof cfg.top_p !== 'number' || cfg.top_p < 0 || cfg.top_p > 1)
      e.top_p = 'Must be between 0 and 1.';
    if (!Number.isInteger(cfg.max_tokens) || cfg.max_tokens < 1 || cfg.max_tokens > 40000)
      e.max_tokens = 'Integer between 1 and 40000.';
    return e;
  };

  const saveConfig = async (modelId) => {
    const cfg = selectedModel?.config || {};
    const cfgErrors = validateConfig(cfg);
    if (Object.keys(cfgErrors).length) {
      setFieldErrors({ config: cfgErrors });
      toast('Fix the highlighted configuration errors.', true);
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      if (!modelId) {
        await api.post('/models/', {
          name: selectedModel.name || 'OpenAI',
          version: selectedModel.version || '',
          provider: selectedModel.provider || 'OpenAI',
          is_active: selectedModel.is_active ?? true,
          config: cfg,
        });
        toast('Model created on server.');
        await fetchModels();
      } else {
        const model = models.find(m => m.id === modelId);
        await api.patch(`/models/${modelId}/`, { config: model?.config });
        toast('Configuration saved.');
        fetchModels();
      }
    } catch (err) {
      const parsed = parseFieldErrors(err?.response?.data);
      setFieldErrors(parsed);
      toast(parsed.non_field_errors || 'Failed to save configuration.', true);
    } finally { setSaving(false); }
  };

  const handleToggleClick = (id) => {
    setConfirmToggle({ show: true, id });
  };

  const confirmToggleModel = async () => {
    const id = confirmToggle.id;
    setConfirmToggle({ show: false, id: null });
    const model = models.find(m => m.id === id);
    if (!model) { toast('Model not found.', true); return; }
    const newState = !model.is_active;
    setModels(prev => prev.map(m => m.id === id ? { ...m, is_active: newState } : m));
    if (selectedModel?.id === id) setSelectedModel(prev => ({ ...prev, is_active: newState }));
    try {
      await api.patch(`/models/${id}/`, { is_active: newState });
      toast(`Model ${newState ? 'activated' : 'deactivated'}.`);
      fetchModels();
    } catch (err) {
      const parsed = parseFieldErrors(err?.response?.data);
      toast(parsed.non_field_errors || 'Could not update model status.', true);
      setModels(prev => prev.map(m => m.id === id ? { ...m, is_active: model.is_active } : m));
      if (selectedModel?.id === id) setSelectedModel(model);
    }
  };

  const handleResetClick = (id) => {
    setConfirmReset({ show: true, id });
  };

  const handleConfirmReset = async () => {
    const id = confirmReset.id;
    setConfirmReset({ show: false, id: null });
    if (!id) {
      setSelectedModel(DEFAULT_MODEL);
      toast('Local configuration reset to default OpenAI settings.');
      return;
    }
    try {
      const res = await api.get(`/models/${id}/`);
      setModels(prev => prev.map(m => m.id === id ? res.data : m));
      if (selectedModel?.id === id) setSelectedModel(res.data);
      toast('Configuration reset to server defaults.');
    } catch (err) {
      const parsed = parseFieldErrors(err?.response?.data);
      toast(parsed.non_field_errors || 'Could not reset to defaults.', true);
    }
  };

  const testModel = async () => {
    if (!selectedModel)       { toast('Select a model first.', true); return; }
    if (!testMessage.trim())  { toast('Enter a test message.', true); return; }
    setTesting(true);
    setTestResult(null);
    setUsedModelInfo(null);
    setLatencyMs(null);
    setErrorMsg('');
    try {
      const t0  = performance.now();
      const res = await api.post('/chat/ai/', { message: testMessage, model_id: selectedModel.id ?? null });
      setLatencyMs(Math.round(performance.now() - t0));
      setTestResult(res.data.ai_message || res.data);
      const usedId = res.data.used_model ?? null;
      if (usedId) {
        const cached = models.find(m => m.id === usedId);
        if (cached) {
          setUsedModelInfo({ id: usedId, name: `${cached.provider} · ${cached.name}` });
        } else {
          try {
            const mres = await api.get(`/models/${usedId}/`);
            setUsedModelInfo({ id: usedId, name: `${mres.data.provider} · ${mres.data.name}` });
          } catch { setUsedModelInfo({ id: usedId, name: `Model ${usedId}` }); }
        }
      } else {
        setUsedModelInfo({ id: null, name: 'OpenAI (server default)' });
      }
      toast('Test completed.');
      fetchStats();
    } catch (err) {
      const parsed = parseFieldErrors(err?.response?.data);
      toast(parsed.non_field_errors || err?.response?.data?.error || 'Test failed.', true);
    } finally { setTesting(false); }
  };

  const modelsToRender = models.length > 0 ? models : [DEFAULT_MODEL];
  const cfg = selectedModel?.config || {};

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">AI Model Management</h1>
        <p className="text-sm text-navy-400 mt-1">Configure and monitor your AI assistant's performance</p>
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

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Models list */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiCpu size={14} className="text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black text-white">Available Models</h2>
          </div>

          <div className="p-3 space-y-2">
            {loadingModels ? (
              [...Array(3)].map((_, i) => <Sk key={i} className="h-20" />)
            ) : modelsToRender.map(model => (
              <button
                key={model.id ?? 'openai-default'}
                onClick={() => setSelectedModel(model)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all
                  ${selectedModel?.id === model.id
                    ? 'border-gold/40 bg-gold/5'
                    : 'border-navy-700/40 hover:border-navy-600/60 bg-navy-900/40'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-white leading-snug">
                    {model.provider} · {model.name}
                    {model.version && <span className="text-navy-500 font-normal text-xs ml-1">v{model.version}</span>}
                  </p>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase
                    ${model.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {model.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-navy-500">{formatDate(model.created_at)}</p>
                <div className="mt-2.5">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      model.id
                        ? handleToggleClick(model.id)
                        : toast('Cannot toggle default model. Create it on server first.', true);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-colors
                      ${model.is_active
                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                  >
                    {model.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Config + test panel */}
        <div className="lg:col-span-1 bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiCpu size={14} className="text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black text-white truncate">
              {selectedModel ? `${selectedModel.provider} · ${selectedModel.name}` : 'Model Configuration'}
            </h2>
          </div>

          {!selectedModel ? (
            <div className="py-20 text-center px-5">
              <FiCpu size={28} className="text-navy-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-navy-400 text-sm">Select a model to view its configuration</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Anthropic model selector */}
              {selectedModel.provider?.toLowerCase() === 'anthropic' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wide text-navy-400 mb-1.5">Claude Model</label>
                  <select
                    value={cfg.anthropic_model || 'claude-sonnet-4-6'}
                    onChange={e => updateConfig(selectedModel.id, 'anthropic_model', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
                      text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  >
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — fast &amp; lightweight</option>
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6 — balanced (recommended)</option>
                    <option value="claude-opus-4-7">Claude Opus 4.7 — most capable</option>
                  </select>
                  <p className="text-[11px] text-navy-600 mt-1">Specific Claude model variant to use for requests.</p>
                </div>
              )}

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wide text-navy-400">Temperature</label>
                  <span className="text-sm font-black text-gold tabular-nums">{(cfg.temperature ?? 0.7).toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={cfg.temperature ?? 0.7}
                  onChange={e => updateConfig(selectedModel.id, 'temperature', parseFloat(e.target.value))}
                  className="w-full accent-gold"
                />
                {fieldErrors?.config?.temperature && (
                  <p className="text-xs text-red-400 mt-1">{fieldErrors.config.temperature}</p>
                )}
                <p className="text-[11px] text-navy-600 mt-1">Controls randomness: lower = deterministic, higher = creative</p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-navy-400 mb-1.5">Max Tokens</label>
                <input
                  type="number" min="64" max="40000"
                  value={cfg.max_tokens ?? 1000}
                  onChange={e => updateConfig(selectedModel.id, 'max_tokens', parseInt(e.target.value || '0'))}
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
                    text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                />
                {fieldErrors?.config?.max_tokens && (
                  <p className="text-xs text-red-400 mt-1">{fieldErrors.config.max_tokens}</p>
                )}
                <p className="text-[11px] text-navy-600 mt-1">Maximum length of the model response.</p>
              </div>

              {/* Top P */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wide text-navy-400">Top P</label>
                  <span className="text-sm font-black text-gold tabular-nums">{(cfg.top_p ?? 1.0).toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={cfg.top_p ?? 1.0}
                  onChange={e => updateConfig(selectedModel.id, 'top_p', parseFloat(e.target.value))}
                  className="w-full accent-gold"
                />
                {fieldErrors?.config?.top_p && (
                  <p className="text-xs text-red-400 mt-1">{fieldErrors.config.top_p}</p>
                )}
                <p className="text-[11px] text-navy-600 mt-1">Nucleus sampling. Lower = more focused outputs.</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => saveConfig(selectedModel.id)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-navy-900
                    disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                >
                  <FiSave size={13} aria-hidden="true" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => handleResetClick(selectedModel.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-navy-300
                    bg-navy-700/60 hover:bg-navy-700 border border-navy-700/40
                    disabled:opacity-40 transition-colors"
                >
                  <FiRefreshCw size={13} aria-hidden="true" />
                  Reset
                </button>
              </div>

              {/* Test panel */}
              <div className="pt-2 border-t border-navy-700/40">
                <p className="text-xs font-black uppercase tracking-wide text-navy-400 mb-2">Test Model</p>
                <textarea
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  rows={3}
                  placeholder="Enter test prompt…"
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-700/60
                    text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50
                    resize-none transition-colors mb-2"
                />
                <button
                  onClick={testModel}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-navy-300
                    bg-navy-700/60 hover:bg-navy-700 border border-navy-700/40
                    disabled:opacity-40 transition-colors"
                >
                  <FiPlay size={13} aria-hidden="true" />
                  {testing ? 'Testing…' : 'Test Model'}
                </button>
              </div>

              {/* Test result */}
              {testResult && (() => {
                const resultText = typeof testResult === 'string'
                  ? testResult
                  : (testResult.message_text || testResult.ai_message || testResult.text || 'No text in response.');
                return (
                  <div className="px-4 py-4 rounded-xl bg-navy-700/40 border border-navy-700/40 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-wide text-navy-400">Last Test Result</p>
                      <div className="flex items-center gap-2">
                        {latencyMs !== null && (
                          <span className="text-[11px] text-navy-500">{latencyMs} ms</span>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(resultText)}
                          title="Copy result"
                          className="p-1 rounded-lg hover:bg-navy-600/60 text-navy-500 hover:text-navy-300 transition-colors"
                        >
                          <FiCopy size={12} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {usedModelInfo && (
                      <p className="text-[11px] text-navy-500">
                        Used: {usedModelInfo.name}{usedModelInfo.id !== null ? ` (id:${usedModelInfo.id})` : ''}
                      </p>
                    )}
                    <p className="text-sm text-navy-200 leading-relaxed whitespace-pre-wrap">{resultText}</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiMessageSquare size={14} className="text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black text-white">AI Performance Stats</h2>
          </div>

          <div className="p-5">
            {loadingStats ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Sk key={i} className="h-16" />)}
              </div>
            ) : !stats ? (
              <div className="py-10 text-center text-sm text-navy-500">No stats available</div>
            ) : (
              <div className="space-y-4">
                {/* Stat cards */}
                <div className="space-y-3">
                  {[
                    { icon: FiMessageSquare, label: 'Total Messages',    value: (stats.total_messages ?? 0).toLocaleString(),          color: 'bg-sky-500/20 text-sky-400'     },
                    { icon: FiClock,         label: 'Avg Response Time', value: `${stats.average_response_time ?? '—'} s`,             color: 'bg-amber-500/20 text-amber-400' },
                    { icon: FiStar,          label: 'User Satisfaction', value: stats.user_satisfaction_rate ?? '—',                    color: 'bg-emerald-500/20 text-emerald-400' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-navy-700/40">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color.split(' ')[0]}`}>
                        <Icon size={16} aria-hidden="true" className={color.split(' ')[1]} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white tabular-nums">{value}</p>
                        <p className="text-xs text-navy-500">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Common questions */}
                {stats.common_questions?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-navy-500 mb-3">
                      Most Common Questions
                    </p>
                    <div className="space-y-2">
                      {stats.common_questions.map((q, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-navy-700/30">
                          <p className="text-xs text-navy-300 leading-relaxed line-clamp-2">
                            {q.message_text ?? q.question ?? q.text ?? '—'}
                          </p>
                          <span className="flex-shrink-0 text-[11px] font-black text-navy-500">
                            {q.count ?? q.hits ?? '—'}×
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Toggle Modal */}
      {confirmToggle.show && (
        <ModalOverlay onClose={() => setConfirmToggle({ show: false, id: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Change Model Activation</h3>
            <p className="text-sm text-navy-400 mb-6">Are you sure you want to change the activation status of this model?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmToggle({ show: false, id: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={confirmToggleModel}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Confirm Reset Modal */}
      {confirmReset.show && (
        <ModalOverlay onClose={() => setConfirmReset({ show: false, id: null })}>
          <div className="bg-navy-800 rounded-2xl border border-navy-700/40 p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-white mb-2">Reset Configuration</h3>
            <p className="text-sm text-navy-400 mb-6">Reset this model's configuration to server defaults?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmReset({ show: false, id: null })}
                className="px-4 py-2 rounded-xl text-sm font-bold text-navy-300 bg-navy-700/60 hover:bg-navy-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors">
                Reset
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
