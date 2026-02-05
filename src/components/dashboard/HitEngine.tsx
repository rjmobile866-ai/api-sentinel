import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Zap, Phone, Clock, RotateCcw, Wifi, Activity } from 'lucide-react';

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

// Default CORS proxies with fallback support
const DEFAULT_PROXIES = [
  { url: 'https://api.allorigins.win/raw?url=', name: 'AllOrigins', is_active: true },
  { url: 'https://corsproxy.io/?', name: 'CORSProxy.io', is_active: true },
  { url: 'https://api.codetabs.com/v1/proxy?quest=', name: 'CodeTabs', is_active: true },
];

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
  const abortRef = useRef(false);
  const proxyIndexRef = useRef(0);

  const getActiveProxies = useCallback(() => {
    const userProxies = proxies.filter(p => p.is_active);
    return userProxies.length > 0 ? userProxies : DEFAULT_PROXIES;
  }, [proxies]);

  const replacePlaceholders = (text: string, phoneNumber: string): string => {
    return text.replace(/\{PHONE\}/gi, phoneNumber);
  };

  const tryFetchWithProxy = async (
    originalUrl: string,
    options: RequestInit,
    activeProxies: Array<{ url: string; name?: string }>,
    startIndex: number
  ): Promise<{ response: Response | null; proxyUsed: string | null; error?: string }> => {
    for (let i = 0; i < activeProxies.length; i++) {
      const proxyIndex = (startIndex + i) % activeProxies.length;
      const proxy = activeProxies[proxyIndex];
      const proxyUrl = proxy.url + encodeURIComponent(originalUrl);
      
      try {
        console.log(`[HIT ENGINE] Trying proxy: ${proxy.name || proxy.url}`);
        const response = await fetch(proxyUrl, {
          ...options,
          mode: 'cors',
        });
        proxyIndexRef.current = proxyIndex + 1;
        return { response, proxyUsed: proxy.name || 'Proxy' };
      } catch (error) {
        console.warn(`[HIT ENGINE] Proxy ${proxy.name || proxy.url} failed:`, error);
        continue;
      }
    }
    return { response: null, proxyUsed: null, error: 'All proxies failed' };
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
      console.error('[HIT ENGINE] Invalid URL:', e);
    }

    // Prepare headers
    const headers: Record<string, string> = {};
    const apiHeaders = api.headers || {};
    Object.entries(apiHeaders).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = replacePlaceholders(value, phoneNumber);
      }
    });

    // Prepare body
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

    const fetchOptions: RequestInit = {
      method: api.method,
      headers,
      body,
    };

    let mode = 'DIRECT';
    let response: Response | null = null;
    let errorMessage: string | undefined;

    console.log(`[HIT ENGINE] 🎯 Hitting API: ${api.name}`);
    console.log(`[HIT ENGINE] URL: ${finalUrl}`);
    console.log(`[HIT ENGINE] Method: ${api.method}`);
    console.log(`[HIT ENGINE] Use Proxy: ${shouldUseProxy}`);

    if (shouldUseProxy) {
      // Use proxy with fallback
      const activeProxies = getActiveProxies();
      const result = await tryFetchWithProxy(
        finalUrl,
        fetchOptions,
        activeProxies,
        proxyIndexRef.current
      );
      
      if (result.response) {
        response = result.response;
        mode = `PROXY (${result.proxyUsed})`;
      } else {
        errorMessage = result.error;
      }
    } else {
      // Direct fetch
      try {
        response = await fetch(finalUrl, {
          ...fetchOptions,
          mode: 'cors',
        });
      } catch (error) {
        console.error('[HIT ENGINE] Direct fetch failed:', error);
        
        // If direct fails and it's HTTP, try proxy as fallback
        if (isHttp) {
          console.log('[HIT ENGINE] Falling back to proxy for HTTP URL...');
          const activeProxies = getActiveProxies();
          const result = await tryFetchWithProxy(
            finalUrl,
            fetchOptions,
            activeProxies,
            proxyIndexRef.current
          );
          
          if (result.response) {
            response = result.response;
            mode = `PROXY FALLBACK (${result.proxyUsed})`;
          } else {
            errorMessage = error instanceof Error ? error.message : 'Network error';
          }
        } else {
          errorMessage = error instanceof Error ? error.message : 'Network error';
        }
      }
    }

    const responseTime = Date.now() - startTime;
    setHitCount(prev => prev + 1);

    if (response) {
      console.log(`[HIT ENGINE] ✅ Response: ${response.status} in ${responseTime}ms`);
      if (response.ok) {
        setSuccessCount(prev => prev + 1);
      } else {
        setFailCount(prev => prev + 1);
      }
      
      onLogCreate({
        api_name: api.name,
        mode,
        status_code: response.status,
        success: response.ok,
        response_time: responseTime,
      });
    } else {
      console.log(`[HIT ENGINE] ❌ Failed: ${errorMessage}`);
      setFailCount(prev => prev + 1);
      
      onLogCreate({
        api_name: api.name,
        mode,
        status_code: null,
        success: false,
        response_time: responseTime,
        error_message: errorMessage,
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
    proxyIndexRef.current = 0;

    console.log('[HIT ENGINE] 🚀 Starting hit engine...');
    console.log(`[HIT ENGINE] APIs: ${enabledApis.length}, Rounds: ${maxRounds}, Delay: ${delay}ms`);

    for (let round = 1; round <= maxRounds; round++) {
      if (abortRef.current) break;
      setCurrentRound(round);
      console.log(`[HIT ENGINE] --- Round ${round}/${maxRounds} ---`);

      for (const api of enabledApis) {
        if (abortRef.current) break;
        setCurrentApi(api.name);
        await hitApi(api, phone);
        
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
  const activeProxiesCount = getActiveProxies().length;

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
              <p className="text-xs text-muted-foreground">Proxies</p>
              <p className="text-lg font-bold text-secondary">{activeProxiesCount}</p>
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
