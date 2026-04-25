import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff,
  FiAlertCircle, FiBook, FiCompass, FiZap, FiUsers,
  FiShield, FiAward, FiClock,
} from 'react-icons/fi';
import PKFLogo from '../../components/PKFLogo';

/* ── Floating orb SVG decoration ───────────────────────────── */
const Orb = ({ className }) => (
  <div
    aria-hidden="true"
    className={`absolute rounded-full pointer-events-none ${className}`}
  />
);

/* ── Feature pill ───────────────────────────────────────────── */
const Feature = ({ icon: Icon, label, delay }) => (
  <div
    style={{ animationDelay: delay }}
    className="animate-fade-up flex items-center gap-3 px-4 py-3 rounded-2xl
      bg-white/5 border border-white/10 backdrop-blur-sm
      hover:bg-white/10 hover:border-gold/30 transition-all duration-300 group"
  >
    <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gold/20 flex items-center justify-center
      text-gold group-hover:bg-gold/30 transition-colors">
      <Icon size={15} aria-hidden="true" />
    </span>
    <span className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
      {label}
    </span>
  </div>
);

/* ── Stat block ─────────────────────────────────────────────── */
const Stat = ({ value, label, delay }) => (
  <div
    style={{ animationDelay: delay }}
    className="animate-fade-up flex flex-col gap-0.5"
  >
    <span className="text-3xl font-black text-gold leading-none animate-glow-text">
      {value}
    </span>
    <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">
      {label}
    </span>
  </div>
);

