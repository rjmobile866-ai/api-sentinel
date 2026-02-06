import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity, Server, AlertCircle, X } from 'lucide-react';
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
  onLogCreate?: (log: {
    api_name: string;
    success: boolean;
    status_code: number | null;
    response_time: number | null;
    error_message: string | null;
    mode: string;
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

  // Load APIs from localStorage (read-only)
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

  const hitApiViaEdgeFunction = async (api: Api, phoneNumber: string) => {
    const startTime = Date.now();
    
    try {
      const finalUrl = replacePlaceholders(api.url, phoneNumber);
      const finalHeaders = replacePlaceholdersInObject(api.headers || {}, phoneNumber) as Record<string, string>;
      const finalBody = replacePlaceholdersInObject(api.body || {}, phoneNumber);
      const finalQueryParams = replacePlaceholdersInObject(api.query_params || {}, phoneNumber) as Record<string, string>;

      let urlWithParams = finalUrl;
      if (Object.keys(finalQueryParams).length > 0) {
        const params = new URLSearchParams(finalQueryParams);
        urlWithParams = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${params.toString()}`;
      }

      console.log(`[QUICK HIT] Calling Edge Function for: ${api.name}`);

      const { data, error } = await supabase.functions.invoke('hit-api', {
        body: {
          url: urlWithParams,
          method: api.method,
          headers: finalHeaders,
          body: api.method !== 'GET' ? finalBody : undefined,
        },
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        console.error(`[QUICK HIT] Edge function error for ${api.name}:`, error);
        setFailCount(prev => prev + 1);
        
        onLogCreate?.({
          api_name: api.name,
          success: false,
          status_code: null,
          response_time: responseTime,
          error_message: error.message,
          mode: 'SERVER',
        });
        return;
      }

      const statusCode = data?.status || 200;
      const success = statusCode >= 200 && statusCode < 300;

      console.log(`[QUICK HIT] ${api.name} - Status: ${statusCode}, Time: ${responseTime}ms`);

      if (success) {
        setSuccessCount(prev => prev + 1);
      } else {
        setFailCount(prev => prev + 1);
      }

      onLogCreate?.({
        api_name: api.name,
        success,
        status_code: statusCode,
        response_time: responseTime,
        error_message: success ? null : (data?.error || 'Unknown error'),
        mode: 'SERVER',
      });

    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      console.error(`[QUICK HIT] Exception for ${api.name}:`, err);
      setFailCount(prev => prev + 1);
      
      onLogCreate?.({
        api_name: api.name,
        success: false,
        status_code: null,
        response_time: responseTime,
        error_message: err.message || 'Unknown exception',
        mode: 'SERVER',
      });
    }
  };

  const handleQuickHit = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Enter valid phone number (10+ digits)');
      return;
    }

    if (enabledApis.length === 0) {
      toast.error('Koi API nahi hai! Pehle Admin Panel me APIs add karo.');
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
      setHitCount(prev => prev + 1);
      
      if (delay > 0 && !stopRef.current) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsRunning(false);
    setCurrentApi(null);
    
    if (!stopRef.current) {
      toast.success('All APIs hit successfully!');
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    setIsRunning(false);
    setCurrentApi(null);
    toast.info('Stopped!');
  };

  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-primary text-glow">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            QUICK HIT ENGINE
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/50 text-primary">
              <Server className="w-3 h-3 mr-1" />
              SERVER
            </Badge>
            <Badge variant="secondary">{enabledApis.length}/{apis.length} APIs</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Input */}
        <div className="space-y-2">
          <Label className="text-muted-foreground flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter phone number"
            className="bg-input border-primary/30 focus:border-primary text-lg tracking-wider"
            maxLength={15}
          />
        </div>

        {/* Delay Control */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Delay: {delay}ms
            </Label>
            <Input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Stats */}
        {(hitCount > 0 || isRunning) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-muted/10 rounded text-center">
              <Activity className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-primary">{hitCount}</p>
              <p className="text-xs text-muted-foreground">Hits</p>
            </div>
            <div className="p-2 bg-primary/10 rounded text-center">
              <Wifi className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-primary">{successCount}</p>
              <p className="text-xs text-muted-foreground">Success</p>
            </div>
            <div className="p-2 bg-destructive/10 rounded text-center">
              <RotateCcw className="w-4 h-4 mx-auto text-destructive mb-1" />
              <p className="text-lg font-bold text-destructive">{failCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        )}

        {/* Current API indicator */}
        {currentApi && (
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/30 animate-pulse">
            <p className="text-xs text-primary text-center">
              🔥 Hitting: <span className="font-bold">{currentApi}</span>
            </p>
          </div>
        )}

        {/* No APIs Warning */}
        {apis.length === 0 && (
          <div className="p-3 bg-warning/10 rounded-lg border border-warning/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-xs text-warning">
              Koi API nahi hai. <a href="/admin" className="underline font-bold">Admin Panel</a> me APIs add karo.
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-2">
          {isRunning ? (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="flex-1 glow-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              STOP
            </Button>
          ) : (
            <Button
              onClick={handleQuickHit}
              disabled={!phone || phone.length < 10 || enabledApis.length === 0}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              <Zap className="w-4 h-4 mr-2" />
              QUICK HIT ({enabledApis.length} APIs)
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          APIs manage karo: <a href="/admin" className="text-primary underline">/admin</a>
        </p>
      </CardContent>
    </Card>
  );
};

export default QuickHitEngine;
