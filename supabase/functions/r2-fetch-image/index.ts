import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
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
    // 1. Verify Authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Parse request
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Fetch remote image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch remote image: ${imageRes.statusText}`);
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get('content-type') || 'application/octet-stream';

    // Generate safe filename
    const urlParts = imageUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const safeName = `${Date.now()}-${lastPart.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // 4. Initialize S3 Client pointing to Cloudflare R2
    const S3 = new S3Client({
      region: "auto",
      endpoint: Deno.env.get("R2_ENDPOINT"),
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
      },
    });

    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const publicUrlBase = Deno.env.get("R2_PUBLIC_URL");

    // 5. Upload to R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: safeName,
      Body: new Uint8Array(arrayBuffer),
      ContentType: contentType,
    });

    await S3.send(command);

    // 6. Construct public URL
    const publicUrl = `${publicUrlBase}/${safeName}`;

    return new Response(
      JSON.stringify({ url: publicUrl }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in r2-fetch-image:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
