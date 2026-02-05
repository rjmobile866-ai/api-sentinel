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
    return new Date(dateStr).toLocaleTimeString();
  };

  return (
    <Card className="border-primary/30 bg-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary text-glow flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            LIVE LOGS
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No logs yet. Start hitting APIs to see results.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded text-xs font-mono border ${
                    log.success
                      ? 'bg-success/10 border-success/30'
                      : 'bg-destructive/10 border-destructive/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="w-3 h-3 text-success" />
                      ) : (
                        <XCircle className="w-3 h-3 text-destructive" />
                      )}
                      <span className={log.success ? 'text-success' : 'text-destructive'}>
                        {log.api_name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          log.mode === 'PROXY' 
                            ? 'border-secondary/50 text-secondary' 
                            : 'border-primary/50 text-primary'
                        }`}
                      >
                        {log.mode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {log.status_code && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            log.status_code < 400
                              ? 'border-success/50 text-success'
                              : 'border-destructive/50 text-destructive'
                          }`}
                        >
                          {log.status_code}
                        </Badge>
                      )}
                      {log.response_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.response_time}ms
                        </span>
                      )}
                      <span>{formatTime(log.created_at)}</span>
                    </div>
                  </div>
                  {log.error_message && (
                    <p className="text-destructive/80 mt-1 truncate">
                      Error: {log.error_message}
                    </p>
                  )}
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
