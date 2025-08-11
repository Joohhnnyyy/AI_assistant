import React, { useState, useEffect, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { BsLightningChargeFill } from 'react-icons/bs';
import { FaPlay } from 'react-icons/fa';
import NewAIChatPanel from "./components/NewAIChatPanel";
import useEditorHotkeys from "./hooks/useHotkeys";
import FileTree from "./components/FileTree";
import TabsBar from "./components/TabsBar";
import RunPanel from "./components/RunPanel";
import Notification from "./components/Notification";
import { fsRead, fsWrite } from "./api";

export default function App() {
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true);
  const [editorValue, setEditorValue] = useState("// Start coding!\n");
  const [selectedText, setSelectedText] = useState("");
  const [openTabs, setOpenTabs] = useState([]); // [{ path, title }]
  const [activePath, setActivePath] = useState("");
  const [filesByPath, setFilesByPath] = useState({}); // path -> content
  const [showRun, setShowRun] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [runTrigger, setRunTrigger] = useState(0);
  const [notification, setNotification] = useState({ message: '', isVisible: false });

  // Hotkey actions
  useEditorHotkeys({
    onAICommand: () => setIsAIPanelOpen(prev => !prev),
    onGoToFile: () => showNotification("Go to File!", "info"),
    onSearchProject: () => showNotification("Search Project!", "info"),
    onAskAIAboutSelection: () => {
      // This would get the selected text from the editor
      if (selectedText) {
        // Handle AI query about selection
        console.log("Asking AI about selection:", selectedText);
      } else {
        showNotification("Please select some text first!", "error");
      }
    },
  });

  // Handle editor mount to set up selection listeners
  const handleEditorDidMount = (editor, monaco) => {
    // Listen for selection changes
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getModel().getValueInRange(editor.getSelection());
      setSelectedText(selection);
    });
  };

  // Handle AI "Apply" events to insert code into the active file (end of file)
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code ?? "";
      if (!code) return;
      if (!activePath) return;
      setFilesByPath(prev => ({ ...prev, [activePath]: (prev[activePath] ?? "") + "\n" + String(code) }));
    };
    window.addEventListener('ai-apply-code', handler);
    return () => window.removeEventListener('ai-apply-code', handler);
  }, [activePath]);

  // Handle notification events from child components
  useEffect(() => {
    const handler = (e) => {
      const { message, type } = e.detail || {};
      if (message) {
        showNotification(message, type);
      }
    };
    window.addEventListener('show-notification', handler);
    return () => window.removeEventListener('show-notification', handler);
  }, []);

  const getLanguageFromPath = (path) => {
    if (!path) return "javascript";
    const ext = path.split('.').pop().toLowerCase();
    const map = {
      js: "javascript",
      mjs: "javascript",
      cjs: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      md: "markdown",
      html: "html",
      css: "css",
      py: "python",
      sh: "shell",
      yml: "yaml",
      yaml: "yaml",
      java: "java",
      go: "go",
      c: "c",
      cc: "cpp",
      cpp: "cpp",
      cxx: "cpp",
      rs: "rust",
    };
    return map[ext] || "plaintext";
  };

  const handleOpenFile = async (path) => {
    try {
      // If not already loaded, fetch
      if (filesByPath[path] === undefined) {
        const res = await fsRead(path);
        setFilesByPath(prev => ({ ...prev, [path]: res.content ?? "" }));
      }
      // Add tab if not present
      setOpenTabs(prev => prev.find(t => t.path === path) ? prev : [...prev, { path, title: path.split('/').pop() }]);
      setActivePath(path);
    } catch (e) {
      console.error("Open file failed:", e);
    }
  };

  const handleActivateTab = (path) => setActivePath(path);
  const handleCloseTab = (path) => {
    setOpenTabs(prev => prev.filter(t => t.path !== path));
    if (activePath === path) {
      const remaining = openTabs.filter(t => t.path !== path);
      setActivePath(remaining[remaining.length - 1]?.path || "");
    }
  };

  const handleSave = async () => {
    if (!activePath) return;
    try {
      await fsWrite(activePath, filesByPath[activePath] ?? "");
      showNotification("File saved successfully!");
    } catch (e) {
      console.error("Save failed:", e);
      showNotification("Failed to save file", "error");
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, isVisible: true, type });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-[#e0e0e0] overflow-hidden">
      {/* Top Navigation */}
      <header className="h-10 bg-[#2d2d2d] flex items-center px-4 justify-between border-b border-[#252525] flex-shrink-0">
        <div className="flex items-center space-x-6">
          <div className="text-sm font-medium text-[#e0e0e0]">AI Code Editor</div>
          <div className="flex items-center space-x-5">
            <div className="text-xs text-[#858585] hover:text-[#e0e0e0] cursor-pointer hover:bg-[#3c3c3c] px-2 py-1 rounded">File</div>
            <div className="text-xs text-[#858585] hover:text-[#e0e0e0] cursor-pointer hover:bg-[#3c3c3c] px-2 py-1 rounded">Edit</div>
            <div className="text-xs text-[#858585] hover:text-[#e0e0e0] cursor-pointer hover:bg-[#3c3c3c] px-2 py-1 rounded">View</div>
            <div className="text-xs text-[#858585] hover:text-[#e0e0e0] cursor-pointer hover:bg-[#3c3c3c] px-2 py-1 rounded">Help</div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            className="text-xs bg-[#16a34a] hover:bg-[#15803d] px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors"
            onClick={() => {
              if (!showRun) setShowRun(true);
              // bump trigger to auto-run current file
              setRunTrigger((x) => x + 1);
            }}
            title="Run Active File"
          >
            <FaPlay className="w-3 h-3" />
            <span>Run</span>
          </button>
          <button 
            className="text-xs bg-[#0d6efd] hover:bg-[#0b5ed7] px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors"
            onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
          >
            <BsLightningChargeFill className="w-3 h-3" />
            <span>AI Assistant</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
        {/* Sidebar */}
        <div className="w-12 bg-[#252526] flex flex-col items-center py-3 border-r border-[#1e1e1e] flex-shrink-0">
          <div className="space-y-4">
            <button 
              className="p-2 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] rounded-md transition-colors relative group"
              title="Explorer (Ctrl+Shift+E)"
              onClick={() => setExplorerCollapsed((c) => !c)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1e1e1e] text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                Explorer (Ctrl+Shift+E)
              </div>
            </button>
            
            <button 
              className="p-2 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] rounded-md transition-colors relative group"
              title="Search (Ctrl+Shift+F)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1e1e1e] text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                Search (Ctrl+Shift+F)
              </div>
            </button>
            
            <button 
              className="p-2 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] rounded-md transition-colors relative group"
              title="Source Control (Ctrl+Shift+G)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1e1e1e] text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                Source Control (Ctrl+Shift+G)
              </div>
            </button>
          </div>
          
          <div className="mt-auto space-y-4">
            <button 
              className="p-2 text-[#e0e0e0] hover:bg-[#2d2d2d] rounded-md transition-colors relative group"
              title="Extensions (Ctrl+Shift+X)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1e1e1e] text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                Extensions (Ctrl+Shift+X)
              </div>
            </button>
          </div>
        </div>

        {/* File Explorer Panel */}
        {!explorerCollapsed && (
          <div className="w-64 bg-[#1e1e1e] border-r border-[#1e1e1e] flex-shrink-0">
            <FileTree onOpen={handleOpenFile} onToggleCollapse={() => setExplorerCollapsed(true)} />
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Tabs */}
          <TabsBar 
            tabs={openTabs}
            activePath={activePath}
            onActivate={handleActivateTab}
            onClose={handleCloseTab}
          />
          
          <div className="flex-1 overflow-hidden">
            <Editor
              height={showRun ? "60%" : "100%"}
              language={getLanguageFromPath(activePath)}
              path={activePath || "untitled.js"}
              value={activePath ? (filesByPath[activePath] ?? "") : editorValue}
              onChange={(val) => {
                if (activePath) {
                  setFilesByPath(prev => ({ ...prev, [activePath]: val ?? "" }));
                } else {
                  setEditorValue(val ?? "");
                }
              }}
              theme="vs-dark"
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                fontFamily: '"Fira Code", "Droid Sans Mono", "Courier New", monospace',
                wordWrap: 'on',
                minimap: { 
                  enabled: true,
                  renderCharacters: false
                },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                renderWhitespace: 'selection',
                tabSize: 2,
                bracketPairColorization: {
                  enabled: true
                },
                guides: {
                  bracketPairs: true
                }
              }}
            />
            {showRun && (
              <div className="h-[40%] border-t border-[#1e1e1e]">
                <RunPanel 
                  defaultCmd={getLanguageFromPath(activePath) === 'python' ? 'python' : 'node'}
                  defaultArgs={[activePath || 'index.js']}
                  cwd={'.'}
                  language={getLanguageFromPath(activePath)}
                  activePath={activePath}
                  onSave={handleSave}
                  trigger={runTrigger}
                />
              </div>
            )}
          </div>
        </div>

        {/* AI Panel */}
        {isAIPanelOpen && (
          <div className="w-96 border-l border-[#1e1e1e] flex-shrink-0 h-full overflow-hidden">
            <NewAIChatPanel 
              isOpen={isAIPanelOpen} 
              onClose={() => setIsAIPanelOpen(false)} 
            />
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="h-6 bg-[#007acc] text-white text-xs flex items-center px-4 justify-between border-t border-[#1e1e1e] flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center cursor-pointer hover:bg-[#1a8fe6] h-full px-2 -mx-2">
            <span className="w-2 h-2 rounded-full bg-[#4caf50] mr-1.5"></span>
            <span>main*</span>
          </div>
          <div className="cursor-pointer hover:bg-[#1a8fe6] h-full px-2 -mx-2 flex items-center">
            <span>UTF-8</span>
          </div>
          <div className="cursor-pointer hover:bg-[#1a8fe6] h-full px-2 -mx-2 flex items-center">
            <span>JavaScript</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="text-xs bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#e0e0e0] px-3 py-1.5 rounded-md border border-[#3c3c3c]"
            onClick={handleSave}
          >Save</button>
          <button 
            className="text-xs bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#e0e0e0] px-3 py-1.5 rounded-md border border-[#3c3c3c]"
            onClick={() => setShowRun((s) => !s)}
          >{showRun ? 'Hide Run' : 'Run'}</button>
          {explorerCollapsed && (
            <button 
              className="text-xs bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#e0e0e0] px-3 py-1.5 rounded-md border border-[#3c3c3c]"
              onClick={() => setExplorerCollapsed(false)}
            >Show Explorer</button>
          )}
          <div className="cursor-pointer hover:bg-[#1a8fe6] h-full px-2 -mx-2 flex items-center">
            <span>Ln 1, Col 1</span>
          </div>
          <div className="cursor-pointer hover:bg-[#1a8fe6] h-full px-2 -mx-2 flex items-center">
            <span>Spaces: 2</span>
          </div>
        </div>
      </footer>
      
      {/* Notification */}
      <Notification 
        message={notification.message}
        isVisible={notification.isVisible}
        onHide={hideNotification}
        type={notification.type}
      />
    </div>
  );
}
