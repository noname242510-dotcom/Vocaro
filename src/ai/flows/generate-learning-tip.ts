'use server';
/**
 * @fileOverview Generates a learning tip for a given vocabulary word or verb.
 *
 * - generateLearningTip - A function that generates helpful tips.
 * - GenerateLearningTipInput - The input type for the generateLearningTip function.
 * - GenerateLearningTipOutput - The return type for the generateLearningTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLearningTipInputSchema = z.object({
  item: z.string().describe('The vocabulary word or verb infinitive.'),
  definition: z.string().describe('The German definition/translation of the item.'),
  language: z.string().describe('The language of the item (e.g., French, English).'),
  type: z.enum(['Vokabel', 'Verb']).describe('The type of the item.'),
});
export type GenerateLearningTipInput = z.infer<typeof GenerateLearningTipInputSchema>;

const GenerateLearningTipOutputSchema = z.object({
  tips: z.array(z.string()).length(3).describe('An array of three distinct, helpful, and concise learning tips, mnemonics, or explanations for the item.'),
});
export type GenerateLearningTipOutput = z.infer<typeof GenerateLearningTipOutputSchema>;

export async function generateLearningTip(input: GenerateLearningTipInput): Promise<GenerateLearningTipOutput> {
  return generateLearningTipFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateLearningTipPrompt',
  input: {schema: GenerateLearningTipInputSchema},
  output: {schema: GenerateLearningTipOutputSchema},
  prompt: `Du bist ein erfahrener Sprachlehrer. Deine Aufgabe ist es, DREI kurze, hilfreiche und leicht verständliche Lerntipps für das folgende Wort zu erstellen.
Jeder Tipp sollte als Eselsbrücke, durch einen Beispielsatz oder eine einfache Erklärung helfen, sich das Wort besser zu merken.
Die drei Tipps müssen sich voneinander unterscheiden. Fasse dich kurz und sei kreativ.

Sprache: {{language}}
Typ: {{type}}
Wort/Verb: "{{item}}"
Bedeutung: "{{definition}}"

Gib ein JSON-Objekt zurück, das ein Array namens "tips" mit genau drei Strings enthält.
`,
});

const generateLearningTipFlow = ai.defineFlow(
  {
    name: 'generateLearningTipFlow',
    inputSchema: GenerateLearningTipInputSchema,
    outputSchema: GenerateLearningTipOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.tips || output.tips.length !== 3) {
        throw new Error('AI failed to generate exactly three learning tips.');
    }
    return output;
  }
);
