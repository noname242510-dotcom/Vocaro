'use server';

export async function generateLearningTip(input: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { tips: ["Key fehlt in Vercel"] };

  try {
    // Wir nutzen das Standard-Fetch von Node.js/Next.js
    // Das umgeht alle Probleme mit dem Google SDK auf Vercel
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Erstelle 3 kurze Lerntipps für "${input.item}". Antworte NUR als JSON: {"tips": ["1", "2", "3"]}` }] }]
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return { tips: [`Google Error: ${data.error.message}`, "Check Region iad1", "Check API Key"] };
    }

    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    return { tips: ["Netzwerk-Blockade auf Vercel", `Fehler: ${error.message}`, "Stelle Vercel auf Region iad1!"] };
  }
}