

/**
 * @fileOverview Generates vocabulary pairs from a block of extracted text.
 */

import { z } from 'zod';

const RelatedWordSchema = z.object({
  language: z.string().describe("The language of the related word (e.g., 'French', 'English')."),
  word: z.string().describe('The related word or phrase.'),
});

const VocabularyItemSchema = z.object({
  term: z.string().describe('The foreign word or phrase.'),
  definition: z.string().describe('The definition or translation of the term.'),
  phonetic: z.string().optional().describe('The phonetic transcription of the term (IPA if possible).'),
  relatedWord: RelatedWordSchema.optional().describe('A similar or related word in another language, if present in the text (e.g., cognates like "exactly" and "exactement").'),
  notes: z.string().optional().describe('Optional contextual notes, examples, or hints for the term.'),
});

const GenerateVocabularyFromExtractedTextInputSchema = z.object({
  extractedText: z.string().describe('A block of text containing potential vocabulary words and definitions, possibly separated by newlines, dashes, or other delimiters.'),
});
export type GenerateVocabularyFromExtractedTextInput = z.infer<typeof GenerateVocabularyFromExtractedTextInputSchema>;

const GenerateVocabularyFromExtractedTextOutputSchema = z.object({
  vocabulary: z.array(VocabularyItemSchema).describe('An array of structured vocabulary items.'),
});
export type GenerateVocabularyFromExtractedTextOutput = z.infer<typeof GenerateVocabularyFromExtractedTextOutputSchema>;

export async function generateVocabularyFromExtractedText(input: GenerateVocabularyFromExtractedTextInput): Promise<GenerateVocabularyFromExtractedTextOutput> {
  if (typeof window !== 'undefined') {
    throw new Error('AI generation is not supported directly on the client. Please move to Firebase Functions.');
  }

  const { ai } = await import('@/ai/genkit');

  const { output } = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    input: input,
    output: { schema: GenerateVocabularyFromExtractedTextOutputSchema },
    prompt: `Parse this unstructured text into vocabulary pairs: {{extractedText}}`
  });

  return output as GenerateVocabularyFromExtractedTextOutput;
}

