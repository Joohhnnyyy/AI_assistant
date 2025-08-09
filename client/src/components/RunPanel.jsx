import React, { useMemo, useState } from "react";
import { runCommand } from "../api";

// Returns preset options for a given language and file path
function buildPresets(language, filePath) {
  const file = filePath || "";
  const base = [
    { label: "Custom", cmd: "", args: [] },
  ];
  switch (language) {
    case "javascript":
      return [
        ...base,
        { label: "Node (run)", cmd: "node", args: [file || "index.js"] },
        { label: "NPM Test", cmd: "npm", args: ["run", "test"] },
      ];
    case "typescript":
      return [
        ...base,
        { label: "ts-node (run)", cmd: "npx", args: ["ts-node", file || "index.ts"] },
        { label: "tsc build + node", cmd: "bash", args: ["-lc", `npx tsc && node ${file.replace(/\.ts$/, ".js") || "dist/index.js"}`] },
      ];
    case "python":
      return [
        ...base,
        { label: "Python (run)", cmd: "python", args: [file || "main.py"] },
      ];
    case "go":
      return [
        ...base,
        { label: "Go run", cmd: "go", args: ["run", file || "."] },
      ];
    case "java":
      return [
        ...base,
        { label: "javac + java", cmd: "bash", args: ["-lc", `javac "${file || "Main.java"}" && java ${file ? file.replace(/\.java$/, "") : "Main"}`] },
      ];
    case "c":
      return [
        ...base,
        { label: "gcc + run", cmd: "bash", args: ["-lc", `gcc ${file || "main.c"} -o a.out && ./a.out`] },
      ];
    case "cpp":
      return [
        ...base,
        { label: "g++ + run", cmd: "bash", args: ["-lc", `g++ ${file || "main.cpp"} -o app && ./app`] },
      ];
    case "rust":
      return [
        ...base,
        { label: "cargo run", cmd: "cargo", args: ["run"] },
      ];
    default:
      return [
        ...base,
        { label: "Shell", cmd: "bash", args: ["-lc", "echo 'No preset for this file. Set cmd/args manually.'"] },
      ];
  }
}

export default function RunPanel({ defaultCmd = "node", defaultArgs = ["index.js"], cwd = ".", language = "javascript", activePath = "", onSave, trigger }) {
  const [cmd, setCmd] = useState(defaultCmd);
  const [args, setArgs] = useState(defaultArgs.join(" "));
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [presetIndex, setPresetIndex] = useState(0);

  const presets = useMemo(() => buildPresets(language, activePath), [language, activePath]);

  const stripWrappingQuotes = (s) => {
    if (!s) return s;
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  };

  const tokenizeArgs = (input) => {
    if (!input || !input.trim()) return [];
    // Split by spaces but keep quoted segments together
    const tokens = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    return tokens.map((t) => stripWrappingQuotes(t));
  };

  const run = async () => {
    setRunning(true);
    setOutput("Running...\n");
    try {
      if (onSave) {
        await onSave();
      }
      let parsed = tokenizeArgs(args);
      if (cmd === "bash" && parsed[0] === "-lc") {
        // Ensure bash receives the entire command as a single argument after -lc
        const remainder = args.replace(/^\s*-lc\s*/, "");
        parsed = ["-lc", stripWrappingQuotes(remainder)];
      }
      const res = await runCommand(cmd, parsed, cwd);
      const text = [
        `> ${cmd} ${cmd === 'bash' && parsed[0] === '-lc' ? `-lc ${parsed[1]}` : args}\n`,
        res.stdout || "",
        res.stderr ? `\n[stderr]\n${res.stderr}` : "",
        `\n[exit code] ${res.code}`,
      ].join("");
      setOutput(text);
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Auto-select the first non-Custom preset and apply it whenever language/active file changes
  React.useEffect(() => {
    // pick first runnable preset that actually references a file when needed
    let idx = presets.findIndex(p => p.label !== "Custom");
    if (idx < 0) idx = 0;
    setPresetIndex(idx);
    const p = presets[idx];
    if (p) {
      setCmd(p.cmd || "");
      setArgs((p.args || []).join(" "));
    }
    // also clear output to avoid confusion when switching files
    setOutput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, activePath]);

  // External trigger to run (increments value)
  React.useEffect(() => {
    if (trigger) {
      // delay slightly to ensure state applied
      setTimeout(() => run(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-[#252525]">
      <div className="p-2 flex items-center space-x-2 bg-[#252526] border-b border-[#1e1e1e]">
        <select
          className="bg-[#1e1e1e] text-[#e0e0e0] border border-[#3c3c3c] rounded px-2 py-1 text-sm"
          value={presetIndex}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setPresetIndex(idx);
            const p = presets[idx];
            if (!p) return;
            setCmd(p.cmd || "");
            setArgs((p.args || []).join(" "));
            setOutput("");
          }}
          title="Presets"
        >
          {presets.map((p, i) => (
            <option key={i} value={i}>{p.label}</option>
          ))}
        </select>
        <input
          className="bg-[#1e1e1e] text-[#e0e0e0] border border-[#3c3c3c] rounded px-2 py-1 text-sm w-28"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="cmd"
        />
        <input
          className="flex-1 bg-[#1e1e1e] text-[#e0e0e0] border border-[#3c3c3c] rounded px-2 py-1 text-sm"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          placeholder="args"
        />
        <button
          className="text-xs bg-[#3c3c3c] hover:bg-[#4a4a4a] px-3 py-1.5 rounded-md text-white"
          onClick={() => {
            const p = presets[presetIndex];
            if (p) {
              setCmd(p.cmd || "");
              setArgs((p.args || []).join(" "));
            }
          }}
        >
          Use Preset
        </button>
        <button
          className="text-xs bg-[#0d6efd] hover:bg-[#0b5ed7] px-3 py-1.5 rounded-md text-white"
          onClick={run}
          disabled={running}
        >
          {running ? "Running..." : "Run Active File"}
        </button>
      </div>
      <pre className="flex-1 m-0 p-3 overflow-auto text-xs text-[#e0e0e0] whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  );
}


