import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customerId, shopId, retailerName, customerData, shopName } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase admin credentials not configured');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get the shop's profile
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('retail_profile_id')
      .eq('id', shopId)
      .single();
      
    if (shopError) throw shopError;
    
    const profileId = shop?.retail_profile_id || 'showroom';
    
    // 2. Build Structural Prompt based on Profile
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

    // 3. Save the draft
    const { error: updateError } = await supabase
      .from('customers')
      .update({ ai_draft_message: draftText })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, text: draftText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
