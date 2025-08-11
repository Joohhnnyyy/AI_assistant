// API helpers for frontend
export async function aiComplete(prompt, history = [], files = [], systemPrompt = "", filePaths = [], imageData = []) {
  const res = await fetch(`/api/ai/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, history, files, systemPrompt, filePaths, imageData })
  });
  return res.json();
}

export async function uploadImage(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const res = await fetch('/api/ai/upload-image', {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function getUploadedImages() {
  const res = await fetch('/api/ai/images');
  return res.json();
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
