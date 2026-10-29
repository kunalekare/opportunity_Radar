import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Profile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const token = api.getToken();
      if (token) {
        const currentUser = await api.getMe();
        setUser(currentUser);
        if (currentUser.has_profile) {
          const userProfile = await api.getProfile().catch(() => null);
          setProfile(userProfile);
        }
      }
    } catch (err) {
      console.warn('Initial session restore error:', err);
      api.setToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(email, pass);
      api.setToken(result.token.access_token);
      setUser(result.user);
      if (result.user.has_profile) {
        const userProfile = await api.getProfile().catch(() => null);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const result = await api.register(email, pass);
      api.setToken(result.token.access_token);
      setUser(result.user);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    try {
      const prof = await api.getProfile();
      setProfile(prof);
      if (user) {
        setUser({ ...user, has_profile: true });
      }
    } catch (e) {
      console.warn('Could not refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
