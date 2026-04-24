// frontend/src/services/geminiChatbot.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key from environment
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

console.log("✅ API Key exists:", !!API_KEY);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(API_KEY);

export async function sendMessage(userMessage) {
  try {
    // ✅ Use gemini-2.5-flash (same as working version)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
You are 'HealthInsura360 Assistant', an AI chatbot for a health insurance platform.

Your role:
- Help users with health insurance policies, claims, renewals, and coverage
- Be friendly, professional, and helpful
- Keep responses concise (2-3 sentences)
- Guide users to use the dashboard features

Available features in HealthInsura360:
- Browse and purchase policies (in 'My Policies' section)
- File and track claims (in 'My Claims' section)
- Renew existing policies
- View policy coverage details
- Get AI-powered policy recommendations

User question: ${userMessage}

Respond in a helpful, friendly manner.
`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ AI Response received");
    return text;
  } catch (error) {
    console.error("❌ Gemini API error:", error);
    
    if (error.message?.includes("API key")) {
      return "API configuration issue. Please check the API key.";
    }
    if (error.message?.includes("network") || error.message?.includes("fetch")) {
      return "Network issue. Please check your internet connection.";
    }
    if (error.message?.includes("quota") || error.message?.includes("429")) {
      return "⚠️ The AI service is busy right now. Please try again in a few minutes.";
    }
    
    return "I'm having trouble connecting. Please try again in a moment.";
  }
}

export function clearConversation() {
  // Simple version - no conversation history needed
  console.log("🔄 Conversation cleared");
}