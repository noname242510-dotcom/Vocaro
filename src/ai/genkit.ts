import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/google-genai'; // gemini15Flash hier importieren!

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
  model: gemini15Flash, // Hier die Referenz nutzen, keinen String!
});