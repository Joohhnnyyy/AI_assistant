import React, { useState, useRef, useEffect, useCallback } from "react";
import { aiComplete } from "../api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'prism-react-renderer';
import { FaCopy, FaCheck, FaCode, FaTerminal, FaSpinner } from 'react-icons/fa';
import { applyGitDiff } from "../api";
import { 
  FaUser, FaRobot, FaPaperPlane, FaTimes, FaGripLines, 
  FaCog, FaRegLightbulb, FaHistory, FaPlus, FaEllipsisV, 
  FaSearch, FaChevronDown, FaRegTrashAlt, FaRegEdit, FaRegClone, FaRegStar, FaRegFileAlt 
} from 'react-icons/fa';
import {
  getCurrentUser,
  getUserConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation
} from '../api/auth';

const NewAIChatPanel = ({ isOpen, onClose }) => {
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showConversationMenu, setShowConversationMenu] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const activeConversation = conversations.find(c => c.isActive)?.id || null;

  // Initialize user and load conversations
  const initializeUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Load user's conversations
      const userConversations = await getUserConversations(user._id);
      setConversations(userConversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        isActive: false,
        updatedAt: new Date(conv.updatedAt)
      })));
      
      // If no conversations, create a default one
      if (userConversations.length === 0) {
        const newConv = await createConversation(user._id, 'New Chat');
        setConversations([{
          id: newConv._id,
          title: newConv.title,
          isActive: true,
          updatedAt: new Date(newConv.updatedAt)
        }]);
        setMessages(newConv.messages || []);
      } else {
        // Load the most recent conversation
        const mostRecent = userConversations[0];
        setConversations(prev => 
          prev.map(c => ({
            ...c,
            isActive: c.id === mostRecent._id
          }))
        );
        setMessages(mostRecent.messages || []);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      // Fallback to local state if API fails
      setMessages([{ 
        id: '1', 
        role: 'ai', 
        content: 'Hello! I\'m your AI coding assistant. How can I help you today?', 
        timestamp: new Date(),
        isError: false 
      }]);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = async (conversationId) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const conversation = await getConversation(conversationId, currentUser._id);
      
      setConversations(prev => 
        prev.map(c => ({
          ...c,
          isActive: c.id === conversationId
        }))
      );
      
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
      alert('Failed to load conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start a new conversation
  const startNewChat = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const newConv = await createConversation(currentUser._id, 'New Chat');
      
      setConversations(prev => [
        {
          id: newConv._id,
          title: newConv.title,
          isActive: true,
          updatedAt: new Date(newConv.updatedAt)
        },
        ...prev.map(c => ({ ...c, isActive: false }))
      ]);
      
      setMessages(newConv.messages || []);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      alert('Failed to create a new conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    console.log('handleSend called with input:', input);
    if (!input.trim() || loading) {
      console.log('Not sending - empty input or already loading');
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      isError: false
    };

    console.log('Adding user message to UI:', userMessage);
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log('Calling aiComplete with prompt:', input);
      // Build a strong system prompt to steer Gemini towards code-editor behavior
      const systemPrompt = `You are an in-editor AI coding assistant. Goals:\n- Write high-quality code edits for the user's project.\n- Respond with concise, skimmable Markdown.\n- By default, output the FINAL FILE CONTENT in a single fenced code block with the correct language. Add the first line as a comment containing the relative file path, like: // path: src/file.ts (or # path: file.py).\n- Only return a unified diff (\`\`\`diff) if the user explicitly asks for a diff.\n- Provide a short summary below the code block if needed.\n- Prefer small, focused edits over large rewrites.\n- If unclear, ask one clarifying question.\n- Maintain cycles of correction and improvement if the user provides feedback.\n- NEVER fabricate files or APIs not present in the provided context.`;

      // Include last messages for short-term memory, and (optionally) a few open files when integrated
      const recent = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

      const response = await aiComplete({ 
        prompt: input,
        history: recent,
        systemPrompt
      });
      console.log('Received response from aiComplete:', response);
      
      // Handle both old and new response formats
      const responseText = response.text || response.result || 'No response from AI';
      console.log('Response text:', responseText);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: responseText,
        timestamp: new Date(),
        isError: false,
        usage: response.usage || null
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!currentUser) return;
    
    // Don't allow deleting the last conversation
    if (conversations.length <= 1) {
      alert('You must have at least one conversation');
      return;
    }
    
    try {
      await deleteConversation(id, currentUser._id);
      
      // Find the next conversation to activate
      const currentIndex = conversations.findIndex(c => c.id === id);
      const nextActiveIndex = currentIndex === 0 && conversations.length > 1 ? 1 : 0;
      const nextActiveId = conversations[nextActiveIndex]?.id;
      
      // Update local state
      setConversations(prev => 
        prev
          .filter(conv => conv.id !== id)
          .map((conv, idx) => ({
            ...conv,
            isActive: idx === nextActiveIndex
          }))
      );
      
      // If the deleted conversation was active, load the next one
      if (id === activeConversation && nextActiveId) {
        await loadConversation(nextActiveId);
      }
      
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const applyToEditor = async (codeContent) => {
    console.log('Apply button clicked');
    console.log('Code content:', codeContent);
    
    // Check for path: comment in the first few lines (supports both // and # comments)
    const pathMatch = codeContent.match(/^[#\/]{1,2}\s*path:\s*([^\s].*?)\s*$/m);
    console.log('Path match:', pathMatch);
    
    if (pathMatch) {
      // Extract the file path and clean up the code content
      const filePath = pathMatch[1].trim();
      const cleanContent = codeContent.replace(/^\/\/\s*path:.*$/m, '').trimStart();
      
      try {
        // Create the file using the filesystem API
        const response = await fetch('/api/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, content: cleanContent })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          alert(`File created successfully at: ${filePath}`);
          // Trigger a refresh of the file tree
          window.dispatchEvent(new CustomEvent('refresh-filetree'));
        } else {
          alert(`Failed to create file: ${result.error || 'Unknown error'}`);
        }
        return;
      } catch (e) {
        console.error('File creation error:', e);
        alert(`Error creating file: ${e.message}`);
        return;
      }
    }
    
    // If content looks like a unified diff, offer to apply via git apply
    const looksLikeDiff = /^(---\s+a\/|\+\+\+\s+b\/|@@\s)/m.test(codeContent);
    if (looksLikeDiff) {
      try {
        // Try several -p levels server-side to avoid manual editing
        const dry = await applyGitDiff(codeContent, { dryRun: true });
        if (dry?.ok === false) {
          alert(`Diff failed dry-run:\n${dry.stderr || dry.stdout || 'Unknown error'}`);
          return;
        }
        const res = await applyGitDiff(codeContent, { dryRun: false });
        if (res?.ok) {
          alert('Changes applied successfully!');
        } else {
          alert(`Failed to apply changes:\n${res?.stderr || res?.stdout || 'Unknown error'}`);
        }
      } catch (e) {
        console.error('Error applying diff:', e);
        alert(`Error applying changes: ${e.message}`);
      }
    } else {
      alert('No file path specified. Add a comment like "// path: filename.ext" at the top of the code block.');
    }
  };

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const [copied, setCopied] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const codeRef = useRef(null);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeContent = String(children).replace(/\n$/, '');

    const copyToClipboard = () => {
      navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    const getLanguageLabel = (lang) => {
      const langMap = {
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'ts': 'TypeScript',
        'typescript': 'TypeScript',
        'py': 'Python',
        'python': 'Python',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'jsx': 'JSX',
        'tsx': 'TSX',
        'bash': 'Bash',
        'sh': 'Shell',
        'md': 'Markdown',
        'yaml': 'YAML',
        'yml': 'YAML',
      };
      return langMap[language?.toLowerCase()] || language || 'Code';
    };

    return (
      <div 
        className="relative my-4 rounded-lg overflow-hidden border border-[#2d2d2d] bg-[#1e1e1e] text-sm"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Language tab */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400 border-b border-[#404040]">
          <div className="flex items-center">
            <FaCode className="w-3 h-3 mr-2 text-blue-400" />
            <span className="font-medium text-gray-300">{getLanguageLabel(language)}</span>
          </div>
          
          {/* Action buttons - shown on hover */}
          <div className={`flex items-center space-x-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={() => applyToEditor(codeContent)}
              className="flex items-center px-2 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Apply to code"
            >
              <FaTerminal className="w-3 h-3 mr-1" />
              <span>Apply</span>
            </button>
            <button 
              onClick={copyToClipboard}
              className={`flex items-center px-2 py-1 text-xs rounded-md ${copied ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'} text-white transition-colors`}
              title={copied ? 'Copied!' : 'Copy code'}
            >
              {copied ? <FaCheck className="w-3 h-3 mr-1" /> : <FaCopy className="w-3 h-3 mr-1" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
        
        {/* Code content */}
        <div className="relative ml-8">
          <pre className="p-4 overflow-x-auto m-0">
            <code 
              ref={codeRef} 
              className={`language-${language} block whitespace-pre`}
              style={{
                fontFamily: 'var(--vscode-editor-font-family, "Fira Code", "Droid Sans Mono", "monospace")',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                display: 'block',
                minWidth: '100%',
                overflow: 'visible',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
              {...props}
            >
              {children}
            </code>
          </pre>
          
          {/* Fade effect at the bottom for long code blocks */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none"></div>
        </div>
        
        {/* Line numbers */}
        <div className="absolute left-0 top-10 bottom-0 w-8 text-right pr-2 text-xs text-gray-500 select-none border-r border-[#2d2d2d] bg-[#1e1e1e] z-10">
          {codeContent.split('\n').map((_, i) => (
            <div key={i} className="h-5 leading-5">{i + 1}</div>
          ))}
        </div>
      </div>
    );
  };

  const Message = ({ message, onApplyCode }) => {
    const splitIntoSegments = (raw) => {
      if (typeof raw !== 'string') return [{ type: 'text', text: '' }];
      const fenceCount = (raw.match(/```/g) || []).length;
      let content = fenceCount % 2 === 1 ? raw + '\n```' : raw;
      const regex = /```(\w+)?\n([\s\S]*?)```/g;
      const segments = [];
      let lastIndex = 0;
      let m;
      while ((m = regex.exec(content)) !== null) {
        if (m.index > lastIndex) {
          segments.push({ type: 'text', text: content.slice(lastIndex, m.index) });
        }
        segments.push({ type: 'code', lang: m[1] || '', code: m[2] || '' });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < content.length) {
        segments.push({ type: 'text', text: content.slice(lastIndex) });
      }
      return segments;
    };

    const segments = splitIntoSegments(message.content);

    return (
      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
        <div 
          className={`max-w-[80%] rounded-lg overflow-hidden ${
            message.role === 'user' 
              ? 'bg-blue-500 text-white' 
              : message.isError 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' 
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="px-4 pt-3 pb-1">
            <div className="text-sm font-medium mb-1 flex items-center">
              {message.role === 'user' ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-300 mr-2"></span>
                  You
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                  AI Assistant
                </span>
              )}
              <span className="text-xs opacity-60 ml-auto">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {segments.map((seg, idx) => (
              seg.type === 'code' ? (
                <div key={idx} className="my-3">
                  <CodeBlock className={`language-${seg.lang || 'text'}`}>
                    {seg.code}
                  </CodeBlock>
                </div>
              ) : (
                seg.text.trim() ? (
                  <div key={idx} className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {seg.text}
                    </ReactMarkdown>
                  </div>
                ) : null
              )
            ))}

            {message.usage && (
              <div className="text-xs opacity-50 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                Tokens: {message.usage.totalTokens} (Prompt: {message.usage.promptTokens}, Completion: {message.usage.completionTokens})
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeUser();
    }
  }, [isOpen, isInitialized, initializeUser]);

  useEffect(() => {
    const saveCurrentConversation = async () => {
      const activeConv = conversations.find(c => c.isActive);
      if (!activeConv || !currentUser || messages.length === 0) return;
      
      try {
        await updateConversation(
          activeConv.id,
          currentUser._id,
          messages
        );
        
        // Update the conversation's updatedAt timestamp
        setConversations(prev => 
          prev.map(c => 
            c.id === activeConv.id 
              ? { ...c, updatedAt: new Date() } 
              : c
          )
        );
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    };
    
    // Only save if we have messages and a user is logged in
    if (isInitialized && messages.length > 0 && currentUser) {
      saveCurrentConversation();
    }
  }, [messages, currentUser, conversations, isInitialized]);

  if (!isOpen) return null;

  return (
    <div 
      ref={panelRef}
      className="fixed right-0 top-0 h-full bg-[#1e1e1e] shadow-xl flex z-50 border-l border-[#404040]"
      style={{ width: '500px' }}
    >
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-[#252526] h-full flex-shrink-0 flex flex-col transition-all duration-200 overflow-hidden`}>
        <div className="p-3">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center space-x-2 bg-[#3c3c3c] hover:bg-[#4d4d4d] text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="flex items-center px-3 py-2 text-xs text-[#858585] border-t border-b border-[#2d2d2d] cursor-pointer hover:bg-[#2d2d2d]">
          <FaChevronDown className="w-3 h-3 mr-2" />
          <span>Recent</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.map(conversation => (
            <div 
              key={conversation.id}
              className={`relative group px-3 py-2 text-sm cursor-pointer ${conversation.isActive ? 'bg-[#2d2d2d]' : 'hover:bg-[#2d2d2d]'}`}
              onClick={() => {
                setConversations(prev => prev.map(c => ({
                  ...c,
                  isActive: c.id === conversation.id
                })));
              }}
            >
              <div className="flex items-center">
                <FaRegStar className="w-4 h-4 mr-2 text-[#858585]" />
                <span className="truncate">{conversation.title}</span>
                <button 
                  onClick={() => handleDeleteConversation(conversation.id)}
                  className="ml-auto text-[#858585] hover:text-[#e0e0e0] transition-colors"
                >
                  <FaRegTrashAlt className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-3 border-t border-[#2d2d2d]">
          <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-[#2d2d2d] cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-[#4d4d4d] flex items-center justify-center">
              <span className="text-xs font-medium">U</span>
            </div>
            <span className="text-sm text-[#e0e0e0]">User</span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] relative">
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-2 top-2 p-1 rounded-md text-[#858585] hover:bg-[#2d2d2d] z-10"
          title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <FaGripLines className="w-4 h-4" />
        </button>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2d2d2d] bg-[#252526]">
          <h3 className="text-sm font-medium text-[#e0e0e0]">
            {conversations.find(c => c.isActive)?.title || 'New Chat'}
          </h3>
          <div className="flex items-center space-x-2">
            <button className="p-1 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] rounded">
              <FaSearch className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-1 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] rounded"
              title="Close panel"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <FaSpinner className="animate-spin text-blue-500 text-2xl" />
            </div>
          ) : (
            messages.map((message) => (
              <Message key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t border-[#2d2d2d] p-3 bg-[#252526]">
          <form onSubmit={handleSend} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type a message..."
              className="w-full bg-[#2d2d2d] text-[#e0e0e0] border border-[#3c3c3c] rounded-lg p-3 pr-10 focus:outline-none focus:border-[#0d6efd] resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '200px' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2 p-1 text-[#858585] hover:text-[#e0e0e0] disabled:opacity-50"
            >
              <FaPaperPlane className="w-4 h-4" />
            </button>
          </form>
          <div className="text-xs text-[#858585] mt-1 text-center">
            {loading ? 'AI is thinking...' : 'Press Enter to send, Shift+Enter for new line'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAIChatPanel;
