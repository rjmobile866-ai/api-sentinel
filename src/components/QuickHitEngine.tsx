import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity, AlertCircle, X, Crosshair, Layers, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';

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
  const [phone, setPhone] = useState('');
  const [delay, setDelay] = useState(500);
  const [isRunning, setIsRunning] = useState(false);
  const [hitCount, setHitCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [currentApi, setCurrentApi] = useState<string | null>(null);
  const [apis, setApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);
  const [hitMode, setHitMode] = useState<'parallel' | 'normal'>('parallel');
  const stopRef = React.useRef(false);

  useEffect(() => {
    const loadApis = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('apis')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) return;

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
        onLogCreate?.({ api_name: api.name, success: false, status_code: null, response_time: responseTime, error_message: error.message, mode: 'SERVER' });
        return;
      }

      const statusCode: number | null = typeof data?.status_code === 'number' ? data.status_code : null;
      const success: boolean = typeof data?.success === 'boolean' ? data.success : statusCode !== null ? statusCode >= 200 && statusCode < 300 : false;

      if (success) setSuccessCount(prev => prev + 1);
      else setFailCount(prev => prev + 1);

      onLogCreate?.({ api_name: api.name, success, status_code: statusCode, response_time: responseTime, error_message: success ? null : (data?.error_message || data?.error || 'Unknown error'), mode: 'SERVER' });
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      setFailCount(prev => prev + 1);
      onLogCreate?.({ api_name: api.name, success: false, status_code: null, response_time: responseTime, error_message: err.message || 'Unknown exception', mode: 'SERVER' });
    }
  };

  const handleQuickHit = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Enter valid phone number (10+ digits)');
      return;
    }

    try { await supabase.from('hit_logs').insert({ phone }); } catch (e) {}

    if (enabledApis.length === 0) {
      toast.error('Koi API nahi hai! Admin Panel me APIs add karo.');
      return;
    }

    stopRef.current = false;
    setIsRunning(true);
    setHitCount(0);
    setSuccessCount(0);
    setFailCount(0);
    setRoundCount(0);

    toast.info(`🔥 ${hitMode === 'parallel' ? 'Parallel' : 'Normal'} mode - ${enabledApis.length} APIs`);

    let currentRound = 0;
    while (!stopRef.current) {
      currentRound++;
      setRoundCount(currentRound);

      if (hitMode === 'parallel') {
        // All APIs simultaneously
        const apiPromises = enabledApis.map(api => {
          if (stopRef.current) return Promise.resolve();
          setCurrentApi(api.name);
          return hitApiViaEdgeFunction(api, phone).then(() => {
            setHitCount(prev => prev + 1);
          });
        });
        await Promise.all(apiPromises);
      } else {
        // One by one sequential
        for (const api of enabledApis) {
          if (stopRef.current) break;
          setCurrentApi(api.name);
          await hitApiViaEdgeFunction(api, phone);
          setHitCount(prev => prev + 1);
          if (!stopRef.current && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (hitMode === 'parallel' && !stopRef.current && delay > 0) {
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
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary via-secondary to-accent" />
      
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary text-glow">
            <Crosshair className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-bold tracking-[0.15em]">{settings.quickHitTitle}</span>
          </div>
          <Badge className="text-[10px] px-2 bg-secondary/10 text-secondary border-secondary/20 rounded-lg">
            {enabledApis.length}/{apis.length} APIs
          </Badge>
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
            className="bg-input/50 border-primary/10 focus:border-primary text-base tracking-wider h-12 rounded-xl transition-all duration-300"
            maxLength={15}
          />
        </div>

        {/* Hit Mode Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/30">
          <button
            onClick={() => !isRunning && setHitMode('parallel')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
              hitMode === 'parallel'
                ? 'bg-primary/15 text-primary glow-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3 h-3" />
            PARALLEL
          </button>
          <button
            onClick={() => !isRunning && setHitMode('normal')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
              hitMode === 'normal'
                ? 'bg-secondary/15 text-secondary glow-secondary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowRight className="w-3 h-3" />
            NORMAL
          </button>
        </div>

        {/* Delay Control */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20">
          <Label className="text-muted-foreground flex items-center gap-1.5 text-xs shrink-0 tracking-wider">
            <Clock className="w-3 h-3 text-primary" />
            <span className="text-primary font-bold">{delay}ms</span>
          </Label>
          <input
            type="range"
            min="0"
            max="2000"
            step="100"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="cursor-pointer flex-1 h-1.5 accent-primary rounded-full"
          />
        </div>

        {/* Stats */}
        {(hitCount > 0 || isRunning) && (
          <div className="flex items-center justify-center gap-3 p-2.5 rounded-xl glass">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 border border-accent/20">
              <RotateCcw className="w-3 h-3 text-accent" />
              <span className="text-sm font-bold text-accent">R{roundCount}</span>
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

        {/* Current API */}
        {currentApi && (
          <div className="p-2 rounded-xl glass border-secondary/15 animate-pulse">
            <p className="text-xs text-secondary text-center truncate font-bold tracking-wider">
              ⚡ {currentApi}
            </p>
          </div>
        )}

        {/* No APIs Warning */}
        {apis.length === 0 && (
          <div className="p-2.5 rounded-xl glass border-warning/15 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-warning shrink-0" />
            <p className="text-xs text-warning">{settings.noApisWarning}</p>
          </div>
        )}

        {/* Action Buttons */}
        {isRunning ? (
          <Button
            onClick={handleStop}
            variant="destructive"
            className="w-full h-12 text-sm font-bold tracking-[0.2em] uppercase rounded-xl glow-destructive"
          >
            <X className="w-4 h-4 mr-2" />
            {settings.stopButtonText}
          </Button>
        ) : (
          <Button
            onClick={handleQuickHit}
            disabled={!phone || phone.length < 10 || enabledApis.length === 0}
            className="w-full h-12 text-sm font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-all duration-300 rounded-xl glow-primary disabled:opacity-30"
          >
            <Zap className="w-4 h-4 mr-2" />
            {settings.hitButtonText} ({enabledApis.length})
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuickHitEngine;
