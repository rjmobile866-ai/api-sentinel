import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, Terminal } from 'lucide-react';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-primary/30 bg-card/50 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 glow-primary">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary text-glow flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              API TESTER
            </h1>
            <p className="text-xs text-muted-foreground">Authorized Testing Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">OPERATOR</p>
            <p className="text-sm text-primary">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:glow-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            LOGOUT
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
