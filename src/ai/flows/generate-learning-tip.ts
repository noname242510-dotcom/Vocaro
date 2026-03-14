'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateLearningTip(input: any) {
  // 1. Sicherheitscheck für den Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { tips: ["Fehler: GEMINI_API_KEY nicht gefunden.", "Prüfe die Vercel Env-Variablen.", "Key fehlt."] };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Wir nutzen hier 'gemini-1.5-flash-latest' - das ist die stabilste ID
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `Erstelle 3 kurze Lerntipps für das Wort "${input.item}" (${input.definition}). 
    Sprache: ${input.language}. 
    Antworte NUR mit einem JSON Objekt: {"tips": ["...", "...", "..."]}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Säubern und Parsen
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return data;

  } catch (error: any) {
    console.error("DEBUG Gemini Error:", error);
    
    // Wir geben die FEHLERMELDUNG direkt im UI aus, um zu sehen was Google sagt
    return { 
      tips: [
        `Google sagt: ${error.message.includes('403') ? '403 Forbidden (Key/Region Problem)' : error.message.substring(0, 50)}`,
        "Versuche 'gemini-1.5-flash' ohne 'latest' falls das hier fehlschlägt.",
        "Checke Vercel Logs für den vollen Stacktrace."
      ] 
    };
  }
}