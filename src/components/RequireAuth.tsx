import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, isTokenExpired } from "../state/auth";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem("access_token");

  // 1. If still fetching the initial 'me' request, show loading
  if (loading) {
    return <div className="loading-screen">Authenticating...</div>;
  }

  // 2. Proactive Expiry Check: If there's no user in state OR the token is expired
  if (!user || (token && isTokenExpired(token))) {
    // Redirect to login, but save the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
