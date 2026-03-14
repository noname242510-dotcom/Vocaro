'use server';

export async function generateLearningTip(input: { item: string; definition?: string; language?: string }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  
  if (!apiKey) {
    return { tips: ["Fehler: GEMINI_API_KEY fehlt in Vercel."] };
  }

  // Wir nutzen hier die stabilste Basis-ID. 
  // KEIN "-latest", KEIN "-001", einfach nur der Name.
  const modelId = "gemini-2.5-flash"; 
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Erstelle 3 einprägsame Eselbrücken für das Wort "${input.item}" (${input.definition}). 
Nutze Wortspiele, Ähnlichkeiten zum Deutschen oder bildhafte Szenarien. 
Kurz und prägnant. 
Antworte NUR als JSON: {"tips": ["Tipp 1", "Tipp 2", "Tipp 3"]}`
          }]
        }]
      }),
      cache: 'no-store' 
    });

    const data = await response.json();

    // Wenn 'gemini-1.5-flash' nicht gefunden wird (404), versuchen wir es mit 'gemini-pro'
    if (data.error && data.error.status === "NOT_FOUND") {
      return { 
        tips: [
          "Modell 'flash' nicht gefunden.",
          "Dein Key scheint nur für 'gemini-pro' oder 'gemini-1.0-pro' zu gehen.",
          "Bitte ändere modelId im Code zu 'gemini-pro'."
        ] 
      };
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const rawText = data.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    }

    return { tips: ["Fehler: " + (data.error?.message || "Unbekannter Google Fehler")] };

  } catch (error: any) {
    return { tips: ["Netzwerkfehler", error.message] };
  }
}