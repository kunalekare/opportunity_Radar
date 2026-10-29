import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600/90 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white shadow-lg border border-amber-500/50">
      <WifiOff className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
      <span>Offline Mode — Cached Opportunity data is being used.</span>
    </div>
  );
};
