async function generateTipsFromApi(term: string, definition: string): Promise<string[]> {
  // ÄNDERUNG: Nutze ein aktuelles Modell wie 'gemini-1.5-flash'
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Erstelle 3 kurze, prägnante Lerntipps für den folgenden deutschen Begriff und seine Definition. 
  Die Tipps sollten kreativ und leicht zu merken sein. 
  Gib NUR die Tipps als Liste zurück (ein Tipp pro Zeile), ohne Einleitung oder Nummerierung.

  Begriff: "${term}"
  Definition: "${definition}"`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("Leere Antwort von Gemini erhalten");

    // Bereinigung der Tipps (entfernt Bindestriche, Zahlen und Leerzeilen)
    const tips = text
      .split('\n')
      .map(tip => tip.replace(/^[-*0-9.]+\s*/, '').trim()) 
      .filter(tip => tip.length > 0)
      .slice(0, 3); // Sicherstellen, dass wir max. 3 Tipps haben

    return tips;
  } catch (error) {
    // Pro-Tipp: Logge den echten Fehler in die Konsole, um zu sehen, ob z.B. der API-Key ungültig ist
    console.error("Gemini API Error Detail:", error);
    
    return [
      `Fehler beim Generieren für "${term}".`,
      "Bitte API-Quota oder Key prüfen.",
      "Versuche es in wenigen Augenblicken noch einmal."
    ];
  }
}