import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.44.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const shopId = url.searchParams.get("shop_id");

    // Load secrets from environment — never hardcode credentials
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") ?? "https://psftgweqjfefrjtsmhoy.supabase.co/functions/v1/google-auth";
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://gauravroy888.github.io/tileflow-ai-web/settings";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Google OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase secrets." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (shopId) {
      // Step 1: Generate Google Auth URL
      const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${shopId}`;
      
      return new Response(
        JSON.stringify({ url: authUrl }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (code && state) {
      // Step 2: Handle Google Callback — exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.refresh_token) {
        const { error } = await supabase
          .from("shops")
          .update({ google_refresh_token: tokenData.refresh_token })
          .eq("id", state);
          
        if (error) console.error("Error saving token:", error);
      }

      // Redirect back to production settings page
      return Response.redirect(frontendUrl, 302);
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in google-auth:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
