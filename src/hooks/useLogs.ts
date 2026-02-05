import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export const useLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);

  const fetchLogs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch logs:', error);
    } else {
      setLogs(data || []);
    }
  };

  const addLog = async (logData: {
    api_name: string;
    mode: string;
    status_code: number | null;
    success: boolean;
    response_time: number;
    error_message?: string;
  }) => {
    if (!user) return;

    const { error } = await supabase.from('api_logs').insert({
      user_id: user.id,
      api_name: logData.api_name,
      mode: logData.mode,
      status_code: logData.status_code,
      success: logData.success,
      response_time: logData.response_time,
      error_message: logData.error_message || null,
    });

    if (error) {
      console.error('Failed to save log:', error);
    }
  };

  const clearLogs = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('api_logs')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to clear logs');
      console.error(error);
    } else {
      setLogs([]);
      toast.success('Logs cleared');
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('api_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'api_logs',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          setLogs((prev) => [payload.new as Log, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { logs, addLog, clearLogs, refetch: fetchLogs };
};
