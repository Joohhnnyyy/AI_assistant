import express from "express";
import fetch from "node-fetch";
import { readFilesForContext } from "./fs.js";

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
const GEMINI_LIST_MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models`;

// List available Gemini models
router.get("/models", async (req, res) => {
  try {
    const response = await fetch(GEMINI_LIST_MODELS_URL, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY }
    });
    let data;
    try {
      data = await response.json();
    } catch (e) {
      return res.status(502).json({ error: "Invalid or empty JSON from Gemini API", details: await response.text() });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Simple diagnostics to verify key presence without revealing it
router.get("/debug", (req, res) => {
  try {
    const present = Boolean(GEMINI_API_KEY && String(GEMINI_API_KEY).trim());
    const length = present ? String(GEMINI_API_KEY).trim().length : 0;
    res.json({ hasKey: present, keyLength: length, modelEndpoint: GEMINI_API_URL.split('?')[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AI completion endpoint
router.post("/complete", async (req, res) => {
  const { prompt, history = [], files = [], systemPrompt, filePaths = [] } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    console.log("Sending request to Gemini API with prompt:", prompt);
    // If filePaths provided, load contents from disk
    let fileParts = [];
    if (Array.isArray(filePaths) && filePaths.length > 0) {
      try {
        fileParts = await readFilesForContext(filePaths);
      } catch {}
    }

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          // Optional system message to steer behavior
          ...(systemPrompt ? [{ role: "user", parts: [{ text: `SYSTEM:\n${systemPrompt}` }] }] : []),
          // Prior chat turns (role: user/ai)
          ...history.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.content }]})),
          // Code context (selected files)
          ...(Array.isArray(files) && files.length > 0 ? [{
            role: "user",
            parts: [{ text: `PROJECT CONTEXT (read-only):\n` + files.map(f => `--- file: ${f.path}\n${f.content ?? ''}`).join('\n\n') }]
          }] : []),
          ...(fileParts.length > 0 ? [{
            role: "user",
            parts: [{ text: `PROJECT FILES FROM DISK:\n` + fileParts.map(f => `--- file: ${f.path}\n${f.content ?? ''}`).join('\n\n') }]
          }] : []),
          // The current instruction
          { role: "user", parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    });
    
    const responseText = await response.text();
    console.log("Gemini API response status:", response.status);
    console.log("Gemini API response:", responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Parsed response data:", data);
    } catch (e) {
      console.error("Error parsing Gemini API response:", e);
      return res.status(502).json({ 
        error: "Invalid JSON from Gemini API", 
        details: responseText,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      res.json({ result: data.candidates[0].content.parts[0].text });
    } else {
      console.error("Unexpected response format from Gemini API:", data);
      res.status(502).json({ 
        error: "Unexpected response format from Gemini API",
        response: data 
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
