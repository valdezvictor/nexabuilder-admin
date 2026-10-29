import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { http, setAccessToken } from "../lib/http";

export const VerifyPage: React.FC = () => {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setError("No token in link."); return; }
    http.get(`/auth/magic-link/verify?token=${encodeURIComponent(token)}`)
      .then((r: any) => {
        if (r.data.access_token) {
          setAccessToken(r.data.access_token);
          // Restore intended destination saved before login, default to /dashboard
          const redirect = sessionStorage.getItem("post_login_redirect") || "/dashboard";
          sessionStorage.removeItem("post_login_redirect");
          navigate(redirect, { replace: true });
        } else setError(r.data.detail || "Invalid link.");
      })
      .catch(() => setError("Could not verify. Try again."));
  }, []);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Nexa<span>Builder</span></div>
        {error ? (
          <>
            <div style={{ textAlign: "center", fontSize: 36, margin: "16px 0" }}>⚠️</div>
            <div style={{ fontSize: 13, color: "var(--red)", textAlign: "center",
              marginBottom: 16 }}>{error}</div>
            <button className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => navigate("/login")}>
              Request new link
            </button>
          </>
        ) : (
          <div className="loading-wrap">
            <div className="spinner"></div>
            <span>Signing you in...</span>
          </div>
        )}
      </div>
    </div>
  );
};
