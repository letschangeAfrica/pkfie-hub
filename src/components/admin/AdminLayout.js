import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
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

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? 64 : 256;

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <AdminSidebar collapsed={collapsed} />

      {/* Content area — offset by sidebar width */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarW }}
      >
        <AdminHeader onToggleSidebar={() => setCollapsed(c => !c)} />

        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route index                   element={<AdminDashboard />}          />
            <Route path="users"            element={<UserManagement />}          />
            <Route path="documents"        element={<DocumentManagement />}      />
            <Route path="announcements"    element={<AnnouncementManagement />}  />
            <Route path="events"           element={<EventManagement />}         />
            <Route path="feedback"         element={<FeedbackManagement />}      />
            <Route path="ai-model"         element={<AIModelManagement />}       />
            <Route path="settings"         element={<SystemSettings />}          />
            <Route path="search"           element={<AdminSearchResults />}      />
            <Route path="notifications"    element={<AdminNotifications />}      />
            <Route path="*"                element={<AdminDashboard />}          />
          </Routes>
        </main>
      </div>
    </div>
  );
}
