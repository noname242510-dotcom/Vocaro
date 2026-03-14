'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateLearningTip(input: any) {
  // WICHTIG: API Key Check direkt hier
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("API Key missing");

  try {
    const genAI = new GoogleGenerativeAI(key);
    // Wir nutzen hier 'gemini-1.5-flash' - das stabilste Modell
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Erstelle 3 kurze Lerntipps für "${input.item}". 
    Gib NUR JSON zurück: {"tips": ["1", "2", "3"]}`;

    const result = await model.generateContent(prompt);
    const text = await result.response.text(); // WICHTIG: await hier!
    
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e: any) {
    // Dieser Log ist für deine Vercel-Logs
    console.error("Critical SDK Error:", e);
    return { tips: ["Fehler: " + e.message, "Bitte Vercel Logs prüfen", "Region Check?"] };
  }
}