import { UserProfile, ValidationReport } from "../types";

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
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
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/**
 * Core request helper with global error handling
 */
const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Not JSON
  }

  if (!response.ok) {
    // Global 401/403 Handling
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('Greenli8_token');
      // We don't trigger a hard redirect here to allow the AuthContext 
      // to handle the state change gracefully via its refreshUser loop or effect
    }
    const error = data?.error || text.slice(0, 100) || response.statusText;
    throw new Error(error);
  }

  return data;
};

export const api = {
  // --- Auth & User ---
  signup: async (email: string, password: string, name?: string): Promise<UserProfile> => {
    const data = await request<{ user: UserProfile; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (data.token) localStorage.setItem('Greenli8_token', data.token);
    return data.user;
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    const data = await request<{ user: UserProfile; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) localStorage.setItem('Greenli8_token', data.token);
    return data.user;
  },

  googleLogin: async (token: string): Promise<UserProfile> => {
    const data = await request<{ user: UserProfile; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    if (data.token) localStorage.setItem('Greenli8_token', data.token);
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('Greenli8_token');
  },

  getCurrentUser: async (): Promise<UserProfile> => {
    return request<UserProfile>('/users/me');
  },

  // --- AI ---
  analyzeIdea: async (idea: string, attachment?: { mimeType: string, data: string }, preferredModel?: string): Promise<ValidationReport> => {
    if (!idea.trim() && !attachment) {
      throw new Error("Please provide an idea or an attachment.");
    }

    const customModels = JSON.parse(localStorage.getItem('greenli8_custom_models') || '[]');
    let customApiKeys: any = undefined;
    
    if (customModels.length > 0) {
      customApiKeys = {};
      customModels.forEach((m: any) => {
        if (m.provider === 'gemini') customApiKeys.gemini = m.apiKey;
      });
    }

    return request<ValidationReport>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ 
        idea: idea.trim() || "Idea from attachment", 
        attachment,
        preferredModel,
        customApiKeys 
      }),
    });
  },

  chat: async (message: string, context: any): Promise<string> => {
    const data = await request<{ text: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message, context }),
    });
    return data.text;
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    return request<UserProfile>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAccount: async (): Promise<void> => {
    await request('/users/me', { method: 'DELETE' });
    localStorage.removeItem('Greenli8_token');
  },

  // --- Reports ---
  getHistory: async (): Promise<ValidationReport[]> => {
     const data = await request<ValidationReport[]>('/reports');
     return data || [];
   },

  // --- Marketing ---
  joinWaitlist: async (email: string, source: string = 'landing'): Promise<{ success: boolean }> => {
    return request('/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email, source }),
    });
  },

  verifyPayment: async (sessionId: string) => {
      // Specialized handling because it returns the raw response in current code
      // although changing it to return the JSON data would be better.
      // To maintain compatibility with App.tsx verifyBackendPayment:
      const res = await fetch(`${API_URL}/verify-payment?session_id=${sessionId}`, {
          headers: getHeaders()
      });
      if (!res.ok) {
          const text = await res.text();
          throw new Error(text.slice(0, 100) || res.statusText);
      }
      return res;
  },
};
