import React from 'react';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import QuickHitEngine from '@/components/QuickHitEngine';
import LogsPanel from '@/components/dashboard/LogsPanel';
import { useLogs } from '@/hooks/useLogs';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-background flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-matrix pointer-events-none" />
      <div className="absolute inset-0 scanline pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-primary/40 bg-card/80 backdrop-blur-lg sticky top-0 z-50 shrink-0">
        <div className="px-3 py-2">
          <h1 className="text-xl font-bold gradient-text tracking-tight">{settings.siteName}</h1>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Warning Banner - Compact */}
        <div className="w-full p-2 border border-warning/40 bg-warning/10 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-xs text-warning">
            {settings.warningText}
          </p>
        </div>

        {/* Logs Panel - At Top */}
        <LogsPanel logs={logs} onClear={clearLogs} />

        {/* Quick Hit Engine */}
        <QuickHitEngine onLogCreate={addLog} />
      </main>
    </div>
  );
};

export default HomePage;
