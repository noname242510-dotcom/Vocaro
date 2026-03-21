
'use server';
/**
 * @fileOverview Generates verb conjugations and translations using AI.
 *
 * - generateVerbForms - A function that generates all forms for a given verb and language.
 * - GenerateVerbFormsOutput - The return type for the generateVerbForms function.
 */

import { ai } from '@/ai/genkit';
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
const germanPronouns = `"ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"`;


const prompt = ai.definePrompt({
  name: 'generateVerbFormsPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: z.object({ verb: z.string(), language: z.string(), tenses: z.string(), pronouns: z.string(), germanPronouns: z.string() }) },
  output: { schema: AISchema },
  prompt: `You are an expert linguist. Your task is to take a verb, provide its German translation, and generate all its conjugated forms in both the original language and German.

Follow these instructions precisely:
1.  Translate the infinitive verb "{{verb}}" from {{language}} into German. Let's call this the "German Infinitive".
2.  Generate the conjugations for the verb "{{verb}}" in {{language}} for ALL tenses listed below. Populate the 'conjugations' array.
3.  For French verbs, pay close attention to elision. If the conjugated form for "je" starts with a vowel or a silent 'h', you MUST use "j'" as the pronoun (e.g., "j'ai", "j'habite").
4.  Generate the corresponding German conjugations for the "German Infinitive" for ALL tenses listed below. Populate the 'germanConjugations' array. Use the German pronouns.
5.  The output MUST be a valid JSON object.
6.  Both 'conjugations' and 'germanConjugations' fields must be a FLAT array of objects. Each object must have three properties: "tense", "pronoun", and "form".
7.  For tenses that don't use personal pronouns (like Participles or Infinitives), use "form" as the value for the "pronoun" property.
8.  For the "Impératif Présent", use the pronouns "(tu)", "(nous)", "(vous)" for French, and the corresponding imperative forms for other languages.

Language: {{language}}
Verb: {{verb}}

Tenses to generate:
{{{tenses}}}

Pronouns to use for {{language}} conjugation: {{{pronouns}}}
Pronouns to use for German conjugation: {{{germanPronouns}}}

Produce ONLY the JSON output, nothing else.
`,
});

const generateVerbFormsFlow = ai.defineFlow(
  {
    name: 'generateVerbFormsFlow',
    inputSchema: GenerateVerbFormsInputSchema,
    outputSchema: AISchema,
  },
  async (input) => {
    let tenses, pronouns;
    // This logic can be simplified or made more robust, but it's okay for now.
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

    const { output } = await prompt({
      verb: input.verb,
      language: input.language,
      tenses,
      pronouns,
      germanPronouns: germanPronouns,
    });

    if (!output) {
      throw new Error('AI failed to generate verb forms.');
    }

    return output;
  }
);

export async function generateVerbForms(input: GenerateVerbFormsInput): Promise<GenerateVerbFormsOutput> {
  const aiResponse = await generateVerbFormsFlow(input);

  // Helper function to transform the flat array into the nested object structure
  const structureForms = (conjugations: z.infer<typeof FlatConjugationSchema>[]) => {
    const structured: GenerateVerbFormsOutput['forms'] = {};
    for (const conjugation of conjugations) {
      if (!structured[conjugation.tense]) {
        structured[conjugation.tense] = {};
      }
      structured[conjugation.tense][conjugation.pronoun] = conjugation.form;
    }
    return structured;
  }

  return {
    infinitive: input.verb,
    translation: aiResponse.translation,
    forms: structureForms(aiResponse.conjugations),
    germanForms: structureForms(aiResponse.germanConjugations),
  };
}
