import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import './AdminLayout.css';

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="adm-layout">
      <AdminSidebar collapsed={sidebarCollapsed} />
      
      <div className={`adm-content ${sidebarCollapsed ? 'adm-collapsed' : ''}`}>
        <AdminHeader onToggleSidebar={toggleSidebar} />
        
        <main className="adm-main">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="documents" element={<DocumentManagement />} />
            <Route path="announcements" element={<AnnouncementManagement />} />
            <Route path="events" element={<EventManagement />} />
            <Route path="feedback" element={<FeedbackManagement />} />
            <Route path="ai-model" element={<AIModelManagement />} />
            <Route path="settings" element={<SystemSettings />} />
            {/* Add the search route here */}
            <Route path="search" element={<AdminSearchResults />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;