

/**
 * @fileOverview Generates stack names based on the subject provided by the user.
 */

import { z } from 'zod';

const GenerateStackNamesFromSubjectInputSchema = z.object({
  subject: z.string().describe('The subject for which stack names should be generated.'),
});
export type GenerateStackNamesFromSubjectInput = z.infer<typeof GenerateStackNamesFromSubjectInputSchema>;

const GenerateStackNamesFromSubjectOutputSchema = z.object({
  stackNames: z.array(z.string()).describe('An array of generated stack names based on the subject.'),
});
export type GenerateStackNamesFromSubjectOutput = z.infer<typeof GenerateStackNamesFromSubjectOutputSchema>;

export async function generateStackNamesFromSubject(input: GenerateStackNamesFromSubjectInput): Promise<GenerateStackNamesFromSubjectOutput> {
  if (typeof window !== 'undefined') {
    throw new Error('AI generation is not supported directly on the client. Please use Firebase Functions.');
  }

  const { ai } = await import('@/ai/genkit');

  const { output } = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    input: input,
    output: { schema: GenerateStackNamesFromSubjectOutputSchema },
    prompt: `Generate five stack names for reorganizing vocabulary for subject: {{subject}}`
  });

  return output as GenerateStackNamesFromSubjectOutput;
}

