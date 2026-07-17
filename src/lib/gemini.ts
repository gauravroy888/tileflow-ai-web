import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
export const genAI = new GoogleGenerativeAI(apiKey);
export const geminiChat = genAI.getGenerativeModel({
  model: 'gemini-flash-lite-latest',
  systemInstruction: 'You are a helpful AI assistant for retail store owners selling tiles, flooring and home decor. Keep answers concise, practical and helpful.',
});
export const geminiVision = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

// Gemini 2.5 Flash Image model — supports image generation AND photo editing (Nano Banana)
export const geminiImageGen = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp-image-generation' });


