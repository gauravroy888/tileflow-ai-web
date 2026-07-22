import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { encodeBase64 } from "jsr:@std/encoding/base64";

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
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('No image data returned from OpenAI. Response: ' + JSON.stringify(data));

      // Return the data in the exact same format that the frontend (AI.tsx) expects for Gemini
      const fakeGeminiFormat = {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'image/png',
                data: b64
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
