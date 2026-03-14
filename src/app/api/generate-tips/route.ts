
import { NextRequest, NextResponse } from 'next/server';

// This is a mock implementation. In a real scenario, you would use the Gemini API.
async function generateTipsFromApi(term: string, definition: string): Promise<string[]> {
  console.log(`Generating tips for: ${term} - ${definition}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mocked tips
  const tips = [
    `Denk an "${term.substring(0, 2)}" wie in [Beispiel 1]`,
    `Das Wort "${term}" reimt sich auf [Beispiel 2]`,
    `Stell dir vor: [visuelle Eselsbrücke mit ${term}]`
  ];
  
  return tips;
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
