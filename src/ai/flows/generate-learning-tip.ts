'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateLearningTip(input: any) {
  // 1. Absoluter Check: Ist der Key da?
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  
  if (!apiKey || apiKey.length < 10) {
    return { tips: ["FEHLER: API Key nicht gefunden oder zu kurz.", "Prüfe Vercel Settings -> Env Variables", `Key-Länge: ${apiKey?.length || 0}`] };
  }

  try {
    // 2. SDK lokal in der Funktion initialisieren
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 3. Wir nutzen 'gemini-1.5-flash' und erzwingen v1
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: "v1" }
    );

    const prompt = `Gib mir 3 Lerntipps für "${input.item}". Antworte NUR im JSON-Format: {"tips": ["1", "2", "3"]}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Falls die KI Markdown-Code-Blocks sendet
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);

  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { 
      tips: [
        "Google API verweigert den Dienst.",
        `Meldung: ${error.message.substring(0, 60)}`,
        "Tipp: Erstelle einen NEUEN Key im Google AI Studio."
      ] 
    };
  }
}