import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff,
  FiAlertCircle, FiBook, FiCompass, FiZap, FiUsers
} from 'react-icons/fi';

/* ── Inline styles (no external CSS dependency) ─────────── */
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: 'linear-gradient(135deg, #0B2559 0%, #1A4080 60%, #0B2559 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
  },
  /* Adinkra diamond background pattern */
  bgPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      repeating-linear-gradient(45deg, rgba(200,144,42,.07) 0, rgba(200,144,42,.07) 1px, transparent 0, transparent 50%),
      repeating-linear-gradient(-45deg, rgba(200,144,42,.07) 0, rgba(200,144,42,.07) 1px, transparent 0, transparent 50%)
    `,
    backgroundSize: '32px 32px',
    pointerEvents: 'none',
  },
  /* Kente stripe at very top */
  kenteTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 7,
    background: 'repeating-linear-gradient(90deg,#C8902A 0,#C8902A 18px,#0B2559 18px,#0B2559 34px,#1A6B3A 34px,#1A6B3A 50px,#FFD700 50px,#FFD700 60px,#8B1A1A 60px,#8B1A1A 70px,#FFD700 70px,#FFD700 80px,#1A6B3A 80px,#1A6B3A 96px,#0B2559 96px,#0B2559 112px,#C8902A 112px,#C8902A 130px)',
    zIndex: 10,
  },
  wrap: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
  },
  /* ── Left panel ── */
  left: {
    flex: '1 1 52%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '5rem 4rem 4rem',
    color: '#fff',
  },
  leftBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(200,144,42,.18)',
    border: '1px solid rgba(200,144,42,.4)',
    borderRadius: 99,
    padding: '0.35rem 1rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#F0B429',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '2rem',
    width: 'fit-content',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.1rem',
    marginBottom: '1.5rem',
  },
  brandIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #C8902A 0%, #F0B429 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    boxShadow: '0 8px 24px rgba(200,144,42,.4)',
    flexShrink: 0,
  },
  brandName: {
    fontSize: '2.2rem',
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  brandSpan: { color: '#F0B429' },
  brandSub: {
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,.55)',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginTop: '0.15rem',
  },
  headline: {
    fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.2,
    marginBottom: '1rem',
    maxWidth: 480,
  },
  headlineAccent: { color: '#F0B429' },
  tagline: {
    fontSize: '1.05rem',
    color: 'rgba(255,255,255,.7)',
    lineHeight: 1.65,
    marginBottom: '2.5rem',
    maxWidth: 440,
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.875rem',
    marginBottom: '3rem',
    maxWidth: 460,
  },
  featureCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 12,
    padding: '0.7rem 0.9rem',
    backdropFilter: 'blur(8px)',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(200,144,42,.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#F0B429',
    fontSize: '0.95rem',
    flexShrink: 0,
  },
  featureText: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,.85)',
    lineHeight: 1.3,
  },
  statsRow: {
    display: 'flex',
    gap: '2.5rem',
    flexWrap: 'wrap',
  },
  stat: { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  statNum: { fontSize: '1.7rem', fontWeight: 900, color: '#F0B429', lineHeight: 1 },
  statLabel: { fontSize: '0.75rem', color: 'rgba(255,255,255,.5)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },

  /* ── Right panel ── */
  right: {
    flex: '0 0 460px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 3rem',
    background: 'rgba(255,255,255,.03)',
    borderLeft: '1px solid rgba(255,255,255,.07)',
    backdropFilter: 'blur(20px)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#fff',
    borderRadius: 24,
    padding: '2.5rem 2rem',
    boxShadow: '0 24px 80px rgba(0,0,0,.3)',
  },
  cardTop: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #0B2559 0%, #1A4080 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    boxShadow: '0 8px 24px rgba(11,37,89,.25)',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0D1B2A',
    marginBottom: '0.3rem',
  },
  cardSub: {
    fontSize: '0.875rem',
    color: '#546278',
  },
  /* Error */
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    background: '#FEE2E2',
    border: '1px solid #FECACA',
    borderRadius: 12,
    padding: '0.85rem 1rem',
    marginBottom: '1.25rem',
    color: '#DC2626',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  /* Form */
  fieldLabel: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#0D1B2A',
    marginBottom: '0.45rem',
    letterSpacing: '0.02em',
  },
  fieldWrap: {
    position: 'relative',
    marginBottom: '1.1rem',
  },
  fieldIcon: {
    position: 'absolute',
    left: '0.9rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#8A96A3',
    fontSize: '1rem',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    height: 48,
    padding: '0 1rem 0 2.6rem',
    borderRadius: 12,
    border: '1.5px solid #E2D9C8',
    background: '#FAFAF5',
    color: '#0D1B2A',
    fontSize: '0.925rem',
    fontFamily: "'Nunito', system-ui, sans-serif",
    fontWeight: 500,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    outline: 'none',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: '#C8902A',
    background: '#fff',
    boxShadow: '0 0 0 3px rgba(200,144,42,.15)',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.9rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8A96A3',
    padding: '0.25rem',
    borderRadius: 6,
    display: 'flex',
    fontSize: '1rem',
    lineHeight: 1,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    fontSize: '0.82rem',
  },
  rememberLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: '#546278',
    fontWeight: 600,
    cursor: 'pointer',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#C8902A',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #0B2559 0%, #1A4080 100%)',
    color: '#fff',
    fontSize: '0.975rem',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
    boxShadow: '0 4px 16px rgba(11,37,89,.3)',
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
  },
  submitBtnHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 8px 24px rgba(11,37,89,.4)',
  },
  submitBtnDisabled: { opacity: 0.6, cursor: 'not-allowed', transform: 'none' },
  spinner: {
    width: 18,
    height: 18,
    border: '2.5px solid rgba(255,255,255,.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  cardFooter: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.8rem',
    color: '#546278',
    lineHeight: 1.5,
  },
  footerLink: {
    color: '#C8902A',
    fontWeight: 700,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    padding: 0,
  },
};

const features = [
  { icon: FiBook,    label: 'Digital Handbook' },
  { icon: FiCompass, label: 'Program Pathfinder' },
  { icon: FiZap,     label: 'AI-Powered Assistant' },
  { icon: FiUsers,   label: 'Campus Community' },
];

export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [btnHover, setBtnHover]         = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const { login }            = useAuth();
  const timerRef             = useRef(null);

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

  const inputStyle = (field) => ({
    ...S.input,
    ...(focusedField === field ? S.inputFocus : {}),
  });

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-left  { animation: fadeUp 0.55s cubic-bezier(.4,0,.2,1) both; }
        .login-right { animation: fadeUp 0.55s 0.15s cubic-bezier(.4,0,.2,1) both; }
        @media (max-width: 900px) {
          .login-left  { display: none !important; }
          .login-right {
            flex: 1 !important;
            padding: 5rem 1.5rem 3rem !important;
            border-left: none !important;
            background: transparent !important;
          }
        }
        @media (max-width: 480px) {
          .login-card { padding: 2rem 1.25rem !important; }
        }
      `}</style>

      {/* Kente top stripe */}
      <div style={S.kenteTop} aria-hidden="true" />

      {/* Adinkra background pattern */}
      <div style={S.bgPattern} aria-hidden="true" />

      <div style={S.wrap}>
        {/* ── Left branding panel ── */}
        <div style={S.left} className="login-left">
          <div style={S.leftBadge}>
            <span>🎓</span> PKFokam Institute of Excellence
          </div>

          <div style={S.brandRow}>
            <div style={S.brandIcon} aria-hidden="true">🎓</div>
            <div>
              <div style={S.brandName}>
                PKF<span style={S.brandSpan}>Connect</span>
              </div>
              <div style={S.brandSub}>Student & Faculty Portal</div>
            </div>
          </div>

          <h1 style={S.headline}>
            Your gateway to <span style={S.headlineAccent}>academic excellence</span> at PKFokam
          </h1>

          <p style={S.tagline}>
            Access resources, connect with peers, get AI-powered answers,
            and explore everything the Institute has to offer — all in one place.
          </p>

          <div style={S.features} role="list">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} style={S.featureCard} role="listitem">
                <div style={S.featureIcon} aria-hidden="true">
                  <Icon size={16} />
                </div>
                <span style={S.featureText}>{label}</span>
              </div>
            ))}
          </div>

          <div style={S.statsRow} aria-label="Platform statistics">
            <div style={S.stat}>
              <span style={S.statNum}>2 500+</span>
              <span style={S.statLabel}>Students</span>
            </div>
            <div style={S.stat}>
              <span style={S.statNum}>128+</span>
              <span style={S.statLabel}>Resources</span>
            </div>
            <div style={S.stat}>
              <span style={S.statNum}>24/7</span>
              <span style={S.statLabel}>AI Support</span>
            </div>
          </div>
        </div>

        {/* ── Right login form ── */}
        <div style={S.right} className="login-right">
          <div style={S.card} className="login-card">
            {/* Card header */}
            <div style={S.cardTop}>
              <div style={S.cardIconWrap} aria-hidden="true">
                <FiMail size={24} color="#F0B429" />
              </div>
              <h2 style={S.cardTitle}>Welcome back</h2>
              <p style={S.cardSub}>Sign in to your PKFConnect account</p>
            </div>

            {/* Error */}
            {error && (
              <div style={S.errorBox} role="alert" aria-live="assertive">
                <FiAlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate autoComplete="off">
              {/* Email */}
              <label style={S.fieldLabel} htmlFor="login-email">
                Email address
              </label>
              <div style={S.fieldWrap}>
                <FiMail style={S.fieldIcon} aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle('email')}
                  placeholder="you@pkfokam.edu"
                  required
                  disabled={loading}
                  aria-required="true"
                />
              </div>

              {/* Password */}
              <label style={S.fieldLabel} htmlFor="login-password">
                Password
              </label>
              <div style={S.fieldWrap}>
                <FiLock style={S.fieldIcon} aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('password'), paddingRight: '2.8rem' }}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  aria-required="true"
                />
                <button
                  type="button"
                  style={S.eyeBtn}
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPw ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>

              {/* Remember + forgot */}
              <div style={S.metaRow}>
                <label style={S.rememberLabel}>
                  <input type="checkbox" disabled={loading} style={{ accentColor: '#C8902A' }} />
                  Remember me
                </label>
                <button type="button" style={S.forgotBtn} disabled={loading}>
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...S.submitBtn,
                  ...(btnHover && !loading ? S.submitBtnHover : {}),
                  ...(loading ? S.submitBtnDisabled : {}),
                }}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
              >
                {loading ? (
                  <>
                    <div style={S.spinner} aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <FiArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div style={S.cardFooter}>
              <p>
                No account?{' '}
                <button style={S.footerLink} type="button">Contact Admissions</button>
              </p>
              <p style={{ marginTop: '0.9rem', fontSize: '0.72rem', color: '#8A96A3' }}>
                © {new Date().getFullYear()} PKFe-Hub · PKFokam Institute of Excellence
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
