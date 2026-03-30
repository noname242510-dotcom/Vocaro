
// Truly browser-safe genkit initialization
export const ai: any = {
  generate: async (options: any) => {
    if (typeof window === 'undefined') {
      const { genkit } = await import('genkit');
      const { googleAI } = await import('@genkit-ai/google-genai');
      const aiInstance = genkit({
        plugins: [
          googleAI({
            apiKey: process.env.GEMINI_API_KEY,
          }),
        ],
      });
      return aiInstance.generate(options);
    }
    throw new Error('Genkit is not supported on the client in this mobile build.');
  },
  defineFlow: () => {},
  definePrompt: () => {},
};