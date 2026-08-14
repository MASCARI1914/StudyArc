import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import LogoutLayout from './components/LogoutLayout';

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  // 🔄 Επαλήθευση Session στο Refresh (F5)
  useEffect(() => {
    const verifyStoredSession = async () => {
      const savedUser = sessionStorage.getItem('studyarc_user');
      if (!savedUser) {
        setLoadingSession(false);
        return;
      }

      try {
        const parsed = JSON.parse(savedUser);
        const res = await axios.post(`${API_URL}/api/auth/verify`, {
          token: parsed.token
        });

        if (res.data && res.data.status === "success") {
          setUser({
            token: parsed.token,
            user_id: res.data.user_id,
            username: res.data.username,
            role_id: res.data.role_id
          });
        } else {
          sessionStorage.removeItem('studyarc_user');
          setUser(null);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        sessionStorage.removeItem('studyarc_user');
        setUser(null);
      } finally {
        setLoadingSession(false);
      }
    };

    verifyStoredSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    sessionStorage.setItem('studyarc_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (user?.token) {
        await axios.post(`${API_URL}/api/auth/logout`, { token: user.token });
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
    
    sessionStorage.removeItem('studyarc_user');
    setTimeout(() => {
      setUser(null);
      setIsLoggingOut(false);
    }, 1200);
  };

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-sans">
        <p className="text-sm font-bold tracking-widest text-purple-400 animate-pulse uppercase">
          Φόρτωση StudyArc...
        </p>
      </div>
    );
  }

  if (isLoggingOut) {
    return <LogoutLayout />;
  }

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return user.role_id === 1 ? (
    <AdminDashboard user={user} onLogout={handleLogout} />
  ) : (
    <Dashboard user={user} onLogout={handleLogout} />
  );
}