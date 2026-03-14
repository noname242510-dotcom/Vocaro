'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export async function generateLearningTip(input: any) {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      // Wir nehmen das Schema hier raus, da es den 400er Fehler provoziert
      prompt: `Du bist ein Lehrer. Erstelle 3 kurze Lerntipps für das Wort "${input.item}".
               Antworte AUSSCHLIESSLICH in diesem JSON-Format:
               {"tips": ["Tipp 1", "Tipp 2", "Tipp 3"]}`,
    });

    // Wir parsen das JSON jetzt einfach selbst manuell
    const text = response.text;
    // Falls die KI Markdown-Codeblöcke mitschickt, säubern wir diese
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return parsed; 
  } catch (error: any) {
    console.error("Fehler beim Generieren:", error);
    return { 
      tips: [
        "Fehler beim Lesen der KI-Antwort.",
        `Technischer Fehler: ${error.message.substring(0, 50)}`,
        "Bitte versuche es gleich noch einmal."
      ] 
    };
  }
}