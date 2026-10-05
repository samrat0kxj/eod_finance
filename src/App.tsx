import React, { useState, useEffect } from 'react';
import type { User } from './types.ts';
import { api, getStoredToken } from './lib/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { UserDashboard } from './components/UserDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'admin'>('dashboard');
  const [hasLoadedReport, setHasLoadedReport] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user } = await api.getMe();
        setCurrentUser(user);
        if (user.role === 'admin') {
          setActiveView('admin');
        } else {
          setActiveView('dashboard');
        }
      } catch {
        // token expired or invalid
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveView('admin');
    } else {
      setActiveView('dashboard');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setHasLoadedReport(false);
  };

  const handleResetCurrentReport = () => {
    setResetCounter((c) => c + 1);
    setHasLoadedReport(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
            Initializing Secure In-Memory Environment...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200">
          UIDAI Financial Reconciliation System · Zero-Disk Storage Security Architecture
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
          activeView={activeView}
          onViewChange={setActiveView}
          hasLoadedReport={hasLoadedReport}
          onResetReport={handleResetCurrentReport}
        />

        <main>
          {activeView === 'admin' && currentUser.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <UserDashboard
              key={resetCounter}
              user={currentUser}
              onReportLoadedChange={setHasLoadedReport}
              resetTrigger={resetCounter}
            />
          )}
        </main>
      </div>

      <footer className="py-5 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Encrypted In-Memory Stream Verified</span>
            <span>·</span>
            <span>Zero Disk Persistence</span>
          </div>
          <div className="text-slate-400">
            UIDAI Enrolment Client Status Report Reconciliation (EOD)
          </div>
        </div>
      </footer>
    </div>
  );
}
