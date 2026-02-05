import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, Zap, Phone, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

interface HitEngineProps {
  apis: Api[];
  proxies: Array<{ url: string; is_active: boolean }>;
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
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [delay, setDelay] = useState(500);
  const [maxRounds, setMaxRounds] = useState(1);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);
  const proxyIndexRef = useRef(0);

  const getActiveProxies = useCallback(() => {
    return proxies.filter(p => p.is_active);
  }, [proxies]);

  const getNextProxy = useCallback(() => {
    const activeProxies = getActiveProxies();
    if (activeProxies.length === 0) return null;
    const proxy = activeProxies[proxyIndexRef.current % activeProxies.length];
    proxyIndexRef.current++;
    return proxy.url;
  }, [getActiveProxies]);

  const replacePlaceholders = (text: string, phoneNumber: string): string => {
    return text.replace(/\{PHONE\}/gi, phoneNumber);
  };

  const hitApi = async (api: Api, phoneNumber: string): Promise<void> => {
    const startTime = Date.now();
    const isHttp = api.url.toLowerCase().startsWith('http://');
    const shouldUseProxy = api.proxy_enabled || (isHttp && api.force_proxy);
    
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
      console.error('Invalid URL:', e);
    }

    let mode = 'DIRECT';
    
    if (shouldUseProxy) {
      const proxyUrl = getNextProxy();
      if (proxyUrl) {
        finalUrl = proxyUrl + encodeURIComponent(finalUrl);
        mode = 'PROXY';
      }
    }

    try {
      const headers: Record<string, string> = {};
      const apiHeaders = api.headers || {};
      Object.entries(apiHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = replacePlaceholders(value, phoneNumber);
        }
      });

      const bodyData = api.body || {};
      let body: string | undefined;
      if (['POST', 'PUT', 'PATCH'].includes(api.method)) {
        body = JSON.stringify(
          Object.fromEntries(
            Object.entries(bodyData).map(([k, v]) => [
              k,
              typeof v === 'string' ? replacePlaceholders(v, phoneNumber) : v
            ])
          )
        );
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(finalUrl, {
        method: api.method,
        headers,
        body,
        mode: 'cors',
      });

      const responseTime = Date.now() - startTime;

      onLogCreate({
        api_name: api.name,
        mode,
        status_code: response.status,
        success: response.ok,
        response_time: responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      onLogCreate({
        api_name: api.name,
        mode,
        status_code: null,
        success: false,
        response_time: responseTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
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
    proxyIndexRef.current = 0;

    for (let round = 1; round <= maxRounds; round++) {
      if (abortRef.current) break;
      setCurrentRound(round);

      for (const api of enabledApis) {
        if (abortRef.current) break;
        await hitApi(api, phone);
        if (delay > 0 && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    setIsRunning(false);
  };

  const stopHitting = () => {
    abortRef.current = true;
    setIsRunning(false);
  };

  const enabledCount = apis.filter(a => a.enabled).length;

  return (
    <Card className="border-primary/30 bg-card glow-primary">
      <CardHeader>
        <CardTitle className="text-primary text-glow flex items-center gap-2">
          <Zap className="w-5 h-5" />
          HIT ENGINE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              className="bg-input border-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-muted/30">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">APIs Enabled</p>
              <p className="text-lg font-bold text-primary">{enabledCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Proxies Active</p>
              <p className="text-lg font-bold text-secondary">{getActiveProxies().length}</p>
            </div>
            {isRunning && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Round</p>
                <p className="text-lg font-bold text-accent animate-pulse">{currentRound}/{maxRounds}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <Button
                onClick={startHitting}
                disabled={!phone.trim() || enabledCount === 0}
                className="bg-success text-success-foreground hover:bg-success/90 glow-primary"
              >
                <Play className="w-4 h-4 mr-2" />
                START
              </Button>
            ) : (
              <Button
                onClick={stopHitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 glow-destructive"
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
