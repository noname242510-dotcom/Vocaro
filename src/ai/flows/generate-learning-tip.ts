'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateLearningTipOutputSchema = z.object({
  tips: z.array(z.string()).length(3),
});

export async function generateLearningTip(input: any) {
  try {
    // 1. Kurzer Check, ob der Key überhaupt da ist (für das Vercel Log)
    if (!process.env.GEMINI_API_KEY) {
      return { tips: ["Fehler: API Key fehlt in Vercel", "Bitte Settings prüfen", "GEMINI_API_KEY ist leer"] };
    }

    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `Erstelle 3 kurze Eselsbrücken für: ${input.item} (${input.definition}). Sprache: ${input.language}`,
      output: { schema: GenerateLearningTipOutputSchema },
    });

    return response.output; 
  } catch (error: any) {
    // Wir geben den Fehler als Tipps zurück, damit du ihn im Modal lesen kannst!
    console.error("Vercel Server Error:", error);
    return { 
      tips: [
        `Server-Fehler: ${error.message || 'Unbekannt'}`,
        `Typ: ${error.constructor?.name || 'Error'}`,
        "Check Vercel Logs für Details"
      ] 
    };
  }
}