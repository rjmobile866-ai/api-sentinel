import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Terminal, AlertTriangle, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings } = useSiteSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Check against stored password from settings
    const storedPassword = settings.adminPassword || '12345';
    if (password === storedPassword) {
      // Store admin session in sessionStorage
      sessionStorage.setItem('adminAuth', 'true');
      toast.success('Access granted!');
      navigate('/admin/dashboard');
    } else {
      toast.error('Invalid password');
      setPassword('');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      
      {/* Warning Banner */}
      <div className="w-full max-w-md mb-6 p-3 border border-warning/50 bg-warning/10 rounded-lg flex items-center gap-3 relative z-10">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
        <p className="text-sm text-warning">
          ⚠️ Yeh tool sirf authorized testing ke liye hai.
        </p>
      </div>

      <Card className="w-full max-w-md border-primary/30 bg-card/80 backdrop-blur glow-primary relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/30 glow-primary">
              <Lock className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-primary text-glow font-bold">
            ADMIN PANEL<span className="terminal-cursor"></span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">MASTER PASSWORD</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                autoFocus
                className="bg-input border-primary/30 focus:border-primary focus:glow-primary text-foreground text-center text-lg tracking-widest"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ACCESSING...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  UNLOCK ADMIN
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center relative z-10">
        🔐 Secure access required
      </p>
    </div>
  );
};

export default AdminLogin;
