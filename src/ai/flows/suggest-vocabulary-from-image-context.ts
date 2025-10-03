'use server';
/**
 * @fileOverview Suggests relevant vocabulary based on the image's content.
 *
 * - suggestVocabularyFromImageContext - A function that handles the vocabulary suggestion process from an image.
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
  suggestedVocabulary: z.array(z.string()).describe('An array of suggested vocabulary words based on the image content.'),
});
export type SuggestVocabularyFromImageContextOutput = z.infer<typeof SuggestVocabularyFromImageContextOutputSchema>;

export async function suggestVocabularyFromImageContext(input: SuggestVocabularyFromImageContextInput): Promise<SuggestVocabularyFromImageContextOutput> {
  return suggestVocabularyFromImageContextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestVocabularyFromImageContextPrompt',
  input: {schema: SuggestVocabularyFromImageContextInputSchema},
  output: {schema: SuggestVocabularyFromImageContextOutputSchema},
  prompt: `You are a helpful assistant designed to suggest relevant vocabulary words based on the content of an image.

  Based on the image provided, suggest a list of vocabulary words that are directly related to the objects, scenes, and concepts depicted in the image.

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
