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

const VocabularyItemSchema = z.object({
  term: z.string().describe('The foreign word or phrase.'),
  definition: z.string().describe('The definition or translation of the term.'),
  notes: z.string().optional().describe('Optional contextual notes, examples, or hints for the term.'),
});

const GenerateVocabularyFromExtractedTextInputSchema = z.object({
  extractedText: z.string().describe('A block of text containing potential vocabulary words and definitions, possibly separated by newlines, dashes, or other delimiters.'),
});
export type GenerateVocabularyFromExtractedTextInput = z.infer<typeof GenerateVocabularyFromExtractedTextInputSchema>;

const GenerateVocabularyFromExtractedTextOutputSchema = z.object({
  vocabulary: z.array(VocabularyItemSchema).describe('An array of structured vocabulary items.'),
});
export type GenerateVocabularyFromExtractedTextOutput = z_infer<typeof GenerateVocabularyFromExtractedTextOutputSchema>;


export async function generateVocabularyFromExtractedText(input: GenerateVocabularyFromExtractedTextInput): Promise<GenerateVocabularyFromExtractedTextOutput> {
  return generateVocabularyFromExtractedTextFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateVocabularyFromExtractedTextPrompt',
  input: { schema: GenerateVocabularyFromExtractedTextInputSchema },
  output: { schema: GenerateVocabularyFromExtractedTextOutputSchema },
  prompt: `You are an expert at parsing unstructured text into structured vocabulary lists.
The user has provided text extracted from an image. This text contains vocabulary words and their definitions.
Your task is to analyze the text and convert it into a structured array of term/definition pairs.

- The text may have various formats (e.g., "word - definition", "word: definition", "word   definition", etc.).
- Each word and its corresponding definition should be a separate item in the output array.
- If there is any additional context, hint, or example sentence, include it in the 'notes' field.
- Clean up any OCR artifacts or noise if possible, but prioritize preserving the original content.

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
