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
  proxyIndex?: number;
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
    const { url, method, headers, body, bodyType = 'json', useProxy = false }: HitApiRequest = await req.json();

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
    let lastError = '';
    let proxyUsed = 'direct';

    // Try direct first, then proxies if useProxy is enabled
    const maxAttempts = useProxy ? FREE_PROXIES.length + 1 : 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const isProxyAttempt = attempt > 0 || useProxy;
      const proxyIndex = useProxy ? (attempt === 0 ? -1 : attempt - 1) : -1;
      
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