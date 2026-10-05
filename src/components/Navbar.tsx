import React from 'react';
import { LogOut, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import type { User } from '../types.ts';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  activeView: 'dashboard' | 'admin';
  onViewChange?: (view: 'dashboard' | 'admin') => void;
  hasLoadedReport?: boolean;
  onResetReport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  activeView,
  onViewChange,
  hasLoadedReport,
  onResetReport,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-wider">
            UID
          </div>
          <div>
            <a href="#" className="text-base font-bold tracking-tight text-white hover:text-slate-200 transition-colors">
              UIDAI EOD Reconciliation
            </a>
            <div className="text-xs text-slate-400 hidden sm:block">
              In-Memory Financial Reporting Engine
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented View */}
        <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
          {user.role === 'admin' ? (
            <div className="flex items-center bg-slate-800 p-1 rounded-md border border-slate-700">
              <button
                type="button"
                onClick={() => onViewChange?.('dashboard')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                EOD Processor
              </button>
              <button
                type="button"
                onClick={() => onViewChange?.('admin')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeView === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Admin Console
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">RAM-Only Buffer Active</span>
              <span aria-hidden="true" className="hidden md:inline">·</span>
              <span>Zero-Disk Policy Enforced</span>
            </div>
          )}

          {hasLoadedReport && onResetReport && (
            <button
              type="button"
              onClick={onResetReport}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-800/80 rounded hover:bg-amber-900/60 transition-colors"
              title="Purge current report from memory and re-upload"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset / Re-upload</span>
            </button>
          )}
        </nav>

        {/* Zone 3: User Details & Logout Action */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-200 flex items-center justify-end gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{user.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              ID: {user.userId} · {user.role === 'admin' ? 'Admin' : 'Operator'}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
