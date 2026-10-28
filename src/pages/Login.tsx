import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { http, setAccessToken } from "../lib/http";

export const LoginPage: React.FC = () => {
  const [email, setEmail]     = useState("valdez.victor@gmail.com");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const navigate              = useNavigate();
  const [params]              = useSearchParams();

  // Handle magic link token from email
  useEffect(() => {
    const token = params.get("token");
    if (!token) return;
    setLoading(true);
    http.get(`/auth/magic-link/verify?token=${encodeURIComponent(token)}`)
      .then((r: any) => {
        const data = r.data;
        if (data.access_token) {
          setAccessToken(data.access_token);
          navigate("/dashboard", { replace: true });
        } else {
          setError("Invalid or expired link. Request a new one.");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Link expired. Request a new one.");
        setLoading(false);
      });
  }, []);

  const handleSend = async () => {
    if (!email.includes("@")) { setError("Enter a valid email."); return; }
    setLoading(true); setError("");
    try {
      await http.post("/auth/magic-link", { email });
      setSent(true);
    } catch { setError("Could not send link. Try again."); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Nexa<span>Builder</span></div>
        <div className="loading-wrap"><div className="spinner"></div></div>
      </div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Nexa<span>Builder</span></div>
        <div className="auth-sub">Admin Console</div>

        {error && (
          <div style={{ padding: "10px 12px", background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: 8, fontSize: 13,
            color: "var(--red)", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!sent ? (
          <>
            <div className="field">
              <label>Admin email</label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="admin@nexabuilder.com" />
            </div>
            <button className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleSend} disabled={loading}>
              {loading ? "Sending..." : "Send Sign-In Link →"}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Check your inbox</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              Sign-in link sent to <strong>{email}</strong>.
              Click the link in the email to access the admin console.
            </div>
            <button className="btn btn-outline"
              style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
              onClick={() => { setSent(false); setError(""); }}>
              Use a different email
            </button>
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 16,
          borderTop: "1px solid var(--border)",
          fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
          Access restricted to NexaBuilder admin accounts only
        </div>
      </div>
    </div>
  );
};
