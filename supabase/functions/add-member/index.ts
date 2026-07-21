import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is a valid authenticated user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const body = await req.json();
    const { email, full_name, password, shop_id } = body;

    if (!email || !shop_id || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields (email, password, shop_id)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Verify caller is the owner of this shop
    const { data: callerProfile } = await adminSupabase
      .from('profiles').select('shop_id, role').eq('id', user.id).single();

    if (callerProfile?.shop_id !== shop_id || callerProfile?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Forbidden. Only the owner can add members.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // Enforce 3-member workspace limit
    const { count } = await adminSupabase
      .from('profiles').select('*', { count: 'exact', head: true }).eq('shop_id', shop_id);

    if (count !== null && count >= 3) {
      return new Response(JSON.stringify({ error: 'Workspace limit reached (max 3 members).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // Create the new user account directly with the provided password
    // The handle_new_user trigger will fire and link them to the correct shop
    // via invited_shop_id in user_metadata.
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so they can log in immediately
      user_metadata: {
        full_name: full_name || '',
        invited_shop_id: shop_id,
        role: 'sales_executive',
      },
    });

    if (createError) throw createError;

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
