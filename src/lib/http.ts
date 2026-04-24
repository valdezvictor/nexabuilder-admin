import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosRequestHeaders } from "axios";

// 1. Smarter URL detection for multi-tenant setup
const getBaseURL = () => {
  if (window.location.hostname === "localhost") {
    return "http://localhost:8001/api";
  }
  // This ensures call.nexabuilder.com talks to api.nexabuilder.com
  // and admin.nexabuilder.com also talks to api.nexabuilder.com
  return "https://api.nexabuilder.com/api";
};

export const http = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

// 2. Persistent Token Management
export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem("access_token", token);
  } else {
    localStorage.removeItem("access_token");
  }
}

// 3. Request Interceptor: Attach the token
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = (config.headers ?? {}) as AxiosRequestHeaders;
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// 4. Response Interceptor: ⭐ NEW: Auto-logout on 401 Unauthorized
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      // Only redirect if we aren't already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
