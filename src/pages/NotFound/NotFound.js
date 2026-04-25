import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiSearch, 
  FiHome, 
  FiFlag, 
  FiBook, 
  FiHelpCircle, 
  FiCompass,
  FiArrowRight,
  FiZap,
  FiMessageSquare,
  FiTarget,
  FiUsers,
  FiStar
} from 'react-icons/fi';
import { FaRobot, FaGraduationCap, FaRocket } from 'react-icons/fa';

export default function NotFound() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const titleRef = useRef(null);
  const [toast, setToast] = useState(null);

  // Toast effect
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.title = '404 — Page not found • PKFIE-Hub';
    // focus the title for keyboard & screen reader users
    if (titleRef.current) {
      try {
        titleRef.current.focus({ preventScroll: true });
      } catch {
        titleRef.current.focus();
      }
    }
    window.scrollTo(0, 0);
  }, []);

  function onSearchSubmit(e) {
    e.preventDefault();
    const q = (query || '').trim();
    if (!q) {
      navigate('/', { replace: true });
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  const handleQuickAction = (path, message) => {
    setToast({ type: "success", message });
    setTimeout(() => navigate(path), 300);
  };

  // Custom animations matching your design system
  const customStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes bounceIn {
      0% { opacity: 0; transform: scale(0.3); }
      50% { opacity: 1; transform: scale(1.05); }
      70% { transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
    .animate-slide-in-left { animation: slideInLeft 0.5s ease-out; }
    .animate-slide-in-right { animation: slideInRight 0.5s ease-out; }
    .animate-scale-in { animation: scaleIn 0.4s ease-out; }
    .animate-bounce-in { animation: bounceIn 0.8s ease-out; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .card-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-hover:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .button-hover {
      transition: all 0.3s ease;
    }
    .button-hover:hover {
      transform: translateY(-2px);
    }
    .toast-enter {
      animation: slideInRight 0.3s ease-out;
    }
  `;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6" role="main" aria-labelledby="nf-title">
      <style>{customStyles}</style>

      {/* Toast notifications */}
      <div aria-live="polite" className="fixed top-6 right-6 z-50">
        {toast && (
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg toast-enter bg-emerald-50 border border-emerald-200 text-emerald-700`}>
            <FiStar className="text-xl" />
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        )}
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Content Section */}
        <section className="space-y-8 animate-slide-in-left">
          {/* Error Code & Title */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-lg">
                <FiZap className="text-2xl" />
              </div>
              <div>
                <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Error 404</div>
                <h1
                  id="nf-title"
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 leading-tight"
                >
                  Page Not Found
                </h1>
              </div>
            </div>

            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
              The page you're looking for doesn't exist or has been moved. Don't worry - let's get you back on track with PKFIE-Hub.
            </p>

            {/* Search Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FiSearch className="text-blue-500" />
                Search PKFIE-Hub
              </h3>
              <form onSubmit={onSearchSubmit} role="search" aria-label="Search site" className="flex gap-3">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search programs, handbook, announcements..."
                    aria-label="Search"
                    autoComplete="off"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all button-hover flex items-center gap-2"
                >
                  <FiSearch className="text-lg" />
                  Search
                </button>
              </form>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FiZap className="text-amber-500" />
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleQuickAction("/", "Welcome back to Dashboard! 🎉")}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all card-hover text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FiHome className="text-xl" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Dashboard</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Return to home</div>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleQuickAction("/assistant", "AI Assistant is ready to help! 🤖")}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all card-hover text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
                      <FaRobot className="text-xl" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">AI Assistant</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Get help & answers</div>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleQuickAction("/handbook", "Opening Student Handbook 📚")}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all card-hover text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <FiBook className="text-xl" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Handbook</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Student resources</div>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleQuickAction("/pathfinder", "Explore academic paths 🧭")}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all card-hover text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <FiCompass className="text-xl" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Pathfinder</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Program explorer</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <FiMessageSquare className="text-xl" />
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-100">Need Help?</div>
                <div className="text-lg font-bold">We're here to assist you</div>
              </div>
            </div>
            <p className="text-blue-100 text-sm mb-4 leading-relaxed">
              Can't find what you're looking for? Our support team is ready to help you navigate PKFIE-Hub.
            </p>
            <div className="flex gap-3">
              <Link 
                to="/contact" 
                className="flex-1 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-all button-hover text-center"
              >
                Contact Support
              </Link>
              <Link 
                to="/feedback" 
                className="flex-1 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all button-hover text-center"
              >
                Give Feedback
              </Link>
            </div>
          </div>
        </section>

        {/* Graphic Section */}
        <section aria-hidden="true" className="flex items-center justify-center animate-slide-in-right">
          <div className="relative w-full max-w-lg">
            {/* Main Graphic */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 shadow-2xl">
              <div className="text-center space-y-6">
                {/* Animated 404 */}
                <div className="relative">
                  <div className="text-8xl font-black text-slate-900 dark:text-slate-100 mb-2 animate-bounce-in">
                    404
                  </div>
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-rose-500 rounded-full animate-float"></div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-amber-500 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
                </div>
                
                {/* Illustration */}
                <div className="relative mx-auto w-48 h-48">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl transform rotate-12 animate-float"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl transform -rotate-6 animate-float" style={{animationDelay: '1.5s'}}></div>
                  <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-lg">
                    <FaGraduationCap className="text-6xl text-slate-400 dark:text-slate-600" />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-6">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">50+</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Programs</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">95%</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Success Rate</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">24/7</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Support</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-400 rounded-full animate-float opacity-60"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-green-400 rounded-full animate-float opacity-60" style={{animationDelay: '2s'}}></div>
            <div className="absolute top-1/2 -right-6 w-4 h-4 bg-purple-400 rounded-full animate-float opacity-60" style={{animationDelay: '1s'}}></div>
          </div>
        </section>
      </div>
    </main>
  );
}