import React, { useState, useRef, useEffect } from "react";
import { aiComplete } from "../api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'prism-react-renderer';
import { FaCopy, FaCheck, FaCode, FaTerminal } from 'react-icons/fa';
import { 
  FaUser, FaRobot, FaPaperPlane, FaTimes, FaGripLines, 
  FaCog, FaRegLightbulb, FaHistory, FaPlus, FaEllipsisV, 
  FaSearch, FaChevronDown, FaRegTrashAlt, FaRegEdit, FaRegClone, FaRegStar, FaRegFileAlt 
} from 'react-icons/fa';

const NewAIChatPanel = ({ isOpen, onClose }) => {
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState([
    { id: '1', title: 'New Chat', isActive: true },
  ]);
  const [messages, setMessages] = useState([
    { 
      id: '1', 
      role: 'ai', 
      content: 'Hello! I\'m your AI coding assistant. How can I help you today?', 
      timestamp: new Date(),
      isError: false 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showConversationMenu, setShowConversationMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const activeConversation = conversations.find(c => c.isActive)?.id || '1';

  const startNewChat = () => {
    const newId = Date.now().toString();
    setConversations(prev => [
      { id: newId, title: 'New Chat', isActive: true },
      ...prev.map(c => ({ ...c, isActive: false }))
    ]);
    setMessages([
      { 
        id: '1', 
        role: 'ai', 
        content: 'Hello! How can I assist you with your coding today?', 
        timestamp: new Date(),
        isError: false 
      }
    ]);
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
      const response = await aiComplete({ prompt: input });
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

  const CodeBlock = ({ language, value }) => {
    const [copied, setCopied] = useState(false);
    const codeRef = useRef(null);

    const copyToClipboard = () => {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const applyToEditor = () => {
      // This would be connected to the main editor
      // For now, we'll just log it
      console.log('Applying code to editor:', value);
      // You can implement the actual logic to update the editor content
    };

    return (
      <div className="relative my-4 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center">
            <FaTerminal className="w-3.5 h-3.5 mr-1.5" />
            {language || 'code'}
          </span>
          <div className="flex space-x-1">
            <button
              onClick={applyToEditor}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="Apply to editor"
            >
              <FaCode className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              {copied ? <FaCheck className="w-3.5 h-3.5 text-green-500" /> : <FaCopy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-3 overflow-x-auto" ref={codeRef}>
          <pre className="text-sm font-mono m-0 p-0">
            <code>{value}</code>
          </pre>
        </div>
      </div>
    );
  };

  const Message = ({ message, onApplyCode }) => {
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
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, '')}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            
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
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
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
