import { UserProfile, ValidationReport } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const getHeaders = () => {
  const token = localStorage.getItem('Greenli8_token');
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
    
    if (!res.ok) {
        let errorMessage = 'Signup failed';
        try {
            const err = await res.json();
            errorMessage = err.error || errorMessage;
        } catch (e) {
            const text = await res.text();
            errorMessage = text.slice(0, 100) || res.statusText;
        }
        throw new Error(errorMessage);
    }
    
    const data = await res.json();
    localStorage.setItem('Greenli8_token', data.token);
    return data.user;
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        let errorMessage = 'Login failed';
        try {
            const err = await res.json();
            errorMessage = err.error || errorMessage;
        } catch (e) {
            const text = await res.text();
            errorMessage = text.slice(0, 100) || res.statusText;
        }
        throw new Error(errorMessage);
    }

    const data = await res.json();
    localStorage.setItem('Greenli8_token', data.token);
    return data.user;
  },

  googleLogin: async (token: string): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
        let errorMessage = 'Google Login failed';
        try {
            const err = await res.json();
            errorMessage = err.error || errorMessage;
        } catch (e) {
            const text = await res.text();
            errorMessage = text.slice(0, 100) || res.statusText;
        }
        throw new Error(errorMessage);
    }

    const data = await res.json();
    localStorage.setItem('Greenli8_token', data.token);
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
  analyzeIdea: async (idea: string, attachment?: { mimeType: string, data: string }): Promise<ValidationReport> => {
    const res = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ idea, attachment }),
    });
    if (!res.ok) {
        let errorMessage = 'Analysis failed';
        try {
            const err = await res.json();
            errorMessage = err.error || errorMessage;
        } catch (e) {
            // Fallback for non-JSON errors
            const text = await res.text();
            errorMessage = text.slice(0, 100) || res.statusText;
        }
        throw new Error(errorMessage);
    }
    return res.json();
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
    if (!res.ok) {
        let errorMessage = 'Failed to fetch history';
        try {
            const err = await res.json();
            errorMessage = err.error || errorMessage;
        } catch (e) {
            const text = await res.text();
            errorMessage = text.slice(0, 100) || res.statusText;
        }
        throw new Error(errorMessage);
    }
    return res.json();
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
