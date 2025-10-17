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
import AdminSearchResults from './pages/admin/AdminSearchResults';
import CampusShowcase from './pages/main/CampusShowcase'; // <-- The new, modern gallery page
import './App.css';

// ProtectedRoute implementation for role-based protection
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" />;
  return children;
};

// Prevent access to login page if already authenticated
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin/AdminDashboard" />;
    return <Navigate to="/" />;
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
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <AuthProvider>
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
            <ProtectedRoute>
              <Layout theme={theme} setTheme={setTheme}>
                <Pathfinder />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/innovation" element={
            <ProtectedRoute>
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

          {/* Admin Panel Protected Routes */}
          <Route path="/admin/AdminDashboard" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminLayout theme={theme} setTheme={setTheme} />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="documents" element={<DocumentManagement />} />
            <Route path="announcements" element={<AnnouncementManagement />} />
            <Route path="events" element={<EventManagement />} />
            <Route path="feedback" element={<FeedbackManagement />} />
            <Route path="ai-model" element={<AIModelManagement />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="search" element={<AdminSearchResults />} />
          </Route>

          {/* Fallback: 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;