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

// Per-API timeout wrapper - ensures one slow API doesn't block others
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Retry wrapper - retries once on failure
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  timeoutMs = 15000,
  retries = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (err) {
      if (attempt === retries) throw err;
      // Small delay before retry
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('All retries exhausted');
}

// Hit a single API with timeout & retry
async function hitApi(
  api: any, 
  phone: string, 
  perApiTimeout: number
): Promise<{ name: string; status: number | null; success: boolean; response_time: number; error?: string }> {
  const targetUrl = replacePlaceholders(api.url, phone);
  const headers: Record<string, string> = {
    'User-Agent': getRandomUA(),
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    ...(api.headers ? replaceInObject(api.headers as Record<string, unknown>, phone) as Record<string, string> : {}),
  };

  try {
    const parsed = new URL(targetUrl);
    headers['Origin'] = parsed.origin;
    headers['Referer'] = parsed.origin + '/';
  } catch {}

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

  try {
    const start = Date.now();
    const response = await fetchWithRetry(targetUrl, fetchOptions, perApiTimeout, 1);
    const responseTime = Date.now() - start;
    return { name: api.name, status: response.status, success: response.ok, response_time: responseTime };
  } catch (err) {
    const errMsg = err.name === 'AbortError' ? `Timeout (>${perApiTimeout/1000}s)` : (err.message || 'Unknown error');
    return { name: api.name, status: null, success: false, response_time: 0, error: errMsg };
  }
}

// Process a batch of APIs in parallel
async function processBatch(
  apis: any[], 
  phone: string, 
  perApiTimeout: number
): Promise<{ name: string; status: number | null; success: boolean; response_time: number; error?: string }[]> {
  const results = await Promise.allSettled(
    apis.map(api => hitApi(api, phone, perApiTimeout))
  );
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { name: apis[i].name, status: null, success: false, response_time: 0, error: r.reason?.message };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get('phone') || url.searchParams.get('number') || '';
    const rounds = Math.min(parseInt(url.searchParams.get('rounds') || '1') || 1, 50); // max 50 rounds
    const batchSize = Math.min(parseInt(url.searchParams.get('batch') || '5') || 5, 20); // max 20 per batch
    const delayBetweenRounds = Math.min(parseInt(url.searchParams.get('delay') || '2') || 2, 10) * 1000; // delay in seconds, max 10s
    const perApiTimeout = parseInt(url.searchParams.get('timeout') || '15') * 1000;

    if (!phone) {
      return new Response(
        JSON.stringify({ 
          error: 'phone parameter is required',
          usage: '?phone=9876543210&rounds=5&batch=5&delay=2&timeout=15',
          params: {
            phone: 'Required - phone number',
            rounds: 'Optional - number of rounds (default: 1, max: 50)',
            batch: 'Optional - APIs per batch (default: 5, max: 20)',
            delay: 'Optional - seconds between rounds (default: 2, max: 10)',
            timeout: 'Optional - per-API timeout in seconds (default: 15)',
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Log this hit (non-blocking)
    supabase.from('hit_logs').insert({ phone }).then(() => {});

    const allRounds: { round: number; results: any[] }[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let round = 1; round <= rounds; round++) {
      // Split APIs into batches
      const roundResults: any[] = [];

      for (let i = 0; i < apis.length; i += batchSize) {
        const batch = apis.slice(i, i + batchSize);
        const batchResults = await processBatch(batch, phone, perApiTimeout);
        roundResults.push(...batchResults);

        // Small delay between batches (500ms) to avoid overwhelming
        if (i + batchSize < apis.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      const roundSuccess = roundResults.filter(r => r.success).length;
      totalSuccess += roundSuccess;
      totalFailed += roundResults.length - roundSuccess;

      allRounds.push({ round, results: roundResults });

      // Delay between rounds (except last round)
      if (round < rounds) {
        await new Promise(r => setTimeout(r, delayBetweenRounds));
      }
    }

    return new Response(
      JSON.stringify({
        phone,
        total_apis: apis.length,
        rounds_completed: rounds,
        batch_size: batchSize,
        total_hits: totalSuccess + totalFailed,
        total_success: totalSuccess,
        total_failed: totalFailed,
        rounds: allRounds,
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
