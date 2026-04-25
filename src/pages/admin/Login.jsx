import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiMail,
  FiLock,
  FiUser,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiBook,
  FiAward,
  FiUsers
} from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const clearErrorTimerRef = useRef(null);

  useEffect(() => {
    // Clear any lingering timer on unmount
    return () => {
      if (clearErrorTimerRef.current) {
        clearTimeout(clearErrorTimerRef.current);
        clearErrorTimerRef.current = null;
      }
    };
  }, []);

  // helper to set error and auto-clear after 5s
  const showError = (message, timeoutMs = 5000) => {
    // clear previous timer if any
    if (clearErrorTimerRef.current) {
      clearTimeout(clearErrorTimerRef.current);
      clearErrorTimerRef.current = null;
    }
    setError(message);
    if (timeoutMs > 0) {
      clearErrorTimerRef.current = setTimeout(() => {
        setError('');
        clearErrorTimerRef.current = null;
      }, timeoutMs);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    // clear previous error and timer immediately when attempting a new submit
    if (clearErrorTimerRef.current) {
      clearTimeout(clearErrorTimerRef.current);
      clearErrorTimerRef.current = null;
    }
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      setLoading(false);

      if (!result?.success) {
        // show error and auto-hide after 5s (keeps old behavior otherwise)
        showError(result?.message || 'Sign in failed', 5000);
      }
      // If success: do not navigate here (old behaviour). PublicOnlyRoute or AuthContext handles redirect.
    } catch (err) {
      setLoading(false);
      showError(err?.message || 'Unexpected error signing in', 5000);
    }
  }

  // Optional: clear error as user types (uncomment if desired)
  // useEffect(() => {
  //   if (error) {
  //     // clear error when user starts changing inputs
  //     const handler = () => setError('');
  //     return () => handler();
  //   }
  // }, [email, password]);

  // Inline hero animation styles (kept from design; can be moved to CSS)
  const customStyles = `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .login-hero-gradient {
      background: linear-gradient(135deg, 
        rgba(59,130,246,0.1) 0%,
        rgba(139,92,246,0.1) 50%,
        rgba(236,72,153,0.05) 100%);
    }
    .dark .login-hero-gradient {
      background: linear-gradient(135deg, 
        rgba(30,64,175,0.2) 0%,
        rgba(109,40,217,0.2) 50%,
        rgba(190,24,93,0.1) 100%);
    }
  `;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <style>{customStyles}</style>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Brand & Features (keeps new look) */}
        <div className="space-y-8 animate-fade-in-up">
          <div className="login-hero-gradient rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-2xl animate-float">
                <FiBook className="text-2xl" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                  PKF<span className="text-blue-600">Connect</span>
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Student & Faculty Portal</p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Welcome back to your <span className="text-blue-600">academic hub</span>
              </h2>

              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Access your courses, connect with peers, and explore everything PKFokam Institute has to offer.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
                  <FiAward className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Academic Excellence</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
                  <FiUsers className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Community Network</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
                  <FiCheckCircle className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Verified Platform</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
                  <FiBook className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Learning Resources</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">2,500+</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Active Students</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">150+</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Courses</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">24/7</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Support</div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form (keeps new visuals, restores old auth flow) */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-lg mx-auto mb-4">
                <FiUser className="text-2xl" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Welcome Back</h2>
              <p className="text-slate-600 dark:text-slate-400">Sign in to your PKFIE-Hub account</p>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit} noValidate autoComplete="off">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" disabled={loading} />
                  Remember me
                </label>
                <button type="button" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors" disabled={loading}>
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              <span className="px-4 text-sm text-slate-500 dark:text-slate-400">or</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            </div>

            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Don't have an account?{' '}
                <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors">
                  Contact Admissions
                </button>
              </p>

              <div className="flex gap-3 justify-center">
                <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                  <FiUser className="w-5 h-5" />
                </button>
                <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                  <FiBook className="w-5 h-5" />
                </button>
                <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                  <FiAward className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} PKFIE-Hub — PKFokam Institute of Excellence</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Secure authentication powered by PKFokam</p>
          </div>
        </div>
      </div>
    </div>
  );
}