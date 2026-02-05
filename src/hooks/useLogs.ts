import { useState } from 'react';
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
  const [logs, setLogs] = useState<Log[]>([]);

  const addLog = (logData: {
    api_name: string;
    mode: string;
    status_code: number | null;
    success: boolean;
    response_time: number;
    error_message?: string;
  }) => {
    const newLog: Log = {
      id: Math.random().toString(36).substr(2, 9),
      api_name: logData.api_name,
      mode: logData.mode,
      status_code: logData.status_code,
      success: logData.success,
      response_time: logData.response_time,
      error_message: logData.error_message || null,
      created_at: new Date().toISOString(),
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  const clearLogs = async () => {
    setLogs([]);
    toast.success('Logs cleared');
  };

  const refetch = () => {
    // No-op for public page
  };

  return { logs, addLog, clearLogs, refetch };
};
