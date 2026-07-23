import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { createClient } from 'npm:@supabase/supabase-js';

// ─── Allowed origins for CORS (CRIT-04) ──────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'http://localhost:5173',
  'https://gauravroy888.github.io',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ─── CRIT-02 fix: Verify authentication ────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller's JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── CRIT-02 fix: Ownership check via service role ─────────────────────
    const { customerId, shopId, retailerName, customerData, shopName } = await req.json();

    // Use service role to verify customer ownership — never trust client shopId alone
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the customer actually belongs to the given shopId
    const { data: customerRecord, error: customerError } = await adminSupabase
      .from('customers')
      .select('id, shop_id')
      .eq('id', customerId)
      .single();

    if (customerError || !customerRecord) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // IDOR fix: confirm the customer's shop_id matches what the caller claims
    if (customerRecord.shop_id !== shopId) {
      return new Response(JSON.stringify({ error: 'Forbidden: Customer does not belong to this shop' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also verify the caller's profile belongs to the same shop
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.shop_id !== shopId) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not belong to this shop' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── All checks passed — proceed with generation ───────────────────────
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    // 1. Get the shop's profile for profile-specific messaging
    const { data: shop, error: shopError } = await adminSupabase
      .from('shops')
      .select('retail_profile_id')
      .eq('id', shopId)
      .single();

    if (shopError) throw shopError;

    const profileId = shop?.retail_profile_id || 'showroom';

    // 2. Build structural rules based on profile
    let structuralRules = '- Keep it under 4 sentences.\n- Be conversational and polite.';

    if (profileId === 'tiles') {
      structuralRules += '\n- Mention next steps like sharing tile installation guides or checking site measurements.\n- Mention maintenance tips for the specific tile finish if applicable.';
    } else if (profileId === 'electronics') {
      structuralRules += '\n- Emphasize our extended warranty and premium support services.\n- Offer a free installation consultation.';
    } else if (profileId === 'furniture') {
      structuralRules += '\n- Mention our white-glove delivery and assembly services.\n- Highlight that we can customize fabrics/dimensions if needed.';
    } else if (profileId === 'pharmacy') {
      structuralRules += '\n- Be extremely discreet, professional and empathetic.\n- Remind them to bring their prescription if required.';
    } else if (profileId === 'salon') {
      structuralRules += '\n- Offer an easy way to re-book their next appointment.\n- Mention any current styling or grooming promotions.';
    }

    const prompt = `Write a short, professional, and friendly WhatsApp follow-up message to a retail customer from the shop "${shopName}". The message is from "${retailerName}".
Customer Name: ${customerData.name}
Project/Service Type: ${customerData.project_type || 'General Inquiry'}
Required Items/Products: ${customerData.required_products || 'Not specified'}

Rules:
${structuralRules}
- Sign off with the retailer's name and shop name.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const result = await model.generateContent(prompt);
    const draftText = result.response.text().trim();

    // 3. Save the draft using service role (safe — ownership already verified above)
    const { error: updateError } = await adminSupabase
      .from('customers')
      .update({ ai_draft_message: draftText })
      .eq('id', customerId)
      .eq('shop_id', shopId); // Double-lock: also filter by shop_id

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, text: draftText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const corsHeaders = getCorsHeaders(req);
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message?.includes('Unauthorized') || error.message?.includes('Forbidden') ? 403 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
