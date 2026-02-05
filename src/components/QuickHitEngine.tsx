import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity, Server, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Api {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  query_params: Record<string, string>;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
}

interface QuickHitEngineProps {
  onLogCreate: (log: {
    api_name: string;
    mode: string;
    status_code: number | null;
    success: boolean;
    response_time: number;
    error_message?: string;
  }) => void;
}

const STORAGE_KEY = 'admin_apis';

const QuickHitEngine: React.FC<QuickHitEngineProps> = ({ onLogCreate }) => {
  const [phone, setPhone] = useState('');
  const [delay, setDelay] = useState(500);
  const [isRunning, setIsRunning] = useState(false);
  const [hitCount, setHitCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [currentApi, setCurrentApi] = useState<string | null>(null);
  const [apis, setApis] = useState<Api[]>([]);
  const stopRef = React.useRef(false);

  // Load APIs from localStorage (same as admin panel)
  useEffect(() => {
    const loadApis = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedApis = JSON.parse(stored) as Api[];
          setApis(parsedApis);
        }
      } catch (e) {
        console.error('[QUICK HIT] Failed to load APIs:', e);
      }
    };
    
    loadApis();
    
    // Listen for storage changes (when admin adds new APIs)
    const handleStorageChange = () => loadApis();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Get only enabled APIs
  const enabledApis = apis.filter(api => api.enabled);

  const replacePlaceholders = (text: string, phoneNumber: string): string => {
    return text.replace(/\{PHONE\}/gi, phoneNumber);
  };

  const replacePlaceholdersInObject = (obj: Record<string, unknown>, phoneNumber: string): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = replacePlaceholders(value, phoneNumber);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = replacePlaceholdersInObject(value as Record<string, unknown>, phoneNumber);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  const hitApiViaEdgeFunction = async (api: Api, phoneNumber: string): Promise<void> => {
    const startTime = Date.now();
    let finalUrl = replacePlaceholders(api.url, phoneNumber);
    
    // Add query params
    try {
      const queryParams = api.query_params || {};
      const urlObj = new URL(finalUrl);
      Object.entries(queryParams).forEach(([key, value]) => {
        if (typeof value === 'string') {
          urlObj.searchParams.set(key, replacePlaceholders(value, phoneNumber));
        }
      });
      finalUrl = urlObj.toString();
    } catch (e) {
      console.error('[QUICK HIT] Invalid URL:', e);
    }

    const headers: Record<string, string> = { ...api.headers };
    let body: Record<string, unknown> | undefined;
    
    if (['POST', 'PUT', 'PATCH'].includes(api.method.toUpperCase())) {
      body = replacePlaceholdersInObject(api.body || {}, phoneNumber);
    }

    console.log(`[QUICK HIT] 🎯 Hitting via Edge Function: ${api.name} -> ${finalUrl}`);

    try {
      const { data, error } = await supabase.functions.invoke('hit-api', {
        body: {
          url: finalUrl,
          method: api.method,
          headers,
          body,
        },
      });

      const responseTime = Date.now() - startTime;
      setHitCount(prev => prev + 1);

      if (error) {
        console.error('[QUICK HIT] ❌ Edge Function error:', error);
        setFailCount(prev => prev + 1);
        onLogCreate({
          api_name: api.name,
          mode: 'SERVER-SIDE',
          status_code: null,
          success: false,
          response_time: responseTime,
          error_message: error.message || 'Edge function error',
        });
        return;
      }

      if (data) {
        console.log(`[QUICK HIT] ✅ ${api.name}: ${data.status_code} in ${data.response_time || responseTime}ms`);
        if (data.success) {
          setSuccessCount(prev => prev + 1);
        } else {
          setFailCount(prev => prev + 1);
        }

        onLogCreate({
          api_name: api.name,
          mode: 'SERVER-SIDE',
          status_code: data.status_code,
          success: data.success,
          response_time: data.response_time || responseTime,
          error_message: data.error_message,
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('[QUICK HIT] ❌ Failed:', error);
      setFailCount(prev => prev + 1);

      onLogCreate({
        api_name: api.name,
        mode: 'SERVER-SIDE',
        status_code: null,
        success: false,
        response_time: responseTime,
        error_message: error instanceof Error ? error.message : 'Network error',
      });
    }
  };

  const handleQuickHit = async () => {
    if (!phone.trim()) {
      toast.error('Phone number enter karo');
      return;
    }

    if (enabledApis.length === 0) {
      toast.error('Koi API enabled nahi hai! Pehle Admin Panel me APIs add karo.');
      return;
    }

    stopRef.current = false;
    setIsRunning(true);
    setHitCount(0);
    setSuccessCount(0);
    setFailCount(0);

    console.log(`[QUICK HIT] Starting quick hit with ${enabledApis.length} APIs via Edge Function`);
    toast.info(`Hitting ${enabledApis.length} APIs via server...`);

    for (const api of enabledApis) {
      if (stopRef.current) break;
      setCurrentApi(api.name);
      await hitApiViaEdgeFunction(api, phone);

      if (delay > 0 && !stopRef.current) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setCurrentApi(null);
    setIsRunning(false);
    if (!stopRef.current) {
      toast.success('Quick hit completed!');
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    setIsRunning(false);
    setCurrentApi(null);
    toast.info('Stopped');
  };

  return (
    <Card className="border-primary/30 bg-card glow-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary text-glow flex items-center gap-2">
            <Zap className="w-5 h-5" />
            QUICK HIT
          </CardTitle>
          {isRunning && (
            <Badge className="bg-success/20 text-success border-success/50 animate-pulse flex items-center gap-1">
              <Activity className="w-3 h-3" />
              RUNNING
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Phone Number
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              disabled={isRunning}
              className="bg-input border-primary/30 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Delay (ms)
            </Label>
            <Input
              type="number"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              min={0}
              disabled={isRunning}
              className="bg-input border-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {isRunning && currentApi && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/30 animate-pulse">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-primary animate-ping" />
              <span className="text-primary text-sm font-mono">
                Hitting: <span className="text-foreground font-bold">{currentApi}</span>
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-muted/30">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center min-w-[60px]">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3" />Mode</p>
              <p className="text-sm font-bold text-secondary">SERVER</p>
            </div>
            {(isRunning || hitCount > 0) && (
              <>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Hits</p>
                  <p className="text-lg font-bold text-foreground">{hitCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-success">✓</p>
                  <p className="text-lg font-bold text-success">{successCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-destructive">✗</p>
                  <p className="text-lg font-bold text-destructive">{failCount}</p>
                </div>
              </>
            )}
          </div>

          {!isRunning ? (
            <Button
              onClick={handleQuickHit}
              disabled={!phone.trim()}
              className="bg-success text-success-foreground hover:bg-success/90 glow-primary font-bold"
            >
              <Zap className="w-4 h-4 mr-2" />
              QUICK HIT
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 glow-destructive font-bold"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              STOP
            </Button>
          )}
        </div>

        {enabledApis.length === 0 ? (
          <div className="p-3 bg-warning/10 rounded-lg border border-warning/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <p className="text-xs text-warning">
              Koi API configured nahi hai. Pehle <a href="/admin" className="underline font-bold">Admin Panel</a> me APIs add karo.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            {enabledApis.length} API(s) ready • Same APIs as Admin Panel
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickHitEngine;
