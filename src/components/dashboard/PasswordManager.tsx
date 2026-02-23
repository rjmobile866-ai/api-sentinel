import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KeyRound, Plus, Trash2, Copy, RefreshCw, Loader2, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserPassword {
  id: string;
  password: string;
  device_ip: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

const PasswordManager: React.FC = () => {
  const [passwords, setPasswords] = useState<UserPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');

  const fetchPasswords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_passwords')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPasswords(data as UserPassword[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPasswords();

    const channel = supabase
      .channel('user_passwords_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_passwords' }, () => {
        fetchPasswords();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pw);
  };

  const addPassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Password daalo ya Generate karo');
      return;
    }
    const { error } = await supabase.from('user_passwords').insert({ password: newPassword.trim() });
    if (error) {
      toast.error('Failed to add password');
    } else {
      toast.success('Password added!');
      setNewPassword('');
      fetchPasswords();
    }
  };

  const deletePassword = async (id: string) => {
    const { error } = await supabase.from('user_passwords').delete().eq('id', id);
    if (!error) {
      toast.success('Password deleted - user will be logged out');
      fetchPasswords();
    }
  };

  const resetIp = async (id: string) => {
    const { error } = await supabase
      .from('user_passwords')
      .update({ device_ip: null })
      .eq('id', id);
    if (!error) {
      toast.success('IP reset - password can be used on new device');
      fetchPasswords();
    }
  };

  const copyPassword = (pw: string) => {
    navigator.clipboard.writeText(pw);
    toast.success('Copied!');
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="h-0.5 w-full bg-gradient-to-r from-accent via-primary to-secondary" />
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent font-bold text-sm tracking-wider">
            <KeyRound className="w-4 h-4" />
            USER PASSWORDS
            <Badge className="text-[10px] bg-accent/10 text-accent border-accent/20 rounded-lg">
              {passwords.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchPasswords} className="h-7 px-2 text-muted-foreground rounded-lg">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Add new password */}
        <div className="flex gap-2">
          <Input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Custom password..."
            className="bg-input/50 border-accent/15 focus:border-accent text-sm rounded-xl flex-1"
          />
          <Button onClick={generatePassword} variant="outline" size="sm" className="border-accent/20 text-accent hover:bg-accent/10 rounded-xl px-3">
            🎲
          </Button>
          <Button onClick={addPassword} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-3">
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {/* Password List */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {loading && passwords.length === 0 ? (
              <div className="text-center py-6">
                <Loader2 className="w-5 h-5 mx-auto animate-spin text-accent" />
              </div>
            ) : passwords.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <KeyRound className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Koi password nahi. Generate karo!</p>
              </div>
            ) : (
              passwords.map((pw) => (
                <div key={pw.id} className="p-3 rounded-xl glass border-muted/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-bold text-foreground tracking-wider">{pw.password}</code>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyPassword(pw.password)} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-lg">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deletePassword(pw.id)} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-lg">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {pw.device_ip ? (
                        <>
                          <Wifi className="w-2.5 h-2.5 text-primary" />
                          <span className="text-primary">{pw.device_ip}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetIp(pw.id)}
                            className="h-4 px-1.5 text-[9px] text-warning hover:text-warning rounded"
                          >
                            Reset IP
                          </Button>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-2.5 h-2.5 text-muted-foreground" />
                          <span>Not connected</span>
                        </>
                      )}
                    </div>
                    <span>{new Date(pw.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PasswordManager;
