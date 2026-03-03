'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

const _RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_URL = _RAW_API_URL.startsWith('https://') ? _RAW_API_URL.replace(/^https:/, 'https:') : _RAW_API_URL;
  
interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser === 'object') {
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (error) {
        console.warn('Failed to parse stored user data:', error);
      }
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const textResponse = await response.text();
          errorData = { detail: textResponse || `HTTP error ${response.status}` };
        }

        if (response.status === 401) {
          throw new Error(errorData.detail || "Invalid email or password");
        }

        throw new Error(errorData.detail || 'Login failed');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format received from server');
      }

      const data = await response.json();
      const { access_token } = data;

      let userObj;
      if (data.user) {
        userObj = data.user;
      } else {
        userObj = {
          id: data.user_id,
          email: data.email
        };
      }

      localStorage.setItem('token', access_token);
      if (userObj && userObj.id) {
        localStorage.setItem('user_id', userObj.id.toString());
        localStorage.setItem('user', JSON.stringify(userObj));

        setToken(access_token);
        setUser(userObj);
        router.push('/dashboard');
      } else {
        console.error("Invalid user data received:", data);
        throw new Error("Invalid user data received from server");
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const textResponse = await response.text();
          errorData = { detail: textResponse || `HTTP error ${response.status}` };
        }
        throw new Error(errorData.detail || 'Registration failed');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format received from server');
      }

      const data = await response.json();
      const { access_token, user } = data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user_id', user.id.toString());
      localStorage.setItem('user', JSON.stringify(user));

      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    setToken(null);
    setUser(null);
    router.push('/signin');
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
