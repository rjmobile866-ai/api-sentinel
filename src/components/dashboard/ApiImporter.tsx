import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, Code, Zap, Globe, Shield, RotateCcw } from 'lucide-react';

interface ParsedApi {
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  query_params: Record<string, string>;
}

interface ApiImporterProps {
  onApiAdd: (api: {
    name: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, any>;
    query_params: Record<string, string>;
    enabled: boolean;
    proxy_enabled: boolean;
    force_proxy: boolean;
    rotation_enabled: boolean;
  }) => void;
}

// Headers to automatically remove
const HEADERS_TO_REMOVE = [
  'user-agent',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'cookie',
  'accept-encoding',
  'content-length',
  'priority',
  'accept-language',
  'host',
  'connection',
  'upgrade-insecure-requests',
  'cache-control',
  'pragma',
  'referer',
  'origin',
];

// Headers to keep by default
const HEADERS_TO_KEEP = [
  'content-type',
  'accept',
  'x-requested-with',
  'authorization',
  'x-api-key',
  'x-auth-token',
];

const ApiImporter: React.FC<ApiImporterProps> = ({ onApiAdd }) => {
  const [rawCode, setRawCode] = useState('');
  const [parsedApi, setParsedApi] = useState<ParsedApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiName, setApiName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [forceProxy, setForceProxy] = useState(true);
  const [rotationEnabled, setRotationEnabled] = useState(false);

  const cleanHeaders = (headers: Record<string, string>): Record<string, string> => {
    const cleaned: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      // Skip headers that should be removed
      if (HEADERS_TO_REMOVE.some(h => lowerKey === h || lowerKey.startsWith('sec-'))) {
        continue;
      }
      
      // Keep important headers and any custom headers
      cleaned[key] = value;
    }
    
    return cleaned;
  };

  const extractQueryParams = (url: string): { cleanUrl: string; params: Record<string, string> } => {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      // Return URL without query string
      const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      return { cleanUrl, params };
    } catch {
      return { cleanUrl: url, params: {} };
    }
  };

  const generateApiName = (url: string, method: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const lastPath = pathParts[pathParts.length - 1] || urlObj.hostname;
      return `${method} ${lastPath}`.substring(0, 50);
    } catch {
      return `${method} API`;
    }
  };

  const parseNodeFetchCode = (code: string) => {
    setError(null);
    setParsedApi(null);

    if (!code.trim()) {
      setError('Please paste Node.js fetch code');
      return;
    }

    try {
      // Extract URL from fetch("url" or fetch('url' or fetch(`url`
      const urlMatch = code.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/);
      if (!urlMatch) {
        setError('Could not find fetch URL. Make sure code starts with fetch("url"...)');
        return;
      }

      let fullUrl = urlMatch[1];
      
      // Extract query params from URL
      const { cleanUrl, params: queryParams } = extractQueryParams(fullUrl);

      // Extract method - default to GET if not specified
      const methodMatch = code.match(/method\s*:\s*["'`](\w+)["'`]/i);
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';

      // Extract headers object
      let headers: Record<string, string> = {};
      const headersMatch = code.match(/headers\s*:\s*(\{[\s\S]*?\})\s*(?:,|\})/);
      if (headersMatch) {
        try {
          // Clean up the headers string for parsing
          let headersStr = headersMatch[1];
          // Replace single quotes with double quotes for JSON parsing
          headersStr = headersStr.replace(/'/g, '"');
          // Remove trailing commas
          headersStr = headersStr.replace(/,\s*}/g, '}');
          // Remove newlines and extra spaces
          headersStr = headersStr.replace(/\n\s*/g, ' ');
          headers = JSON.parse(headersStr);
        } catch (e) {
          // Try alternative parsing for complex headers
          const headerLines = headersMatch[1].match(/["'`]([^"'`]+)["'`]\s*:\s*["'`]([^"'`]*)["'`]/g);
          if (headerLines) {
            headerLines.forEach(line => {
              const parts = line.match(/["'`]([^"'`]+)["'`]\s*:\s*["'`]([^"'`]*)["'`]/);
              if (parts) {
                headers[parts[1]] = parts[2];
              }
            });
          }
        }
      }

      // Clean headers
      const cleanedHeaders = cleanHeaders(headers);

      // Extract body
      let body: Record<string, any> = {};
      const bodyMatch = code.match(/body\s*:\s*(?:JSON\.stringify\s*\()?\s*(\{[\s\S]*?\})\s*\)?/);
      if (bodyMatch) {
        try {
          let bodyStr = bodyMatch[1];
          bodyStr = bodyStr.replace(/'/g, '"');
          bodyStr = bodyStr.replace(/,\s*}/g, '}');
          bodyStr = bodyStr.replace(/\n\s*/g, ' ');
          body = JSON.parse(bodyStr);
        } catch (e) {
          // If JSON parse fails, try to extract key-value pairs
          const bodyLines = bodyMatch[1].match(/["'`]([^"'`]+)["'`]\s*:\s*["'`]?([^"'`,\}]+)["'`]?/g);
          if (bodyLines) {
            bodyLines.forEach(line => {
              const parts = line.match(/["'`]([^"'`]+)["'`]\s*:\s*["'`]?([^"'`,\}]+)["'`]?/);
              if (parts) {
                body[parts[1]] = parts[2].trim();
              }
            });
          }
        }
      }

      // Also check for string body (like raw JSON string)
      if (Object.keys(body).length === 0) {
        const rawBodyMatch = code.match(/body\s*:\s*["'`]([\s\S]*?)["'`]/);
        if (rawBodyMatch) {
          try {
            body = JSON.parse(rawBodyMatch[1]);
          } catch {
            // Keep empty if can't parse
          }
        }
      }

      const generatedName = generateApiName(cleanUrl, method);
      setApiName(generatedName);

      // Check if HTTP URL - auto enable proxy
      if (cleanUrl.toLowerCase().startsWith('http://')) {
        setProxyEnabled(true);
        setForceProxy(true);
      }

      setParsedApi({
        name: generatedName,
        url: cleanUrl,
        method,
        headers: cleanedHeaders,
        body,
        query_params: queryParams,
      });

    } catch (e) {
      setError('Failed to parse code. Please make sure it\'s valid Node.js fetch code from Reqable.');
      console.error('Parse error:', e);
    }
  };

  const handleConfirmAdd = () => {
    if (!parsedApi) return;

    onApiAdd({
      name: apiName || parsedApi.name,
      url: parsedApi.url,
      method: parsedApi.method,
      headers: parsedApi.headers,
      body: parsedApi.body,
      query_params: parsedApi.query_params,
      enabled,
      proxy_enabled: proxyEnabled,
      force_proxy: forceProxy,
      rotation_enabled: rotationEnabled,
    });

    // Reset form
    setRawCode('');
    setParsedApi(null);
    setApiName('');
    setEnabled(true);
    setProxyEnabled(false);
    setForceProxy(true);
    setRotationEnabled(false);
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-success/20 text-success border-success/30',
    POST: 'bg-secondary/20 text-secondary border-secondary/30',
    PUT: 'bg-warning/20 text-warning border-warning/30',
    DELETE: 'bg-destructive/20 text-destructive border-destructive/30',
    PATCH: 'bg-accent/20 text-accent border-accent/30',
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card className="border-primary/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <Code className="w-5 h-5" />
            Paste Node.js Fetch Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`// Paste your Node.js fetch code here (from Reqable)
// Example:
fetch("https://api.example.com/endpoint", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token"
  },
  body: JSON.stringify({
    "key": "value"
  })
})`}
            value={rawCode}
            onChange={(e) => setRawCode(e.target.value)}
            className="min-h-[200px] font-mono text-xs bg-muted/30 border-muted/50"
          />
          
          <Button
            onClick={() => parseNodeFetchCode(rawCode)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Code className="w-4 h-4 mr-2" />
            Parse & Preview API
          </Button>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parsed Result Section */}
      {parsedApi && (
        <Card className="border-success/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-success flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Parsed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Name */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">API Name</Label>
              <Input
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                placeholder="Enter API name"
                className="bg-muted/30 border-muted/50"
              />
            </div>

            {/* Method & URL */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Method & URL</Label>
              <div className="flex items-center gap-2">
                <Badge className={`${methodColors[parsedApi.method] || 'bg-muted'} border shrink-0`}>
                  {parsedApi.method}
                </Badge>
                <code className="flex-1 text-xs bg-muted/30 p-2 rounded border border-muted/50 truncate">
                  {parsedApi.url}
                </code>
              </div>
            </div>

            {/* Headers */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Headers ({Object.keys(parsedApi.headers).length} kept)
              </Label>
              <div className="bg-muted/30 p-2 rounded border border-muted/50 max-h-32 overflow-auto">
                {Object.keys(parsedApi.headers).length > 0 ? (
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(parsedApi.headers, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-muted-foreground">No headers</span>
                )}
              </div>
            </div>

            {/* Body */}
            {Object.keys(parsedApi.body).length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Body</Label>
                <div className="bg-muted/30 p-2 rounded border border-muted/50 max-h-32 overflow-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(parsedApi.body, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Query Params */}
            {Object.keys(parsedApi.query_params).length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Query Parameters</Label>
                <div className="bg-muted/30 p-2 rounded border border-muted/50">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(parsedApi.query_params, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">Enable</span>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} className="scale-75" />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-secondary" />
                  <span className="text-xs text-muted-foreground">Proxy</span>
                </div>
                <Switch checked={proxyEnabled} onCheckedChange={setProxyEnabled} className="scale-75" />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-warning" />
                  <span className="text-xs text-muted-foreground">Force</span>
                </div>
                <Switch checked={forceProxy} onCheckedChange={setForceProxy} className="scale-75" />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
                <div className="flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 text-accent" />
                  <span className="text-xs text-muted-foreground">Rotate</span>
                </div>
                <Switch checked={rotationEnabled} onCheckedChange={setRotationEnabled} className="scale-75" />
              </div>
            </div>

            {/* HTTP Warning */}
            {parsedApi.url.toLowerCase().startsWith('http://') && (
              <div className="flex items-start gap-2 p-2 rounded bg-warning/10 border border-warning/30 text-warning text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>HTTP URL detected - Proxy auto-enabled for server-side execution</span>
              </div>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirmAdd}
              className="w-full bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm & Add API
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApiImporter;
