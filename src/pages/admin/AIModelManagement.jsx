import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../../services/api';
import {
  FiCheckCircle,
  FiMessageCircle,
  FiAlertCircle,
  FiSave,
  FiPlay,
  FiRefreshCw,
  FiCheck,
  FiClock,
  FiStar,
  FiRotateCcw,
  FiCpu,
  FiX,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiZap,
  FiActivity
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';

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

// API endpoints - CORRECTED for your Django URL structure
const API_ENDPOINTS = {
  MODELS: 'chat/models/',        // This becomes /api/chat/models/
  CHAT_AI: 'chat/ai/',           // This becomes /api/chat/ai/  
  CHAT_STATS: 'chat/stats/',     // This becomes /api/chat/stats/
  USER_PROFILE: 'users/profile/' // This becomes /api/users/profile/
};

// Safe API path builder
const buildPath = (p) => {
  const base = api.defaults?.baseURL ?? '/api';
  return `${base.replace(/\/$/, '')}/${p.replace(/^\/+/, '')}`;
};

export default function AIModelManagement() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [stats, setStats] = useState(null);

  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [togglingModelId, setTogglingModelId] = useState(null);
  const [resettingModelId, setResettingModelId] = useState(null);

  const [testResult, setTestResult] = useState(null);
  const [usedModelInfo, setUsedModelInfo] = useState(null);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [testMessage, setTestMessage] = useState('Give me a short welcome message for new students.');
  const [fieldErrors, setFieldErrors] = useState({});

  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  const [confirmToggle, setConfirmToggle] = useState({ show: false, modelId: null, modelName: '', currentStatus: '' });
  const [confirmReset, setConfirmReset] = useState({ show: false, modelId: null, modelName: '' });

  // Toast notification
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Refs for modal focus management
  const toggleModalRef = useRef(null);
  const resetModalRef = useRef(null);

  // Centralized config access
  const cfg = selectedModel?.config ?? {};

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

  // Escape key handler for modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (confirmToggle.show) {
          setConfirmToggle({ show: false, modelId: null, modelName: '', currentStatus: '' });
        }
        if (confirmReset.show) {
          setConfirmReset({ show: false, modelId: null, modelName: '' });
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [confirmToggle.show, confirmReset.show]);

  // Focus management for modals
  useEffect(() => {
    if (confirmToggle.show && toggleModalRef.current) {
      toggleModalRef.current.focus();
    }
  }, [confirmToggle.show]);

  useEffect(() => {
    if (confirmReset.show && resetModalRef.current) {
      resetModalRef.current.focus();
    }
  }, [confirmReset.show]);

  useEffect(() => {
    // Detect admin via existing profile endpoint
    let mounted = true;
    const fetchProfile = async () => {
      setIsCheckingUser(true);
      try {
        const res = await api.get(buildPath(API_ENDPOINTS.USER_PROFILE));
        if (!mounted) return;
        const me = res.data || {};
        const admin = !!me.is_staff || !!me.is_superuser || (me.role && (me.role.toLowerCase() === 'admin' || me.role.toLowerCase() === 'staff'));
        setIsAdmin(admin);
      } catch {
        setIsAdmin(false);
      } finally {
        if (mounted) setIsCheckingUser(false);
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

  const clearMessagesAfter = useCallback((ms = 4500) => {
    if (!ms) return;
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
      setFieldErrors({});
    }, ms);
  }, []);

  const parseFieldErrors = useCallback((errData) => {
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
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Parsed field errors:', result);
    }
    
    return result;
  }, []);

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setErrorMessage('');
    try {
      const res = await api.get(buildPath(API_ENDPOINTS.MODELS));
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setModels(data);
      if (data.length > 0) {
        setSelectedModel(prev => (prev ? (data.find(m => m.id === prev.id) || data[0]) : data[0]));
      } else {
        setSelectedModel(DEFAULT_OPENAI_MODEL);
      }
      setToast({ type: 'success', message: `Loaded ${data.length} models` });
    } catch (err) {
      console.error('Error fetching models:', err);
      setModels([]);
      setSelectedModel(DEFAULT_OPENAI_MODEL);
      setToast({ type: 'error', message: 'Failed to load AI models (showing default configuration)' });
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setErrorMessage('');
    try {
      const res = await api.get(buildPath(API_ENDPOINTS.CHAT_STATS));
      const s = res.data && res.data.stats ? res.data.stats : res.data;
      setStats(s);
    } catch (err) {
      console.error('Failed to load statistics.', err);
      setStats(null);
      setToast({ type: 'error', message: 'Failed to load statistics' });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '-';
    try { 
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }); 
    } catch { return dateString; }
  }, []);

  const handleToggleClick = useCallback((model) => {
    if (!isAdmin) {
      setToast({ type: 'error', message: 'Only admins can change model activation' });
      return;
    }
    setConfirmToggle({ 
      show: true, 
      modelId: model.id, 
      modelName: model.name,
      currentStatus: model.is_active 
    });
  }, [isAdmin]);

  const confirmToggleModel = useCallback(async () => {
    const { modelId, currentStatus } = confirmToggle;
    setTogglingModelId(modelId);
    
    const model = models.find(m => m.id === modelId);
    if (!model) {
      setToast({ type: 'error', message: 'Model not found' });
      setTogglingModelId(null);
      return;
    }

    const newState = !currentStatus;

    // optimistic update
    setModels(prev => prev.map(m => (m.id === modelId ? { ...m, is_active: newState } : m)));
    if (selectedModel?.id === modelId) setSelectedModel(prev => ({ ...prev, is_active: newState }));

    try {
      await api.patch(`${buildPath(API_ENDPOINTS.MODELS)}${modelId}/`, { is_active: newState });
      setToast({ type: 'success', message: `Model ${newState ? 'activated' : 'deactivated'} successfully` });
      await fetchModels(); // Wait for refresh to ensure consistency
    } catch (err) {
      console.error('Failed to toggle model status', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      const errorMsg = parsed?.non_field_errors || 'Could not update model status';
      setToast({ type: 'error', message: errorMsg });
      
      // Show detailed error for admins in development
      if (process.env.NODE_ENV === 'development' && isAdmin) {
        console.error('Detailed toggle error:', err.response?.data);
      }
      
      setFieldErrors(parsed || {});
      // rollback
      setModels(prev => prev.map(m => (m.id === modelId ? { ...m, is_active: model.is_active } : m)));
      if (selectedModel?.id === modelId) setSelectedModel(model);
    } finally {
      setTogglingModelId(null);
      setConfirmToggle({ show: false, modelId: null, modelName: '', currentStatus: '' });
    }
  }, [confirmToggle, models, selectedModel, fetchModels, parseFieldErrors, isAdmin]);

  const updateModelConfigLocal = useCallback((modelId, key, value) => {
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
      setSelectedModel(prev => ({ 
        ...(prev || DEFAULT_OPENAI_MODEL), 
        config: { ...(prev?.config || {}), [key]: value } 
      }));
      return;
    }
    setModels(prev => prev.map(m => (m.id === modelId ? { ...m, config: { ...(m.config || {}), [key]: value } } : m)));
    if (selectedModel?.id === modelId) setSelectedModel(prev => ({ 
      ...(prev || DEFAULT_OPENAI_MODEL), 
      config: { ...(prev?.config || {}), [key]: value } 
    }));
  }, [selectedModel]);

  const validateConfig = useCallback((cfg) => {
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
  }, []);

  const saveModelConfig = useCallback(async (modelId) => {
    if (!isAdmin) {
      setToast({ type: 'error', message: 'Only admins may save model configurations' });
      return;
    }

    const clientErrors = validateConfig(cfg);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors({ config: clientErrors });
      setToast({ type: 'error', message: 'Please fix the configuration errors' });
      return;
    }

    if (!modelId) {
      const payload = {
        name: selectedModel.name || 'OpenAI',
        version: selectedModel.version || '',
        provider: selectedModel.provider || 'OpenAI',
        is_active: selectedModel.is_active ?? true,
        config: cfg,
      };
      setSaving(true);
      setFieldErrors({});
      try {
        const response = await api.post(buildPath(API_ENDPOINTS.MODELS), payload);
        setToast({ type: 'success', message: 'Model created on server and saved' });
        await fetchModels();
        // Select the newly created model
        if (response.data && response.data.id) {
          const newModel = response.data;
          setSelectedModel(newModel);
        }
      } catch (err) {
        console.error('Failed to create model on server', err);
        const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
        setFieldErrors(parsed || {});
        setToast({ type: 'error', message: parsed?.non_field_errors || 'Could not create model on server' });
      } finally {
        setSaving(false);
      }
      return;
    }

    const model = models.find(m => m.id === modelId);
    if (!model) {
      setToast({ type: 'error', message: 'Model not found' });
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      await api.patch(`${buildPath(API_ENDPOINTS.MODELS)}${modelId}/`, { config: model.config });
      setToast({ type: 'success', message: 'Configuration saved successfully' });
      await fetchModels();
    } catch (err) {
      console.error('Failed to save model config', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      setFieldErrors(parsed || {});
      setToast({ type: 'error', message: parsed?.non_field_errors || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  }, [isAdmin, cfg, validateConfig, selectedModel, fetchModels, parseFieldErrors, models]);

  const handleResetClick = useCallback((model) => {
    if (!isAdmin && model.id) {
      setToast({ type: 'error', message: 'Only admins may reset server-side configuration' });
      return;
    }
    setConfirmReset({ 
      show: true, 
      modelId: model.id, 
      modelName: model.name 
    });
  }, [isAdmin]);

  const performResetConfirm = useCallback(async () => {
    const { modelId } = confirmReset;
    setResettingModelId(modelId);

    if (!modelId) {
      setSelectedModel(DEFAULT_OPENAI_MODEL);
      setToast({ type: 'success', message: 'Local configuration reset to default settings' });
      setResettingModelId(null);
      setConfirmReset({ show: false, modelId: null, modelName: '' });
      return;
    }

    try {
      const res = await api.get(`${buildPath(API_ENDPOINTS.MODELS)}${modelId}/`);
      const serverModel = res.data;
      setModels(prev => (prev || []).map(m => (m.id === modelId ? serverModel : m)));
      if (selectedModel?.id === modelId) setSelectedModel(serverModel);
      setToast({ type: 'success', message: 'Configuration reset to server defaults' });
    } catch (err) {
      console.error('Reset failed', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      setFieldErrors(parsed || {});
      setToast({ type: 'error', message: parsed?.non_field_errors || 'Could not reset to defaults' });
    } finally {
      setResettingModelId(null);
      setConfirmReset({ show: false, modelId: null, modelName: '' });
    }
  }, [confirmReset, selectedModel, parseFieldErrors]);

  const testModel = useCallback(async (message) => {
    if (!selectedModel) {
      setToast({ type: 'error', message: 'Select a model first' });
      return;
    }
    if (!message || !message.trim()) {
      setToast({ type: 'error', message: 'Enter a test message' });
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
      const res = await api.post(buildPath(API_ENDPOINTS.CHAT_AI), payload);
      const t1 = performance.now();
      setLastLatencyMs(Math.round(t1 - t0));

      const aiMessage = res.data.ai_message || res.data;
      setTestResult(aiMessage);

      // Show RAG sources if available
      if (res.data.sources && Array.isArray(res.data.sources)) {
        console.log('RAG Sources:', res.data.sources);
        // You can display these in the UI if needed
      }

      const usedId = res.data.used_model ?? null;
      if (usedId) {
        const cached = models.find(m => m.id === usedId);
        if (cached) setUsedModelInfo({ id: usedId, name: `${cached.provider} · ${cached.name}` });
        else {
          try {
            const mres = await api.get(`${buildPath(API_ENDPOINTS.MODELS)}${usedId}/`);
            const m = mres.data;
            setUsedModelInfo({ id: usedId, name: `${m.provider} · ${m.name}` });
          } catch {
            setUsedModelInfo({ id: usedId, name: `Model ${usedId}` });
          }
        }
      } else {
        setUsedModelInfo({ id: null, name: 'OpenAI (server default)' });
      }

      setToast({ type: 'success', message: 'Test completed successfully' });
      fetchStats();
    } catch (err) {
      console.error('Test failed', err);
      const parsed = err?.response?.data ? parseFieldErrors(err.response.data) : null;
      const errorMsg = parsed?.non_field_errors || err?.response?.data?.error || 'Test failed';
      
      // Show detailed error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Test error details:', err.response?.data);
      }
      
      setFieldErrors(parsed || {});
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setTesting(false);
    }
  }, [selectedModel, models, parseFieldErrors, fetchStats]);

  const modelsToRender = models.length > 0 ? models : [DEFAULT_OPENAI_MODEL];

  const canSave = useMemo(() => isAdmin, [isAdmin]);
  const canToggle = useMemo(() => isAdmin, [isAdmin]);

  // Stats calculation for cards
  const performanceStats = useMemo(() => ({
    totalMessages: stats?.total_messages ?? 0,
    avgResponseTime: stats?.average_response_time ?? '-',
    userSatisfaction: stats?.user_satisfaction_rate ?? '-',
    activeModels: models.filter(m => m.is_active).length,
  }), [stats, models]);

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
    .animate-fade-in-up { animation: fadeInUp 0.45s ease-out; }
    .animate-scale-in { animation: scaleIn 0.25s ease-out; }
  `;

  // Show loading state while checking user permissions
  if (isCheckingUser) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <FiRefreshCw className="w-8 h-8 mx-auto text-slate-400 animate-spin mb-3" />
          <div className="text-sm text-slate-500">Loading user permissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <style>{customStyles}</style>

      {/* Toast Notification */}
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <FaRobot className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">AI Model Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Configure and monitor your AI assistant's performance</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchModels(); fetchStats(); }}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh models and stats"
            aria-label="Refresh data"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Messages</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {performanceStats.totalMessages.toLocaleString()}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiMessageCircle className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Avg Response Time</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {performanceStats.avgResponseTime !== '-' ? `${performanceStats.avgResponseTime}s` : '-'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <FiClock className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">User Satisfaction</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {performanceStats.userSatisfaction !== '-' ? `${performanceStats.userSatisfaction}%` : '-'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiStar className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Active Models</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {performanceStats.activeModels}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FiCpu className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Models List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Available Models</h3>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {modelsToRender.length} models
              </span>
            </div>

            {loadingModels ? (
              <div className="text-center py-8">
                <FiRefreshCw className="w-8 h-8 mx-auto text-slate-400 animate-spin mb-3" />
                <div className="text-sm text-slate-500">Loading models...</div>
              </div>
            ) : modelsToRender.length === 0 ? (
              <div className="text-center py-8">
                <FiCpu className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                <div className="text-sm text-slate-500">No models available</div>
              </div>
            ) : (
              <div className="space-y-3">
                {modelsToRender.map((model, index) => (
                  <div
                    key={model.id ?? 'openai-default'}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedModel?.id === model.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    } animate-fade-in-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setSelectedModel(model)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {model.provider} · {model.name}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            model.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                          }`}>
                            {model.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        {model.version && (
                          <div className="text-sm text-slate-500 mb-2">Version: {model.version}</div>
                        )}
                        
                        <div className="text-xs text-slate-500">
                          Created: {formatDate(model.created_at || model.lastUpdated)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (model.id) {
                            if (!canToggle) {
                              setToast({ type: 'error', message: 'Admin privileges required' });
                              return;
                            }
                            handleToggleClick(model);
                          } else {
                            setToast({ type: 'error', message: 'Create this model on server to manage activation' });
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          model.is_active
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                        title={!canToggle ? 'Admin only' : undefined}
                      >
                        {model.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Model Configuration */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg h-full flex flex-col">
            {selectedModel ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Model Configuration</h3>
                    <p className="text-sm text-slate-500">
                      {selectedModel.provider} · {selectedModel.name} {selectedModel.version ? `· v${selectedModel.version}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedModel.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedModel.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Model Parameters</h4>
                    
                    <div className="space-y-5">
                      {/* Temperature */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Temperature
                          </label>
                          <span className="text-sm font-mono text-slate-600">
                            {(cfg.temperature ?? 0.7).toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={cfg.temperature ?? 0.7}
                          onChange={(e) => updateModelConfigLocal(selectedModel.id, 'temperature', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        {fieldErrors?.config?.temperature && (
                          <div className="text-sm text-rose-600 mt-2">{fieldErrors.config.temperature}</div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Controls randomness: lower = more deterministic, higher = more creative
                        </p>
                      </div>

                      {/* Max Tokens */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Max Tokens
                        </label>
                        <input
                          type="number"
                          min="64"
                          max="40000"
                          step="1"
                          value={cfg.max_tokens ?? 1000}
                          onChange={(e) => updateModelConfigLocal(selectedModel.id, 'max_tokens', parseInt(e.target.value || '0'))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        />
                        {fieldErrors?.config?.max_tokens && (
                          <div className="text-sm text-rose-600 mt-2">{fieldErrors.config.max_tokens}</div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Maximum length of the model response in tokens
                        </p>
                      </div>

                      {/* Top P */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Top P
                          </label>
                          <span className="text-sm font-mono text-slate-600">
                            {(cfg.top_p ?? 1.0).toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={cfg.top_p ?? 1.0}
                          onChange={(e) => updateModelConfigLocal(selectedModel.id, 'top_p', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        {fieldErrors?.config?.top_p && (
                          <div className="text-sm text-rose-600 mt-2">{fieldErrors.config.top_p}</div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Nucleus sampling: lower = more focused, higher = more diverse
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => saveModelConfig(selectedModel.id)}
                      disabled={saving || !canSave}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                        canSave
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg'
                          : 'bg-slate-200 text-slate-600 cursor-not-allowed'
                      }`}
                      title={!canSave ? 'Admin privileges required' : undefined}
                    >
                      <FiSave className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                      onClick={() => handleResetClick(selectedModel)}
                      disabled={selectedModel?.id ? !isAdmin : false}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                      title={!isAdmin && selectedModel?.id ? 'Admin only' : undefined}
                    >
                      <FiRotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  </div>

                  {/* Test Section */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Test Model</h4>
                    <div className="flex gap-3">
                      <textarea
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        rows={3}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        placeholder="Enter a test message..."
                      />
                      <button
                        onClick={() => testModel(testMessage)}
                        disabled={testing}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg transition-all font-medium disabled:opacity-50"
                      >
                        <FiPlay className="w-4 h-4" />
                        {testing ? 'Testing...' : 'Test'}
                      </button>
                    </div>

                    {testResult && (
                      <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 animate-fade-in-up">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <FaRobot className="w-5 h-5 text-slate-600" />
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">Assistant Response</div>
                              {usedModelInfo && (
                                <div className="text-xs text-slate-500">
                                  Model: {usedModelInfo.name} {usedModelInfo.id !== null ? `(ID: ${usedModelInfo.id})` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            {lastLatencyMs !== null && (
                              <div className="font-mono">Latency: {lastLatencyMs}ms</div>
                            )}
                            <div>{formatDate(testResult.created_at)}</div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-lg p-3 border">
                          {testResult.message_text || testResult.ai_message || JSON.stringify(testResult)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <FiCpu className="w-16 h-16 text-slate-400 mb-4" />
                <p className="text-lg font-medium">Select a model to configure</p>
                <p className="text-sm mt-2">Choose from the available models to view and edit settings</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Panel */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Performance Analytics</h3>
              <FiBarChart2 className="w-5 h-5 text-slate-400" />
            </div>

            {loadingStats ? (
              <div className="text-center py-8">
                <FiRefreshCw className="w-8 h-8 mx-auto text-slate-400 animate-spin mb-3" />
                <div className="text-sm text-slate-500">Loading statistics...</div>
              </div>
            ) : stats ? (
              <>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {(stats.total_messages ?? 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500">Total Messages Processed</div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.average_response_time !== '-' && stats.average_response_time !== null ? `${stats.average_response_time}s` : '-'}
                    </div>
                    <div className="text-sm text-slate-500">Average Response Time</div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.user_satisfaction_rate !== '-' && stats.user_satisfaction_rate !== null ? `${stats.user_satisfaction_rate}%` : '-'}
                    </div>
                    <div className="text-sm text-slate-500">User Satisfaction Rate</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Frequent Questions</h4>
                  <div className="space-y-2">
                    {(stats.common_questions || []).slice(0, 5).map((q, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in-up"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1 pr-3">
                          {q.message_text ?? q.question ?? q.text ?? '—'}
                        </div>
                        <div className="text-xs font-semibold px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {q.count ?? q.hits ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <FiBarChart2 className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                <div className="text-sm text-slate-500">No statistics available</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Toggle Confirmation Modal */}
      {confirmToggle.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setConfirmToggle({ show: false, modelId: null, modelName: '', currentStatus: '' })} 
          />
          <div 
            ref={toggleModalRef}
            tabIndex={-1}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="toggle-modal-title"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <FiActivity className="text-xl" />
                </div>
                <div>
                  <h3 id="toggle-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Model Status</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Update model activation state</p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to {confirmToggle.currentStatus ? 'deactivate' : 'activate'} <strong>"{confirmToggle.modelName}"</strong>?
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setConfirmToggle({ show: false, modelId: null, modelName: '', currentStatus: '' })}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={confirmToggleModel}
                  disabled={togglingModelId === confirmToggle.modelId}
                >
                  {togglingModelId === confirmToggle.modelId ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    confirmToggle.currentStatus ? 'Deactivate' : 'Activate'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {confirmReset.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setConfirmReset({ show: false, modelId: null, modelName: '' })} 
          />
          <div 
            ref={resetModalRef}
            tabIndex={-1}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FiRotateCcw className="text-xl" />
                </div>
                <div>
                  <h3 id="reset-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reset Configuration</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Restore default settings</p>
                </div>
              </div>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Reset <strong>"{confirmReset.modelName}"</strong> configuration to server defaults? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
                  onClick={() => setConfirmReset({ show: false, modelId: null, modelName: '' })}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={performResetConfirm}
                  disabled={resettingModelId === confirmReset.modelId}
                >
                  {resettingModelId === confirmReset.modelId ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Reset Configuration'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}