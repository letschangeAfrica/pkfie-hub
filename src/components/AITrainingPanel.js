import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlay, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function AITrainingPanel({ selectedDocuments = [], onTrainingComplete, onClose }) {
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [trainedModels, setTrainedModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const token = localStorage.getItem('token');

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, modelsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/ai_training/training-sessions/`, { headers: { Authorization: token ? `Bearer ${token}` : undefined } }),
        axios.get(`${BASE_URL}/api/ai_training/trained-models/`, { headers: { Authorization: token ? `Bearer ${token}` : undefined } }),
      ]);
      setTrainingSessions(sessionsRes.data || []);
      setTrainedModels(modelsRes.data || []);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to load training data' });
    } finally {
      setLoading(false);
    }
  };

  const startTraining = async () => {
    if (!selectedDocuments || selectedDocuments.length === 0) {
      setToast({ type: 'error', message: 'Please select documents to train on' });
      return;
    }
    setTraining(true);
    try {
      await axios.post(`${BASE_URL}/api/ai_training/documents/train/`, {
        document_ids: selectedDocuments.map(d => d.id),
      }, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      setToast({ type: 'success', message: 'Training started' });
      // poll progress
      const poll = setInterval(async () => {
        await fetchTrainingData();
        const latest = trainingSessions[0];
        if (latest && (latest.status === 'Completed' || latest.status === 'Failed')) {
          clearInterval(poll);
          setTraining(false);
          if (onTrainingComplete) onTrainingComplete();
        }
      }, 3000);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to start training' });
      setTraining(false);
    }
  };

  const setActiveModel = async (modelId) => {
    try {
      await axios.post(`${BASE_URL}/api/ai_training/trained-models/${modelId}/set_active/`, {}, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      setToast({ type: 'success', message: 'Model activated' });
      fetchTrainingData();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to activate model' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Processing': return 'text-blue-600 bg-blue-100';
      case 'Failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Training Panel</h2>
        <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><FiX /></button>
      </div>

      {toast && (
        <div className={`p-3 rounded ${toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />} <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="bg-white border rounded p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Selected documents: <strong>{selectedDocuments.length}</strong></p>
            <p className="text-xs text-gray-500">These documents will be processed into chunks and embedded for retrieval.</p>
          </div>
          <div>
            <button
              onClick={startTraining}
              disabled={training || selectedDocuments.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {training ? 'Training...' : <><FiPlay className="inline mr-2" /> Start Training</>}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Training Sessions</h3>
          <button onClick={fetchTrainingData} className="p-2 rounded hover:bg-gray-100">
            <FiRefreshCw />
          </button>
        </div>

        {trainingSessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions yet</p>
        ) : (
          trainingSessions.map(s => (
            <div key={s.id} className="border rounded p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className={`px-2 py-1 rounded text-xs ${getStatusColor(s.status)}`}>{s.status}</div>
                <div className="text-xs text-gray-500">{new Date(s.started_at).toLocaleString()}</div>
              </div>
              <div className="text-sm text-gray-600">{s.documents_count} documents • {s.total_chunks} chunks</div>
              {s.status === 'Processing' && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${s.progress_percentage}%` }} />
                </div>
              )}
              {s.error_message && <div className="text-sm text-red-600 mt-2">{s.error_message}</div>}
            </div>
          ))
        )}
      </div>

      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-3">Trained Models</h3>
        {trainedModels.length === 0 ? (
          <p className="text-sm text-gray-500">No trained models yet</p>
        ) : (
          trainedModels.map(m => (
            <div key={m.id} className="border rounded p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{m.name}</div>
                {m.is_active && <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</div>}
              </div>
              <div className="text-sm text-gray-600 mb-2">{m.description}</div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div>Accuracy: {m.accuracy_score ? `${(m.accuracy_score * 100).toFixed(1)}%` : 'N/A'}</div>
                <div>{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              {!m.is_active && (
                <button onClick={() => setActiveModel(m.id)} className="mt-2 w-full py-2 bg-gray-100 rounded">Set active</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
