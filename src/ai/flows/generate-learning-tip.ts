'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schemas bleiben identisch
const GenerateLearningTipInputSchema = z.object({
  item: z.string().describe('The vocabulary word or verb infinitive.'),
  definition: z.string().describe('The German definition/translation of the item.'),
  language: z.string().describe('The language of the item (e.g., French, English).'),
  type: z.enum(['Vokabel', 'Verb']).describe('The type of the item.'),
});

export type GenerateLearningTipInput = z.infer<typeof GenerateLearningTipInputSchema>;

const GenerateLearningTipOutputSchema = z.object({
  tips: z.array(z.string()).length(3).describe('An array of three distinct, helpful, and concise learning tips.'),
});

export type GenerateLearningTipOutput = z.infer<typeof GenerateLearningTipOutputSchema>;

// Der Prompt wird definiert
const learningTipPrompt = ai.definePrompt({
  name: 'generateLearningTipPrompt',
  input: { schema: GenerateLearningTipInputSchema },
  output: { schema: GenerateLearningTipOutputSchema },
  prompt: `Du bist ein erfahrener Sprachlehrer. Deine Aufgabe ist es, DREI kurze, hilfreiche und leicht verständliche Lerntipps für das folgende Wort zu erstellen.
Jeder Tipp sollte als Eselsbrücke, durch einen Beispielsatz oder eine einfache Erklärung helfen, sich das Wort besser zu merken.
Die drei Tipps müssen sich voneinander unterscheiden. Fasse dich kurz und sei kreativ.

Sprache: {{language}}
Typ: {{type}}
Wort/Verb: "{{item}}"
Bedeutung: "{{definition}}"`,
});

// Die Hauptfunktion, die exportiert wird
export async function generateLearningTip(input: GenerateLearningTipInput): Promise<GenerateLearningTipOutput> {
  // Wir rufen den Flow auf
  return await generateLearningTipFlow(input);
}

// Der Flow
const generateLearningTipFlow = ai.defineFlow(
  {
    name: 'generateLearningTipFlow',
    inputSchema: GenerateLearningTipInputSchema,
    outputSchema: GenerateLearningTipOutputSchema,
  },
  async (input) => {
    // KORREKTUR: Wir nutzen ai.generate und übergeben den Prompt dort.
    // Das ist in Genkit oft stabiler als der direkte Prompt-Aufruf.
    const response = await ai.generate({
      prompt: learningTipPrompt(input),
    });

    const output = response.output;

    if (!output || !output.tips || output.tips.length !== 3) {
      console.error("KI Output unvollständig:", output);
      throw new Error('AI failed to generate exactly three learning tips.');
    }

    return output;
  }
);
