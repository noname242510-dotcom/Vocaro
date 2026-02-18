'use server';
/**
 * @fileOverview Generates a learning tip for a given vocabulary word or verb.
 *
 * - generateLearningTip - A function that generates a helpful tip.
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
  tip: z.string().describe('A helpful and concise learning tip, mnemonic, or explanation for the item.'),
});
export type GenerateLearningTipOutput = z.infer<typeof GenerateLearningTipOutputSchema>;

export async function generateLearningTip(input: GenerateLearningTipInput): Promise<GenerateLearningTipOutput> {
  return generateLearningTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLearningTipPrompt',
  input: {schema: GenerateLearningTipInputSchema},
  output: {schema: GenerateLearningTipOutputSchema},
  prompt: `Du bist ein erfahrener Sprachlehrer. Deine Aufgabe ist es, einen kurzen, hilfreichen und leicht verständlichen Lerntipp für das folgende Wort zu erstellen.
Der Tipp sollte als Eselsbrücke, durch einen Beispielsatz oder eine einfache Erklärung helfen, sich das Wort besser zu merken.
Fasse dich kurz und sei kreativ.

Sprache: {{language}}
Typ: {{type}}
Wort/Verb: "{{item}}"
Bedeutung: "{{definition}}"
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
    if (!output) {
        throw new Error('AI failed to generate a learning tip.');
    }
    return output;
  }
);
