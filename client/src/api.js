// API helpers for frontend
export async function aiComplete({ prompt, files, language }) {
  console.log('Sending request with data:', { prompt, files, language });
  const res = await fetch("/api/ai/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, files, language, timestamp: new Date().toISOString() })
  });
  console.log('Response status:', res.status);
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
