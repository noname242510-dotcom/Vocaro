'use server';
/**
 * @fileOverview Generates verb conjugations and translations using AI.
 *
 * - generateVerbForms - A function that generates all forms for a given verb and language.
 * - GenerateVerbFormsInput - The input type.
 * - GenerateVerbFormsOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TenseSchema = z.record(z.string(), z.string()).describe('An object where keys are pronouns (e.g., "ich", "du", "er/sie/es") and values are the conjugated verb forms.');

const VerbFormsSchema = z.record(z.string(), TenseSchema).describe('An object where keys are tense names (e.g., "Présent", "Simple Past") and values are objects containing the conjugations for that tense.');

export const GenerateVerbFormsInputSchema = z.object({
  verb: z.string().describe('The infinitive form of the verb to be conjugated.'),
  language: z.string().describe("The language of the verb, e.g., 'French', 'English'."),
});
export type GenerateVerbFormsInput = z.infer<typeof GenerateVerbFormsInputSchema>;

export const GenerateVerbFormsOutputSchema = z.object({
  translation: z.string().describe('The German translation of the infinitive verb.'),
  forms: VerbFormsSchema,
});
export type GenerateVerbFormsOutput = z.infer<typeof GenerateVerbFormsOutputSchema>;

export async function generateVerbForms(input: GenerateVerbFormsInput): Promise<GenerateVerbFormsOutput> {
  return generateVerbFormsFlow(input);
}

const frenchTenses = `
- Indicatif Présent
- Indicatif Imparfait
- Indicatif Passé composé
- Indicatif Plus-que-parfait
- Indicatif Futur simple
- Indicatif Futur antérieur
- Conditionnel Présent
- Conditionnel Passé
- Subjonctif Présent
- Subjonctif Passé
- Impératif Présent
- Infinitif Présent
- Participe Présent
- Participe Passé
`;

const englishTenses = `
- Simple Present
- Simple Past
- Simple Future
- Present Progressive
- Past Progressive
- Future Progressive
- Present Perfect
- Past Perfect
- Future Perfect
- Present Perfect Progressive
- Past Perfect Progressive
- Future Perfect Progressive
- Imperative
- Infinitive
- Present Participle
- Past Participle
`;

const prompt = ai.definePrompt({
  name: 'generateVerbFormsPrompt',
  input: { schema: GenerateVerbFormsInputSchema },
  output: { schema: GenerateVerbFormsOutputSchema },
  prompt: `You are an expert linguist and conjugation specialist. Your task is to take a verb in a given language, provide its German translation, and generate all its conjugated forms for a standard set of tenses.

Follow these instructions precisely:
1.  Translate the infinitive verb "{{verb}}" from {{language}} into German. The translation should be a single, concise German infinitive.
2.  Generate the conjugations for the verb "{{verb}}" in {{language}} for all the tenses listed below.
3.  The output MUST be a valid JSON object that strictly follows the provided output schema.
4.  For each tense, provide a JSON object where keys are the personal pronouns (e.g., "je", "tu", "I", "you", "he/she/it") and values are the corresponding conjugated verb forms.
5.  For tenses like "Participe Passé" or "Infinitive" that don't have personal pronouns, use "form" as the key.
6.  For the "Impératif Présent", use the pronouns "(tu)", "(nous)", "(vous)".

Language: {{language}}
Verb: {{verb}}

{{#if (eq language "French")}}
Tenses to generate:
${frenchTenses}
Pronouns to use: "je", "tu", "il/elle/on", "nous", "vous", "ils/elles"
{{/if}}

{{#if (eq language "English")}}
Tenses to generate:
${englishTenses}
Pronouns to use: "I", "you", "he/she/it", "we", "they"
{{/if}}

Produce ONLY the JSON output, nothing else.
`,
});

const generateVerbFormsFlow = ai.defineFlow(
  {
    name: 'generateVerbFormsFlow',
    inputSchema: GenerateVerbFormsInputSchema,
    outputSchema: GenerateVerbFormsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate verb forms.');
    }
    return output;
  }
);
