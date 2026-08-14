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
  timeout: 115000, // 115s — covers AI endpoints (Apply AI Suggestions, Auto-Fix, AI Review)
  withCredentials: false,
});

// 2. Persistent Token Management
export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem("access_token", token);
  } else {
    localStorage.removeItem("access_token");
  }
}

// 3. Request Interceptor: Attach the token + CMS admin key for /cms/ routes
const CMS_ADMIN_KEY = import.meta.env.VITE_CMS_ADMIN_KEY || "";

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  config.headers = (config.headers ?? {}) as AxiosRequestHeaders;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  // Inject CMS admin key for all admin API endpoints
  const adminRoutes = ["/cms/", "/seo/", "/content/", "/keywords/", "/meta/", "/media/", "/social/", "/gsc/", "/bing/", "/outreach/", "/admin/", "/ai/", "/blog/", "/seo-content/", "/materials/", "/attribution/", "/rank/", "/call-tracking/", "/financing/", "/crm/", "/routing/"];
  if (CMS_ADMIN_KEY && adminRoutes.some(r => config.url?.startsWith(r))) {
    config.headers["X-Admin-Key"] = CMS_ADMIN_KEY;
  }
  return config;
});

// 4. Response Interceptor: Auto-logout on 401 (but NOT during login)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("access_token");
      // Only redirect if we are not already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
