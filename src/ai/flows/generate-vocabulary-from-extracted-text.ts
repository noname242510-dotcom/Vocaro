'use server';
/**
 * @fileOverview Generates vocabulary pairs from a block of extracted text.
 *
 * - generateVocabularyFromExtractedText - A function that processes text to create vocabulary items.
 * - GenerateVocabularyFromExtractedTextInput - The input type.
 * - GenerateVocabularyFromExtractedTextOutput - The return type.
 */

import { ai } from '@/ai/genkit';
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
  return generateVocabularyFromExtractedTextFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateVocabularyFromExtractedTextPrompt',
  input: { schema: GenerateVocabularyFromExtractedTextInputSchema },
  output: { schema: GenerateVocabularyFromExtractedTextOutputSchema },
  prompt: `You are an expert linguist and OCR cleanup specialist. Your task is to parse unstructured text extracted from an image into a structured vocabulary list.

Follow these instructions precisely:
1.  Analyze the text to identify term/definition pairs.
2.  For each foreign term, provide its phonetic transcription in IPA if possible.
3.  Sometimes, the text includes a similar word from another language as a hint (e.g., "exactly" next to "exactement"). If you find such a cognate or related word, capture it in the 'relatedWord' field.
4.  Ignore small, isolated visual artifacts like stray crosses, dots, or single letters that do not form a coherent part of a word. However, you MUST preserve meaningful parenthesized text like "(to)" or "(s')".
5.  If there is any other useful context or example sentence, include it in the 'notes' field.

Extracted Text:
{{{extractedText}}}
`,
});

const generateVocabularyFromExtractedTextFlow = ai.defineFlow(
  {
    name: 'generateVocabularyFromExtractedTextFlow',
    inputSchema: GenerateVocabularyFromExtractedTextInputSchema,
    outputSchema: GenerateVocabularyFromExtractedTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
