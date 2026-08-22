import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import LogoutLayout from './components/LogoutLayout';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  // 🔄 Έλεγχος Session κατά την εκκίνηση
  useEffect(() => {
    const verifyStoredSession = async () => {
      const savedUser = sessionStorage.getItem('studyarc_user') || localStorage.getItem('studyarc_user');
      if (!savedUser) {
        setLoadingSession(false);
        return;
      }

      try {
        const parsed = JSON.parse(savedUser);
        
        // Επιβεβαίωση χρήστη από το Supabase
        const { data, error } = await supabase
          .from('users')
          .select('id, username, role_id, total_xp, level, tokens')
          .eq('id', parsed.user_id)
          .single();

        if (data && !error) {
          setUser({
            token: parsed.token || 'session-active',
            user_id: data.id,
            username: data.username,
            role_id: data.role_id
          });
        } else {
          sessionStorage.removeItem('studyarc_user');
          localStorage.removeItem('studyarc_user');
          setUser(null);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        sessionStorage.removeItem('studyarc_user');
        localStorage.removeItem('studyarc_user');
        setUser(null);
      } finally {
        setLoadingSession(false);
      }
    };

    verifyStoredSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    sessionStorage.setItem('studyarc_user', JSON.stringify(userData));
    localStorage.setItem('studyarc_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    sessionStorage.removeItem('studyarc_user');
    localStorage.removeItem('studyarc_user');
    
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