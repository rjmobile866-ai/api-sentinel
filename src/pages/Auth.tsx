import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Terminal, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary text-glow animate-pulse">
          <Terminal className="w-12 h-12" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) {
      toast.error(error.message);
    } else if (!isLogin) {
      toast.success('Account created! Check your email to verify.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background scanline p-4">
      <div className="absolute inset-0 gradient-matrix pointer-events-none" />
      
      {/* Warning Banner */}
      <div className="w-full max-w-md mb-6 p-3 border border-warning/50 bg-warning/10 rounded-lg flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
        <p className="text-sm text-warning">
          ⚠️ Yeh tool sirf authorized testing aur educational purpose ke liye hai.
        </p>
      </div>

      <Card className="w-full max-w-md border-primary/30 bg-card/80 backdrop-blur glow-primary">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/30 glow-primary">
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-primary text-glow font-bold">
            API TESTER<span className="terminal-cursor"></span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? 'Access your secure dashboard' : 'Create your operator account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">EMAIL</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@domain.com"
                required
                className="bg-input border-primary/30 focus:border-primary focus:glow-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">PASSWORD</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-input border-primary/30 focus:border-primary focus:glow-primary text-foreground"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-bold"
            >
              {isSubmitting ? 'PROCESSING...' : isLogin ? 'ACCESS SYSTEM' : 'CREATE ACCOUNT'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Secure connection established • All data encrypted
      </p>
    </div>
  );
};

export default Auth;
