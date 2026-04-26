import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const Ctx = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const lastFetchRef = useRef(0);

  const fetchNotifications = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetchRef.current < 60_000) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    lastFetchRef.current = Date.now();
    try {
      const res = await axios.get(
        `${BASE_URL}/api/notifications/?ordering=-created_at&page_size=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(res.data.results || res.data || []);
    } catch {
      // silently ignore — keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `${BASE_URL}/api/notifications/${id}/`,
        { read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    const token = localStorage.getItem('token');
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    await Promise.allSettled(
      unread.map(n =>
        axios.patch(
          `${BASE_URL}/api/notifications/${n.id}/`,
          { read: true },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      )
    );
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications]);

  // Fetch on mount then every 90 s
  useEffect(() => {
    fetchNotifications(true);
    const id = setInterval(() => fetchNotifications(true), 90_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{ notifications, loading, unreadCount, fetchNotifications, markRead, markAllRead }}>
      {children}
    </Ctx.Provider>
  );
};

export const useNotifications = () => useContext(Ctx);
