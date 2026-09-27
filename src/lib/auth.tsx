"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, getToken, setToken, clearToken, login as apiLogin, register as apiRegister, type User } from "./api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await apiLogin(email, password);
    setToken(token);
    setUser(user);
  }

  async function register(email: string, password: string, name?: string) {
    const { token, user } = await apiRegister(email, password, name);
    setToken(token);
    setUser(user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
