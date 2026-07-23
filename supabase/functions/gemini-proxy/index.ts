import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { decodeBase64 } from "jsr:@std/encoding/base64";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";
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

// ─── Rate limit check (CRIT-03) ──────────────────────────────────────────────
async function checkImageRateLimit(supabase: any, shopId: string, userId: string): Promise<void> {
  const { error: usageError } = await supabase.from('ai_usage_logs').insert({
    shop_id: shopId,
    user_id: userId,
    action_type: 'image_generation',
  });
  if (usageError) {
    if (usageError.message.includes('RATE_LIMIT_AI_IMAGE')) {
      throw new Error('Daily AI image limit reached (50 images/day). Please try again tomorrow.');
    }
    throw usageError;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ─── CRIT-01: Verify auth on every request ─────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Fetch shop_id for this user (needed for rate limiting)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();
    const shopId = profile?.shop_id ?? null;

    // ─── Parse body ────────────────────────────────────────────────────────
    const { action, prompt, history, parts, imageParts, shopId: _clientShopId } = await req.json();
    // NOTE: systemInstruction is intentionally NOT accepted from client (MED-01 fix).
    // The system instruction is built server-side per action type.

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── CHAT action ───────────────────────────────────────────────────────
    if (action === 'chat') {
      // System instruction is built from request parts (the client passes it via the prompt),
      // but we enforce our own fallback here.
      const bodyText = parts?.[0]?.text || prompt || '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        // Server-side system instruction — not from client input
        systemInstruction: 'You are a helpful AI assistant for retail store owners. Only help with retail, inventory, customer, and business-related questions.',
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(bodyText || prompt);
      return new Response(JSON.stringify({ text: result.response.text() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── VISION action ─────────────────────────────────────────────────────
    if (action === 'vision') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const contentParts = [...(parts || [])];
      if (imageParts && imageParts.length > 0) {
        contentParts.push(...imageParts);
      }

      const result = await model.generateContent(contentParts);
      return new Response(JSON.stringify({ text: result.response.text() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── GENERATE IMAGE action ─────────────────────────────────────────────
    if (action === 'generateImage') {
      // CRIT-03: Server-side rate limit check
      if (shopId && user.id) {
        await checkImageRateLimit(supabaseClient, shopId, user.id);
      }

      const openAiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAiKey) {
        return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not configured for image generation.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const partsArr = parts || [];
      const imagePrompt = partsArr.map((p: any) => p.text || '').join(' ').trim() || 'Edit this image';

      const formData = new FormData();
      formData.append('model', 'gpt-image-2');
      formData.append('prompt', imagePrompt);
      formData.append('n', '1');
      formData.append('size', '1024x1024');

      if (imageParts && imageParts.length > 0) {
        // OpenAI images/edits ONLY accepts exactly one 'image' file (the room to edit).
        const firstImagePart = imageParts.find((p: any) => p.inlineData);
        if (firstImagePart) {
          const baseImage = firstImagePart.inlineData;
          const binary = atob(baseImage.data);
          const array = new Uint8Array(binary.length);
          for (let j = 0; j < binary.length; j++) {
            array[j] = binary.charCodeAt(j);
          }
          const file = new File([array], 'room_image.png', { type: 'image/png' });
          formData.append('image', file);
        }
      }

      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI image edit error: ${response.status} - ${errData?.error?.message || JSON.stringify(errData)}`);
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;
      const b64Json = data.data?.[0]?.b64_json;

      let imgBuffer: Uint8Array;
      if (b64Json) {
        imgBuffer = decodeBase64(b64Json);
      } else if (imageUrl) {
        const imgRes = await fetch(imageUrl);
        imgBuffer = new Uint8Array(await imgRes.arrayBuffer());
      } else {
        throw new Error('No image URL or b64_json returned from OpenAI. Response: ' + JSON.stringify(data));
      }

      // Compress to JPEG
      const imageObj = await Image.decode(imgBuffer);
      const jpegBuffer = await imageObj.encodeJPEG(80);

      // Upload to R2
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
      // Safe server-generated filename — never from client input
      const filename = `gen_${user.id.substring(0, 8)}_${Date.now()}.jpg`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        ContentType: "image/jpeg",
        Body: jpegBuffer,
      });
      await S3.send(command);

      const finalUrl = `${publicUrlBase}/${filename}`;

      const fakeGeminiFormat = {
        candidates: [{
          content: {
            parts: [{
              fileData: {
                mimeType: 'image/jpeg',
                fileUri: finalUrl
              }
            }]
          }
        }]
      };

      return new Response(JSON.stringify(fakeGeminiFormat), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const corsHeaders = getCorsHeaders(req);
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message?.includes('Unauthorized') ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
