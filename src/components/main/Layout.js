import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, theme, setTheme }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeSidebar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSidebar]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <>
      {/* Skip to main content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50
          focus:px-4 focus:py-2 focus:rounded-lg focus:bg-gold focus:text-navy-900
          focus:font-bold focus:text-sm focus:shadow-gold-md focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen bg-slate-50 dark:bg-navy-950">

        <Sidebar
          sidebarOpen={sidebarOpen}
          onClose={closeSidebar}
          onNavClick={closeSidebar}
        />

        {/* Main area — pushes right of sidebar on large screens */}
        <div className="flex flex-col flex-1 min-h-screen lg:ml-64 transition-[margin] duration-300 ease-smooth">
          <main id="main-content" tabIndex={-1} className="flex flex-col flex-1 outline-none">
            <Header
              theme={theme}
              setTheme={setTheme}
              onMenuToggle={() => setSidebarOpen(v => !v)}
              sidebarOpen={sidebarOpen}
            />
            <div className="flex-1 p-5 sm:p-8">
              {children}
            </div>
          </main>

          <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1
            px-8 py-4 bg-navy-900 border-t border-navy-700/40
            text-[11px] text-white/50 font-medium">
            <span>&copy; {new Date().getFullYear()} PKFe-Hub — PKFokam Institute of Excellence</span>
            <span className="text-white/30">A student-led initiative for transparency and excellence</span>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Layout;
