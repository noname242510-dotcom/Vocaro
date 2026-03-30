

/**
 * @fileOverview Generates verb conjugations and translations using AI.
 */

import { z } from 'zod';
import type { Verb, GenerateVerbFormsOutput } from '@/lib/types';

const GenerateVerbFormsInputSchema = z.object({
  verb: z.string().describe('The infinitive form of the verb to be conjugated.'),
  language: z.string().describe("The language of the verb, e.g., 'French', 'English'."),
});
type GenerateVerbFormsInput = z.infer<typeof GenerateVerbFormsInputSchema>;

const FlatConjugationSchema = z.object({
  tense: z.string().describe('The tense of the conjugation (e.g., "Présent", "Simple Past").'),
  pronoun: z.string().describe('The pronoun for the conjugation (e.g., "je", "I", or "form" for participles).'),
  form: z.string().describe('The conjugated verb form.'),
});

const AISchema = z.object({
  translation: z.string().describe('The German translation of the infinitive verb.'),
  conjugations: z.array(FlatConjugationSchema).describe('A flat array of all conjugated forms for the verb in the target language.'),
  germanConjugations: z.array(FlatConjugationSchema).describe('A flat array of all conjugated forms for the German translation of the verb.'),
});

const germanPronouns = `"ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"`;

export async function generateVerbForms(input: GenerateVerbFormsInput): Promise<GenerateVerbFormsOutput> {
  if (typeof window !== 'undefined') {
    throw new Error('AI generation is not supported directly on the client in this mobile build. Please move to Firebase Functions.');
  }

  // Dynamically import genkit only on server-side
  const { ai } = await import('@/ai/genkit');

  const { output } = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    input: input,
    output: { schema: AISchema },
    prompt: `You are an expert linguist. Translate "{{verb}}" from {{language}} to German and generate conjugations.`
  });

  if (!output) {
    throw new Error('AI failed to generate verb forms.');
  }

  const structureForms = (conjugations: any[]) => {
    const structured: any = {};
    for (const c of conjugations) {
      if (!structured[c.tense]) structured[c.tense] = {};
      structured[c.tense][c.pronoun] = c.form;
    }
    return structured;
  };

  return {
    infinitive: input.verb,
    translation: output.translation,
    forms: structureForms(output.conjugations),
    germanForms: structureForms(output.germanConjugations),
  };
}