const features = [
  { icon: FiBook,    label: 'Digital Handbook' },
  { icon: FiCompass, label: 'Program Pathfinder' },
  { icon: FiZap,     label: 'AI-Powered Assistant' },
  { icon: FiUsers,   label: 'Campus Community' },
];

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { login }  = useAuth();
  const timerRef   = useRef(null);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

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
      setLoading(false);
      if (!result?.success) showError(result?.message || 'Invalid email or password.');
    } catch (err) {
      setLoading(false);
      showError(err?.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-navy-gradient font-sans">

      {/* Kente stripe */}
      <div className="kente-stripe absolute top-0 left-0 right-0 z-10 h-[7px]" aria-hidden="true" />

      {/* Atmospheric orbs */}
      <Orb className="w-[480px] h-[480px] bg-gold/5 blur-[120px] -top-32 -left-24 animate-float" />
      <Orb className="w-[360px] h-[360px] bg-navy-500/30 blur-[100px] bottom-0 right-[40%] animate-float-reverse" />
      <Orb className="w-[280px] h-[280px] bg-gold/8 blur-[80px] top-1/2 right-8 animate-float" />

      {/* Adinkra diamond pattern overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, rgba(255,215,0,.04) 0, rgba(255,215,0,.04) 1px, transparent 0, transparent 50%),
            repeating-linear-gradient(-45deg, rgba(255,215,0,.04) 0, rgba(255,215,0,.04) 1px, transparent 0, transparent 50%)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Left branding panel ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 py-20 relative z-[1]">
        {/* Institute badge */}
        <div className="animate-fade-up flex items-center gap-2 mb-10 w-fit
          px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 backdrop-blur-sm">
          <FiAward size={13} className="text-gold" aria-hidden="true" />
          <span className="text-[11px] font-black tracking-widest uppercase text-gold">
            PKFokam Institute of Excellence
          </span>
        </div>

        {/* Brand lockup */}
        <div className="animate-slide-left flex items-center gap-4 mb-8" style={{ animationDelay: '60ms' }}>
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-md animate-glow" />
            <div className="relative bg-navy-800 rounded-2xl p-3 ring-2 ring-gold/30 shadow-gold-md">
              <PKFLogo size={48} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-white leading-none tracking-tight">
              PKF<span className="text-gold">Connect</span>
            </p>
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mt-1">
              Student &amp; Faculty Portal
            </p>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up text-white font-display font-black leading-tight mb-5"
          style={{ fontSize: 'clamp(1.9rem, 2.8vw, 2.8rem)', animationDelay: '100ms' }}
        >
          Your gateway to{' '}
          <span className="text-gold animate-glow-text">academic excellence</span>
          <br />at PKFokam
        </h1>

        <p className="animate-fade-up text-white/60 text-base leading-relaxed mb-10 max-w-md"
           style={{ animationDelay: '140ms' }}>
          Access resources, connect with peers, get AI-powered answers,
          and explore everything the Institute has to offer — all in one place.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3 mb-12 max-w-md">
          {features.map(({ icon, label }, i) => (
            <Feature key={label} icon={icon} label={label} delay={`${180 + i * 50}ms`} />
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-end gap-10" aria-label="Platform statistics">
          <Stat value="2 500+" label="Students"  delay="380ms" />
          <Stat value="128+"   label="Resources" delay="420ms" />
          <Stat value="24 / 7" label="AI Support" delay="460ms" />
        </div>
      </div>

      {/* Vertical divider */}
      <div
        aria-hidden="true"
        className="hidden lg:block w-px self-stretch my-10 bg-gradient-to-b
          from-transparent via-white/10 to-transparent"
      />

      {/* ── Right form panel ───────────────────────────────── */}
      <div className="relative z-[1] flex items-center justify-center
        w-full lg:w-[480px] px-6 py-16 lg:py-8">

        <div className="w-full max-w-md animate-scale-in" style={{ animationDelay: '80ms' }}>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-[0_32px_96px_rgba(0,0,0,.35)] overflow-hidden">

            {/* Gold top strip */}
            <div className="h-1 bg-gold-gradient" aria-hidden="true" />

            <div className="px-8 py-8 sm:px-10 sm:py-10">

              {/* Card header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                  bg-navy-gradient shadow-navy-md mb-4">
                  <PKFLogo size={32} />
                </div>
                <h2 className="text-2xl font-black text-navy-900 leading-tight">
                  Welcome back
                </h2>
                <p className="text-sm text-navy-600/70 mt-1">
                  Sign in to your PKFIE-Hub account
                </p>
              </div>

              {/* Error alert */}
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-3 mb-6 px-4 py-3 rounded-2xl
                    bg-red-50 border border-red-200 text-red-700 text-sm font-semibold
                    animate-fade-up"
                >
                  <FiAlertCircle size={17} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-5">

                {/* Email field */}
                <div>
                  <label htmlFor="login-email" className="block text-xs font-bold text-navy-800 mb-1.5 tracking-wide">
                    Email address
                  </label>
                  <div className="relative">
                    <FiMail
                      size={15}
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none"
                    />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@pkfokam.edu"
                      required
                      disabled={loading}
                      aria-required="true"
                      className="w-full h-12 pl-10 pr-4 rounded-xl text-sm font-medium
                        bg-navy-50/50 border border-navy-200 text-navy-900
                        placeholder-navy-400/60
                        focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="login-password" className="block text-xs font-bold text-navy-800 mb-1.5 tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <FiLock
                      size={15}
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none"
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
                      className="w-full h-12 pl-10 pr-12 rounded-xl text-sm font-medium
                        bg-navy-50/50 border border-navy-200 text-navy-900
                        placeholder-navy-400/60
                        focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      disabled={loading}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                        text-navy-400 hover:text-navy-700 hover:bg-navy-100
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
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-navy-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={loading}
                      className="w-4 h-4 rounded accent-gold cursor-pointer"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    disabled={loading}
                    className="font-bold text-gold hover:text-gold-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full h-12 rounded-xl font-black text-sm
                    bg-navy-gradient text-white shadow-navy-md
                    hover:shadow-navy-lg hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-navy-md
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0
                    transition-all duration-200 overflow-hidden
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {/* Shimmer on hover */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                      -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                        <FiArrowRight size={16} aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 space-y-3 text-center">
                <p className="text-xs text-navy-500">
                  No account?{' '}
                  <button type="button" className="font-bold text-gold hover:text-gold-600 transition-colors">
                    Contact Admissions
                  </button>
                </p>

                {/* Trust signals */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  {[
                    { icon: FiShield, label: 'Secure login' },
                    { icon: FiClock,  label: 'Session protected' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] text-navy-400 font-semibold">
                      <Icon size={11} aria-hidden="true" />
                      {label}
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-navy-400/60">
                  &copy; {new Date().getFullYear()} PKFe-Hub &middot; PKFokam Institute of Excellence
                </p>
              </div>
            </div>
          </div>

          {/* Mobile brand below card */}
          <div className="lg:hidden mt-8 text-center animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <PKFLogo size={28} />
              <p className="text-lg font-black text-white">
                PKF<span className="text-gold">Connect</span>
              </p>
            </div>
            <p className="text-xs text-white/40 tracking-widest uppercase">
              PKFokam Institute of Excellence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
