import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity, AlertCircle, X, Key } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useSiteConfig } from '@/hooks/useSiteConfig';

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

const QuickHitEngine: React.FC<QuickHitEngineProps> = ({ onLogCreate }) => {
  const { settings } = useSiteSettings();
  const { accessKey: dbAccessKey, loading: configLoading } = useSiteConfig();
  const [phone, setPhone] = useState('');
  const [userKey, setUserKey] = useState('');
  const [keyVerified, setKeyVerified] = useState(false);
  const [delay, setDelay] = useState(500);
  const [isRunning, setIsRunning] = useState(false);
  const [hitCount, setHitCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [currentApi, setCurrentApi] = useState<string | null>(null);
  const [apis, setApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);
  const stopRef = React.useRef(false);

  // Load APIs from database
  useEffect(() => {
    const loadApis = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('apis')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[QUICK HIT] Failed to fetch APIs:', error);
          return;
        }

        const transformedApis: Api[] = (data || []).map(row => ({
          id: row.id,
          name: row.name,
          url: row.url,
          method: row.method,
          headers: (row.headers as Record<string, string>) || {},
          body: (row.body as Record<string, unknown>) || {},
          query_params: (row.query_params as Record<string, string>) || {},
          enabled: row.enabled ?? true,
          proxy_enabled: row.proxy_enabled ?? false,
          force_proxy: row.force_proxy ?? true,
          rotation_enabled: row.rotation_enabled ?? false,
        }));

        setApis(transformedApis);
        console.log(`[QUICK HIT] Loaded ${transformedApis.length} APIs from database`);
      } catch (e) {
        console.error('[QUICK HIT] Failed to load APIs:', e);
      } finally {
        setLoading(false);
      }
    };
    
    loadApis();
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

      const statusCode: number | null =
        typeof data?.status_code === 'number' ? data.status_code : null;

      const success: boolean =
        typeof data?.success === 'boolean'
          ? data.success
          : statusCode !== null
            ? statusCode >= 200 && statusCode < 300
            : false;

      console.log(
        `[QUICK HIT] ${api.name} - Status: ${statusCode ?? 'N/A'}, Success: ${success}, Time: ${responseTime}ms`
      );

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
        error_message: success ? null : (data?.error_message || data?.error || 'Unknown error'),
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

  const handleKeySubmit = () => {
    if (!dbAccessKey || dbAccessKey === '') {
      // No key set in admin, allow access
      setKeyVerified(true);
      toast.success('Access granted!');
      return;
    }
    if (userKey === dbAccessKey) {
      setKeyVerified(true);
      toast.success('Key verified! Access granted.');
    } else {
      toast.error('Wrong key! Contact admin for correct key.');
      setKeyVerified(false);
    }
  };

  const handleQuickHit = async () => {
    // Verify key at hit time
    if (dbAccessKey && dbAccessKey !== '') {
      if (userKey !== dbAccessKey) {
        toast.error('Wrong key! Sahi key enter karo.');
        setKeyVerified(false);
        return;
      }
      setKeyVerified(true);
    }
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
    setRoundCount(0);

    console.log(`[QUICK HIT] Starting continuous hit with ${enabledApis.length} APIs via Edge Function`);
    toast.info(`🔥 Continuous mode started - ${enabledApis.length} APIs per round`);

    // Continuous loop - keeps running until stopped
    let currentRound = 0;
    while (!stopRef.current) {
      currentRound++;
      setRoundCount(currentRound);
      
      // Hit all APIs in parallel for speed
      const apiPromises = enabledApis.map(api => {
        if (stopRef.current) return Promise.resolve();
        setCurrentApi(api.name);
        return hitApiViaEdgeFunction(api, phone).then(() => {
          setHitCount(prev => prev + 1);
        });
      });
      await Promise.all(apiPromises);
      
      // Small pause between rounds
      if (!stopRef.current && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsRunning(false);
    setCurrentApi(null);
    toast.info(`Stopped after ${currentRound} rounds`);
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
            {settings.quickHitTitle}
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {enabledApis.length}/{apis.length} APIs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {/* Access Key Input */}
        <div className="space-y-1">
          <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Key className="w-3 h-3" />
            Access Key
          </Label>
          <Input
            type="password"
            value={userKey}
            onChange={(e) => setUserKey(e.target.value)}
            placeholder="Enter access key..."
            className="bg-input border-primary/30 focus:border-primary text-base tracking-wider h-10"
          />
        </div>

        {/* Phone Input - Always Visible */}
        <div className="space-y-1">
          <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Phone className="w-3 h-3" />
            {settings.phoneLabel}
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder={settings.phonePlaceholder}
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
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded">
              <RotateCcw className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold text-primary">R{roundCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-secondary" />
              <span className="text-sm font-bold text-secondary">{hitCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-accent" />
              <span className="text-sm font-bold text-accent">{successCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3 text-destructive" />
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
              <a href="/admin" className="underline font-bold">Admin</a> {settings.noApisWarning}
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
            {settings.stopButtonText}
          </Button>
        ) : (
          <Button
            onClick={handleQuickHit}
            disabled={!phone || phone.length < 10 || enabledApis.length === 0}
            className="w-full bg-gradient-to-r from-primary via-secondary to-accent text-white font-bold h-10 glow-primary hover:opacity-90"
          >
            <Zap className="w-4 h-4 mr-2" />
            {settings.hitButtonText} ({enabledApis.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickHitEngine;