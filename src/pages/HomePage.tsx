import React from 'react';
import { AlertTriangle } from 'lucide-react';
import QuickHitEngine from '@/components/QuickHitEngine';
import LogsPanel from '@/components/dashboard/LogsPanel';
import { useLogs } from '@/hooks/useLogs';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background scanline">
      <div className="absolute inset-0 gradient-matrix pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-primary/30 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary text-glow">API TESTER</h1>
          <Button
            onClick={() => navigate('/admin')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-bold"
          >
            🔐 ADMIN PANEL
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Warning Banner */}
        <div className="w-full p-3 border border-warning/50 bg-warning/10 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-warning">
            ⚠️ Yeh tool sirf authorized testing aur educational purpose ke liye hai.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Hit Engine */}
          <QuickHitEngine onLogCreate={addLog} />

          {/* Logs */}
          <LogsPanel logs={logs} onClear={clearLogs} />
        </div>
      </main>
    </div>
  );
};

export default HomePage;
