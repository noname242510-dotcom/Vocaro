'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateLearningTip(input: any) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    // Wir nutzen hier direkt die stabile v1 Schnittstelle über das SDK
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Du bist ein Lehrer. Erstelle 3 kurze Lerntipps (Eselsbrücken) für:
               Wort: ${input.item}
               Bedeutung: ${input.definition}
               Sprache: ${input.language}
               
               Antworte NUR mit einem validen JSON-Objekt in diesem Format:
               {"tips": ["Tipp 1", "Tipp 2", "Tipp 3"]}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // JSON säubern (falls Markdown-Tags wie ```json drumherum sind)
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("SDK Error:", error);
    return { 
      tips: [
        "Fehler beim direkten KI-Aufruf.",
        `Grund: ${error.message.substring(0, 50)}`,
        "Bitte prüfe den API-Key in Vercel."
      ] 
    };
  }
}