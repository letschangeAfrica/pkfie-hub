import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
    // Redirect is handled by PublicOnlyRoute in App.js
  };

  return (
    <div className="pkfe-login-container">
      <div className="pkfe-login-form">
        <div className="pkfe-login-logo">
          <i className="fas fa-shield-alt"></i>
          <span>PKFe-Hub</span>
        </div>
        <h1 className="pkfe-login-title">Login</h1>
        {error && <div className="pkfe-login-alert pkfe-login-alert-error">{error}</div>}
        <form className="pkfe-login-form-content" onSubmit={handleSubmit} autoComplete="off">
          <div className="pkfe-login-form-group">
            <input
              type="email"
              className="pkfe-login-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </div>
          <div className="pkfe-login-form-group">
            <input
              type="password"
              className="pkfe-login-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          <button className="pkfe-login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;