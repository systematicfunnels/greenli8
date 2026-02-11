import { UserProfile, ValidationReport } from "../types";

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    // If we're on Vercel, we can use a relative path or the current origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    return 'https://greenli8.vercel.app/api';
  }
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

const getHeaders = () => {
  const token = localStorage.getItem('Greenli8_token');
  if (!token) {
    console.warn("Attempting protected request without token");
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // --- Auth & User ---
  signup: async (email: string, password: string, name?: string): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON
    }

    if (!res.ok) {
      throw new Error(data?.error || text.slice(0, 100) || res.statusText);
    }
    
    if (data.token) {
      localStorage.setItem('Greenli8_token', data.token);
      // Wait for localStorage to persist
      if (localStorage.getItem('Greenli8_token') !== data.token) {
        console.warn("Token persistence delayed");
      }
    }
    return data.user;
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON
    }

    if (!res.ok) {
      throw new Error(data?.error || text.slice(0, 100) || res.statusText);
    }

    if (data.token) {
      localStorage.setItem('Greenli8_token', data.token);
      // Wait for localStorage to persist
      if (localStorage.getItem('Greenli8_token') !== data.token) {
        console.warn("Token persistence delayed");
      }
    }
    return data.user;
  },

  googleLogin: async (token: string): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON
    }

    if (!res.ok) {
      throw new Error(data?.error || text.slice(0, 100) || res.statusText);
    }

    if (!data || !data.token) {
      throw new Error("Invalid response from server");
    }

    localStorage.setItem('Greenli8_token', data.token);
    // Wait for localStorage to persist
    if (localStorage.getItem('Greenli8_token') !== data.token) {
      console.warn("Token persistence delayed");
    }
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('Greenli8_token');
  },

  getCurrentUser: async (): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  // --- AI ---
  analyzeIdea: async (idea: string, attachment?: { mimeType: string, data: string }, preferredModel?: string): Promise<ValidationReport> => {
    // Ensure idea is at least a minimum length or attachment exists
    if (!idea.trim() && !attachment) {
      throw new Error("Please provide an idea or an attachment.");
    }

    // Check for custom keys in localStorage
    const customModels = JSON.parse(localStorage.getItem('greenli8_custom_models') || '[]');
    let customApiKeys: any = undefined;
    
    if (customModels.length > 0) {
      customApiKeys = {};
      customModels.forEach((m: any) => {
        if (m.provider === 'gemini') customApiKeys.gemini = m.apiKey;
      });
    }

    const res = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        idea: idea.trim() || "Idea from attachment", 
        attachment,
        preferredModel, // Pass preferred model to backend
        customApiKeys // Pass custom keys to backend
      }),
    });
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON
    }

    if (!res.ok) {
      throw new Error(data?.error || text.slice(0, 100) || res.statusText);
    }
    
    return data;
  },

  chat: async (message: string, context: any): Promise<string> => {
    const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, context }),
    });
    if (!res.ok) throw new Error('Chat failed');
    const data = await res.json();
    return data.text;
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Update failed');
    return res.json();
  },

  deleteAccount: async (): Promise<void> => {
    const res = await fetch(`${API_URL}/users/me`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Deletion failed');
    localStorage.removeItem('Greenli8_token');
  },

  // --- Reports ---
  getHistory: async (): Promise<ValidationReport[]> => {
     const res = await fetch(`${API_URL}/reports`, {
       headers: getHeaders(),
     });
     
     const text = await res.text();
     let data;
     try {
       data = JSON.parse(text);
     } catch (e) {
       // Not JSON
     }

     if (!res.ok) {
       throw new Error(data?.error || text.slice(0, 100) || res.statusText);
     }
     
     return data || [];
   },

  // --- Marketing ---
  joinWaitlist: async (email: string, source: string = 'landing'): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
    });
    if (!res.ok) throw new Error('Failed to join waitlist');
    return res.json();
  },

  verifyPayment: async (sessionId: string) => {
      const res = await fetch(`${API_URL}/verify-payment?session_id=${sessionId}`);
      if (!res.ok) {
          let errorMessage = 'Payment verification failed';
          try {
              const err = await res.json();
              errorMessage = err.error || errorMessage;
          } catch (e) {
              const text = await res.text();
              errorMessage = text.slice(0, 100) || res.statusText;
          }
          throw new Error(errorMessage);
      }
      return res;
  }
};
