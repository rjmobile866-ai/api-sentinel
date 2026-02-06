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
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary text-glow flex items-center gap-2 text-sm">
            <Terminal className="w-4 h-4" />
            LOGS
            {logs.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
        <ScrollArea className="h-32">
          <div className="space-y-1 px-3 pb-2">
            {logs.length === 0 ? (
              <div className="text-center py-3 text-muted-foreground">
                <Terminal className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Koi log nahi. API hit karo.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded text-xs font-mono border ${
                    log.success
                      ? 'bg-accent/10 border-accent/30'
                      : 'bg-destructive/10 border-destructive/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {log.success ? (
                        <CheckCircle className="w-3 h-3 text-accent shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-destructive shrink-0" />
                      )}
                      <span className={`truncate ${log.success ? 'text-accent' : 'text-destructive'}`}>
                        {log.api_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] shrink-0">
                      {log.status_code && (
                        <span className={log.status_code < 400 ? 'text-accent' : 'text-destructive'}>
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
