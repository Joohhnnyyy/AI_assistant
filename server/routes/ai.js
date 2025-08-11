import express from "express";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fetch from "node-fetch";
import { readFilesForContext } from "./fs.js";

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
const GEMINI_LIST_MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'images');
    // Create directory if it doesn't exist
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => cb(err));
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
  const { prompt, history = [], files = [], systemPrompt, filePaths = [], imageData = [] } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    console.log("Sending request to Gemini API with prompt:", prompt);
    
    // Process image data if provided
    let imageParts = [];
    if (Array.isArray(imageData) && imageData.length > 0) {
      for (const img of imageData) {
        try {
          // Convert base64 to buffer
          const base64Data = img.data.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          imageParts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/png',
              data: base64Data
            }
          });
        } catch (error) {
          console.error('Error processing image data:', error);
        }
      }
    }
    
    // Clean the prompt to remove image references that might cause issues
    let cleanPrompt = prompt;
    const imageRefs = prompt.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
    
    // Replace image references with a cleaner format
    imageRefs.forEach(ref => {
      const match = ref.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        const [, alt, url] = match;
        cleanPrompt = cleanPrompt.replace(ref, `[Image: ${alt || 'Uploaded image'}]`);
      }
    });
    
    // If filePaths provided, load contents from disk
    let fileParts = [];
    if (Array.isArray(filePaths) && filePaths.length > 0) {
      try {
        fileParts = await readFilesForContext(filePaths);
      } catch {}
    }

    // Build the parts array for the request
    let parts = [{ text: cleanPrompt }];
    
    // Add image parts if available
    if (imageParts.length > 0) {
      parts = [...imageParts, ...parts];
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
          // The current instruction with images
          { role: "user", parts: parts }
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
    
    if (!response.ok) {
      console.error("Gemini API error response:", responseText);
      return res.status(response.status).json({ 
        error: `Gemini API error: ${response.status}`, 
        details: responseText 
      });
    }

    try {
      const data = JSON.parse(responseText);
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
      
      res.json({
        text: generatedText,
        usage: {
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0
        }
      });
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      res.json({ text: responseText, result: responseText });
    }
    
  } catch (error) {
    console.error("AI completion error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Image upload endpoint
router.post("/upload-image", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Generate the URL for the uploaded image using the correct server port
    const baseUrl = req.protocol + '://' + req.get('host');
    const imageUrl = `${baseUrl}/api/ai/images/${req.file.filename}`;
    
    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: imageUrl
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve uploaded images
router.get("/images/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, '..', '..', 'uploads', 'images', filename);
    
    // Check if file exists
    await fs.access(imagePath);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/*');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the image file
    const stream = createReadStream(imagePath);
    stream.pipe(res);
  } catch (error) {
    console.error("Image serve error:", error);
    res.status(404).json({ error: "Image not found" });
  }
});

// Get list of uploaded images
router.get("/images", async (req, res) => {
  try {
    const imagesDir = path.join(__dirname, '..', '..', 'uploads', 'images');
    
    // Check if directory exists
    try {
      await fs.access(imagesDir);
    } catch {
      // Directory doesn't exist, return empty list
      return res.json({ images: [] });
    }
    
    const files = await fs.readdir(imagesDir);
    const baseUrl = req.protocol + '://' + req.get('host');
    const images = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(imagesDir, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          url: `${baseUrl}/api/ai/images/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime
        };
      })
    );
    
    res.json({ images: images.sort((a, b) => b.uploadedAt - a.uploadedAt) });
  } catch (error) {
    console.error("Get images error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
