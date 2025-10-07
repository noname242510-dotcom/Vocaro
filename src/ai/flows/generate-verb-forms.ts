'use server';
/**
 * @fileOverview Generates verb conjugations and translations using AI.
 *
 * - generateVerbForms - A function that generates all forms for a given verb and language.
 * - GenerateVerbFormsOutput - The return type for the generateVerbForms function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { GenerateVerbFormsOutput } from '@/lib/types';

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
  conjugations: z.array(FlatConjugationSchema).describe('A flat array of all conjugated forms for the verb.'),
});


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

const frenchPronouns = `"je", "tu", "il/elle/on", "nous", "vous", "ils/elles"`;
const englishPronouns = `"I", "you", "he/she/it", "we", "they"`;

const prompt = ai.definePrompt({
  name: 'generateVerbFormsPrompt',
  input: { schema: z.object({ verb: z.string(), language: z.string(), tenses: z.string(), pronouns: z.string() }) },
  output: { schema: AISchema },
  prompt: `You are an expert linguist. Your task is to take a verb, provide its German translation, and generate all its conjugated forms.

Follow these instructions precisely:
1.  Translate the infinitive verb "{{verb}}" from {{language}} into German.
2.  Generate the conjugations for the verb "{{verb}}" in {{language}} for ALL tenses listed below.
3.  The output MUST be a valid JSON object.
4.  The 'conjugations' field must be a FLAT array of objects. Each object must have three properties: "tense", "pronoun", and "form".
5.  For tenses that don't use personal pronouns (like Participles or Infinitives), use "form" as the value for the "pronoun" property.
6.  For the "Impératif Présent", use the pronouns "(tu)", "(nous)", "(vous)".

Language: {{language}}
Verb: {{verb}}

Tenses to generate:
{{{tenses}}}

Pronouns to use for conjugation: {{{pronouns}}}

Produce ONLY the JSON output, nothing else.
`,
});

const generateVerbFormsFlow = ai.defineFlow(
  {
    name: 'generateVerbFormsFlow',
    inputSchema: GenerateVerbFormsInputSchema,
    outputSchema: z.custom<GenerateVerbFormsOutput>(),
  },
  async (input) => {
    let tenses, pronouns;
    if (input.language === 'French') {
      tenses = frenchTenses;
      pronouns = frenchPronouns;
    } else if (input.language === 'English') {
      tenses = englishTenses;
      pronouns = englishPronouns;
    } else {
      // Default to English if language is not specified or recognized
      tenses = englishTenses;
      pronouns = englishPronouns;
    }
    
    const { output: aiResponse } = await prompt({
      verb: input.verb,
      language: input.language,
      tenses,
      pronouns,
    });

    if (!aiResponse) {
      throw new Error('AI failed to generate verb forms.');
    }

    // Transform the flat array into the nested object structure the app expects
    const structuredForms: GenerateVerbFormsOutput['forms'] = {};

    for (const conjugation of aiResponse.conjugations) {
      if (!structuredForms[conjugation.tense]) {
        structuredForms[conjugation.tense] = {};
      }
      structuredForms[conjugation.tense][conjugation.pronoun] = conjugation.form;
    }

    return {
      translation: aiResponse.translation,
      forms: structuredForms,
    };
  }
);

export async function generateVerbForms(input: GenerateVerbFormsInput): Promise<GenerateVerbFormsOutput> {
  return generateVerbFormsFlow(input);
}
