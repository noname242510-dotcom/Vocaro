'use server';
/**
 * @fileOverview Extracts text from an image using OCR.
 *
 * - suggestVocabularyFromImageContext - A function that performs OCR on an image.
 * - SuggestVocabularyFromImageContextInput - The input type for the suggestVocabularyFromImageContext function.
 * - SuggestVocabularyFromImageContextOutput - The return type for the suggestVocabularyFromImageContext function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestVocabularyFromImageContextInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestVocabularyFromImageContextInput = z.infer<typeof SuggestVocabularyFromImageContextInputSchema>;

const SuggestVocabularyFromImageContextOutputSchema = z.object({
  suggestedVocabulary: z.array(z.string()).describe('An array of text blocks extracted from the image.'),
});
export type SuggestVocabularyFromImageContextOutput = z.infer<typeof SuggestVocabularyFromImageContextOutputSchema>;

export async function suggestVocabularyFromImageContext(input: SuggestVocabularyFromImageContextInput): Promise<SuggestVocabularyFromImageContextOutput> {
  return suggestVocabularyFromImageContextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestVocabularyFromImageContextPrompt',
  input: {schema: SuggestVocabularyFromImageContextInputSchema},
  output: {schema: SuggestVocabularyFromImageContextOutputSchema},
  prompt: `You are an Optical Character Recognition (OCR) specialist. Your task is to extract all text from the provided image.
  
  Return the text exactly as it appears in the image. Do not summarize, translate, or interpret the text.
  
  Image: {{media url=imageDataUri}}
  `,
});

const suggestVocabularyFromImageContextFlow = ai.defineFlow(
  {
    name: 'suggestVocabularyFromImageContextFlow',
    inputSchema: SuggestVocabularyFromImageContextInputSchema,
    outputSchema: SuggestVocabularyFromImageContextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
