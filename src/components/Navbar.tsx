import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Radar, User as UserIcon, LogOut, Compass, FileCheck, Layers } from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'profile' | 'sources' | 'onboarding';
  setCurrentView: (view: 'dashboard' | 'profile' | 'sources' | 'onboarding') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, profile, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Radar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                Opportunity<span className="text-cyan-400">Radar</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                PWA
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 -mt-0.5">
              AI Job, Gig & Deal Scanner
            </p>
          </div>
        </div>

        {/* Navigation Tabs (if logged in) */}
        {user && (
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                currentView === 'dashboard'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Radar Feed</span>
            </button>

            <button
              onClick={() => setCurrentView('sources')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                currentView === 'sources'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sources</span>
            </button>

            <button
              onClick={() => setCurrentView('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                currentView === 'profile'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Profile & Filters</span>
            </button>

            {!user.has_profile && (
              <button
                onClick={() => setCurrentView('onboarding')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  currentView === 'onboarding'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800 hover:bg-cyan-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Onboarding</span>
              </button>
            )}
          </nav>
        )}

        {/* Actions & User State */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton />

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                  {profile?.full_name || user.email}
                </span>
                <span className="text-[10px] text-slate-400">
                  {profile?.headline || 'Radar Calibrating'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
