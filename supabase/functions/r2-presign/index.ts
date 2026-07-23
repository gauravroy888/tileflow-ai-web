import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";
import { createClient } from "npm:@supabase/supabase-js@2.44.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Parse request
    const { filename, contentType, fileSize } = await req.json();

    if (!filename || !contentType) {
      return new Response(
        JSON.stringify({ error: "Missing filename or contentType" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate allowed content types (images and PDFs only)
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/gif', 'image/svg+xml', 'application/pdf',
    ];
    if (!ALLOWED_TYPES.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: `File type "${contentType}" is not allowed. Allowed types: images and PDF.` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Enforce 10 MB max file size
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    if (fileSize && fileSize > MAX_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum allowed size is 10 MB.` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Initialize S3 Client pointing to Cloudflare R2
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

    // 4. Generate Presigned URL
    // CRIT-05: Sanitize filename — strip path traversal chars, force safe prefix
    const rawName = filename as string;
    const safeName = rawName
      .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only allow safe chars
      .replace(/\.{2,}/g, '_')            // Block ../
      .substring(0, 200);                 // Max length

    // Always prefix uploads with 'uploads/' to sandbox in a safe directory
    const safeKey = `uploads/${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: safeKey,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 }); // 1 hour expiry

    // 5. Return the presigned URL and the final public URL
    return new Response(
      JSON.stringify({
        signedUrl,
        publicUrl: `${publicUrlBase}/${safeKey}`,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Error generating presigned URL:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
