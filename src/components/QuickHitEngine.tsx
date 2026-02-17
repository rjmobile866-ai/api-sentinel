import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity, AlertCircle, X, Key, Crosshair } from 'lucide-react';
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

    try {
      await supabase.from('hit_logs').insert({ phone });
    } catch (e) {
      console.error('Failed to save phone log:', e);
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

    toast.info(`🔥 Continuous mode started - ${enabledApis.length} APIs per round`);

    let currentRound = 0;
    while (!stopRef.current) {
      currentRound++;
      setRoundCount(currentRound);
      
      const apiPromises = enabledApis.map(api => {
        if (stopRef.current) return Promise.resolve();
        setCurrentApi(api.name);
        return hitApiViaEdgeFunction(api, phone).then(() => {
          setHitCount(prev => prev + 1);
        });
      });
      await Promise.all(apiPromises);
      
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
    <Card className="neon-border bg-card/80 backdrop-blur-lg overflow-hidden">
      {/* Accent top bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary via-secondary to-primary" />
      
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-primary text-glow">
            <Crosshair className="w-4 h-4 animate-pulse" />
            <span className="tracking-[0.15em]">{settings.quickHitTitle}</span>
          </div>
          <Badge className="text-[10px] px-2 bg-secondary/20 text-secondary border-secondary/30">
            {enabledApis.length}/{apis.length} APIs
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4">
        {/* Access Key Input */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground flex items-center gap-1.5 text-xs tracking-wider uppercase">
            <Key className="w-3 h-3 text-secondary" />
            Access Key
          </Label>
          <Input
            type="password"
            value={userKey}
            onChange={(e) => setUserKey(e.target.value)}
            placeholder="Enter access key..."
            className="bg-input/80 border-primary/20 focus:border-primary focus:glow-primary text-base tracking-wider h-11 transition-all duration-300"
          />
        </div>

        {/* Phone Input */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground flex items-center gap-1.5 text-xs tracking-wider uppercase">
            <Phone className="w-3 h-3 text-primary" />
            {settings.phoneLabel}
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder={settings.phonePlaceholder}
            className="bg-input/80 border-secondary/20 focus:border-secondary focus:glow-secondary text-base tracking-wider h-11 transition-all duration-300"
            maxLength={15}
          />
        </div>

        {/* Delay Control */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
          <Label className="text-muted-foreground flex items-center gap-1.5 text-xs shrink-0 tracking-wider">
            <Clock className="w-3 h-3 text-primary" />
            <span className="text-primary font-bold">{delay}ms</span>
          </Label>
          <Input
            type="range"
            min="0"
            max="2000"
            step="100"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="cursor-pointer flex-1 h-2 accent-primary"
          />
        </div>

        {/* Stats */}
        {(hitCount > 0 || isRunning) && (
          <div className="flex items-center justify-center gap-3 p-2.5 rounded-lg neon-border bg-card/50">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/15 border border-secondary/20">
              <RotateCcw className="w-3 h-3 text-secondary" />
              <span className="text-sm font-bold text-secondary">R{roundCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold text-primary">{hitCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold text-primary">{successCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3 text-destructive" />
              <span className="text-sm font-bold text-destructive">{failCount}</span>
            </div>
          </div>
        )}

        {/* Current API indicator */}
        {currentApi && (
          <div className="p-2 rounded-lg neon-border-pink bg-secondary/5 animate-pulse">
            <p className="text-xs text-secondary text-center truncate font-bold tracking-wider">
              ⚡ {currentApi}
            </p>
          </div>
        )}

        {/* No APIs Warning */}
        {apis.length === 0 && (
          <div className="p-2.5 bg-warning/5 rounded-lg border border-warning/20 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-warning shrink-0" />
            <p className="text-xs text-warning">
              <a href="/admin" className="underline font-bold">[Admin]</a> {settings.noApisWarning}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {isRunning ? (
          <Button
            onClick={handleStop}
            variant="destructive"
            className="w-full glow-destructive h-12 text-sm font-bold tracking-[0.2em] uppercase"
          >
            <X className="w-4 h-4 mr-2" />
            {settings.stopButtonText}
          </Button>
        ) : (
          <Button
            onClick={handleQuickHit}
            disabled={!phone || phone.length < 10 || enabledApis.length === 0}
            className="w-full h-12 text-sm font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-primary to-secondary text-background hover:opacity-90 transition-all duration-300 glow-primary disabled:opacity-30"
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
