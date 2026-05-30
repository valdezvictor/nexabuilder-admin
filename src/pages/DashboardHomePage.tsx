import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

type Metrics = {
  leads:       { total: number; today: number; this_week: number; ai_assessed: number; internal_routed: number };
  routing:     { rate: number; total: number };
  partners:    { count: number };
  contractors: { total: number; active: number; enriched: number };
  health:      { status: string; database: string };
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get("/admin/metrics")
      .then(r => setMetrics(r.data))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-wrap"><div className="spinner"></div>Loading dashboard...</div>
  );

  const l = metrics?.leads       || { total:0, today:0, this_week:0, ai_assessed:0, internal_routed:0 };
  const r = metrics?.routing     || { rate:0, total:0 };
  const p = metrics?.partners    || { count:0 };
  const c = metrics?.contractors || { total:0, active:0, enriched:0 };
  const h = metrics?.health      || { status:"unknown", database:"unknown" };

  const healthy = h.status === "healthy";

  return (
    <div>
      {/* System status banner */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom: 24, flexWrap:"wrap", gap:12
      }}>
        <div>
          <h1 style={{ fontSize:"1.4rem", fontWeight:900, color:"var(--navy)", margin:0 }}>
            Platform Overview
          </h1>
          <p style={{ color:"var(--muted)", margin:"4px 0 0", fontSize:13 }}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
          </p>
        </div>
        <div style={{
          display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
          background: healthy ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${healthy ? "#86efac" : "#fca5a5"}`,
          borderRadius:10, fontSize:13, fontWeight:700,
          color: healthy ? "var(--green)" : "var(--red)"
        }}>
          <div style={{ width:8, height:8, borderRadius:"50%",
            background: healthy ? "var(--green)" : "var(--red)" }} />
          {healthy ? "All Systems Operational" : `Degraded — DB: ${h.database}`}
        </div>
      </div>

      {/* Lead KPIs */}
      <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
        letterSpacing:".6px", color:"var(--muted)", marginBottom:10 }}>
        Lead Intelligence
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(5,1fr)" }}>
        {[
          { label:"Total Leads",     value:l.total?.toLocaleString()||"—",      sub:"All time",                       color:"var(--navy)"   },
          { label:"Today",           value:l.today?.toLocaleString()||"—",       sub:"Since midnight",                 color:"var(--blue)"   },
          { label:"This Week",       value:l.this_week?.toLocaleString()||"—",   sub:"Last 7 days",                    color:"var(--blue)"   },
          { label:"AI Assessed",     value:l.ai_assessed?.toLocaleString()||"—", sub: l.total ? `${Math.round(l.ai_assessed/l.total*100)}% of total` : "", color:"var(--purple)" },
          { label:"Matched",         value:l.internal_routed?.toLocaleString()||"—", sub:"With contractors",          color:"var(--green)"  },
        ].map((k,i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Platform KPIs */}
      <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
        letterSpacing:".6px", color:"var(--muted)", margin:"20px 0 10px" }}>
        Platform
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)" }}>
        {[
          { label:"Routing Success",   value:`${r.rate||0}%`,                         sub:`${r.total||0} processed`,                   color:"var(--blue)"   },
          { label:"Active Partners",   value:p.count?.toLocaleString()||"—",           sub:"Notary, loan, insurance",                    color:"var(--navy)"   },
          { label:"CSLB Contractors",  value:c.total?.toLocaleString()||"—",           sub:"California licensed",                        color:"var(--navy)"   },
          { label:"Active (CLEAR)",    value:c.active?.toLocaleString()||"—",          sub: c.total ? `${Math.round(c.active/c.total*100)}% of DB` : "", color:"var(--green)"  },
        ].map((k,i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Two column — quick actions + recent activity */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginTop:24 }}>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Quick Actions</div>
          </div>
          <div className="card-body" style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <a href="/leads"          className="btn btn-outline" style={{ justifyContent:"space-between" }}>
              <span>📋 View All Leads</span><span>→</span>
            </a>
            <a href="/contractors"    className="btn btn-outline" style={{ justifyContent:"space-between" }}>
              <span>👷 Manage Contractors</span><span>→</span>
            </a>
            <a href="/outreach"       className="btn btn-outline" style={{ justifyContent:"space-between" }}>
              <span>📡 Outreach Queue</span><span>→</span>
            </a>
            <a href="/bids"           className="btn btn-outline" style={{ justifyContent:"space-between" }}>
              <span>📥 Bid Management</span><span>→</span>
            </a>
            <a href="/routing-cockpit" className="btn btn-primary" style={{ justifyContent:"space-between" }}>
              <span>🎯 Routing Cockpit</span><span>→</span>
            </a>
          </div>
        </div>

        {/* System health detail */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">💚 System Health</div>
            <span className={`badge ${healthy ? "badge-green" : "badge-red"}`}>
              {h.status}
            </span>
          </div>
          <div className="card-body">
            {[
              { label:"API Server",     value:"Operational",   ok:true  },
              { label:"Database",       value:h.database,      ok:h.database==="connected" },
              { label:"AI Assessment",  value:"Online",        ok:true  },
              { label:"Email / SES",    value:"Online",        ok:true  },
              { label:"SMS / SNS",      value:"Online",        ok:true  },
              { label:"Escrow API",     value:"Pending setup", ok:false },
            ].map((row,i) => (
              <div key={i} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 0",
                borderBottom: i < 5 ? "1px solid var(--border)" : "none",
                fontSize:13
              }}>
                <span style={{ color:"var(--text)" }}>{row.label}</span>
                <span style={{ fontWeight:700, color: row.ok ? "var(--green)" : "var(--amber)" }}>
                  {row.ok ? "✓ " : "⚠ "}{row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portal links */}
      <div className="card" style={{ marginTop:4 }}>
        <div className="card-header">
          <div className="card-title">🌐 Portal Links</div>
        </div>
        <div className="card-body" style={{
          display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12
        }}>
          {[
            { label:"Member Portal",     url:"https://member.nexabuilder.com",     icon:"🏠", color:"var(--blue)"   },
            { label:"Contractor Portal", url:"https://contractor.nexabuilder.com", icon:"👷", color:"var(--green)"  },
            { label:"Call Center",       url:"https://call.nexabuilder.com",       icon:"📞", color:"var(--purple)" },
            { label:"Main Site",         url:"https://nexabuilder.com",            icon:"🌐", color:"var(--navy)"   },
          ].map((p,i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ flexDirection:"column", gap:6, padding:"16px 12px",
                textAlign:"center", justifyContent:"center", height:"auto" }}>
              <span style={{ fontSize:24 }}>{p.icon}</span>
              <span style={{ fontSize:12, color:"var(--muted)" }}>{p.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export { Dashboard as DashboardHomePage };
