'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateLearningTipOutputSchema = z.object({
  tips: z.array(z.string()).length(3),
});

export async function generateLearningTip(input: any) {
  try {
    const response = await ai.generate({
      // WICHTIG: Nutze exakt diesen String. 
      // Das 'googleai/' Präfix ist der Schlüssel!
      model: 'googleai/gemini-1.5-flash', 
      prompt: `Du bist ein Lehrer. Erstelle 3 kurze Lerntipps für: ${input.item}.`,
      output: { schema: GenerateLearningTipOutputSchema },
    });

    return response.output; 
  } catch (error: any) {
    console.error("Vercel Error:", error);
    return { 
      tips: [
        `Fehler: ${error.message}`,
        "Modell-Aufruf fehlgeschlagen.",
        "Checke, ob das googleAI Plugin geladen ist."
      ] 
    };
  }
}