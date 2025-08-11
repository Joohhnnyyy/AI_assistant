import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User, Conversation } from '../models/User.js';

const router = express.Router();

// Generate a meaningful title from the first user message
const generateTitle = (message) => {
  if (!message || message.length < 10) return 'New Chat';
  
  // Take first 30 characters and clean up
  let title = message.substring(0, 30).trim();
  
  // Remove common prefixes
  title = title.replace(/^(help|how|what|why|can|please|i need|i want|show me|explain|create|make|build|fix|debug|help me|how to|what is|why is|can you|please help|i need help|i want to|show me how|explain how|create a|make a|build a|fix the|debug the)/i, '');
  
  // Clean up and capitalize
  title = title.replace(/[^\w\s-]/g, '').trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // If title is too short, use a default
  if (title.length < 5) title = 'New Chat';
  
  return title;
};

// Get or create user
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    // Find or create user
    let user = await User.findOne({ username });
    
    if (!user) {
      // Create new user with a simple token (in production, use proper auth)
      const token = uuidv4();
      user = new User({
        username,
        token
      });
      await user.save();
      
      // Create a default conversation for the new user
      const defaultConversation = new Conversation({
        userId: user._id,
        title: 'New Chat',
        messages: [{
          role: 'ai',
          content: 'Hello! I\'m your AI coding assistant. How can I help you today?',
          isError: false
        }]
      });
      await defaultConversation.save();
    } else {
      // Update last active time
      user.lastActive = new Date();
      await user.save();
    }

    res.json({
      userId: user._id,
      token: user.token,
      username: user.username
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's conversations
router.get('/conversations', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .select('_id title updatedAt');
      
    res.json(conversations);
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific conversation
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const conversation = await Conversation.findOne({ _id: id, userId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
    
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { userId, title = 'New Chat', firstMessage } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Generate title from first message if provided
    const conversationTitle = firstMessage ? generateTitle(firstMessage) : title;
    
    const conversation = new Conversation({
      userId,
      title: conversationTitle,
      messages: [{
        role: 'ai',
        content: 'Hello! How can I assist you with your coding today?',
        isError: false
      }]
    });
    
    await conversation.save();
    
    res.status(201).json({
      _id: conversation._id,
      title: conversation.title,
      updatedAt: conversation.updatedAt
    });
    
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a conversation (add new messages)
router.put('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, messages, title } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const conversation = await Conversation.findOne({ _id: id, userId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Update messages (replace instead of append)
    if (Array.isArray(messages)) {
      conversation.messages = messages;
    }
    
    // Update title if provided
    if (title && title !== conversation.title) {
      conversation.title = title;
    }
    
    // Update timestamp
    conversation.updatedAt = new Date();
    
    await conversation.save();
    
    res.json({
      success: true,
      messageCount: conversation.messages.length,
      updatedAt: conversation.updatedAt
    });
    
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a conversation title
router.patch('/conversations/:id/title', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, title } = req.body;
    
    if (!userId || !title) {
      return res.status(400).json({ error: 'User ID and title are required' });
    }
    
    const conversation = await Conversation.findOne({ _id: id, userId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    conversation.title = title;
    conversation.updatedAt = new Date();
    await conversation.save();
    
    res.json({
      success: true,
      title: conversation.title,
      updatedAt: conversation.updatedAt
    });
    
  } catch (error) {
    console.error('Update title error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const result = await Conversation.deleteOne({ _id: id, userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
