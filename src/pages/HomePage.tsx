import React, { useState } from 'react';
import { AlertTriangle, Send, Skull, Lock } from 'lucide-react';
import QuickHitEngine from '@/components/QuickHitEngine';
import LogsPanel from '@/components/dashboard/LogsPanel';
import { useLogs } from '@/hooks/useLogs';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const HomePage = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const { settings } = useSiteSettings();
  const [showSplash, setShowSplash] = useState(true);
  
  // Password gate
  const [isAuthed, setIsAuthed] = useState(() => {
    return localStorage.getItem('userPasswordAuth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);

  const handlePasswordLogin = async () => {
    if (!password.trim()) {
      toast.error('Password daalo!');
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-password', {
        body: { password: password.trim() },
      });
      
      if (error || !data?.success) {
        toast.error(data?.error || 'Invalid password');
        setPassword('');
      } else {
        localStorage.setItem('userPasswordAuth', 'true');
        localStorage.setItem('userPasswordId', data.password_id);
        setIsAuthed(true);
        toast.success('Access granted!');
      }
    } catch (e: any) {
      toast.error('Connection error');
    } finally {
      setChecking(false);
    }
  };

  // Password gate screen
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-matrix pointer-events-none" />
        <div className="absolute inset-0 scanline pointer-events-none" />
        
        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
        
        <div className="w-full max-w-sm relative z-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl glass-card flex items-center justify-center glow-primary animate-float">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black tracking-[0.2em] gradient-text">
              {settings.siteName}
            </h1>
            <p className="text-xs text-muted-foreground tracking-wider">ENTER PASSWORD TO ACCESS</p>
          </div>
          
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-input/50 border-primary/20 focus:border-primary h-12 text-center text-lg tracking-[0.3em] rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
              autoFocus
            />
            <Button
              onClick={handlePasswordLogin}
              disabled={checking || !password}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold tracking-[0.2em] rounded-xl glow-primary hover:opacity-90 transition-all"
            >
              {checking ? 'VERIFYING...' : 'UNLOCK'}
            </Button>
          </div>
          
          <p className="text-center text-[10px] text-muted-foreground/50 tracking-wider">
            🔒 ONE PASSWORD • ONE DEVICE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-background flex flex-col relative">
      <div className="absolute inset-0 gradient-matrix pointer-events-none" />
      <div className="absolute inset-0 scanline pointer-events-none" />
      
      {/* Decorative orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/3 rounded-full blur-3xl pointer-events-none" />

      {/* Splash Dialog */}
      <Dialog open={showSplash} onOpenChange={setShowSplash}>
        <DialogContent className="glass-card border-0 text-center max-w-xs rounded-2xl">
          <div className="space-y-3 py-2">
            <Skull className="w-8 h-8 mx-auto text-secondary animate-flicker" />
            <p className="text-lg font-bold gradient-text tracking-widest">Created by D4RK</p>
            <a
              href="https://t.me/queenmeth"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass text-secondary hover:bg-secondary/10 transition-all duration-300 text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Telegram: @queenmeth
            </a>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 shrink-0">
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
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.6s' }} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-3 relative z-10">
        {/* Warning Banner */}
        <div className="w-full p-2.5 glass-card rounded-xl flex items-center gap-2 border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 animate-pulse" />
          <p className="text-xs text-warning font-medium">
            {settings.warningText}
          </p>
        </div>

        {/* Quick Hit Engine */}
        <QuickHitEngine onLogCreate={addLog} />

        {/* Logs Panel */}
        <LogsPanel logs={logs} onClear={clearLogs} />
      </main>
    </div>
  );
};

export default HomePage;
