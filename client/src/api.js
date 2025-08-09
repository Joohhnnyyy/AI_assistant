// API helpers for frontend
export async function aiComplete({ prompt, files, language, history, systemPrompt }) {
  const res = await fetch("/api/ai/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, files, language, history, systemPrompt })
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("Invalid or empty JSON from backend (possible Gemini API error)");
  }
  if (!res.ok) {
    throw new Error(data.error || "Unknown error from backend");
  }
  return data;
}

export async function getPromptTemplates() {
  const res = await fetch("/api/templates");
  return res.json();
}

export async function getGitDiff() {
  const res = await fetch("/api/git/diff");
  return res.json();
}

export async function applyGitDiff(diffText, { dryRun = false } = {}) {
  const res = await fetch("/api/git/apply-diff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diffText, dryRun })
  });
  return res.json();
}

// FS APIs
export async function fsTree(path = ".", depth = 2) {
  const res = await fetch(`/api/fs/tree?path=${encodeURIComponent(path)}&depth=${depth}`);
  return res.json();
}

export async function fsRead(filePath) {
  const res = await fetch(`/api/fs/read?path=${encodeURIComponent(filePath)}`);
  return res.json();
}

export async function fsWrite(filePath, content) {
  const res = await fetch(`/api/fs/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, content })
  });
  return res.json();
}

export async function fsNew(targetPath, isDir = false) {
  const res = await fetch(`/api/fs/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: targetPath, isDir })
  });
  return res.json();
}

export async function fsRename(oldPath, newPath) {
  const res = await fetch(`/api/fs/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPath, newPath })
  });
  return res.json();
}

export async function fsDelete(targetPath) {
  const res = await fetch(`/api/fs/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: targetPath })
  });
  return res.json();
}

// Run command API
export async function runCommand(cmd, args = [], cwd = ".") {
  const res = await fetch(`/api/run/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd, args, cwd })
  });
  return res.json();
}
