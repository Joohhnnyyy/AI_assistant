import express from "express";
import { readFile } from "fs/promises";
import path from "path";

const router = express.Router();
const templatesPath = path.resolve("../shared/promptTemplates.json");

router.get("/", async (req, res) => {
  try {
    const data = await readFile(templatesPath, "utf-8");
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
