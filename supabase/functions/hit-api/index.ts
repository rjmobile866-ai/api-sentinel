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
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

interface HitApiRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  bodyType?: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, method, headers, body, bodyType = 'json' }: HitApiRequest = await req.json();

    if (!url || !method) {
      return new Response(
        JSON.stringify({ error: 'URL and method are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[hit-api] Hitting: ${method} ${url}`);

    // Extract origin/referer from target URL
    let origin = '';
    try {
      const urlObj = new URL(url);
      origin = urlObj.origin;
    } catch {
      origin = '';
    }

    // Merge browser headers with custom headers (custom headers take priority)
    const finalHeaders: Record<string, string> = {
      ...browserHeaders,
      ...(origin && { 'Origin': origin, 'Referer': origin + '/' }),
      ...headers,
    };

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: finalHeaders,
    };

    // Only add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
      if (bodyType === 'form-urlencoded') {
        fetchOptions.body = new URLSearchParams(body as Record<string, string>).toString();
        fetchOptions.headers = {
          ...finalHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        };
      } else if (bodyType === 'multipart') {
        fetchOptions.body = JSON.stringify(body);
        const headersCopy = { ...finalHeaders };
        delete headersCopy['Content-Type'];
        fetchOptions.headers = headersCopy;
      } else if (bodyType === 'text') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        const headersCopy = { ...finalHeaders };
        delete headersCopy['Content-Type'];
        fetchOptions.headers = headersCopy;
      } else {
        fetchOptions.body = JSON.stringify(body);
        fetchOptions.headers = {
          ...finalHeaders,
          'Content-Type': 'application/json',
        };
      }
    }

    const startTime = Date.now();
    
    const response = await fetch(url, fetchOptions);
    
    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    
    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      responseText = 'Unable to read response body';
    }

    console.log(`[hit-api] Response: ${statusCode} in ${responseTime}ms`);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status_code: statusCode,
        response_time: responseTime,
        response_text: responseText.substring(0, 1000),
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