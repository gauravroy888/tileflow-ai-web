import OpenAI from 'openai';

// Initialize the OpenAI client
// Note: dangerouslyAllowBrowser is required when running directly in a Vite frontend.
// In a production app, this should be routed through a secure backend server.
export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true 
});
