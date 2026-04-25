import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { ReactComponent as AfricaSVG } from '../images/africa.svg';
import cameroonUrl from '../images/cameroon.svg'; // import as URL to avoid JSX/SVG parsing issues
import {
  FiZap,
  FiUsers,
  FiCheckCircle,
  FiTarget,
  FiBookOpen,
  FiTrendingUp,
  FiSearch
} from 'react-icons/fi';
import { FaGraduationCap, FaRocket, FaChartLine, FaUniversity } from 'react-icons/fa';
import { GiDesert, GiJungle, GiRiver, GiTeacher } from 'react-icons/gi';

/**
 * SplashScreenAfrica
 *
 * Notes:
 * - cameroon.svg is imported as a URL (default import) to avoid JSX transform issues when the SVG includes constructs
 *   that SVGR/JSX can't parse. If you must use it as a React component, sanitize the SVG (remove namespaced attributes,
 *   <title> containing path-like data, or invalid XML namespaces).
 *
 * - Ensure other files in your repo do NOT import cameroon.svg using "ReactComponent as ..." anywhere else.
 */

function isReturningUser() {
  try { return localStorage.getItem('pkfie_returning') === '1'; } catch { return false; }
}

function markReturningUser() {
  try { localStorage.setItem('pkfie_returning', '1'); } catch { /* ignore */ }
}

