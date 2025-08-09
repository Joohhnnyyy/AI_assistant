import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Project root is one level up from server directory
const projectRoot = path.resolve(__dirname, "..", "..");

const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".DS_Store"]);

function toAbsoluteSafePath(relativeOrAbsolutePath) {
  const candidate = path.resolve(projectRoot, relativeOrAbsolutePath || ".");
  if (!candidate.startsWith(projectRoot)) {
    throw new Error("Path escapes project root");
  }
  return candidate;
}

async function readDirTree(dirPath, depth = 2) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const children = await Promise.all(
    entries
      .filter((ent) => !IGNORED_DIRS.has(ent.name))
      .map(async (ent) => {
        const full = path.join(dirPath, ent.name);
        const rel = path.relative(projectRoot, full);
        if (ent.isDirectory()) {
          return {
            type: "dir",
            name: ent.name,
            path: rel,
            children: depth > 0 ? await readDirTree(full, depth - 1) : [],
          };
        }
        return { type: "file", name: ent.name, path: rel };
      })
  );
  // sort: dirs first, then files alphabetically
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return children;
}

// GET /api/fs/tree?path=relative&depth=2
router.get("/tree", async (req, res) => {
  try {
    const target = toAbsoluteSafePath(req.query.path || ".");
    const depth = Number(req.query.depth ?? 2);
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }
    const tree = await readDirTree(target, isNaN(depth) ? 2 : depth);
    res.json({ root: path.relative(projectRoot, target), tree });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fs/read?path=relative
router.get("/read", async (req, res) => {
  try {
    const p = req.query.path;
    if (!p) return res.status(400).json({ error: "path is required" });
    const abs = toAbsoluteSafePath(p);
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) return res.status(400).json({ error: "Cannot read a directory" });
    const content = await fs.readFile(abs, "utf-8");
    res.json({ path: p, content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/fs/write { path, content }
router.post("/write", async (req, res) => {
  try {
    const { path: p, content } = req.body || {};
    if (!p || typeof content !== "string") {
      return res.status(400).json({ error: "path and content are required" });
    }
    const abs = toAbsoluteSafePath(p);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf-8");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/fs/new { path, isDir }
router.post("/new", async (req, res) => {
  try {
    const { path: p, isDir } = req.body || {};
    if (!p) return res.status(400).json({ error: "path is required" });
    const abs = toAbsoluteSafePath(p);
    if (isDir) {
      await fs.mkdir(abs, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, "", "utf-8");
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/fs/rename { oldPath, newPath }
router.post("/rename", async (req, res) => {
  try {
    const { oldPath, newPath } = req.body || {};
    if (!oldPath || !newPath) return res.status(400).json({ error: "oldPath and newPath are required" });
    const absOld = toAbsoluteSafePath(oldPath);
    const absNew = toAbsoluteSafePath(newPath);
    await fs.mkdir(path.dirname(absNew), { recursive: true });
    await fs.rename(absOld, absNew);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/fs/delete { path }
router.post("/delete", async (req, res) => {
  try {
    const { path: p } = req.body || {};
    if (!p) return res.status(400).json({ error: "path is required" });
    const abs = toAbsoluteSafePath(p);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat) return res.json({ ok: true });
    if (stat.isDirectory()) {
      await fs.rm(abs, { recursive: true, force: true });
    } else {
      await fs.unlink(abs);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

// Helper to read many files for AI context
export async function readFilesForContext(paths) {
  const results = [];
  for (const rel of paths) {
    const abs = toAbsoluteSafePath(rel);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) continue;
      const content = await fs.readFile(abs, 'utf-8');
      results.push({ path: rel, content });
    } catch {
      // ignore
    }
  }
  return results;
}


