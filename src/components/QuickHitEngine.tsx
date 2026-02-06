import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, Clock, RotateCcw, Wifi, Activity, Server, AlertCircle, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ApiForm from '@/components/dashboard/ApiForm';

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
  const [formOpen, setFormOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<any>(null);
  const stopRef = React.useRef(false);

  // Load APIs from localStorage
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

  // Save APIs to localStorage
  const saveApis = (newApis: Api[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newApis));
      setApis(newApis);
      // Dispatch storage event for other tabs/components
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('[QUICK HIT] Failed to save APIs:', e);
    }
  };

  useEffect(() => {
    loadApis();
    
    // Listen for storage changes
    const handleStorageChange = () => loadApis();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Get only enabled APIs
  const enabledApis = apis.filter(api => api.enabled);

  // Add new API
  const handleAddApi = (data: any) => {
    const newApi: Api = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      url: data.url,
      method: data.method,
      headers: JSON.parse(data.headers || '{}'),
      body: JSON.parse(data.body || '{}'),
      query_params: JSON.parse(data.query_params || '{}'),
      enabled: data.enabled,
      proxy_enabled: data.proxy_enabled,
      force_proxy: data.force_proxy,
      rotation_enabled: data.rotation_enabled,
    };
    
    if (data.id) {
      // Update existing
      const updated = apis.map(api => api.id === data.id ? { ...newApi, id: data.id } : api);
      saveApis(updated);
      toast.success('API updated!');
    } else {
      // Add new
      saveApis([...apis, newApi]);
      toast.success('API added!');
    }
    setEditingApi(null);
  };

  // Delete API
  const handleDeleteApi = (id: string) => {
    const updated = apis.filter(api => api.id !== id);
    saveApis(updated);
    toast.success('API deleted!');
  };

  // Edit API
  const handleEditApi = (api: Api) => {
    setEditingApi({
      ...api,
      headers: JSON.stringify(api.headers || {}, null, 2),
      body: JSON.stringify(api.body || {}, null, 2),
      query_params: JSON.stringify(api.query_params || {}, null, 2),
    });
    setFormOpen(true);
  };

  // Toggle API enabled
  const toggleApiEnabled = (id: string) => {
    const updated = apis.map(api => 
      api.id === id ? { ...api, enabled: !api.enabled } : api
    );
    saveApis(updated);
  };

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
      // Replace placeholders
      const finalUrl = replacePlaceholders(api.url, phoneNumber);
      const finalHeaders = replacePlaceholdersInObject(api.headers || {}, phoneNumber) as Record<string, string>;
      const finalBody = replacePlaceholdersInObject(api.body || {}, phoneNumber);
      const finalQueryParams = replacePlaceholdersInObject(api.query_params || {}, phoneNumber) as Record<string, string>;

      // Build URL with query params
      let urlWithParams = finalUrl;
      if (Object.keys(finalQueryParams).length > 0) {
        const params = new URLSearchParams(finalQueryParams);
        urlWithParams = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${params.toString()}`;
      }

      console.log(`[QUICK HIT] Calling Edge Function for: ${api.name}`);
      console.log(`[QUICK HIT] URL: ${urlWithParams}`);

      // Call via Edge Function
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
      toast.error('Koi API enabled nahi hai! Pehle API add karo.');
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
              SERVER MODE
            </Badge>
            <Badge variant="secondary">{apis.length} APIs</Badge>
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

        {/* API List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Your APIs</Label>
            <Button
              size="sm"
              onClick={() => { setEditingApi(null); setFormOpen(true); }}
              className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add API
            </Button>
          </div>
          
          {apis.length === 0 ? (
            <div className="p-4 bg-muted/10 rounded-lg border border-dashed border-muted/30 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No APIs added yet</p>
              <Button
                size="sm"
                onClick={() => { setEditingApi(null); setFormOpen(true); }}
                className="mt-2"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Your First API
              </Button>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {apis.map((api) => (
                <div
                  key={api.id}
                  className={`p-2 rounded-lg border flex items-center justify-between ${
                    api.enabled 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-muted/5 border-muted/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => toggleApiEnabled(api.id)}
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        api.enabled ? 'bg-green-500' : 'bg-muted'
                      }`}
                      title={api.enabled ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}
                    />
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {api.method}
                    </Badge>
                    <span className="text-sm truncate">{api.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditApi(api)}
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteApi(api.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {(hitCount > 0 || isRunning) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-muted/10 rounded text-center">
              <Activity className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-primary">{hitCount}</p>
              <p className="text-xs text-muted-foreground">Hits</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded text-center">
              <Wifi className="w-4 h-4 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold text-green-500">{successCount}</p>
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
          Add unlimited APIs • All hits via secure server
        </p>
      </CardContent>

      {/* API Form Dialog */}
      <ApiForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingApi(null); }}
        onSubmit={handleAddApi}
        editData={editingApi}
      />
    </Card>
  );
};

export default QuickHitEngine;