export default function SplashScreenAfrica({
  visible = true,
  onFinish = () => {},
  duration = isReturningUser() ? 2000 : 10000,
}) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [highlightCameroon, setHighlightCameroon] = useState(false);
  const [glowPhase, setGlowPhase] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  const pathRef = useRef(null);
  const cameroonRef = useRef(null);

  const steps = useMemo(
    () => [
      { icon: FiBookOpen, text: 'Loading Academic Database...', color: 'text-blue-600' },
      { icon: FaUniversity, text: 'Initializing Campus Resources...', color: 'text-emerald-600' },
      { icon: GiTeacher, text: 'Preparing AI Assistant...', color: 'text-violet-600' },
      { icon: FiTarget, text: 'Launching Your Dashboard...', color: 'text-amber-600' },
    ],
    []
  );

  const features = useMemo(
    () => [
      { icon: FiZap, text: 'AI-Powered Insights', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
      { icon: FiSearch, text: 'Transparent Information', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10' },
      { icon: FiUsers, text: 'Community Driven', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-500/10' },
      { icon: FaChartLine, text: 'Performance Analytics', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10' },
    ],
    []
  );

  const africanRegions = useMemo(
    () => [
      { name: 'North', countries: 6, icon: GiDesert, color: '#f59e0b', position: 'top-20 right-40' },
      { name: 'West', countries: 16, icon: FaRocket, color: '#10b981', position: 'top-40 left-32' },
      { name: 'Central', countries: 9, icon: GiJungle, color: '#3b82f6', position: 'top-1/2 left-1/2' },
      { name: 'East', countries: 14, icon: GiRiver, color: '#8b5cf6', position: 'top-40 right-32' },
      { name: 'South', countries: 5, icon: FiTrendingUp, color: '#ec4899', position: 'bottom-20 left-1/2' },
    ],
    []
  );

  const handleSkip = useCallback(() => {
    setProgress(100);
    setIsLoaded(true);
    markReturningUser();
    try { onFinish(); } catch (e) { console.error(e); }
  }, [onFinish]);

  // progress and other intervals
  useEffect(() => {
    if (!visible) return;
    const stepValue = 100 / (duration / 100);
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(100, prev + stepValue);
        if (next >= 100) {
          clearInterval(progressInterval);
          setIsLoaded(true);
          markReturningUser();
          setTimeout(() => {
            try { onFinish(); } catch (e) { console.error(e); }
          }, 700);
        }
        return next;
      });
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 2000);

    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 1400);

    const glowInterval = setInterval(() => {
      setGlowPhase(prev => prev + 0.08);
    }, 60);

    const cameroonTimer = setTimeout(() => {
      setHighlightCameroon(true);
      setTimeout(() => setHighlightCameroon(false), 3200);
    }, 3600);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearInterval(featureInterval);
      clearInterval(glowInterval);
      clearTimeout(cameroonTimer);
    };
  }, [visible, duration, onFinish, steps.length, features.length]);

  // animate paths inside rendered AfricaSVG
  useEffect(() => {
    if (!visible || !pathRef.current) return;

    const svgRoot = pathRef.current;
    // SVGR wraps the SVG; query for inner SVG element if present
    const innerSvg = svgRoot.nodeName === 'svg' ? svgRoot : svgRoot.querySelector('svg') || svgRoot;
    const paths = innerSvg.querySelectorAll('path, polygon, polyline, circle, rect');

    if (!paths || paths.length === 0) return;

    paths.forEach((el, i) => {
      try {
        const length = el.getTotalLength ? el.getTotalLength() : 0;
        el.style.transition = 'none';
        if (length) {
          el.style.strokeDasharray = `${length}`;
          el.style.strokeDashoffset = `${length}`;
        }
        el.style.stroke = '#1e3a8a';
        el.style.strokeWidth = '1.2';
        el.style.fillOpacity = '0';
        setTimeout(() => {
          el.style.transition = 'stroke-dashoffset 1.6s ease-out, fill 0.9s ease 0.8s';
          if (length) el.style.strokeDashoffset = '0';
          setTimeout(() => {
            el.style.fill = 'url(#africa-gradient)';
            el.style.fillOpacity = '0.95';
            el.style.stroke = '#0ea5a0';
            el.style.animation = 'pulse 3.2s ease-in-out infinite';
          }, 1000 + i * 80);
        }, i * 120);
      } catch (e) {
        el.style.transition = 'opacity 1s ease';
        el.style.opacity = '1';
      }
    });

    // Cameroon overlay animation (we use <img>, so animate its container)
    if (cameroonRef.current) {
      const node = cameroonRef.current;
      node.style.transition = 'transform 0.8s ease, opacity 0.8s ease';
      node.style.opacity = highlightCameroon ? '1' : '0';
      node.style.transform = highlightCameroon ? 'scale(1.0)' : 'scale(0.92)';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, highlightCameroon]);

  // keyboard shortcuts
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleSkip();
      }
      if (e.key.toLowerCase() === 'c') {
        setHighlightCameroon(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, handleSkip]);

  if (!visible) return null;

  const glowIntensity = 0.4 + 0.6 * Math.abs(Math.sin(glowPhase));

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-start overflow-y-auto py-8 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 transition-colors duration-700"
      role="dialog"
      aria-label="Welcome to PKFIE-Hub"
      aria-live="polite"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border rounded-full -translate-x-1/2 -translate-y-1/2 border-blue-300/30 dark:border-blue-600/30" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 border rounded-full translate-x-1/3 translate-y-1/3 border-emerald-300/30 dark:border-emerald-600/30" />
        <div className="absolute inset-0 opacity-6" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Floating feature cards */}
      {features.map((feature, idx) => {
        const posClass = idx === 0 ? 'top-10 left-10' : idx === 1 ? 'top-10 right-10' : idx === 2 ? 'bottom-10 left-10' : 'bottom-10 right-10';
        return (
          <div
            key={feature.text}
            className={`absolute transform transition-all duration-1000 ${idx === activeFeature ? 'opacity-100 scale-100' : 'opacity-30 scale-90'} ${posClass}`}
          >
            <div className={`backdrop-blur-sm rounded-2xl p-4 border ${idx === activeFeature ? 'border-blue-500/30 bg-white/20 dark:bg-slate-800/30 shadow-xl' : 'border-slate-200/30 bg-white/10 dark:border-slate-700/30 dark:bg-slate-800/10'}`}>
              <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(90deg,#60a5fa,#06b6d4)' }}>
                <feature.icon className="text-white text-xl" />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{feature.text}</span>
            </div>
          </div>
        );
      })}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 md:px-8 max-w-6xl mx-auto w-full">
        {/* Logo & title */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <FaGraduationCap className="text-white text-lg" />
              </div>
              <div className="absolute -inset-1 rounded-xl blur-md opacity-30" style={{ background: 'linear-gradient(90deg,#60a5fa,#8b5cf6)' }} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#60A5FA,#10B981,#8B5CF6)' }}>
              PKFIE-Hub
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">PKFokam Institute of Excellence • AI-Powered Academic Platform</p>
        </div>

        {/* Map + stats */}
        <div className="relative mb-8 md:mb-12">
          {/* Hidden defs used by JS-driven fills */}
          <svg width="0" height="0" aria-hidden>
            <defs>
              <linearGradient id="africa-gradient" x1="0" x2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="33%" stopColor="#10B981" />
                <stop offset="66%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>

          <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
            {/* Regional indicators overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {africanRegions.map((region) => (
                <div
                  key={region.name}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${highlightCameroon && region.name === 'Central' ? 'scale-125' : 'scale-100'} ${region.position}`}
                >
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: region.color }} />
                    <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: region.color, animationDelay: Math.random() + 's' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Africa SVG - wrapped so we can query paths */}
            <div ref={pathRef} className="w-full h-[400px] max-w-[680px] mx-auto">
              <AfricaSVG
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full drop-shadow-xl"
                style={{ filter: `drop-shadow(0 0 ${12 + glowIntensity * 24}px rgba(59,130,246,${0.25 + glowIntensity * 0.25}))` }}
              />
            </div>

            {/* Cameroon overlay using <img> to avoid compilation issues */}
            <div
              ref={cameroonRef}
              className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${highlightCameroon ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
              style={{ width: 96, height: 96, pointerEvents: 'none' }}
            >
              <img src={cameroonUrl} alt="Cameroon highlight" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            {/* Statistics row */}
            <div className="flex justify-center gap-6 mt-6 flex-wrap">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">54</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">1.4B</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">People</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">∞</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Potential</div>
              </div>
            </div>
          </div>

          {/* Rotating border */}
          <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-blue-500 via-emerald-500 to-violet-500 bg-clip-padding animate-spin-slow" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor' }} />
        </div>

        {/* Progress & steps */}
        <div className="w-full max-w-3xl space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Initializing Academic Platform</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {Math.round(progress)}%{isLoaded && <span className="ml-2 text-emerald-600 dark:text-emerald-400">✓ Ready</span>}
              </span>
            </div>

            <div className="relative">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#3B82F6,#06b6d4,#8B5CF6)' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const bgClass = step.color.replace('text', 'bg') + '/10';
              const borderClass = step.color.replace('text', 'border') + '/20';
              return (
                <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${isActive ? 'opacity-100 scale-105' : 'opacity-60 scale-100'}`}>
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-lg ${bgClass} border ${borderClass} flex items-center justify-center`}>
                      <Icon className={`text-lg ${step.color}`} />
                    </div>
                    {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{step.text}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{isActive ? 'Processing...' : 'Queued...'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action */}
        <button
          onClick={handleSkip}
          className="mt-10 group relative overflow-hidden px-10 py-3 rounded-xl font-semibold transition-all duration-500 bg-gradient-to-r from-blue-600 via-emerald-500 to-violet-600 text-white shadow-lg hover:shadow-xl"
          aria-label="Enter platform"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <span className="relative flex items-center gap-3">
            <span>Enter Academic Platform</span>
            <FiCheckCircle className="text-xl transform group-hover:scale-110 transition-all" />
          </span>
        </button>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">PKFIE-Hub — A student-led initiative for transparency and excellence</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>© {new Date().getFullYear()} PKFokam Institute of Excellence</span>
            <span>•</span>
            <span>Press <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">ESC</kbd> to skip</span>
            <span>•</span>
            <button onClick={() => setHighlightCameroon(prev => !prev)} className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Press <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">C</kbd> to highlight Cameroon</button>
          </div>
        </div>
      </div>

      {/* Inline styles */}
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 0.85; transform: scale(1);} 50% { opacity: 1; transform: scale(1.04);} }
        @keyframes spin-slow { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(0deg);} 50% { transform: translateY(-20px) rotate(10deg);} }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-ping { animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite; }
        @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
      `}</style>
    </div>
  );
}  // <-- End of the component (only one!)