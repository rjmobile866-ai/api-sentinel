import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Zap, Phone, Clock, RotateCcw, Wifi, Activity, Server, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

interface Api {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  bodyType?: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none';
  query_params: Record<string, string>;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
  residential_proxy_enabled?: boolean;
}

interface HitEngineProps {
  apis: Api[];
  proxies: Array<{ url: string; is_active: boolean; name?: string }>;
  onLogCreate: (log: {
    api_name: string;
    mode: string;
    status_code: number | null;
    success: boolean;
    response_time: number;
    error_message?: string;
  }) => void;
}

const HitEngine: React.FC<HitEngineProps> = ({ apis, proxies, onLogCreate }) => {
  const [phone, setPhone] = useState('');
  const [delay, setDelay] = useState(500);
  const [maxRounds, setMaxRounds] = useState(1);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentApi, setCurrentApi] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hitCount, setHitCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [useProxy, setUseProxy] = useState(false);
  const abortRef = useRef(false);

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

    // Prepare final URL with placeholder replacement
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
      console.error('[HIT ENGINE] Invalid URL:', e);
    }

    // Prepare headers with placeholder replacement
    const headers: Record<string, string> = {};
    const apiHeaders = api.headers || {};
    Object.entries(apiHeaders).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = replacePlaceholders(value, phoneNumber);
      }
    });

    // Prepare body with placeholder replacement
    let body: Record<string, unknown> | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(api.method.toUpperCase()) && api.body) {
      body = replacePlaceholdersInObject(api.body, phoneNumber);
    }

    console.log(`[HIT ENGINE] 🎯 Hitting API via Edge Function: ${api.name}`);
    console.log(`[HIT ENGINE] URL: ${finalUrl}`);
    console.log(`[HIT ENGINE] Method: ${api.method}`);

    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('hit-api', {
        body: {
          url: finalUrl,
          method: api.method,
          headers,
          body,
          bodyType: api.bodyType || 'json',
          useProxy,
          useResidentialProxy: api.residential_proxy_enabled || false,
        },
      });

      const responseTime = Date.now() - startTime;
      setHitCount(prev => prev + 1);

      if (error) {
        console.error('[HIT ENGINE] ❌ Edge Function error:', error);
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
        console.log(`[HIT ENGINE] ✅ Response: ${data.status_code} in ${data.response_time}ms`);
        
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
      console.error('[HIT ENGINE] ❌ Failed:', error);
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

  const startHitting = async () => {
    if (!phone.trim()) return;
    
    const enabledApis = apis.filter(a => a.enabled);
    if (enabledApis.length === 0) return;

    setIsRunning(true);
    abortRef.current = false;
    setCurrentRound(0);
    setHitCount(0);
    setSuccessCount(0);
    setFailCount(0);
    

    console.log('[HIT ENGINE] 🚀 Starting hit engine...');
    console.log(`[HIT ENGINE] APIs: ${enabledApis.length}, Rounds: ${maxRounds}, Delay: ${delay}ms`);

    for (let round = 1; round <= maxRounds; round++) {
      if (abortRef.current) break;
      setCurrentRound(round);
      console.log(`[HIT ENGINE] --- Round ${round}/${maxRounds} ---`);

      for (const api of enabledApis) {
        if (abortRef.current) break;
        setCurrentApi(api.name);
        await hitApiViaEdgeFunction(api, phone);
        
        if (delay > 0 && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.log('[HIT ENGINE] ✅ Hit engine completed');
    setCurrentApi(null);
    setIsRunning(false);
  };

  const stopHitting = () => {
    console.log('[HIT ENGINE] ⏹️ Stopping hit engine...');
    abortRef.current = true;
    setIsRunning(false);
    setCurrentApi(null);
  };

  const enabledCount = apis.filter(a => a.enabled).length;

  return (
    <Card className="border-primary/30 bg-card glow-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary text-glow flex items-center gap-2">
            <Zap className="w-5 h-5" />
            HIT ENGINE
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
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Max Rounds
            </Label>
            <Input
              type="number"
              value={maxRounds}
              onChange={(e) => setMaxRounds(Number(e.target.value))}
              min={1}
              disabled={isRunning}
              className="bg-input border-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* Proxy Toggle */}
        <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-secondary/30">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-secondary" />
            <div>
              <p className="text-sm font-medium text-foreground">Free Proxy</p>
              <p className="text-xs text-muted-foreground">Route through CORS proxies (slower but bypasses blocks)</p>
            </div>
          </div>
          <Switch
            checked={useProxy}
            onCheckedChange={setUseProxy}
            disabled={isRunning}
          />
        </div>

        {/* Live Status */}
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

        {/* Stats Panel */}
        <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-muted/30">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center min-w-[60px]">
              <p className="text-xs text-muted-foreground">APIs</p>
              <p className="text-lg font-bold text-primary">{enabledCount}</p>
            </div>
            <div className="text-center min-w-[60px]">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3" />Mode</p>
              <p className="text-lg font-bold text-secondary">SERVER</p>
            </div>
            {(isRunning || hitCount > 0) && (
              <>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs text-muted-foreground">Round</p>
                  <p className="text-lg font-bold text-accent">{currentRound}/{maxRounds}</p>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs text-muted-foreground">Hits</p>
                  <p className="text-lg font-bold text-foreground">{hitCount}</p>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs text-success">Success</p>
                  <p className="text-lg font-bold text-success">{successCount}</p>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs text-destructive">Failed</p>
                  <p className="text-lg font-bold text-destructive">{failCount}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <Button
                onClick={startHitting}
                disabled={!phone.trim() || enabledCount === 0}
                className="bg-success text-success-foreground hover:bg-success/90 glow-primary font-bold"
              >
                <Play className="w-4 h-4 mr-2" />
                START
              </Button>
            ) : (
              <Button
                onClick={stopHitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 glow-destructive font-bold"
              >
                <Square className="w-4 h-4 mr-2" />
                STOP
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HitEngine;
