'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateLearningTip(input: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return { tips: ["Fehler: API Key in Vercel nicht gefunden.", "Bitte Env-Variablen prüfen.", "Key leer."] };
  }

  try {
    // Wir initialisieren das SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // WICHTIG: Wir erzwingen hier die API-Version v1
    // Das verhindert den 404-Fehler mit v1beta, den du in den Screenshots siehst
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: "v1" } 
    );

    const prompt = `Du bist ein Sprachlehrer. Erstelle 3 kurze, kreative Lerntipps für das Wort "${input.item}" (${input.definition}).
    Antworte NUR mit einem JSON-Objekt: {"tips": ["Tipp 1", "Tipp 2", "Tipp 3"]}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Robustes JSON-Parsing
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Gemini-Fehler:", error);
    return { 
      tips: [
        "Google API Fehler (v1)",
        `Details: ${error.message.substring(0, 50)}`,
        "Versuche die Vercel Region auf 'Washington' zu stellen."
      ] 
    };
  }
}