import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, prompt, history, systemInstruction, parts, imageParts } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'chat') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-flash-lite-latest',
        systemInstruction
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(prompt);
      return new Response(JSON.stringify({ text: result.response.text() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'vision') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
      
      const contentParts = [...(parts || [])];
      if (imageParts && imageParts.length > 0) {
        contentParts.push(...imageParts);
      }
      
      const result = await model.generateContent(contentParts);
      return new Response(JSON.stringify({ text: result.response.text() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generateImage') {
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
        for (let i = 0; i < imageParts.length; i++) {
          const baseImage = imageParts[i].inlineData;
          if (baseImage) {
            const binary = atob(baseImage.data);
            const array = new Uint8Array(binary.length);
            for (let j = 0; j < binary.length; j++) {
              array[j] = binary.charCodeAt(j);
            }
            const file = new File([array], `image_${i}.png`, { type: 'image/png' });
            formData.append('image[]', file);
          }
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
      if (!imageUrl) throw new Error('No image URL returned from OpenAI. Response: ' + JSON.stringify(data));

      // 1. Download image from OpenAI
      const imgRes = await fetch(imageUrl);
      const imgBuffer = await imgRes.arrayBuffer();

      // 2. Compress to JPEG
      const imageObj = await Image.decode(new Uint8Array(imgBuffer));
      const jpegBuffer = await imageObj.encodeJPEG(80);

      // 3. Upload to R2
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
      const filename = `gen_${Date.now()}.jpg`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        ContentType: "image/jpeg",
        Body: jpegBuffer,
      });
      await S3.send(command);

      const finalUrl = `${publicUrlBase}/${filename}`;

      // Return the final URL in Gemini format
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

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
