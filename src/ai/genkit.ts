import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    // Wir übergeben den Key explizit aus deiner .env Variable
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
  // Wir nutzen das aktuelle, extrem schnelle 1.5-Flash Modell
  model: 'googleai/gemini-1.5-flash',
});