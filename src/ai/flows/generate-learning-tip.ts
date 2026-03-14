'use server';

export async function generateLearningTip(input: { item: string; definition?: string; language?: string }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  
  if (!apiKey) {
    return { 
      tips: ["System-Fehler: API_KEY fehlt in Vercel.", "Bitte Env-Variablen prüfen.", "Deployment neustarten."] 
    };
  }

  // Wir definieren eine Liste von Modellen, falls das erste fehlschlägt
  // 'gemini-1.5-flash-latest' ist oft die sicherste Wahl für neue Keys
  const modelId = "gemini-1.5-flash-latest"; 
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Du bist ein erfahrener Sprachlehrer. 
            Erstelle 3 kurze, merkwürdige oder lustige Eselbrücken/Lerntipps für:
            Wort: "${input.item}"
            Bedeutung: "${input.definition || 'unbekannt'}"
            Zielsprache: ${input.language || 'Deutsch'}

            Antworte AUSSCHLIESSLICH in diesem JSON-Format:
            {"tips": ["Tipp 1", "Tipp 2", "Tipp 3"]}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 400,
        }
      }),
      // Verhindert, dass Vercel die KI-Antwort cached
      cache: 'no-store' 
    });

    const data = await response.json();

    // Fehlerbehandlung für Google-Antworten
    if (data.error) {
      console.error("Google API Error Details:", data.error);
      return { 
        tips: [
          `Google Fehler: ${data.error.status}`,
          `Nachricht: ${data.error.message.substring(0, 50)}...`,
          "Checke, ob das Modell im AI Studio aktiv ist."
        ] 
      };
    }

    // Extraktion des Textes aus der Google-Struktur
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const rawText = data.candidates[0].content.parts[0].text;
      
      // JSON säubern (falls die KI Markdown ```json mitschickt)
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      try {
        return JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("JSON Parse Error:", rawText);
        return { tips: ["KI hat kein sauberes JSON geliefert.", "Bitte versuche es noch einmal.", "Formatierungsfehler."] };
      }
    }

    return { tips: ["Keine Antwort von der KI erhalten.", "Bitte Prompt prüfen.", "Empty Response."] };

  } catch (error: any) {
    console.error("Fetch Error:", error);
    return { 
      tips: [
        "Netzwerkfehler beim Aufruf.",
        `Details: ${error.message.substring(0, 50)}`,
        "Prüfe die Vercel Function Region (sollte iad1 sein)."
      ] 
    };
  }
}