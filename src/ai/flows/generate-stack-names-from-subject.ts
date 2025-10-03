'use server';

/**
 * @fileOverview Generates stack names based on the subject provided by the user.
 *
 * - generateStackNamesFromSubject - A function that generates stack names based on the subject.
 * - GenerateStackNamesFromSubjectInput - The input type for the generateStackNamesFromSubject function.
 * - GenerateStackNamesFromSubjectOutput - The return type for the generateStackNamesFromSubject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStackNamesFromSubjectInputSchema = z.object({
  subject: z.string().describe('The subject for which stack names should be generated.'),
});
export type GenerateStackNamesFromSubjectInput = z.infer<typeof GenerateStackNamesFromSubjectInputSchema>;

const GenerateStackNamesFromSubjectOutputSchema = z.object({
  stackNames: z.array(z.string()).describe('An array of generated stack names based on the subject.'),
});
export type GenerateStackNamesFromSubjectOutput = z.infer<typeof GenerateStackNamesFromSubjectOutputSchema>;

export async function generateStackNamesFromSubject(input: GenerateStackNamesFromSubjectInput): Promise<GenerateStackNamesFromSubjectOutput> {
  return generateStackNamesFromSubjectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStackNamesFromSubjectPrompt',
  input: {schema: GenerateStackNamesFromSubjectInputSchema},
  output: {schema: GenerateStackNamesFromSubjectOutputSchema},
  prompt: `You are an expert at generating creative and relevant stack names for vocabulary learning apps.
  Given the subject, generate five stack names that would be appropriate for organizing vocabulary related to that subject. Be creative and concise.
  Subject: {{{subject}}}`,
});

const generateStackNamesFromSubjectFlow = ai.defineFlow(
  {
    name: 'generateStackNamesFromSubjectFlow',
    inputSchema: GenerateStackNamesFromSubjectInputSchema,
    outputSchema: GenerateStackNamesFromSubjectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
