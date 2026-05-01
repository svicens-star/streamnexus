import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const geminiService = {
  async searchGrounding(query: string) {
    if (!ai) return "El asistente AI no está configurado. Define VITE_GEMINI_API_KEY en tu entorno.";
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });
    return response.text;
  },

  async analyzeImage(prompt: string, base64Image: string, mimeType: string) {
    if (!ai) return "El asistente AI no está configurado. Define VITE_GEMINI_API_KEY en tu entorno.";
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType } }
        ]
      }
    });
    return response.text;
  },

  async textToSpeech(text: string) {
    if (!ai) return null;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }
};
