import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/main/Layout';
import Dashboard from './pages/main/Dashboard';
import Handbook from './pages/main/Handbook';
import Assistant from './pages/main/Assistant';
import Pathfinder from './pages/main/Pathfinder';
import Innovation from './pages/main/Innovation';
import Feedback from './pages/main/Feedback';
import UserProfile from './components/userprofile/UserProfile';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import DocumentManagement from './pages/admin/DocumentManagement';
import AnnouncementManagement from './pages/admin/AnnouncementManagement';
import EventManagement from './pages/admin/EventManagement';
import FeedbackManagement from './pages/admin/FeedbackManagement';
import AIModelManagement from './pages/admin/AIModelManagement';
import SystemSettings from './pages/admin/SystemSettings';
import Login from './pages/admin/Login';
import ProgramDetail from './pages/main/ProgramDetail';
import SearchResults from './pages/main/SearchResults';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import AdminSearchResults from './pages/admin/AdminSearchResults';
import CampusShowcase from './pages/main/CampusShowcase';
import Calendar from './pages/main/Calendar';
import Notifications from './pages/main/Notifications';
import Settings from './pages/main/Settings';
import Announcements from './pages/main/Announcements';
import AdminNotifications from './pages/admin/AdminNotifications';
import NotFound from './pages/NotFound/NotFound';
import './App.css';

// ProtectedRoute implementation for role-based protection
const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles }) => {
  const { isAuthenticated, isAdmin, currentUser, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#001F5B' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,215,0,.3)', borderTopColor: '#FFD700', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) return <Navigate to="/" replace />;
  return children;
};

// Prevent access to login page if already authenticated
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#001F5B' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,215,0,.3)', borderTopColor: '#FFD700', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (isAuthenticated) {
    // send admins to /admin and normal users to main app
    if (isAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

// Wrapper to force remount ProgramDetail on code change
const ProgramDetailWithKey = () => {
  const { code } = useParams();
  return <ProgramDetail key={code} />;
};

function App() {
  // --- THEME STATE (Dark/Light) ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || "light");

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <AuthProvider>
      <NotificationsProvider>
      <Router>
        <Routes>
          {/* Main App Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/handbook" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Handbook />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/assistant" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Assistant />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/pathfinder" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Layout theme={theme} setTheme={setTheme}>
                <Pathfinder />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/innovation" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Layout theme={theme} setTheme={setTheme}>
                <Innovation />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/feedback" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Feedback />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <UserProfile />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Program Detail Page Route */}
          <Route path="/programs/:code" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <ProgramDetailWithKey />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Search Results Page */}
          <Route path="/search" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <SearchResults />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Calendar />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Notifications />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/announcements" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Announcements />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Settings theme={theme} setTheme={setTheme} />
              </Layout>
            </ProtectedRoute>
          } />

          {/* --- NEW: Campus Showcase (Gallery) Page --- */}
          <Route path="/showcase" element={
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <CampusShowcase />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Admin Login: only for unauthenticated users */}
          <Route path="/admin/login" element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          } />

          {/* Admin Panel Protected Routes (parent path = /admin) */}
          <Route path="/admin/*" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminLayout theme={theme} setTheme={setTheme} />
            </ProtectedRoute>
          }>
            {/* index -> /admin */}
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="documents" element={<DocumentManagement />} />
            <Route path="announcements" element={<AnnouncementManagement />} />
            <Route path="events" element={<EventManagement />} />
            <Route path="feedback" element={<FeedbackManagement />} />
            <Route path="ai-model" element={<AIModelManagement />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="search" element={<AdminSearchResults />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>

          {/* Fallback: 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      </NotificationsProvider>
    </AuthProvider>
  );
}

export default App;