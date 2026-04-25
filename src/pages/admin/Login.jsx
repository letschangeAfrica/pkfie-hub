import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff,
  FiAlertCircle, FiBook, FiCompass, FiCpu, FiCamera,
  FiShield, FiClock, FiAward,
} from 'react-icons/fi';
import PKFLogo from '../../components/PKFLogo';

/* ── Feature card (left panel) ──────────────────────────────── */
const Feature = ({ icon: Icon, label, delay }) => (
  <div
    style={{ animationDelay: delay }}
    className="animate-fade-up flex items-center gap-3 px-4 py-3.5 rounded-2xl
      border border-white/10 bg-white/5 hover:bg-white/10
      hover:border-gold/30 transition-all duration-300 group cursor-default"
  >
    <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gold/15 border border-gold/20
      flex items-center justify-center text-gold group-hover:bg-gold/25 transition-colors">
      <Icon size={16} aria-hidden="true" />
    </span>
    <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
      {label}
    </span>
  </div>
);

const features = [
  { icon: FiBook,    label: 'Digital Handbook' },
  { icon: FiCompass, label: 'Program Pathfinder' },
  { icon: FiCpu,     label: 'AI-Powered Assistant' },
  { icon: FiCamera,  label: 'Campus Showcase' },
];

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { login } = useAuth();
  const timerRef  = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const showError = (msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setError(msg);
    timerRef.current = setTimeout(() => setError(''), 6000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result?.success) showError(result?.message || 'Invalid email or password.');
    } catch (err) {
      showError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex overflow-hidden font-sans"
      style={{ background: 'linear-gradient(135deg, #000D2E 0%, #001F5B 60%, #000D2E 100%)' }}
    >
      {/* Kente stripe — animated, top of page */}
      <div className="kente-stripe absolute top-0 left-0 right-0 z-10" aria-hidden="true" />

      {/* Adinkra diamond pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, rgba(255,215,0,.035) 0, rgba(255,215,0,.035) 1px, transparent 0, transparent 50%),
            repeating-linear-gradient(-45deg, rgba(255,215,0,.035) 0, rgba(255,215,0,.035) 1px, transparent 0, transparent 50%)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Atmospheric glow orbs */}
      <div aria-hidden="true" className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-0 left-1/4 w-[360px] h-[360px] rounded-full bg-navy-500/20 blur-[100px] pointer-events-none" />
      <div aria-hidden="true" className="absolute top-1/3 right-[38%] w-[240px] h-[240px] rounded-full bg-gold/5 blur-[80px] pointer-events-none" />

      {/* ── Left branding panel ───────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 px-14 pt-24 pb-14 relative z-[1] max-w-[620px]">

        {/* Top: badge + brand + headline */}
        <div className="animate-fade-up">
          {/* Institute badge */}
          <div className="inline-flex items-center gap-2 mb-10
            px-4 py-1.5 rounded-full border border-gold/25 bg-gold/8 backdrop-blur-sm">
            <FiAward size={12} className="text-gold" aria-hidden="true" />
            <span className="text-[11px] font-black tracking-widest uppercase text-gold">
              PKFokam Institute of Excellence
            </span>
          </div>

          {/* Brand lockup */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gold/20 blur-lg animate-glow" />
              <div className="relative w-14 h-14 rounded-2xl bg-[#001F5B] border border-gold/30 shadow-[0_0_20px_rgba(255,215,0,.2)] flex items-center justify-center">
                <PKFLogo size={36} />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white leading-none tracking-tight">
                PKFIE<span className="text-gold">-Hub</span>
              </h1>
              <p className="text-xs font-bold tracking-widest uppercase text-white/40 mt-1">
                Student &amp; Faculty Portal
              </p>
            </div>
          </div>

          {/* Headline */}
          <p
            className="font-display font-bold text-white leading-tight mb-5"
            style={{ fontSize: 'clamp(2rem, 3vw, 2.75rem)' }}
          >
            Your gateway to{' '}
            <span className="text-gold">academic excellence</span>{' '}
            at PKFokam
          </p>

          <p className="text-white/55 text-base leading-relaxed mb-10 max-w-[440px]">
            Access your digital handbook, connect with the AI assistant,
            explore academic paths, and engage with the campus community
            — all in one place.
          </p>

          {/* Feature grid 2×2 */}
          <div className="grid grid-cols-2 gap-3 mb-12 max-w-[480px]">
            {features.map(({ icon, label }, i) => (
              <Feature key={label} icon={icon} label={label} delay={`${i * 60}ms`} />
            ))}
          </div>
        </div>

        {/* Bottom: stats */}
        <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-8" />
          <div className="flex items-center gap-12">
            {[
              { value: '2,500+', label: 'STUDENTS' },
              { value: '128+',   label: 'RESOURCES' },
              { value: '24/7',   label: 'AI SUPPORT' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-3xl font-black text-gold leading-none tabular-nums">
                  {value}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: login card ─────────────────────────────────── */}
      <div className="relative z-[1] flex items-center justify-center
        w-full lg:w-[520px] px-6 py-20 lg:py-0
        lg:bg-black/10 lg:border-l lg:border-white/[0.06]"
      >
        <div
          className="w-full max-w-[420px] animate-scale-in"
          style={{ animationDelay: '100ms' }}
        >
          {/* Card */}
          <div className="bg-white rounded-3xl overflow-hidden"
               style={{ boxShadow: '0 32px 80px rgba(0,0,0,.4), 0 0 0 1px rgba(255,215,0,.08)' }}>

            {/* Gold top bar */}
            <div
              aria-hidden="true"
              className="h-1.5"
              style={{ background: 'linear-gradient(90deg, #FFD700 0%, #FFEE66 45%, #FFD700 55%, #FFC200 100%)' }}
            />

            <div className="px-8 py-9">

              {/* Card header */}
              <div className="flex flex-col items-center text-center mb-7">
                <div
                  className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #000D2E 0%, #001F5B 100%)',
                    boxShadow: '0 8px 24px rgba(0,31,91,.4)',
                  }}
                >
                  <PKFLogo size={36} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  Welcome back
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Sign in to your PKFIE-Hub account
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl
                    bg-red-50 border border-red-200 text-red-700 text-sm font-semibold
                    animate-fade-up"
                >
                  <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">

                {/* Email */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <FiMail
                      size={15}
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="student@pkfokam.edu"
                      required
                      disabled={loading}
                      aria-required="true"
                      className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-slate-800
                        bg-slate-50 border border-slate-200
                        placeholder-slate-400
                        focus:outline-none focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20
                        focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <FiLock
                      size={15}
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      aria-required="true"
                      className="w-full h-12 pl-10 pr-11 rounded-xl text-sm text-slate-800
                        bg-slate-50 border border-slate-200
                        placeholder-slate-400
                        focus:outline-none focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20
                        focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      disabled={loading}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg
                        text-slate-400 hover:text-slate-700 hover:bg-slate-100
                        transition-colors disabled:opacity-50"
                    >
                      {showPw
                        ? <FiEyeOff size={16} aria-hidden="true" />
                        : <FiEye    size={16} aria-hidden="true" />
                      }
                    </button>
                  </div>
                </div>

                {/* Remember + forgot */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-semibold">
                    <input
                      type="checkbox"
                      disabled={loading}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer
                        accent-[#001F5B]"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    disabled={loading}
                    className="font-bold text-[#FFD700] hover:text-[#E6A800] transition-colors"
                    style={{ color: '#B8860B' }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="group relative w-full h-12 rounded-xl font-black text-sm text-white
                    overflow-hidden transition-all duration-200
                    hover:-translate-y-0.5 active:translate-y-0
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
                  style={{
                    background: 'linear-gradient(135deg, #000D2E 0%, #001F5B 50%, #002B80 100%)',
                    boxShadow: '0 4px 20px rgba(0,31,91,.4)',
                  }}
                >
                  {/* hover shimmer */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%]
                      transition-transform duration-700
                      bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                        <FiArrowRight
                          size={16}
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Footer */}
              <div className="mt-7 space-y-4 text-center">
                <p className="text-xs text-slate-500">
                  No account?{' '}
                  <button
                    type="button"
                    className="font-bold transition-colors"
                    style={{ color: '#B8860B' }}
                  >
                    Contact Admissions
                  </button>
                </p>

                <div className="flex items-center justify-center gap-5">
                  {[
                    { icon: FiShield, label: 'Secure login' },
                    { icon: FiClock,  label: 'Session protected' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                      <Icon size={11} aria-hidden="true" />
                      {label}
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400">
                  &copy; {new Date().getFullYear()} PKFokam Institute of Excellence
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: brand below card */}
          <div className="lg:hidden mt-8 text-center animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-center gap-3 mb-1.5">
              <PKFLogo size={24} />
              <p className="text-lg font-black text-white">
                PKFIE<span className="text-gold">-Hub</span>
              </p>
            </div>
            <p className="text-xs text-white/40 tracking-widest uppercase font-bold">
              PKFokam Institute of Excellence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
