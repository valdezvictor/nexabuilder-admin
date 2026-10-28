import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

export const EscrowPage: React.FC = () => {
  const [data, setData]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder — full implementation coming
    setLoading(false);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--navy)" }}>🏦 Escrow & Payments</h1>
        <span className="badge badge-blue">Coming Soon</span>
      </div>
      <div className="card">
        <div className="card-body" style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
          <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>
            Project milestones and escrow transactions
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
            This view is being built. The backend endpoints and data models are already in place.
          </p>
        </div>
      </div>
    </div>
  );
};
