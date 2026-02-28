import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function replacePlaceholders(value: string, phone: string): string {
  return value.replace(/\{PHONE\}/gi, phone);
}

function replaceInObject(obj: Record<string, unknown>, phone: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      result[key] = replacePlaceholders(val, phone);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = replaceInObject(val as Record<string, unknown>, phone);
    } else {
      result[key] = val;
    }
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get('phone') || url.searchParams.get('number') || '';

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'phone parameter is required. Usage: ?phone=9876543210' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all enabled APIs from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: apis, error: dbError } = await supabase
      .from('apis')
      .select('*')
      .eq('enabled', true);

    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch APIs', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apis || apis.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No enabled APIs found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log this hit
    await supabase.from('hit_logs').insert({ phone });

    // Fire all APIs in parallel
    const results = await Promise.allSettled(
      apis.map(async (api) => {
        const targetUrl = replacePlaceholders(api.url, phone);
        const headers: Record<string, string> = {
          'User-Agent': getRandomUA(),
          'Accept': '*/*',
          ...(api.headers ? replaceInObject(api.headers as Record<string, unknown>, phone) as Record<string, string> : {}),
        };

        const method = (api.method || 'GET').toUpperCase();
        const fetchOptions: RequestInit = { method, headers };

        if (['POST', 'PUT', 'PATCH'].includes(method) && api.body) {
          const body = replaceInObject(api.body as Record<string, unknown>, phone);
          const contentType = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
          const ct = contentType ? headers[contentType] : '';

          if (/x-www-form-urlencoded/i.test(ct)) {
            fetchOptions.body = new URLSearchParams(body as Record<string, string>).toString();
          } else {
            fetchOptions.body = JSON.stringify(body);
            if (!contentType) headers['Content-Type'] = 'application/json';
          }
        }

        const start = Date.now();
        const response = await fetch(targetUrl, fetchOptions);
        const responseTime = Date.now() - start;

        return {
          name: api.name,
          status: response.status,
          success: response.ok,
          response_time: responseTime,
        };
      })
    );

    const summary = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { name: apis[i].name, status: null, success: false, error: r.reason?.message };
    });

    const successCount = summary.filter(s => s.success).length;

    return new Response(
      JSON.stringify({
        phone,
        total: apis.length,
        success: successCount,
        failed: apis.length - successCount,
        results: summary,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
