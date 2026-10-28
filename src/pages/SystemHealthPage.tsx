import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

export function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    http.get("/admin/metrics/system/health")
      .then(r => setHealth(r.data))
      .catch(() => setHealth({ status:"error", database:"unreachable" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner"></div></div>;
  if (!health)  return <div className="empty-state">Could not load health data</div>;

  const ok = health.status === "healthy";

  return (
    <div>
      {/* Overall status banner */}
      <div style={{
        display:"flex", alignItems:"center", gap:12, padding:"16px 20px",
        background: ok ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${ok ? "#86efac" : "#fca5a5"}`,
        borderRadius:12, marginBottom:24
      }}>
        <div style={{ width:14, height:14, borderRadius:"50%",
          background: ok ? "var(--green)" : "var(--red)",
          boxShadow: `0 0 0 4px ${ok ? "#d1fae5" : "#fecaca"}` }} />
        <div>
          <div style={{ fontWeight:900, fontSize:16,
            color: ok ? "var(--green)" : "var(--red)" }}>
            {ok ? "All Systems Operational" : "System Degraded"}
          </div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
            Database: {health.database} · Latency: {health.db_latency_ms}ms
          </div>
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginLeft:"auto" }} onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {/* Service grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
        {Object.entries(health.services || {}).map(([name, svc]:any) => {
          const isOk = svc.status === "operational" || svc.status === "connected";
          const isPending = svc.status === "pending_setup";
          return (
            <div key={name} className="card" style={{ marginBottom:0 }}>
              <div className="card-body" style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:40, height:40, borderRadius:"50%", flexShrink:0,
                  background: isOk ? "#f0fdf4" : isPending ? "#fffbeb" : "#fef2f2",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18
                }}>
                  {isOk ? "✅" : isPending ? "⏳" : "❌"}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"var(--navy)",
                    textTransform:"capitalize" }}>
                    {name.replace(/_/g," ")}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color: isOk ? "var(--green)" : isPending ? "var(--amber)" : "var(--red)" }}>
                    {svc.status}
                    {svc.latency_ms ? ` · ${svc.latency_ms}ms` : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw metrics */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📊 Runtime Metrics</div>
        </div>
        <div className="card-body">
          <table className="data-table">
            <tbody>
              {[
                ["API Server",     "Operational",               "var(--green)"],
                ["DB Latency",     `${health.db_latency_ms}ms`, health.db_latency_ms < 50 ? "var(--green)" : "var(--amber)"],
                ["Queue Depth",    health.queue_depth ?? 0,     "var(--navy)"],
                ["Worker Status",  health.worker_status || "active", "var(--green)"],
                ["Error Rate",     `${health.error_rate ?? 0}%`, "var(--green)"],
              ].map(([label, value, color]) => (
                <tr key={label as string}>
                  <td style={{ fontWeight:700, width:"40%" }}>{label}</td>
                  <td style={{ color: color as string, fontWeight:700 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
