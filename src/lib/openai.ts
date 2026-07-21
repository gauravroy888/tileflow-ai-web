// OpenAI calls are routed through the Supabase Edge Function (gemini-proxy)
// to keep the API key secure on the server side.
// Do NOT import or call OpenAI directly from the browser.
// Use supabase.functions.invoke('gemini-proxy', { body: { action: '...' } }) instead.
export {};
