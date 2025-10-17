import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api'; // your axios instance

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for token and fetch profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/profile/')
        .then(res => {
          setCurrentUser(res.data.user || res.data);
        })
        .catch(() => {
          setCurrentUser(null);
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login/', { email, password });
      const { access, user } = res.data;
      localStorage.setItem('token', access);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      setCurrentUser(user);
      return { success: true, user };
    } catch (error) {
      setCurrentUser(null);
      localStorage.removeItem('token');
      return {
        success: false,
        message: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (profileData) => {
    const response = await api.put('/auth/profile/', profileData);
    setCurrentUser(response.data.user || response.data);
    return response;
  };

  // Utility: wait until finished loading and check for admin
  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';
  const isStudent = currentUser?.role === 'student';
  const isParent = currentUser?.role === 'parent';

  const value = {
    currentUser,
    setCurrentUser,
    login,
    logout,
    updateProfile,
    isAuthenticated,
    isAdmin,
    isStaff,
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