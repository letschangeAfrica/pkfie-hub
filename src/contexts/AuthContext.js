import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, clearAccessToken, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore the session using the httpOnly refresh cookie.
  // If the cookie is present Django returns a fresh access token; if not, user is logged out.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const res = await api.post('/auth/token-refresh/');
        setAccessToken(res.data.access);
        const profile = await api.get('/auth/profile/');
        if (!cancelled) setCurrentUser(profile.data.user || profile.data);
      } catch {
        clearAccessToken();
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // When the interceptor detects a hard auth failure (refresh token expired/revoked),
  // wipe the in-memory state so the UI shows the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(null);
    });
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login/', { email, password });
      const { access, user } = res.data;
      setAccessToken(access);
      setCurrentUser(user);
      return { success: true, user };
    } catch (error) {
      setCurrentUser(null);
      clearAccessToken();
      return {
        success: false,
        message: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch {
      // Best effort — clear state even if the request fails.
    }
    clearAccessToken();
    setCurrentUser(null);
  };

  const updateProfile = async (profileData) => {
    const response = await api.put('/auth/profile/', profileData);
    setCurrentUser(response.data.user || response.data);
    return response;
  };

  const isAuthenticated = !!currentUser;
  const isAdmin    = currentUser?.role === 'admin' || currentUser?.is_staff === true || currentUser?.is_superuser === true;
  const isLecturer = currentUser?.role === 'lecturer';
  const isParent   = currentUser?.role === 'parent';
  const isStudent  = currentUser?.role === 'student';

  const value = {
    currentUser,
    setCurrentUser,
    login,
    logout,
    updateProfile,
    isAuthenticated,
    isAdmin,
    isLecturer,
    isStudent,
    isParent,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
