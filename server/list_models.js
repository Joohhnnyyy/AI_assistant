import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log("Fetching available models...");
    const models = await genAI.listModels();
    console.log("\nAvailable models:");
    models.forEach((model, i) => {
      console.log(`\nModel ${i + 1}:`);
      console.log(`  Name: ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Description: ${model.description}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
    });
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

listModels();
