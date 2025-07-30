import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent("Say hello world");
    console.log("Gemini API response:", result.response.text());
  } catch (e) {
    console.error("Gemini API error:", e);
  }
}

testGemini();
