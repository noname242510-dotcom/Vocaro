'use server';
/**
 * @fileOverview Converts text to speech using a Genkit flow.
 *
 * - textToSpeech - A function that takes text and returns a WAV audio data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';


const abbreviationMap: Record<string, Record<string, string>> = {
  'fr-FR': {
    'qn': 'quelqu’un',
    'qc': 'quelque chose',
    'qqn': 'quelqu’un',
    'qqch': 'quelque chose',
  },
  // Add other languages and their abbreviations here
  // 'en-US': {
  //   'e.g.': 'for example',
  //   'i.e.': 'that is',
  // }
};

function expandAbbreviations(text: string, languageCode: string): string {
  const langAbbreviations = abbreviationMap[languageCode];
  if (!langAbbreviations) {
    return text;
  }
  
  // Use a regex to match whole words/abbreviations only.
  // This prevents replacing 'qc' inside a word like 'accueil'.
  // The (?<=\s|^) and (?=\s|$) are lookbehind and lookahead for whitespace or start/end of string.
  // The period is made optional.
  for (const [abbr, expansion] of Object.entries(langAbbreviations)) {
      const regex = new RegExp(`(?<=\\s|^)${abbr}\\.?(?=\\s|$)`, 'gi');
      text = text.replace(regex, expansion);
  }
  return text;
}

const TextToSpeechInputSchema = z.object({
  text: z.string().describe("The text to be converted to speech."),
  languageCode: z.string().optional().describe("Optional BCP-47 language code (e.g., 'en-US', 'fr-FR')."),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  media: z.string().describe("The generated audio as a 'data:audio/wav;base64,...' URI."),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text, languageCode }) => {
    // 1. Replace slashes with commas for pauses.
    const textWithPauses = text.replace(/\//g, ', ');
    
    // 2. Expand abbreviations based on language code.
    const expandedText = languageCode ? expandAbbreviations(textWithPauses, languageCode) : textWithPauses;

    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // A standard male voice
          },
          ...(languageCode ? { languageCode } : {}) // Conditionally add languageCode
        },
      },
      prompt: expandedText,
    });

    if (!media?.url) {
      throw new Error('No media returned from TTS model.');
    }

    // The model returns PCM data in a data URI, we need to convert it to WAV for browser playback
    const pcmData = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    const wavData = await toWav(pcmData);

    return {
      media: 'data:audio/wav;base64,' + wavData,
    };
  }
);


async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (chunk) => {
      bufs.push(chunk);
    });
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
