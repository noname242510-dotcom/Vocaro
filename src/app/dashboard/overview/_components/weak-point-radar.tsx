
import { z } from 'genkit';

export async function generateLearningTip(input: any) {
  if (typeof window !== 'undefined') {
    return {
      tips: [
        "KI-Funktionen sind in der mobilen App aktuell nur online verfügbar.",
        "Bitte nutze die Web-Version für KI-gestützte Lerntipps.",
        "Oder versuche es später noch einmal."
      ]
    };
  }

  try {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `Du bist ein Lehrer. Erstelle 3 kurze Lerntipps für das Wort "${input.item}".
               Antworte AUSSCHLIESSLICH in diesem JSON-Format:
               {"tips": ["Tipp 1", "Tipp 2", "Tipp 3"]}`,
    });

    const text = response.text;
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Fehler beim Generieren:", error);
    return { 
      tips: [
        "Fehler beim Lesen der KI-Antwort.",
        "Bitte versuche es gleich noch einmal."
      ] 
    };
  }
}

