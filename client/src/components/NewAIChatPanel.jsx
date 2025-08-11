import React, { useState, useRef, useEffect, useCallback } from "react";
import { aiComplete, uploadImage, getUploadedImages } from "../api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'prism-react-renderer';
import { FaCopy, FaCheck, FaCode, FaTerminal, FaSpinner, FaImage, FaUpload, FaTimes } from 'react-icons/fa';
import { applyGitDiff } from "../api";
import { 
  FaUser, FaRobot, FaPaperPlane, FaGripLines, 
  FaCog, FaRegLightbulb, FaHistory, FaPlus, FaEllipsisV, 
  FaSearch, FaChevronDown, FaRegTrashAlt, FaRegEdit, FaRegClone, FaRegStar, FaRegFileAlt 
} from 'react-icons/fa';
import {
  getCurrentUser,
  getUserConversations,
  getConversation,
  createConversation,
  updateConversation,
  updateConversationTitle,
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
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imageDataMap, setImageDataMap] = useState(new Map()); // Store image data for AI
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeConversation = conversations.find(c => c.isActive)?.id || null;

  // Initialize user and load conversations
  const initializeUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Load user's conversations
      const userConversations = await getUserConversations(user.userId);
      setConversations(userConversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        isActive: false,
        updatedAt: new Date(conv.updatedAt),
        isServerConversation: true
      })));
      
      // If no conversations, create a default one
      if (userConversations.length === 0) {
        try {
          const newConv = await createConversation(user.userId, 'New Chat');
        setConversations([{
          id: newConv._id,
          title: newConv.title,
          isActive: true,
          updatedAt: new Date(newConv.updatedAt)
        }]);
        setMessages(newConv.messages || []);
        } catch (convError) {
          console.warn('Could not create default conversation, using fallback:', convError);
          // Create a local fallback conversation
          setConversations([{
            id: 'fallback-1',
            title: 'New Chat',
            isActive: true,
            updatedAt: new Date(),
            isServerConversation: false
          }]);
          setMessages([{ 
            id: '1', 
            role: 'ai', 
            content: 'Hello! I\'m your AI coding assistant. How can I help you today?', 
            timestamp: new Date(),
            isError: false 
          }]);
        }
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
      setCurrentUser({
        userId: `fallback-${Date.now()}`,
        username: 'Anonymous User'
      });
      setConversations([{
        id: 'fallback-1',
        title: 'New Chat',
        isActive: true,
        updatedAt: new Date(),
        isServerConversation: false
      }]);
      setMessages([{ 
        id: '1', 
        role: 'ai', 
        content: 'Hello! I\'m your AI coding assistant. How can I help you today? (Note: Running in offline mode)', 
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
      const conversation = await getConversation(conversationId, currentUser.userId);
      
      setConversations(prev => 
        prev.map(c => ({
          ...c,
          isActive: c.id === conversationId
        }))
      );
      
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'Failed to load conversation. Please try again.', type: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Start a new conversation
  const startNewChat = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const newConv = await createConversation(currentUser.userId, 'New Chat');
      
      setConversations(prev => [
        {
          id: newConv._id,
          title: newConv.title,
          isActive: true,
          updatedAt: new Date(newConv.updatedAt),
          isServerConversation: true
        },
        ...prev.map(c => ({ ...c, isActive: false }))
      ]);
      
      setMessages(newConv.messages || []);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'Failed to create a new conversation. Please try again.', type: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteConversation = async (id) => {
    if (!currentUser) return;
    
    // Don't allow deleting the last conversation
    if (conversations.length <= 1) {
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'You must have at least one conversation', type: 'error' }
      }));
      return;
    }
    
    // Don't try to delete fallback conversations (they don't exist on the server)
    if (id.startsWith('fallback-')) {
      console.log('Skipping delete for fallback conversation:', id);
      // Just remove from local state
      setConversations(prev => 
        prev
          .filter(conv => conv.id !== id)
          .map((conv, idx) => ({
            ...conv,
            isActive: idx === 0
          }))
      );
      setMessages([]);
      return;
    }
    
    try {
      await deleteConversation(id, currentUser.userId);
      
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
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'Failed to delete conversation. Please try again.', type: 'error' }
      }));
    }
  };

  const handleEditTitle = (conversation) => {
    setEditingTitle(conversation.id);
    setEditTitleValue(conversation.title);
  };

  const handleSaveTitle = async (conversationId) => {
    if (!currentUser || !editTitleValue.trim()) return;
    
    // Don't try to update titles for fallback conversations
    if (conversationId.startsWith('fallback-')) {
      console.log('Skipping title update for fallback conversation:', conversationId);
      // Just update local state
      setConversations(prev => 
        prev.map(c => 
          c.id === conversationId 
            ? { ...c, title: editTitleValue.trim() } 
            : c
        )
      );
      setEditingTitle(null);
      setEditTitleValue('');
      return;
    }
    
    try {
      await updateConversationTitle(conversationId, currentUser.userId, editTitleValue.trim());
      
      // Update local state
      setConversations(prev => 
        prev.map(c => 
          c.id === conversationId 
            ? { ...c, title: editTitleValue.trim() } 
            : c
        )
      );
      
      setEditingTitle(null);
      setEditTitleValue('');
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'Title updated successfully', type: 'success' }
      }));
    } catch (error) {
      console.error('Error updating title:', error);
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'Failed to update title', type: 'error' }
      }));
    }
  };

  const handleCancelEdit = () => {
    setEditingTitle(null);
    setEditTitleValue('');
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Filter and validate image files
    const imageFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        window.dispatchEvent(new CustomEvent('show-notification', { 
          detail: { message: `${file.name} is not an image file`, type: 'error' }
        }));
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        window.dispatchEvent(new CustomEvent('show-notification', { 
          detail: { message: `${file.name} is too large (max 10MB)`, type: 'error' }
        }));
        return false;
      }
      
      return true;
    });

    if (imageFiles.length === 0) return;

    try {
      setUploadingImage(true);
      
      // Upload each image
      for (const file of imageFiles) {
        const result = await uploadImage(file);
        
        if (result.success) {
          // Convert image to base64 for AI processing
          const base64Data = await convertImageToBase64(file);
          const imageInfo = {
            data: base64Data,
            mimeType: file.type,
            alt: file.name
          };
          
          // Store image data for AI processing
          setImageDataMap(prev => new Map(prev).set(result.url, imageInfo));
          
          // Add image reference to input
          const imageRef = `![${file.name}](${result.url})`;
          setInput(prev => prev + (prev ? '\n' : '') + imageRef);
          
          window.dispatchEvent(new CustomEvent('show-notification', { 
            detail: { message: `${file.name} uploaded successfully`, type: 'success' }
          }));
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      }
      
      // Refresh image gallery
      loadUploadedImages();
      
    } catch (error) {
      console.error('Image upload error:', error);
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: `Failed to upload image: ${error.message}`, type: 'error' }
      }));
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadUploadedImages = async () => {
    try {
      const result = await getUploadedImages();
      if (result.images) {
        setUploadedImages(result.images);
      }
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const insertImageReference = async (imageUrl, filename) => {
    const imageRef = `![${filename}](${imageUrl})`;
    setInput(prev => prev + (prev ? '\n' : '') + imageRef);
    setShowImageGallery(false);
    
    // If we don't have the image data cached, fetch and store it
    if (!imageDataMap.has(imageUrl)) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64 = await convertImageToBase64(blob);
        
        const imageInfo = {
          data: base64,
          mimeType: blob.type || 'image/png',
          alt: filename
        };
        
        setImageDataMap(prev => new Map(prev).set(imageUrl, imageInfo));
      } catch (error) {
        console.error('Error fetching image data:', error);
      }
    }
  };

  const removeImageReference = (imageUrl) => {
    setInput(prev => prev.replace(new RegExp(`!\\[.*?\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'), ''));
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getImageDataForAI = async () => {
    const imageRefs = input.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
    console.log('Found image references:', imageRefs);
    const imageData = [];
    
    for (const ref of imageRefs) {
      const match = ref.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        const [, alt, url] = match;
        console.log('Processing image:', { alt, url });
        
        // Check if we have the image data cached
        if (imageDataMap.has(url)) {
          console.log('Using cached image data for:', url);
          imageData.push(imageDataMap.get(url));
        } else {
          // Try to fetch the image and convert to base64
          try {
            console.log('Fetching image from:', url);
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const blob = await response.blob();
            console.log('Image blob size:', blob.size, 'type:', blob.type);
            const base64 = await convertImageToBase64(blob);
            
            const imageInfo = {
              data: base64,
              mimeType: blob.type || 'image/png',
              alt: alt || 'Uploaded image'
            };
            
            console.log('Successfully processed image:', imageInfo.alt);
            
            // Cache the image data
            setImageDataMap(prev => new Map(prev).set(url, imageInfo));
            imageData.push(imageInfo);
          } catch (error) {
            console.error('Error converting image to base64:', error);
          }
        }
      }
    }
    
    console.log('Returning image data:', imageData.length, 'images');
    return imageData;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'Please drop image files only', type: 'error' }
      }));
      return;
    }
    
    // Upload the first image file
    if (imageFiles[0]) {
      const event = { target: { files: [imageFiles[0]] } };
      handleImageUpload(event);
    }
  };

  const exportChatHistory = () => {
    const activeConv = conversations.find(c => c.isActive);
    if (!activeConv || messages.length === 0) {
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'No conversation to export', type: 'error' }
      }));
      return;
    }

    const chatData = {
      title: activeConv.title,
      exportDate: new Date().toISOString(),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        isError: msg.isError
      }))
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { message: 'Chat history exported successfully', type: 'success' }
    }));
  };

  const importChatHistory = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const chatData = JSON.parse(text);
        
        if (!chatData.messages || !Array.isArray(chatData.messages)) {
          throw new Error('Invalid chat history format');
        }

        // Create a new conversation with the imported data
        if (currentUser) {
          const newConv = await createConversation(
            currentUser.userId, 
            chatData.title || 'Imported Chat',
            chatData.messages[0]?.content || null
          );

          // Set the imported messages
          const importedMessages = chatData.messages.map(msg => ({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            isError: msg.isError || false
          }));

          // Add to conversations list
          setConversations(prev => [
            {
              id: newConv._id,
              title: newConv.title,
              isActive: true,
              updatedAt: new Date(newConv.updatedAt)
            },
            ...prev.map(c => ({ ...c, isActive: false }))
          ]);

          // Set messages
          setMessages(importedMessages);

          window.dispatchEvent(new CustomEvent('show-notification', { 
            detail: { message: 'Chat history imported successfully', type: 'success' }
          }));
        }
      } catch (error) {
        console.error('Error importing chat history:', error);
        window.dispatchEvent(new CustomEvent('show-notification', { 
          detail: { message: 'Failed to import chat history. Invalid file format.', type: 'error' }
        }));
      }
    };
    input.click();
  };

  const filteredMessages = searchQuery.trim() 
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-black px-1 rounded">{part}</mark>
      ) : part
    );
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
          // Dispatch custom event for notification instead of alert
          window.dispatchEvent(new CustomEvent('show-notification', { 
            detail: { message: `File created successfully at: ${filePath}`, type: 'success' }
          }));
          // Trigger a refresh of the file tree
          window.dispatchEvent(new CustomEvent('refresh-filetree'));
        } else {
          window.dispatchEvent(new CustomEvent('show-notification', { 
            detail: { message: `Failed to create file: ${result.error || 'Unknown error'}`, type: 'error' }
          }));
        }
        return;
      } catch (e) {
        console.error('File creation error:', e);
        window.dispatchEvent(new CustomEvent('show-notification', { 
          detail: { message: `Error creating file: ${e.message}`, type: 'error' }
        }));
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
          window.dispatchEvent(new CustomEvent('show-notification', { 
            detail: { message: `Diff failed dry-run:\n${dry.stderr || dry.stdout || 'Unknown error'}`, type: 'error' }
          }));
          return;
        }
        const res = await applyGitDiff(codeContent, { dryRun: false });
        if (res?.ok) {
          window.dispatchEvent(new CustomEvent('show-notification', { 
            detail: { message: 'Changes applied successfully!', type: 'success' }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('show-notification', { 
            detail: { message: `Failed to apply changes:\n${res?.stderr || res?.stdout || 'Unknown error'}`, type: 'error' }
          }));
        }
      } catch (e) {
        console.error('Error applying diff:', e);
        window.dispatchEvent(new CustomEvent('show-notification', { 
          detail: { message: `Error applying changes: ${e.message}`, type: 'error' }
        }));
      }
    } else {
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { message: 'No file path specified. Add a comment like "// path: filename.ext" at the top of the code block.', type: 'error' }
      }));
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

  const Message = ({ message, onApplyCode, searchQuery }) => {
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
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: ({ src, alt }) => (
                          <div className="my-2">
                            <img 
                              src={src} 
                              alt={alt || 'Image'} 
                              className="max-w-full h-auto rounded border border-gray-300 dark:border-gray-600"
                              style={{ maxHeight: '300px' }}
                            />
                            {alt && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                {alt}
                              </p>
                            )}
                          </div>
                        )
                      }}
                    >
                      {searchQuery ? highlightText(seg.text, searchQuery) : seg.text}
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

  // Update handleSend to include image data
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

    // If this is the first message in a new conversation, create it
    if (messages.length === 0 && currentUser) {
      try {
        const newConv = await createConversation(currentUser.userId, 'New Chat', input);
        setConversations(prev => [
          {
            id: newConv._id,
            title: newConv.title,
            isActive: true,
            updatedAt: new Date(newConv.updatedAt)
          },
          ...prev.map(c => ({ ...c, isActive: false }))
        ]);
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }

    try {
      console.log('Calling aiComplete with prompt:', input);
      console.log('Input contains image references:', input.includes('!['));
      
      // Get image data for AI processing
      const imageData = await getImageDataForAI();
      console.log('Image data for AI:', imageData.length, 'images');
      
      // Build appropriate system prompt based on whether images are present
      let systemPrompt;
      if (imageData.length > 0) {
        systemPrompt = `You are a helpful AI assistant that can analyze images and provide detailed descriptions. When analyzing images:\n- Provide detailed descriptions of what you see in the image\n- Identify objects, people, text, colors, and overall composition\n- Describe the mood, setting, and context if applicable\n- Be specific and thorough in your analysis\n- If the image contains text, try to read and include it in your response\n- If asked about code or technical content in the image, provide helpful explanations\n- Respond in a conversational, helpful tone`;
      } else {
        systemPrompt = `You are an in-editor AI coding assistant. Goals:\n- Write high-quality code edits for the user's project.\n- Respond with concise, skimmable Markdown.\n- By default, output the FINAL FILE CONTENT in a single fenced code block with the correct language. Add the first line as a comment containing the relative file path, like: // path: src/file.ts (or # path: file.py).\n- Only return a unified diff (\`\`\`diff) if the user explicitly asks for a diff.\n- Provide a short summary below the code block if needed.\n- Prefer small, focused edits over large rewrites.\n- If unclear, ask one clarifying question.\n- Maintain cycles of correction and improvement if the user provides feedback.\n- NEVER fabricate files or APIs not present in the provided context.`;
      }

      // Include last messages for short-term memory, and (optionally) a few open files when integrated
      const recent = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

      console.log('Sending request to AI with:', {
        prompt: input,
        imageCount: imageData.length,
        systemPrompt: systemPrompt.substring(0, 100) + '...'
      });
      
      const response = await aiComplete(input, recent, [], systemPrompt, [], imageData);
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
        content: `Sorry, I encountered an error processing your request: ${error.message}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeUser();
    }
  }, [isOpen, isInitialized, initializeUser]);

  // Load uploaded images when component initializes
  useEffect(() => {
    if (isInitialized) {
      loadUploadedImages();
    }
  }, [isInitialized]);

  useEffect(() => {
    const saveCurrentConversation = async () => {
      const activeConv = conversations.find(c => c.isActive);
      if (!activeConv || !currentUser || messages.length === 0) return;
      
      console.log('Attempting to save conversation:', {
        id: activeConv.id,
        title: activeConv.title,
        messageCount: messages.length,
        userId: currentUser.userId
      });
      
      // Don't try to save fallback conversations or conversations that weren't created on the server
      if (activeConv.id.startsWith('fallback-') || !activeConv.id.match(/^[0-9a-fA-F]{24}$/) || !activeConv.isServerConversation) {
        console.log('Skipping save for fallback, invalid, or non-server conversation ID:', activeConv.id);
        return;
      }
      
      try {
        // Generate a title from the first user message if it's a new conversation
        let title = activeConv.title;
        if (activeConv.title === 'New Chat' && messages.length > 0) {
          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            title = firstUserMessage.content.substring(0, 30).trim();
            if (title.length > 5) {
              title = title.charAt(0).toUpperCase() + title.slice(1);
            } else {
              title = 'New Chat';
            }
          }
        }
        
        await updateConversation(
          activeConv.id,
          currentUser.userId,
          messages,
          title
        );
        
        // Update the conversation's title and updatedAt timestamp
        setConversations(prev => 
          prev.map(c => 
            c.id === activeConv.id 
              ? { ...c, title, updatedAt: new Date() } 
              : c
          )
        );
      } catch (error) {
        console.error('Error saving conversation:', error);
        // Don't show notification for save errors as they shouldn't block the chat
        // The conversation will still be saved locally in the UI
      }
    };
    
    // Only save if we have messages, a user is logged in, and a valid server conversation
    if (isInitialized && messages.length > 0 && currentUser) {
      const activeConv = conversations.find(c => c.isActive);
      if (activeConv && activeConv.isServerConversation) {
        // Debounce the save to avoid too many API calls
        const timeoutId = setTimeout(saveCurrentConversation, 1000);
        return () => clearTimeout(timeoutId);
      }
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
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {editingTitle === conversation.id ? (
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={() => handleSaveTitle(conversation.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveTitle(conversation.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="bg-transparent text-gray-300 focus:outline-none"
                        style={{ width: `${editTitleValue.length * 8 + 20}px` }}
                      />
                    ) : (
                      conversation.title
                    )}
                  </div>
                  <div className="text-xs text-[#858585] truncate">
                    {conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString() : 'Today'}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTitle(conversation);
                  }}
                  className="ml-2 text-[#858585] hover:text-[#e0e0e0] transition-colors opacity-0 group-hover:opacity-100"
                >
                  <FaRegEdit className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  className="ml-2 text-[#858585] hover:text-[#e0e0e0] transition-colors opacity-0 group-hover:opacity-100"
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
            <button 
              onClick={exportChatHistory}
              className="p-1 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] rounded"
              title="Export chat history"
            >
              <FaRegFileAlt className="w-4 h-4" />
            </button>
            <button 
              onClick={importChatHistory}
              className="p-1 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] rounded"
              title="Import chat history"
            >
              <FaRegClone className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`p-1 rounded ${showSearch ? 'text-[#0d6efd] bg-[#2d2d2d]' : 'text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2d2d2d]'}`}
              title="Search chat history"
            >
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

        {/* Conversation Stats */}
        {messages.length > 0 && (
          <div className="px-4 py-2 bg-[#1e1e1e] border-b border-[#2d2d2d] text-xs text-[#858585]">
            <div className="flex items-center justify-between">
              <span>{messages.length} messages</span>
              <span>
                Last active: {conversations.find(c => c.isActive)?.updatedAt 
                  ? new Date(conversations.find(c => c.isActive).updatedAt).toLocaleString() 
                  : 'Now'}
              </span>
            </div>
          </div>
        )}

        {/* Search Input */}
        {showSearch && (
          <div className="px-4 py-2 bg-[#1e1e1e] border-b border-[#2d2d2d]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-[#2d2d2d] text-[#e0e0e0] border border-[#3c3c3c] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0d6efd]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#858585] hover:text-[#e0e0e0]"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-xs text-[#858585]">
                Found {filteredMessages.length} messages
              </div>
            )}
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <FaSpinner className="animate-spin text-blue-500 text-2xl" />
            </div>
          ) : searchQuery && filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#858585]">
              <div className="text-center">
                <div className="text-lg mb-2">No messages found</div>
                <div className="text-sm">Try adjusting your search query</div>
              </div>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <Message key={message.id} message={message} searchQuery={searchQuery} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t border-[#2d2d2d] p-3 bg-[#252526]">
          {/* Image Upload Controls */}
          <div className="flex items-center space-x-3 mb-3">
            {/* Gallery Button with Mountain Icon */}
            <button
              type="button"
              onClick={() => setShowImageGallery(!showImageGallery)}
              className="flex items-center justify-center w-10 h-10 bg-[#3c3c3c] hover:bg-[#4d4d4d] text-[#858585] hover:text-[#e0e0e0] rounded-lg transition-colors"
              title="Image gallery"
            >
              <svg 
                className="w-5 h-5" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
                <circle cx="18" cy="6" r="2"/>
              </svg>
            </button>
            
            {/* Upload Button with Arrow in Circle */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center justify-center w-10 h-10 bg-[#3c3c3c] hover:bg-[#4d4d4d] text-[#858585] hover:text-[#e0e0e0] rounded-lg transition-colors disabled:opacity-50"
              title="Upload images"
            >
              {uploadingImage ? (
                <FaSpinner className="w-5 h-5 animate-spin" />
              ) : (
                <svg 
                  className="w-5 h-5" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6m0 0l-3-3m3 3l3-3"/>
                </svg>
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Image Gallery */}
          {showImageGallery && (
            <div className="mb-3 p-4 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-[#e0e0e0]">Uploaded Images</h4>
                <button
                  onClick={() => setShowImageGallery(false)}
                  className="text-[#858585] hover:text-[#e0e0e0] p-1 rounded"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
              {uploadedImages.length === 0 ? (
                <p className="text-xs text-[#858585] text-center py-4">No images uploaded yet</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {uploadedImages.map((image) => (
                    <div key={image.filename} className="relative group">
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="w-full h-16 object-cover rounded border border-[#3c3c3c] cursor-pointer hover:border-[#0d6efd] transition-colors"
                        onClick={() => insertImageReference(image.url, image.filename)}
                        title="Click to insert image reference"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">
                          Insert
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Image References Preview */}
          {(() => {
            const imageRefs = input.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
            if (imageRefs.length === 0) return null;
            
            return (
              <div className="mb-3 p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-medium text-[#e0e0e0]">Image References ({imageRefs.length})</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {imageRefs.map((ref, index) => {
                    const match = ref.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                    if (!match) return null;
                    const [, alt, url] = match;
                    return (
                      <div key={index} className="flex items-center space-x-2 bg-[#2d2d2d] rounded-lg px-3 py-2">
                        <img
                          src={url}
                          alt={alt || 'Image'}
                          className="w-6 h-6 object-cover rounded"
                        />
                        <span className="text-xs text-[#e0e0e0]">{alt || 'Image'}</span>
                        <button
                          onClick={() => removeImageReference(url)}
                          className="text-[#858585] hover:text-red-400 text-xs p-1 rounded"
                          title="Remove image reference"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
              placeholder="Type a message... (You can upload images for AI analysis)"
              className="w-full bg-[#2d2d2d] text-[#e0e0e0] border border-[#3c3c3c] rounded-lg p-4 pr-12 focus:outline-none focus:border-[#0d6efd] resize-none"
              rows={1}
              style={{ minHeight: '56px', maxHeight: '200px' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-3 bottom-3 p-2 text-[#858585] hover:text-[#e0e0e0] disabled:opacity-50 rounded-lg hover:bg-[#3c3c3c] transition-colors"
            >
              <FaPaperPlane className="w-5 h-5" />
            </button>
          </form>
          <div className="text-xs text-[#858585] mt-2 text-center">
            {loading ? 'AI is thinking...' : 'Press Enter to send, Shift+Enter for new line'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAIChatPanel;