
import { GoogleGenAI } from "@google/genai";

// Initialize the GoogleGenAI client using the API key directly from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIResponse = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
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
