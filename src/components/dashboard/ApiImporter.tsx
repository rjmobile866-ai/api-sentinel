import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, Code, Zap, Globe, Shield, RotateCcw, Info } from 'lucide-react';

interface ParsedApi {
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  query_params: Record<string, string>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ApiImporterProps {
  onApiAdd: (api: {
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
  }) => void;
}

// Headers to automatically remove (case-insensitive matching)
const HEADERS_TO_REMOVE = [
  'user-agent',
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

// sec-* headers pattern - all headers starting with sec- are removed
const SEC_HEADER_PATTERN = /^sec-/i;

// X-Requested-With values to replace with XMLHttpRequest
const INVALID_XRW_VALUES = ['mark.via.gp', 'mark.via', 'via.browser'];

const ApiImporter: React.FC<ApiImporterProps> = ({ onApiAdd }) => {
  const [rawCode, setRawCode] = useState('');
  const [parsedApi, setParsedApi] = useState<ParsedApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiName, setApiName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [forceProxy, setForceProxy] = useState(true);
  const [rotationEnabled, setRotationEnabled] = useState(false);

  // Normalize header key to lowercase for comparison
  const normalizeHeaderKey = (key: string): string => key.toLowerCase().trim();

  // Check if header should be removed
  const shouldRemoveHeader = (key: string): boolean => {
    const normalizedKey = normalizeHeaderKey(key);
    
    // Check sec-* pattern
    if (SEC_HEADER_PATTERN.test(normalizedKey)) {
      return true;
    }
    
    // Check against removal list
    return HEADERS_TO_REMOVE.includes(normalizedKey);
  };

  // Clean and normalize headers
  const cleanHeaders = (
    headers: Record<string, string>, 
    method: string, 
    hasJsonBody: boolean
  ): Record<string, string> => {
    const normalizedHeaders: Map<string, { originalKey: string; value: string }> = new Map();
    
    // First pass: normalize and deduplicate headers (last value wins)
    for (const [key, value] of Object.entries(headers)) {
      const normalizedKey = normalizeHeaderKey(key);
      
      // Skip headers that should be removed
      if (shouldRemoveHeader(key)) {
        continue;
      }
      
      // Handle X-Requested-With normalization
      if (normalizedKey === 'x-requested-with') {
        const lowerValue = value.toLowerCase();
        if (INVALID_XRW_VALUES.some(v => lowerValue.includes(v))) {
          normalizedHeaders.set(normalizedKey, { originalKey: 'X-Requested-With', value: 'XMLHttpRequest' });
          continue;
        }
      }
      
      // Store with normalized key, keeping last value
      normalizedHeaders.set(normalizedKey, { originalKey: key, value });
    }
    
    // Build final headers object
    const cleaned: Record<string, string> = {};
    
    for (const [normalizedKey, { originalKey, value }] of normalizedHeaders) {
      // Use proper casing for common headers
      const properKey = getProperHeaderCasing(originalKey);
      cleaned[properKey] = value;
    }
    
    // Auto-add Content-Type for POST/PUT/PATCH with JSON body
    if (['POST', 'PUT', 'PATCH'].includes(method) && hasJsonBody) {
      const hasContentType = normalizedHeaders.has('content-type');
      if (!hasContentType) {
        cleaned['Content-Type'] = 'application/json';
      }
    }
    
    // Auto-add Accept header for JSON body requests
    if (hasJsonBody) {
      const hasAccept = normalizedHeaders.has('accept');
      if (!hasAccept) {
        cleaned['Accept'] = 'application/json';
      }
    }
    
    // Remove Content-Type for GET requests (shouldn't have body)
    if (method === 'GET') {
      delete cleaned['Content-Type'];
      // Also check lowercase version
      for (const key of Object.keys(cleaned)) {
        if (normalizeHeaderKey(key) === 'content-type') {
          delete cleaned[key];
        }
      }
    }
    
    return cleaned;
  };

  // Get proper casing for common headers
  const getProperHeaderCasing = (header: string): string => {
    const casingMap: Record<string, string> = {
      'content-type': 'Content-Type',
      'accept': 'Accept',
      'authorization': 'Authorization',
      'x-requested-with': 'X-Requested-With',
      'x-api-key': 'X-API-Key',
      'x-auth-token': 'X-Auth-Token',
    };
    
    const normalized = normalizeHeaderKey(header);
    return casingMap[normalized] || header;
  };

  // Extract query params from URL
  const extractQueryParams = (url: string): { cleanUrl: string; params: Record<string, string> } => {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      return { cleanUrl, params };
    } catch {
      return { cleanUrl: url, params: {} };
    }
  };

  // Generate meaningful API name
  const generateApiName = (url: string, method: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Find meaningful path segments (not just numbers/IDs)
      const meaningfulParts = pathParts.filter(part => {
        // Skip pure numeric parts or UUID-like strings
        if (/^\d+$/.test(part)) return false;
        if (/^[a-f0-9-]{32,}$/i.test(part)) return false;
        return true;
      });
      
      // Take last 2 meaningful parts for better context
      const nameParts = meaningfulParts.slice(-2);
      
      if (nameParts.length > 0) {
        // Convert to readable format: api-login-send-otp → login send otp
        const readableName = nameParts
          .map(p => p.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'))
          .join(' ')
          .toLowerCase();
        return `${method} ${readableName}`.substring(0, 50);
      }
      
      // Fallback to hostname
      const hostParts = urlObj.hostname.split('.');
      const domain = hostParts.length > 1 ? hostParts[hostParts.length - 2] : hostParts[0];
      return `${method} ${domain}`.substring(0, 50);
    } catch {
      return `${method} API`;
    }
  };

  // Check if body is JSON
  const isJsonBody = (body: unknown): boolean => {
    if (body === null || body === undefined) return false;
    if (typeof body === 'object' && Object.keys(body as object).length > 0) return true;
    return false;
  };

  // Validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Validate parsed API before adding
  const validateApi = (api: ParsedApi, customName: string): ValidationResult => {
    const errors: string[] = [];
    
    // Validate URL
    if (!api.url || !isValidUrl(api.url)) {
      errors.push('Invalid URL format. Please check the URL is complete and valid.');
    }
    
    // Validate method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!api.method || !validMethods.includes(api.method)) {
      errors.push('Invalid HTTP method. Supported: GET, POST, PUT, DELETE, PATCH');
    }
    
    // Validate API name
    const finalName = customName || api.name;
    if (!finalName || finalName.trim().length < 2) {
      errors.push('API name is required (minimum 2 characters)');
    }
    
    // Validate body JSON (if present)
    if (['POST', 'PUT', 'PATCH'].includes(api.method) && Object.keys(api.body).length > 0) {
      try {
        JSON.stringify(api.body);
      } catch {
        errors.push('Body contains invalid JSON data');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // Parse body from code with variable resolution
  const parseBody = (code: string): { body: Record<string, unknown>; parseWarning?: string } => {
    let body: Record<string, unknown> = {};
    let parseWarning: string | undefined;
    
    // Pattern 1: body: JSON.stringify({...})
    const jsonStringifyInlineMatch = code.match(/body\s*:\s*JSON\.stringify\s*\(\s*(\{[\s\S]*?\})\s*\)/);
    if (jsonStringifyInlineMatch) {
      try {
        let bodyStr = jsonStringifyInlineMatch[1];
        bodyStr = bodyStr.replace(/'/g, '"');
        bodyStr = bodyStr.replace(/,\s*}/g, '}');
        bodyStr = bodyStr.replace(/,\s*]/g, ']');
        bodyStr = bodyStr.replace(/\n\s*/g, ' ');
        bodyStr = bodyStr.replace(/(\{|,)\s*([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
        body = JSON.parse(bodyStr);
        return { body };
      } catch {
        // Continue to other patterns
      }
    }
    
    // Pattern 2: body: variable (variable resolution)
    const bodyVarMatch = code.match(/body\s*:\s*([a-zA-Z_]\w*)\s*[,}]/);
    if (bodyVarMatch && Object.keys(body).length === 0) {
      const varName = bodyVarMatch[1];
      
      // Try to find JSON.stringify(object) definition
      // Pattern: const varName = JSON.stringify({...})
      const jsonStringifyVarMatch = code.match(
        new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*JSON\\.stringify\\s*\\(\\s*(\\{[\\s\\S]*?\\})\\s*\\)`)
      );
      
      if (jsonStringifyVarMatch) {
        try {
          let bodyStr = jsonStringifyVarMatch[1];
          bodyStr = bodyStr.replace(/'/g, '"');
          bodyStr = bodyStr.replace(/,\s*}/g, '}');
          bodyStr = bodyStr.replace(/,\s*]/g, ']');
          bodyStr = bodyStr.replace(/\n\s*/g, ' ');
          bodyStr = bodyStr.replace(/(\{|,)\s*([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
          body = JSON.parse(bodyStr);
          return { body };
        } catch {
          // Continue
        }
      }
      
      // Pattern: const varName = {...} (direct object)
      const objectVarMatch = code.match(
        new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*[;\\n]`)
      );
      
      if (objectVarMatch) {
        try {
          let bodyStr = objectVarMatch[1];
          bodyStr = bodyStr.replace(/'/g, '"');
          bodyStr = bodyStr.replace(/,\s*}/g, '}');
          bodyStr = bodyStr.replace(/,\s*]/g, ']');
          bodyStr = bodyStr.replace(/\n\s*/g, ' ');
          bodyStr = bodyStr.replace(/(\{|,)\s*([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
          body = JSON.parse(bodyStr);
          return { body };
        } catch {
          // Continue
        }
      }
      
      // Pattern: const varName = "json string"
      const stringVarMatch = code.match(
        new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*["'\`]([\s\\S]*?)["'\`]\\s*[;\\n]`)
      );
      
      if (stringVarMatch) {
        try {
          body = JSON.parse(stringVarMatch[1]);
          return { body };
        } catch {
          // Not valid JSON string
        }
      }
      
      // If variable definition not found but body uses a variable
      if (Object.keys(body).length === 0) {
        parseWarning = `Body variable "${varName}" found but definition not detected. Please check or manually enter body.`;
        return { body, parseWarning };
      }
    }
    
    // Pattern 3: body: {...} (direct object)
    const directBodyMatch = code.match(/body\s*:\s*(\{[\s\S]*?\})\s*(?:,|\})/);
    if (directBodyMatch && Object.keys(body).length === 0) {
      try {
        let bodyStr = directBodyMatch[1];
        bodyStr = bodyStr.replace(/'/g, '"');
        bodyStr = bodyStr.replace(/,\s*}/g, '}');
        bodyStr = bodyStr.replace(/,\s*]/g, ']');
        bodyStr = bodyStr.replace(/\n\s*/g, ' ');
        bodyStr = bodyStr.replace(/(\{|,)\s*([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
        body = JSON.parse(bodyStr);
        return { body };
      } catch {
        // Try extracting key-value pairs
        const bodyLines = directBodyMatch[1].match(/["'`]([^"'`]+)["'`]\s*:\s*["'`]?([^"'`,}]+)["'`]?/g);
        if (bodyLines) {
          bodyLines.forEach(line => {
            const parts = line.match(/["'`]([^"'`]+)["'`]\s*:\s*["'`]?([^"'`,}]+)["'`]?/);
            if (parts) {
              body[parts[1]] = parts[2].trim();
            }
          });
          if (Object.keys(body).length > 0) {
            return { body };
          }
        }
      }
    }
    
    // Pattern 4: body: "json string"
    const stringBodyMatch = code.match(/body\s*:\s*["'`]([\s\S]*?)["'`]\s*[,}]/);
    if (stringBodyMatch && Object.keys(body).length === 0) {
      try {
        body = JSON.parse(stringBodyMatch[1]);
        return { body };
      } catch {
        // Not valid JSON string
      }
    }
    
    return { body, parseWarning };
  };

  // Main parse function
  const parseNodeFetchCode = (code: string) => {
    setError(null);
    setParsedApi(null);
    setValidationErrors([]);
    setParseWarning(null);

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

      const fullUrl = urlMatch[1];
      
      // Validate URL early
      if (!isValidUrl(fullUrl)) {
        setError('Invalid URL detected. Please check the URL format.');
        return;
      }
      
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
          let headersStr = headersMatch[1];
          headersStr = headersStr.replace(/'/g, '"');
          headersStr = headersStr.replace(/,\s*}/g, '}');
          headersStr = headersStr.replace(/\n\s*/g, ' ');
          // Handle unquoted keys
          headersStr = headersStr.replace(/(\{|,)\s*([a-zA-Z_-]+)\s*:/g, '$1"$2":');
          headers = JSON.parse(headersStr);
        } catch {
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

      // Parse body with variable resolution
      const { body, parseWarning: bodyWarning } = parseBody(code);
      if (bodyWarning) {
        setParseWarning(bodyWarning);
      }
      
      const hasJsonBody = isJsonBody(body);

      // Clean headers with context
      const cleanedHeaders = cleanHeaders(headers, method, hasJsonBody);

      // Generate meaningful name
      const generatedName = generateApiName(cleanUrl, method);
      setApiName(generatedName);

      // Check if HTTP URL - auto enable proxy
      if (cleanUrl.toLowerCase().startsWith('http://')) {
        setProxyEnabled(true);
        setForceProxy(true);
      }

      const parsed: ParsedApi = {
        name: generatedName,
        url: cleanUrl,
        method,
        headers: cleanedHeaders,
        body,
        query_params: queryParams,
      };

      setParsedApi(parsed);

    } catch (e) {
      setError('Failed to parse code. Please make sure it\'s valid Node.js fetch code from Reqable.');
      console.error('Parse error:', e);
    }
  };

  // Handle confirm and add
  const handleConfirmAdd = () => {
    if (!parsedApi) return;

    // Validate before adding
    const validation = validateApi(parsedApi, apiName);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);

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
    setError(null);
    setParseWarning(null);
    setValidationErrors([]);
    setEnabled(true);
    setProxyEnabled(false);
    setForceProxy(true);
    setRotationEnabled(false);
  };

  // Get error message for status codes
  const getStatusErrorHint = (statusCode: number): string => {
    switch (statusCode) {
      case 400:
        return '💡 Hint: Body / Content-Type mismatch - check if body format matches Content-Type header';
      case 401:
        return '💡 Hint: Authorization / session required - add valid auth token or login first';
      case 403:
        return '💡 Hint: API blocked by origin / security - may need proxy or different approach';
      case 404:
        return '💡 Hint: Endpoint not found - verify the URL path is correct';
      case 429:
        return '💡 Hint: Rate limited - too many requests, add delay between hits';
      case 500:
        return '💡 Hint: Server error - check if request body/headers are correct';
      default:
        return '';
    }
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-success/20 text-success border-success/30',
    POST: 'bg-secondary/20 text-secondary border-secondary/30',
    PUT: 'bg-warning/20 text-warning border-warning/30',
    DELETE: 'bg-destructive/20 text-destructive border-destructive/30',
    PATCH: 'bg-accent/20 text-accent border-accent/30',
  };

  // Build preview of what will be sent
  const buildRequestPreview = () => {
    if (!parsedApi) return null;

    const preview = {
      method: parsedApi.method,
      url: parsedApi.url + (Object.keys(parsedApi.query_params).length > 0 
        ? '?' + new URLSearchParams(parsedApi.query_params).toString() 
        : ''),
      headers: parsedApi.headers,
      ...(Object.keys(parsedApi.body).length > 0 && { body: parsedApi.body }),
    };

    return preview;
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
    "phone": "{PHONE}"
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
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="space-y-2 p-3 rounded bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Validation Failed
                </div>
                <ul className="list-disc list-inside text-xs text-destructive space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parse Warning */}
            {parseWarning && (
              <div className="space-y-2 p-3 rounded bg-warning/10 border border-warning/30">
                <div className="flex items-center gap-2 text-warning font-medium text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Body Parsing Notice
                </div>
                <p className="text-xs text-warning">{parseWarning}</p>
              </div>
            )}

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
              <Label className="text-muted-foreground flex items-center gap-2">
                Headers ({Object.keys(parsedApi.headers).length} kept)
                <Info className="w-3 h-3 text-muted-foreground/60" />
              </Label>
              <div className="bg-muted/30 p-2 rounded border border-muted/50 max-h-32 overflow-auto">
                {Object.keys(parsedApi.headers).length > 0 ? (
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(parsedApi.headers, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-muted-foreground">No headers (defaults will be used)</span>
                )}
              </div>
            </div>

            {/* Body */}
            {Object.keys(parsedApi.body).length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Body (JSON)</Label>
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

            {/* Request Preview - What will actually be sent */}
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                📤 Request Preview (Exact Payload)
              </Label>
              <div className="bg-background/50 p-2 rounded border border-primary/30 max-h-40 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap text-primary/80">
                  {JSON.stringify(buildRequestPreview(), null, 2)}
                </pre>
              </div>
            </div>

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

            {/* Info about auto-added headers */}
            {parsedApi.method !== 'GET' && Object.keys(parsedApi.body).length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded bg-secondary/10 border border-secondary/30 text-secondary text-xs">
                <Info className="w-4 h-4 shrink-0" />
                <span>Content-Type & Accept headers auto-added for JSON body</span>
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
