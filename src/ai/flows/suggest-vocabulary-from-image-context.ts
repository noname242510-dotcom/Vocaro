
import { z } from 'zod';

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
  if (typeof window !== 'undefined') {
    throw new Error('AI generation is not supported directly on the client. Please move to Firebase Functions.');
  }

  const { ai } = await import('@/ai/genkit');

  const { output } = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    prompt: `Extract text from this image: ${input.imageDataUri}`,
    output: { schema: SuggestVocabularyFromImageContextOutputSchema }
  });

  return output as SuggestVocabularyFromImageContextOutput;
}

