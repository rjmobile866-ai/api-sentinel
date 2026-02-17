import React, { useState } from 'react';
import { AlertTriangle, Send, Skull } from 'lucide-react';
import QuickHitEngine from '@/components/QuickHitEngine';
import LogsPanel from '@/components/dashboard/LogsPanel';
import { useLogs } from '@/hooks/useLogs';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const HomePage = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const { settings } = useSiteSettings();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-background flex flex-col relative">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-matrix pointer-events-none" />
      <div className="absolute inset-0 scanline pointer-events-none" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(150 100% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(150 100% 50%) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Splash Dialog */}
      <Dialog open={showSplash} onOpenChange={setShowSplash}>
        <DialogContent className="bg-card border-primary/40 text-center max-w-xs neon-border">
          <div className="space-y-3 py-2">
            <Skull className="w-8 h-8 mx-auto text-secondary animate-flicker" />
            <p className="text-lg font-bold gradient-text tracking-widest">Created by D4RK</p>
            <a
              href="https://t.me/queenmeth"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all duration-300 text-sm font-medium glow-secondary"
            >
              <Send className="w-4 h-4" />
              Telegram: @queenmeth
            </a>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Header */}
      <header className="border-b border-primary/30 bg-card/90 backdrop-blur-xl sticky top-0 z-50 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h1 className="text-xl font-black tracking-[0.2em] text-primary text-glow animate-flicker">
              {settings.siteName}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.6s' }} />
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-3 relative z-10">
        {/* Warning Banner */}
        <div className="w-full p-2.5 border border-warning/30 bg-warning/5 rounded-lg flex items-center gap-2 neon-border-pink">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 animate-pulse" />
          <p className="text-xs text-warning font-medium">
            {settings.warningText}
          </p>
        </div>

        {/* Quick Hit Engine - INPUT FIRST */}
        <QuickHitEngine onLogCreate={addLog} />

        {/* Logs Panel - BELOW */}
        <LogsPanel logs={logs} onClear={clearLogs} />
      </main>
    </div>
  );
};

export default HomePage;
