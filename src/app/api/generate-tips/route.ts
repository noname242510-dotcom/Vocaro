
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

// Get the API key from environment variables
const genAI = new GoogleGenerativeAI(apiKey);

async function generateTipsFromApi(term: string, definition: string): Promise<string[]> {
  // For text-only input, use the gemini-1.5-flash model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Erstelle 3 kurze, prägnante Lerntipps für den folgenden deutschen Begriff und seine Definition. Die Tipps sollten kreativ und leicht zu merken sein. Gib nur die Tipps als Liste zurück, ohne zusätzliche Einleitung oder Formatierung.

Begriff: "${term}"
Definition: "${definition}"

Beispiel-Tipps:
- Denk an "..." wie in [Beispiel]
- Das Wort reimt sich auf [Beispiel]
- Stell dir vor: [visuelle Eselsbrücke]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Split the response into individual tips. Assuming the AI returns a list separated by newlines.
    const tips = text.split('\n').map(tip => tip.startsWith('- ') ? tip.substring(2) : tip).filter(tip => tip.trim() !== '');

    return tips;
  } catch (error) {
    console.error("Error generating tips from Gemini:", error);
    // Return some fallback tips in case of an error
    return [
      `Konnte keine Tipps für "${term}" generieren.`,
      "Versuche es später erneut.",
      "Überprüfe die Verbindung zur API.",
    ];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { term, definition } = body;

    if (!term || !definition) {
      return NextResponse.json({ error: 'Term and definition are required' }, { status: 400 });
    }

    const tips = await generateTipsFromApi(term, definition);

    return NextResponse.json({ tips });

  } catch (error) {
    console.error("Error generating tips:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
