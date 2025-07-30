import React, { useState, useRef, useEffect } from "react";
import { aiComplete } from "../api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaUser, FaRobot, FaPaperPlane, FaCode, FaTimes, FaGripLines, FaCog, FaRegLightbulb, FaHistory } from 'react-icons/fa';

// Simple code block component
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const code = String(children).replace(/\n$/, '');
  
  return !inline ? (
    <div className="my-2 rounded-md overflow-hidden border border-gray-200">
      <div className="bg-gray-100 text-gray-700 text-xs p-2 flex justify-between items-center border-b">
        <span className="font-mono text-xs">{language}</span>
        <button 
          className="text-gray-500 hover:text-blue-600 text-xs"
          onClick={() => navigator.clipboard.writeText(code)}
          title="Copy to clipboard"
        >
          Copy
        </button>
      </div>
      <pre className="bg-gray-50 p-3 overflow-x-auto text-sm">
        <code className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  ) : (
    <code className={`${className || ''} bg-gray-100 px-1 py-0.5 rounded text-sm font-mono`} {...props}>
      {children}
    </code>
  );
};

// System message to set the AI's behavior
const SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are an AI coding assistant. Follow these guidelines:
  - Format responses using Markdown
  - Use code blocks with language specification
  - Be concise but thorough
  - Provide explanations with examples when helpful
  - Use bullet points for lists
  - Format file paths and commands with backticks`
};

export default function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([SYSTEM_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = { 
      role: "user", 
      content: input,
      timestamp: new Date().toISOString()
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    try {
      // Get AI response
      const res = await aiComplete({ 
        prompt: input,
        history: messages.filter(m => m.role !== 'system').slice(-5) // Send last 5 messages for context
      });
      
      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        { 
          role: "ai", 
          content: res.result,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('AI Error:', err);
      setMessages(prev => [
        ...prev,
        { 
          role: "ai", 
          content: "I encountered an error processing your request. Please try again.",
          isError: true,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setInput("");
      setLoading(false);
    }
  };

  // Handle mouse down for resizing
  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const newWidth = startWidth.current + (startX.current - e.clientX);
    // Set min and max width constraints
    if (newWidth >= 300 && newWidth <= 800) {
      setWidth(newWidth);
    }
  };

  const stopResize = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Check if the click is not on the toggle button
        const toggleButton = document.querySelector('.ai-toggle-button');
        if (toggleButton && !toggleButton.contains(e.target)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded-l-md shadow-lg z-40 hover:bg-[#2d2d2d] transition-colors ai-toggle-button border-l border-[#404040]"
        title="Open AI Assistant"
      >
        <FaGripLines className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="fixed right-0 top-0 h-full bg-[#1e1e1e] shadow-xl flex flex-col z-50 border-l border-[#404040]"
      style={{ width: `${width}px` }}
    >
      {/* Tabs */}
      <div className="flex border-b border-[#252526] bg-[#252526] px-2">
        <button className="px-4 py-2 text-sm font-medium text-[#d4d4d4] border-b-2 border-[#007acc] bg-[#1e1e1e]">
          Chat
        </button>
        <button className="px-4 py-2 text-sm font-medium text-[#858585] hover:text-[#d4d4d4]">
          Commands
        </button>
      </div>
      
      {/* Header with actions */}
      <div className="flex justify-between items-center px-3 py-2 bg-[#2d2d2d] border-b border-[#252526]">
        <div className="flex items-center space-x-2">
          <button className="text-[#858585] hover:text-[#d4d4d4] p-1 rounded hover:bg-[#3c3c3c]">
            <FaHistory className="w-4 h-4" />
          </button>
          <button className="text-[#858585] hover:text-[#d4d4d4] p-1 rounded hover:bg-[#3c3c3c]">
            <FaRegLightbulb className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center">
          <button 
            onClick={() => setIsOpen(false)}
            className="text-[#858585] hover:text-[#d4d4d4] p-1 rounded hover:bg-[#3c3c3c]"
            title="Close panel"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Messages container with flex and overflow */}
      <div 
        className="flex-1 overflow-y-auto p-3 space-y-3 text-[#e0e0e0] text-sm font-mono" 
        style={{ 
          height: 'calc(100% - 160px)',
          backgroundColor: '#1e1e1e',
          fontFamily: 'var(--vscode-editor-font-family, "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace)'
        }}
      >
        {messages
          .filter(msg => msg.role !== 'system') // Don't show system messages
          .map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-4/5 rounded-lg p-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : msg.isError 
                      ? 'bg-red-100 border border-red-300' 
                      : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center mb-1 text-xs text-[#858585]">
                  {msg.role === 'user' ? (
                    <FaUser className="mr-2 text-[#569cd6]" />
                  ) : msg.isError ? (
                    <span className="text-[#f14c4c] mr-2">⚠️</span>
                  ) : (
                    <FaRobot className="text-[#4ec9b0] mr-2" />
                  )}
                  <span className="text-[#6a9955] font-mono">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className="mx-2 text-[#494949]">•</span>
                  <span className="text-[#6a9955]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {msg.role === 'ai' && !msg.isError ? (
                  <div className="text-[#e0e0e0] text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({node, inline, className, children, ...props}) => {
                          if (inline) {
                            return (
                              <code className="bg-[#2d2d2d] text-[#e0e0e0] px-1 py-0.5 rounded text-[0.9em]" {...props}>
                                {children}
                              </code>
                            );
                          }
                          return <CodeBlock node={node} inline={inline} className={className} {...props}>{children}</CodeBlock>;
                        },
                        pre: ({node, ...props}) => <div className="my-2" {...props} />,
                        p: ({node, ...props}) => <p className="my-2 leading-relaxed text-[#e0e0e0]" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1 text-[#e0e0e0]" {...props} />,
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-4 border-[#264f78] pl-3 py-1 my-2 bg-[#264f781a]" {...props} />
                        ),
                        a: ({node, ...props}) => (
                          <a 
                            className="text-[#3794ff] hover:underline" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            {...props} 
                          />
                        ),
                        strong: ({node, ...props}) => <span className="font-semibold text-[#ffffff]" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-[#e0e0e0] leading-relaxed">
                  {msg.content}
                </div>
                )}
              </div>
            </div>
          ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-4/5">
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form 
        className="border-t border-[#252526] p-3 bg-[#252526]"
        onSubmit={handleSend}
      >
        <div className="relative">
          <textarea
            className="w-full bg-[#1e1e1e] text-[#d4d4d4] border border-[#3c3c3c] rounded p-3 pr-10 focus:outline-none focus:border-[#007acc] resize-none font-mono text-sm"
            placeholder="Ask me to write code, explain concepts, or help debug..."
            rows="3"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            style={{
              minHeight: '60px',
              maxHeight: '200px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#3c3c3c #1e1e1e',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button 
            type="submit" 
            className={`absolute right-2 bottom-2 p-1.5 rounded ${
              loading || !input.trim() 
                ? 'text-[#3c3c3c] cursor-not-allowed' 
                : 'text-[#d4d4d4] hover:bg-[#3c3c3c]'
            } transition-colors`}
            disabled={loading || !input.trim()}
            title="Send message"
          >
            <FaPaperPlane className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-xs text-[#858585] flex items-center justify-between">
          <div className="flex items-center">
            <FaCode className="mr-1.5" />
            <span>Use markdown for code blocks: ```language</span>
          </div>
          <button 
            type="button"
            className="text-[#858585] hover:text-[#d4d4d4] p-1 rounded hover:bg-[#3c3c3c]"
            title="Settings"
          >
            <FaCog className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
      
      {/* Resize handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#007acc] active:bg-[#007acc] transition-colors"
        onMouseDown={startResize}
      />
    </div>
  );
}
