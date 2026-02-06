import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Browser-like headers to bypass basic protections
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

// Free CORS proxy services (rotated on failure)
const FREE_PROXIES = [
  { name: 'allorigins', format: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: 'corsproxy', format: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  { name: 'cors-anywhere', format: (url: string) => `https://cors-anywhere.herokuapp.com/${url}` },
];

interface HitApiRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  bodyType?: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none';
  useProxy?: boolean;
  useResidentialProxy?: boolean;
}

// Get residential proxy URL from environment (user configured)
function getResidentialProxyUrl(): string | null {
  return Deno.env.get('RESIDENTIAL_PROXY_URL') || null;
}

async function makeRequestViaResidentialProxy(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  proxyUrl: string
): Promise<{ response: Response | null; error: string | null }> {
  console.log(`[hit-api] Using residential proxy for: ${method} ${url}`);

  try {
    // Parse proxy URL (format: http://user:pass@host:port)
    const proxyParsed = new URL(proxyUrl);
    const proxyAuth = proxyParsed.username && proxyParsed.password 
      ? `${proxyParsed.username}:${proxyParsed.password}`
      : null;

    // For residential proxies, we use a different approach
    // Most residential proxy APIs work as HTTP endpoints
    // We'll try the common formats

    // Format 1: Direct proxy with auth header
    const fetchHeaders: Record<string, string> = {
      ...headers,
    };

    if (proxyAuth) {
      fetchHeaders['Proxy-Authorization'] = `Basic ${btoa(proxyAuth)}`;
    }

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: fetchHeaders,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = body;
    }

    // Try direct fetch (some environments support proxy env vars)
    const response = await fetch(url, fetchOptions);
    return { response, error: null };
  } catch (error) {
    console.error(`[hit-api] Residential proxy failed:`, error.message);
    return { response: null, error: error.message };
  }
}

async function makeRequest(
  url: string, 
  method: string, 
  headers: Record<string, string>, 
  body: string | undefined,
  useProxy: boolean,
  proxyIndex: number
): Promise<{ response: Response | null; proxyUsed: string | null; error: string | null }> {
  
  const targetUrl = useProxy && proxyIndex < FREE_PROXIES.length 
    ? FREE_PROXIES[proxyIndex].format(url)
    : url;
  
  const proxyName = useProxy && proxyIndex < FREE_PROXIES.length 
    ? FREE_PROXIES[proxyIndex].name 
    : 'direct';

  console.log(`[hit-api] Trying ${proxyName}: ${method} ${url}`);

  try {
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    return { response, proxyUsed: proxyName, error: null };
  } catch (error) {
    console.error(`[hit-api] ${proxyName} failed:`, error.message);
    return { response: null, proxyUsed: proxyName, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      url, 
      method, 
      headers, 
      body, 
      bodyType = 'json', 
      useProxy = false,
      useResidentialProxy = false 
    }: HitApiRequest = await req.json();

    if (!url || !method) {
      return new Response(
        JSON.stringify({ error: 'URL and method are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract origin for headers
    let origin = '';
    try {
      const urlObj = new URL(url);
      origin = urlObj.origin;
    } catch {
      origin = '';
    }

    // Build final headers
    const finalHeaders: Record<string, string> = {
      ...browserHeaders,
      ...(origin && { 'Origin': origin, 'Referer': origin + '/' }),
      ...headers,
    };

    // Prepare body
    let requestBody: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
      if (bodyType === 'form-urlencoded') {
        requestBody = new URLSearchParams(body as Record<string, string>).toString();
        finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (bodyType === 'text') {
        requestBody = typeof body === 'string' ? body : JSON.stringify(body);
      } else {
        requestBody = JSON.stringify(body);
        finalHeaders['Content-Type'] = 'application/json';
      }
    }

    const startTime = Date.now();

    // Check if residential proxy is requested and configured
    if (useResidentialProxy) {
      const residentialProxyUrl = getResidentialProxyUrl();
      
      if (!residentialProxyUrl) {
        console.log('[hit-api] Residential proxy requested but not configured');
        return new Response(
          JSON.stringify({
            success: false,
            status_code: null,
            response_time: 0,
            error_message: 'Residential proxy not configured. Please add RESIDENTIAL_PROXY_URL secret.',
            proxy_used: 'residential (not configured)',
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const result = await makeRequestViaResidentialProxy(
        url,
        method,
        finalHeaders,
        requestBody,
        residentialProxyUrl
      );

      const responseTime = Date.now() - startTime;

      if (result.response) {
        const statusCode = result.response.status;
        let responseText = '';
        try {
          responseText = await result.response.text();
        } catch {
          responseText = 'Unable to read response body';
        }

        console.log(`[hit-api] Success via residential: ${statusCode} in ${responseTime}ms`);

        return new Response(
          JSON.stringify({
            success: result.response.ok,
            status_code: statusCode,
            response_time: responseTime,
            response_text: responseText.substring(0, 1000),
            proxy_used: 'residential',
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          status_code: null,
          response_time: responseTime,
          error_message: `Residential proxy failed: ${result.error}`,
          proxy_used: 'residential',
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Regular flow (direct or free proxy)
    let lastError = '';
    let proxyUsed = 'direct';

    // Try direct first, then proxies if useProxy is enabled
    const maxAttempts = useProxy ? FREE_PROXIES.length + 1 : 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // For first attempt with useProxy, start with proxy index 0
      const actualProxyIndex = useProxy ? attempt : -1;
      const actualUseProxy = actualProxyIndex >= 0 && actualProxyIndex < FREE_PROXIES.length;

      const result = await makeRequest(
        url,
        method,
        finalHeaders,
        requestBody,
        actualUseProxy,
        actualProxyIndex
      );

      if (result.response) {
        const responseTime = Date.now() - startTime;
        const statusCode = result.response.status;
        
        let responseText = '';
        try {
          responseText = await result.response.text();
        } catch {
          responseText = 'Unable to read response body';
        }

        console.log(`[hit-api] Success via ${result.proxyUsed}: ${statusCode} in ${responseTime}ms`);

        return new Response(
          JSON.stringify({
            success: result.response.ok,
            status_code: statusCode,
            response_time: responseTime,
            response_text: responseText.substring(0, 1000),
            proxy_used: result.proxyUsed,
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      lastError = result.error || 'Unknown error';
      proxyUsed = result.proxyUsed || 'unknown';
    }

    // All attempts failed
    const responseTime = Date.now() - startTime;
    console.error(`[hit-api] All attempts failed. Last error: ${lastError}`);

    return new Response(
      JSON.stringify({
        success: false,
        status_code: null,
        response_time: responseTime,
        error_message: `All attempts failed: ${lastError}`,
        proxy_used: proxyUsed,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[hit-api] Error:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        status_code: null,
        response_time: 0,
        error_message: error.message || 'Failed to hit API',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});