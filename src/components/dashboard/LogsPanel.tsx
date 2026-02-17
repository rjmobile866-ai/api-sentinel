import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Log {
  id: string;
  api_name: string;
  mode: string;
  status_code: number | null;
  success: boolean;
  response_time: number | null;
  error_message: string | null;
  created_at: string;
}

interface LogsPanelProps {
  logs: Log[];
  onClear: () => void;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ logs, onClear }) => {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="neon-border bg-card/80 backdrop-blur-lg overflow-hidden">
      <div className="h-0.5 w-full bg-gradient-to-r from-secondary via-primary to-secondary" />
      
      <CardHeader className="py-2.5 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary text-glow flex items-center gap-2 text-sm tracking-[0.15em]">
            <Terminal className="w-4 h-4" />
            LOGS
            {logs.length > 0 && (
              <Badge className="text-[10px] px-2 bg-primary/15 text-primary border-primary/30">
                {logs.length}
              </Badge>
            )}
          </CardTitle>
          {logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-6 px-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-36">
          <div className="space-y-1 px-4 pb-3">
            {logs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Terminal className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs tracking-wider">Koi log nahi. API hit karo.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded text-xs font-mono border transition-all duration-200 ${
                    log.success
                      ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                      : 'bg-destructive/5 border-destructive/20 hover:border-destructive/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {log.success ? (
                        <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-destructive shrink-0" />
                      )}
                      <span className={`truncate ${log.success ? 'text-primary' : 'text-destructive'}`}>
                        {log.api_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] shrink-0">
                      {log.status_code && (
                        <span className={log.status_code < 400 ? 'text-primary' : 'text-destructive'}>
                          {log.status_code}
                        </span>
                      )}
                      {log.response_time && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {log.response_time}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LogsPanel;
