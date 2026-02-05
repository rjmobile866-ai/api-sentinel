import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity } from 'lucide-react';
import { toast } from 'sonner';

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

// Default CORS proxies
const DEFAULT_PROXIES = [
  { url: 'https://api.allorigins.win/raw?url=', name: 'AllOrigins', is_active: true },
  { url: 'https://corsproxy.io/?', name: 'CORSProxy.io', is_active: true },
  { url: 'https://api.codetabs.com/v1/proxy?quest=', name: 'CodeTabs', is_active: true },
];

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

const QuickHitEngine: React.FC<QuickHitEngineProps> = ({ onLogCreate }) => {
  const [phone, setPhone] = useState('');
  const [delay, setDelay] = useState(500);
  const [isRunning, setIsRunning] = useState(false);
  const [hitCount, setHitCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [currentApi, setCurrentApi] = useState<string | null>(null);

  // Sample APIs for quick testing
  const sampleApis: Api[] = [
    {
      id: '1',
      name: 'HTTPBin GET',
      url: 'https://httpbin.org/get',
      method: 'GET',
      headers: {},
      body: {},
      query_params: { phone: '{PHONE}' },
      enabled: true,
      proxy_enabled: false,
      force_proxy: true,
      rotation_enabled: false,
    },
    {
      id: '2',
      name: 'HTTPBin POST',
      url: 'https://httpbin.org/post',
      method: 'POST',
      headers: {},
      body: { phone: '{PHONE}', test: 'true' },
      query_params: {},
      enabled: true,
      proxy_enabled: false,
      force_proxy: true,
      rotation_enabled: false,
    },
  ];

  const tryFetchWithProxy = async (
    originalUrl: string,
    options: RequestInit,
    startIndex: number = 0
  ): Promise<{ response: Response | null; proxyUsed: string | null; error?: string }> => {
    for (let i = 0; i < DEFAULT_PROXIES.length; i++) {
      const proxyIndex = (startIndex + i) % DEFAULT_PROXIES.length;
      const proxy = DEFAULT_PROXIES[proxyIndex];
      const proxyUrl = proxy.url + encodeURIComponent(originalUrl);
      
      try {
        console.log(`[QUICK HIT] Trying proxy: ${proxy.name}`);
        const response = await fetch(proxyUrl, {
          ...options,
          mode: 'cors',
        });
        return { response, proxyUsed: proxy.name };
      } catch (error) {
        console.warn(`[QUICK HIT] Proxy ${proxy.name} failed`);
        continue;
      }
    }
    return { response: null, proxyUsed: null, error: 'All proxies failed' };
  };

  const hitApi = async (api: Api, phoneNumber: string, proxyIndex: number = 0): Promise<number> => {
    const startTime = Date.now();
    const isHttp = api.url.toLowerCase().startsWith('http://');
    const shouldUseProxy = api.proxy_enabled || (isHttp && api.force_proxy);
    
    let finalUrl = api.url.replace(/\{PHONE\}/gi, phoneNumber);
    
    // Add query params
    try {
      const urlObj = new URL(finalUrl);
      Object.entries(api.query_params || {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          urlObj.searchParams.set(key, value.replace(/\{PHONE\}/gi, phoneNumber));
        }
      });
      finalUrl = urlObj.toString();
    } catch (e) {
      console.error('[QUICK HIT] Invalid URL:', e);
    }

    const headers: Record<string, string> = { ...api.headers };
    let body: string | undefined;
    
    if (['POST', 'PUT', 'PATCH'].includes(api.method)) {
      const bodyObj = Object.fromEntries(
        Object.entries(api.body || {}).map(([k, v]) => [
          k,
          typeof v === 'string' ? v.replace(/\{PHONE\}/gi, phoneNumber) : v
        ])
      );
      body = JSON.stringify(bodyObj);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const fetchOptions: RequestInit = { method: api.method, headers, body };
    let mode = 'DIRECT';
    let response: Response | null = null;
    let errorMessage: string | undefined;

    console.log(`[QUICK HIT] 🎯 Hitting: ${api.name} | ${finalUrl}`);

    if (shouldUseProxy) {
      const result = await tryFetchWithProxy(finalUrl, fetchOptions, proxyIndex);
      if (result.response) {
        response = result.response;
        mode = `PROXY (${result.proxyUsed})`;
      } else {
        errorMessage = result.error;
      }
    } else {
      try {
        response = await fetch(finalUrl, { ...fetchOptions, mode: 'cors' });
      } catch (error) {
        if (isHttp) {
          console.log('[QUICK HIT] Falling back to proxy for HTTP...');
          const result = await tryFetchWithProxy(finalUrl, fetchOptions, proxyIndex);
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
      console.log(`[QUICK HIT] ✅ ${response.status} in ${responseTime}ms`);
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
      console.log(`[QUICK HIT] ❌ ${errorMessage}`);
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

    return responseTime;
  };

  const handleQuickHit = async () => {
    if (!phone.trim()) {
      toast.error('Phone number enter karo');
      return;
    }

    setIsRunning(true);
    setHitCount(0);
    setSuccessCount(0);
    setFailCount(0);

    console.log(`[QUICK HIT] Starting quick hit with ${sampleApis.length} APIs`);

    let proxyIndex = 0;
    for (const api of sampleApis) {
      if (!isRunning) break;
      setCurrentApi(api.name);
      proxyIndex = await hitApi(api, phone, proxyIndex);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setCurrentApi(null);
    setIsRunning(false);
    toast.success('Quick hit completed!');
  };

  const handleStop = () => {
    setIsRunning(false);
    setCurrentApi(null);
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
          <div className="flex items-center gap-4">
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

        <p className="text-xs text-muted-foreground text-center">
          Test 2 sample APIs with just a phone number • Full admin panel at /admin
        </p>
      </CardContent>
    </Card>
  );
};

export default QuickHitEngine;
