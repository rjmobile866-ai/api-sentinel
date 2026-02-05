import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HitApiRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, method, headers, body }: HitApiRequest = await req.json();

    if (!url || !method) {
      return new Response(
        JSON.stringify({ error: 'URL and method are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[hit-api] Hitting: ${method} ${url}`);

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // Only add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
      fetchOptions.body = JSON.stringify(body);
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
        response_text: responseText.substring(0, 1000), // Limit response size
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
