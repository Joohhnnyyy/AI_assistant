import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { BsLightningChargeFill } from 'react-icons/bs';
import NewAIChatPanel from "./components/NewAIChatPanel";
import useEditorHotkeys from "./hooks/useHotkeys";

export default function App() {
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true);
  const [editorValue, setEditorValue] = useState("// Start coding!\n");
  const [selectedText, setSelectedText] = useState("");

  // Hotkey actions
  useEditorHotkeys({
    onAICommand: () => setIsAIPanelOpen(prev => !prev),
    onGoToFile: () => alert("Go to File!"),
    onSearchProject: () => alert("Search Project!"),
    onAskAIAboutSelection: () => {
      // This would get the selected text from the editor
      if (selectedText) {
        // Handle AI query about selection
        console.log("Asking AI about selection:", selectedText);
      } else {
        alert("Please select some text first!");
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

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Tabs */}
          <div className="h-9 bg-[#252526] flex items-center border-b border-[#1e1e1e] px-2">
            <div className="flex items-center h-full px-3 border-b-2 border-[#0d6efd] text-[#e0e0e0] text-sm">
              <svg className="w-4 h-4 mr-2 text-[#6a9955]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 3H6v18l7-6v-4.5l7-6V9l-7 6V3z" />
              </svg>
              index.js
            </div>
            <div className="flex items-center h-full px-3 text-[#858585] hover:text-[#e0e0e0] text-sm cursor-pointer">
              <svg className="w-4 h-4 mr-2 text-[#569cd6]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 8V3.5L18.5 10H13zm-2 9l-4-4h3v-3h2v3h3l-4 4z" />
              </svg>
              package.json
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              defaultValue={editorValue}
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
        <div className="flex items-center space-x-4">
          <div className="cursor-pointer hover:bg-[#1a8fe6] h-full px-2 -mx-2 flex items-center">
            <span>Ln 1, Col 1</span>
          </div>
          <div className="cursor-pointer hover:bg-[#1a8fe6] h-full px-2 -mx-2 flex items-center">
            <span>Spaces: 2</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
