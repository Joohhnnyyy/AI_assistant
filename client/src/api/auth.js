// API utility for authentication and user-related operations

const API_BASE_URL = ''; // Same origin

// Get current user from localStorage or create a new one
const getCurrentUser = async () => {
  // Check if we have a user in localStorage
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      // Validate that the user has required fields
      if (user && user.userId) {
        return user;
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
      localStorage.removeItem('currentUser');
    }
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
    // Return a fallback user object if server is not available
    const fallbackUser = {
      userId: `fallback-${Date.now()}`,
      username: `user-${Math.random().toString(36).substr(2, 8)}`,
      token: `token-${Math.random().toString(36).substr(2, 8)}`
    };
    localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
    return fallbackUser;
  }
};

// Get user conversations
const getUserConversations = async (userId) => {
  try {
    // If userId is undefined, return empty array instead of making a request
    if (!userId) {
      console.warn('No userId provided, returning empty conversations array');
      return [];
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching conversations:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

// Get a specific conversation
const getConversation = async (conversationId, userId) => {
  try {
    if (!userId) {
      throw new Error('No userId provided');
    }
    
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
const createConversation = async (userId, title = 'New Chat', firstMessage = null) => {
  try {
    if (!userId) {
      throw new Error('No userId provided');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, firstMessage })
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
const updateConversation = async (conversationId, userId, messages, title = null) => {
  try {
    if (!userId) {
      throw new Error('No userId provided');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations/${conversationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date(),
          isError: msg.isError || false
        })),
        title
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to update conversation: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
};

// Update conversation title
const updateConversationTitle = async (conversationId, userId, title) => {
  try {
    if (!userId) {
      throw new Error('No userId provided');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/conversations/${conversationId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update conversation title');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating conversation title:', error);
    throw error;
  }
};

// Delete a conversation
const deleteConversation = async (conversationId, userId) => {
  try {
    if (!userId) {
      throw new Error('No userId provided');
    }
    
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
  updateConversationTitle,
  deleteConversation
};
