import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

// POST /api/run/command { cmd, args, cwd }
// Executes a simple command for running code (e.g., node file.js, python file.py)
// NOTE: This is a basic runner with minimal safeguards. In production, sandboxing is required.
router.post("/command", async (req, res) => {
  try {
    const { cmd, args = [], cwd = "." } = req.body || {};
    if (!cmd) return res.status(400).json({ error: "cmd is required" });

    const absCwd = path.resolve(projectRoot, cwd);
    if (!absCwd.startsWith(projectRoot)) {
      return res.status(400).json({ error: "cwd escapes project root" });
    }

    const child = spawn(cmd, Array.isArray(args) ? args : [], {
      cwd: absCwd,
      shell: process.platform === "win32",
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => {
      res.json({ code, stdout, stderr });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;



