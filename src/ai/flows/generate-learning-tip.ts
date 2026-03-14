'use server';

import { ai } from '@/ai/genkit';
import { gemini15Flash } from '@genkit-ai/google-genai'; // Auch hier importieren
import { z } from 'genkit';

const GenerateLearningTipOutputSchema = z.object({
  tips: z.array(z.string()).length(3),
});

export async function generateLearningTip(input: any) {
  try {
    const response = await ai.generate({
      model: gemini15Flash, // Referenz statt String 'googleai/...'
      prompt: `Du bist ein Lehrer. Erstelle 3 kurze Lerntipps für: ${input.item}.`,
      output: { schema: GenerateLearningTipOutputSchema },
    });

    return response.output; 
  } catch (error: any) {
    console.error("Vercel Error:", error);
    return { 
      tips: [
        `Fehler: ${error.message}`,
        "Bitte prüfe, ob der Gemini API Key korrekt ist.",
        "Stelle sicher, dass @genkit-ai/google-genai installiert ist."
      ] 
    };
  }
}