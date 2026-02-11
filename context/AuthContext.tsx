import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  credits: number;
  isLifetime: boolean;
  isLoading: boolean;
  login: (userData: UserProfile) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('Greenli8_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [credits, setCredits] = useState<number>(user?.credits || 20);
  const [isLifetime, setIsLifetime] = useState<boolean>(user?.isPro || false);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setCredits(20);
    setIsLifetime(false);
    api.logout();
    localStorage.removeItem('Greenli8_user');
    localStorage.removeItem('Greenli8_history');
    localStorage.removeItem('Greenli8_credits');
    localStorage.removeItem('Greenli8_lifetime');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('Greenli8_token')) return;
    try {
      const dbUser = await api.getCurrentUser();
      setUser(dbUser);
      setCredits(dbUser.credits);
      setIsLifetime(dbUser.isPro);
      localStorage.setItem('Greenli8_user', JSON.stringify(dbUser));
    } catch (e: any) {
      if (e.message?.includes('401') || e.message?.includes('403')) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const hasToken = !!localStorage.getItem('Greenli8_token');
    
    if (hasToken) {
      // Refresh user data from backend on mount
      refreshUser();
    } else {
      // Guest initialization
      const savedCredits = localStorage.getItem('Greenli8_credits');
      if (savedCredits) setCredits(parseInt(savedCredits));
      
      const savedLifetime = localStorage.getItem('Greenli8_lifetime');
      if (savedLifetime === 'true') setIsLifetime(true);
      
      setIsLoading(false);
    }
    // We only want to run this initialization once on mount.
    // Login/Logout are handled by their respective functions.
  }, []); 

  const login = async (userData: UserProfile) => {
    setUser(userData);
    setCredits(userData.credits);
    setIsLifetime(userData.isPro);
    localStorage.setItem('Greenli8_user', JSON.stringify(userData));
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const oldUser = user;
    
    // Optimistic update
    setUser((prev: UserProfile | null) => prev ? { ...prev, ...data } : null);
    if (data.credits !== undefined) setCredits(data.credits);
    if (data.isPro !== undefined) setIsLifetime(data.isPro);

    try {
      await api.updateProfile(data);
    } catch (e) {
      setUser(oldUser);
      setCredits(oldUser.credits);
      setIsLifetime(oldUser.isPro);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      credits, 
      isLifetime, 
      isLoading,
      login, 
      logout, 
      updateProfile,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
