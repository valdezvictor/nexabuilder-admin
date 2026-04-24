import React, { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, fetchMe } from "../api/auth";
import { setAccessToken } from "../lib/http";

type User = {
  id: string;
  email: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    domain: string;
    type: string;
  };
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

// ⭐ NEW: Decode JWT and check expiry
export function isTokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // payload.exp is in seconds, Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // If decoding fails, treat as expired
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // hydrate from localStorage on first load
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    // ⭐ NEW: Immediate expiry check on load
    if (!token || isTokenExpired(token)) {
      setAccessToken(null);
      setLoading(false);
      return;
    }

    setAccessToken(token);
    fetchMe()
      .then((me) => setUser(me))
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { access_token } = await apiLogin(email, password);
      setAccessToken(access_token);
      const me = await fetchMe();
      setUser(me);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
