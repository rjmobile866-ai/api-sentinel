import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { password } = await req.json()
    
    // Get client IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('cf-connecting-ip') 
      || req.headers.get('x-real-ip') 
      || 'unknown'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find the password in database
    const { data: pwRecord, error } = await supabase
      .from('user_passwords')
      .select('*')
      .eq('password', password)
      .eq('is_active', true)
      .single()

    if (error || !pwRecord) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update last used info (no IP locking - mobile IPs change frequently)
    await supabase
      .from('user_passwords')
      .update({ device_ip: clientIp, last_used_at: new Date().toISOString() })
      .eq('id', pwRecord.id)

    return new Response(JSON.stringify({ 
      success: true, 
      password_id: pwRecord.id,
      ip: clientIp
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
