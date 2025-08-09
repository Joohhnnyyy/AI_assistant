import express from "express";
import simpleGit from "simple-git";
import path from "path";
import { spawn } from "child_process";

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

// Apply a unified diff using git apply
router.post("/apply-diff", async (req, res) => {
  const { diffText, dryRun = false } = req.body || {};
  if (!diffText || typeof diffText !== "string") {
    return res.status(400).json({ error: "diffText is required" });
  }
  const looksLikeAB = /^(---\s+a\/|\+\+\+\s+b\/|diff --git\s+a\/)/m.test(diffText);
  const pLevels = looksLikeAB ? [1, 0, 2] : [0, 1, 2];

  const runApply = (p) => new Promise((resolve) => {
    const modeArg = dryRun ? "--check" : "--apply";
    const args = ["apply", modeArg, "--reject", `-p${p}`, "--whitespace=nowarn", "--unidiff-zero"];
    const child = spawn("git", args, { cwd: process.cwd() });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => resolve({ code: 1, stdout: "", stderr: e.message, p }));
    child.on("close", (code) => resolve({ code, stdout, stderr, p }));
    child.stdin.write(diffText);
    child.stdin.end();
  });

  try {
    const attempts = [];
    for (const p of pLevels) {
      // eslint-disable-next-line no-await-in-loop
      const result = await runApply(p);
      attempts.push(result);
      if (result.code === 0) {
        return res.json({ ok: true, usedP: p, stdout: result.stdout, stderr: result.stderr });
      }
    }
    const last = attempts[attempts.length - 1] || { code: 1, stdout: "", stderr: "" };
    return res.status(422).json({ ok: false, attempts, stdout: last.stdout, stderr: last.stderr });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
