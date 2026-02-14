import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HitLog {
  id: string;
  phone: string;
  created_at: string;
}

const HitLogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<HitLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) {
      setLogs(data as HitLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('hit_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hit_logs' }, (payload) => {
        setLogs((prev) => [payload.new as HitLog, ...prev.slice(0, 199)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const clearAll = async () => {
    const { error } = await supabase.from('hit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) {
      setLogs([]);
      toast.success('Hit logs cleared');
    } else {
      toast.error('Failed to clear logs');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  };

  return (
    <Card className="border-accent/30 bg-card/50 backdrop-blur">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-accent text-glow flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4" />
            HIT LOGS
            {logs.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {logs.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchLogs} className="h-6 px-2 text-muted-foreground hover:text-primary">
              <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2 text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="space-y-1 px-3 pb-2">
            {loading && logs.length === 0 ? (
              <div className="text-center py-4">
                <Loader2 className="w-5 h-5 mx-auto animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Phone className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Koi number nahi abhi tak.</p>
              </div>
            ) : (
              logs.map((log) => {
                const { date, time } = formatDateTime(log.created_at);
                return (
                  <div key={log.id} className="p-1.5 rounded text-xs font-mono border bg-accent/5 border-accent/20 flex items-center justify-between gap-2">
                    <span className="text-accent font-semibold">{log.phone}</span>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {date} • {time}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HitLogsPanel;
