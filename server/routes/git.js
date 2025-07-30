import express from "express";
import simpleGit from "simple-git";
import path from "path";

const router = express.Router();
const git = simpleGit();

// Summarize git diff
router.get("/diff", async (req, res) => {
  try {
    const diff = await git.diff();
    res.json({ diff });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate commit message
router.post("/commit-message", async (req, res) => {
  const { diff } = req.body;
  // Here you would call Gemini Pro to summarize/generate commit message
  res.json({ message: "AI-generated commit message (stub)" });
});

export default router;
