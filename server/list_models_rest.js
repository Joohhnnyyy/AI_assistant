import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_LIST_MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;

async function listModels() {
  try {
    console.log("Fetching available models...");
    const response = await fetch(GEMINI_LIST_MODELS_URL);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch models');
    }

    console.log("\nAvailable models:");
    if (data.models && data.models.length > 0) {
      data.models.forEach((model, index) => {
        console.log(`\nModel ${index + 1}:`);
        console.log(`  Name: ${model.name}`);
        console.log(`  Display Name: ${model.displayName || 'N/A'}`);
        console.log(`  Description: ${model.description || 'N/A'}`);
        console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log(`  Version: ${model.version || 'N/A'}`);
      });
    } else {
      console.log("No models found.");
    }
  } catch (error) {
    console.error("Error listing models:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

listModels();
