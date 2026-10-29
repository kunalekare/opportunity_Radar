import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile' | 'onboarding'>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-xs font-medium">Initializing Opportunity Radar...</span>
      </div>
    );
  }

  // Not logged in -> Show Auth Page (Login / Register)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
        <AuthPage />
        <footer className="py-4 text-center text-[11px] text-slate-500 border-t border-slate-900">
          Opportunity Radar • Monorepo (FastAPI + React + PostgreSQL + Claude SDK) • Strict Manual Apply Guardrail
        </footer>
        <OfflineIndicator />
      </div>
    );
  }

  // User has no profile yet -> Direct to Onboarding Wizard
  if (!user.has_profile || currentView === 'onboarding') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
        <Navbar currentView="onboarding" setCurrentView={setCurrentView} />
        <main className="flex-1">
          <OnboardingPage
            onComplete={() => {
              setCurrentView('dashboard');
            }}
          />
        </main>
        <OfflineIndicator />
      </div>
    );
  }

  // Main Dashboard / Profile view
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1">
        {currentView === 'dashboard' ? (
          <DashboardPage onGoToProfile={() => setCurrentView('profile')} />
        ) : (
          <ProfilePage />
        )}
      </main>
      <footer className="py-5 text-center text-[11px] text-slate-500 border-t border-slate-900 max-w-7xl mx-auto w-full px-4">
        Opportunity Radar PWA • Phase 1 Foundation Active • Ready for Phase 2 Source Adapters
      </footer>
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
