import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import UserManagement from '../../pages/admin/UserManagement';
import DocumentManagement from '../../pages/admin/DocumentManagement';
import AnnouncementManagement from '../../pages/admin/AnnouncementManagement';
import EventManagement from '../../pages/admin/EventManagement';
import FeedbackManagement from '../../pages/admin/FeedbackManagement';
import AIModelManagement from '../../pages/admin/AIModelManagement';
import SystemSettings from '../../pages/admin/SystemSettings';
import AdminSearchResults from '../../pages/admin/AdminSearchResults';
import AdminNotifications from '../../pages/admin/AdminNotifications';
import CalendarManagement from '../../pages/admin/CalendarManagement';

function AdminNotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-7xl font-black text-navy-700 select-none">404</p>
      <p className="text-lg font-black text-white mt-3">Page not found</p>
      <p className="text-sm text-navy-400 mt-1 mb-6">This admin page doesn't exist.</p>
      <button
        onClick={() => navigate('/admin')}
        className="px-5 py-2.5 rounded-xl text-sm font-black text-navy-900 transition-all hover:-translate-y-px"
        style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default function AdminLayout() {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(v => !v);
    } else {
      setCollapsed(v => !v);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Content area — no left margin on mobile (sidebar overlays), margin on desktop */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        collapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <AdminHeader onToggleSidebar={handleToggleSidebar} />

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Routes>
            <Route index                   element={<AdminDashboard />}         />
            <Route path="users"            element={<UserManagement />}         />
            <Route path="documents"        element={<DocumentManagement />}     />
            <Route path="announcements"    element={<AnnouncementManagement />} />
            <Route path="events"           element={<EventManagement />}        />
            <Route path="calendar"         element={<CalendarManagement />}     />
            <Route path="feedback"         element={<FeedbackManagement />}     />
            <Route path="ai-model"         element={<AIModelManagement />}      />
            <Route path="settings"         element={<SystemSettings />}         />
            <Route path="search"           element={<AdminSearchResults />}     />
            <Route path="notifications"    element={<AdminNotifications />}     />
            <Route path="*"                element={<AdminNotFound />}          />
          </Routes>
        </main>
      </div>
    </div>
  );
}
