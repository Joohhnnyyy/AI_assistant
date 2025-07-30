import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using gemini-2.0-flash as requested
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
const GEMINI_LIST_MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;

// List available Gemini models
router.get("/models", async (req, res) => {
  try {
    const response = await fetch(GEMINI_LIST_MODELS_URL);
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

// AI completion endpoint
router.post("/complete", async (req, res) => {
  console.log('Received request body:', req.body);
  const { prompt, history = [] } = req.body;
  
  if (!prompt) {
    console.error('Error: No prompt provided in request body');
    return res.status(400).json({ 
      error: "Prompt is required",
      receivedBody: req.body,
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log("Sending request to Gemini API with prompt:", prompt);
    console.log("Using API key:", GEMINI_API_KEY ? '*** (key exists)' : 'MISSING API KEY');
    
    // Prepare the messages array with just the current prompt
    // Gemini 2.0 Flash has a simpler format than the previous version
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{
            text: prompt
          }]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
        stopSequences: []
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    console.log("Sending request to:", GEMINI_API_URL);
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseText = await response.text();
    console.log("Gemini API response status:", response.status);
    console.log("Gemini API response headers:", JSON.stringify([...response.headers.entries()]));
    console.log("Gemini API response body:", responseText);
    
    if (!response.ok) {
      console.error(`Gemini API error: ${response.status} ${response.statusText}`);
      return res.status(502).json({ 
        error: `Gemini API error: ${response.status} ${response.statusText}`,
        details: responseText,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Parsed response data:", JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Error parsing Gemini API response:", e);
      return res.status(502).json({ 
        error: "Invalid JSON from Gemini API", 
        details: responseText,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    // Handle the response from Gemini Pro API
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const result = data.candidates[0].content.parts[0].text;
      console.log("Extracted response text:", result.substring(0, 100) + (result.length > 100 ? '...' : ''));
      res.json({ 
        text: result,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        }
      });
    } else if (data.error) {
      console.error("Gemini API returned an error:", data.error);
      res.status(502).json({ 
        error: data.error.message || "Error from Gemini API",
        details: data.error
      });
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
