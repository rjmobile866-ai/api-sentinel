import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity, AlertCircle, X } from 'lucide-react';
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
      <CardHeader className="py-2 px-3">
        <CardTitle className="flex items-center justify-between text-primary text-glow text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            QUICK HIT
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {enabledApis.length}/{apis.length} APIs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {/* Phone Input */}
        <div className="space-y-1">
          <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Phone className="w-3 h-3" />
            Phone Number
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="91XXXXXXXXXX"
            className="bg-input border-primary/30 focus:border-primary text-base tracking-wider h-10"
            maxLength={15}
          />
        </div>

        {/* Delay Control - Compact */}
        <div className="flex items-center gap-3">
          <Label className="text-muted-foreground flex items-center gap-1 text-xs shrink-0">
            <Clock className="w-3 h-3" />
            {delay}ms
          </Label>
          <Input
            type="range"
            min="0"
            max="2000"
            step="100"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="cursor-pointer flex-1 h-2"
          />
        </div>

        {/* Stats - Compact Inline */}
        {(hitCount > 0 || isRunning) && (
          <div className="flex items-center justify-center gap-4 p-2 bg-muted/10 rounded-lg">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-secondary" />
              <span className="text-sm font-bold text-secondary">{hitCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-accent" />
              <span className="text-sm font-bold text-accent">{successCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-destructive" />
              <span className="text-sm font-bold text-destructive">{failCount}</span>
            </div>
          </div>
        )}

        {/* Current API indicator */}
        {currentApi && (
          <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/30 animate-pulse">
            <p className="text-xs text-primary text-center truncate">
              🔥 <span className="font-bold">{currentApi}</span>
            </p>
          </div>
        )}

        {/* No APIs Warning */}
        {apis.length === 0 && (
          <div className="p-2 bg-warning/10 rounded-lg border border-warning/30 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-warning shrink-0" />
            <p className="text-xs text-warning">
              <a href="/admin" className="underline font-bold">Admin</a> me APIs add karo.
            </p>
          </div>
        )}

        {/* Action Button */}
        {isRunning ? (
          <Button
            onClick={handleStop}
            variant="destructive"
            className="w-full glow-destructive h-10"
          >
            <X className="w-4 h-4 mr-2" />
            STOP
          </Button>
        ) : (
          <Button
            onClick={handleQuickHit}
            disabled={!phone || phone.length < 10 || enabledApis.length === 0}
            className="w-full bg-gradient-to-r from-primary via-secondary to-accent text-white font-bold h-10 glow-primary hover:opacity-90"
          >
            <Zap className="w-4 h-4 mr-2" />
            HIT ({enabledApis.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickHitEngine;
