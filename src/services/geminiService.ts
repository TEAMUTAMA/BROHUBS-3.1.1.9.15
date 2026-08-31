
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey });
  return ai;
}

export const getAIResponse = async (prompt: string) => {
  const client = getClient();
  if (!client) {
    return "AI assistant is unavailable. Add GEMINI_API_KEY to .env.local to enable chat.";
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are the AI assistant for BROHUBS, the premium high-performance broadcasting platform for digital creators. You represent BROHUBS (all caps). You are professional, tech-forward, and extremely knowledgeable about streaming technology. You focus on explaining BROHUBS features like 4K 60FPS streaming, white-label branding, ultra-low latency toolkit, and smart automation for studios. Your goal is to make creators feel like BROHUBS is their ultimate studio partner.",
        temperature: 0.7,
      },
    });
    // Directly access the .text property on the response object.
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having a bit of trouble connecting right now. Please try again later.";
  }
};
