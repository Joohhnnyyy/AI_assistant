// API utility for authentication and user-related operations

const API_BASE_URL = ''; // Same origin

// Get current user from localStorage or create a new one
const getCurrentUser = async () => {
  // Check if we have a user in localStorage
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  
  // Create a new anonymous user
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `user-${Math.random().toString(36).substr(2, 8)}` })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    
    const user = await response.json();
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Get user conversations
const getUserConversations = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// Get a specific conversation
const getConversation = async (conversationId, userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations/${conversationId}?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
};

// Create a new conversation
const createConversation = async (userId, title = 'New Chat') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// Update a conversation with new messages
const updateConversation = async (conversationId, userId, messages) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations/${conversationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          isError: msg.isError || false
        }))
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update conversation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
};

// Delete a conversation
const deleteConversation = async (conversationId, userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations/${conversationId}?userId=${userId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

export {
  getCurrentUser,
  getUserConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation
};
