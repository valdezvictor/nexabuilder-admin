import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

export const MetricsPage: React.FC = () => {
  const [summary, setSummary]   = useState<any>(null);
  const [enriching, setEnriching] = useState(false);
  const [msg, setMsg]           = useState("");
  const [outreach, setOutreach] = useState<any>(null);

  useEffect(() => {
    http.get("/admin/metrics/leads/summary").then(r=>setSummary(r.data)).catch(()=>{});
    http.get("/outreach/stats").then(r=>setOutreach(r.data)).catch(()=>{});
  }, []);

  const runEnrichment = async () => {
    setEnriching(true); setMsg("");
    try {
      const r = await http.post("/api/enrichment/run", {});
      setMsg(`✓ Enrichment complete: ${r.data.enriched||0} contractors updated.`);
    } catch(e:any) {
      setMsg("❌ " + (e?.response?.data?.detail||"Enrichment failed"));
    } finally { setEnriching(false); }
  };

  const s = summary || {};
  const o = outreach || {};

  return (
    <div>
      {/* Lead conversion stats */}
      <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
        letterSpacing:".6px", color:"var(--muted)", marginBottom:10 }}>
        Lead Conversion Pipeline
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(5,1fr)", marginBottom:20 }}>
        {[
          { label:"Total Leads",    value:s.total||0,                color:"var(--navy)"   },
          { label:"AI Assessed",    value:s.ai_assessed||0,          color:"var(--purple)" },
          { label:"Matched",        value:s.matched||0,              color:"var(--blue)"   },
          { label:"In Progress",    value:s.in_progress||0,          color:"var(--amber)"  },
          { label:"Completed",      value:s.completed||0,            color:"var(--green)"  },
        ].map((k,i)=>(
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color:k.color }}>{typeof k.value==="number"?k.value.toLocaleString():k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
        letterSpacing:".6px", color:"var(--muted)", marginBottom:10 }}>
        Contractor Outreach Funnel
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(6,1fr)", marginBottom:24 }}>
        {[
          { label:"SMS Sent",       value:o.sms_sent||0,         color:"var(--amber)"  },
          { label:"Emails Captured",value:o.emails_captured||0,  color:"var(--blue)"   },
          { label:"Invites Sent",   value:o.invites_sent||0,     color:"var(--purple)" },
          { label:"Portal Accounts",value:o.portal_accounts||0,  color:"var(--navy)"   },
          { label:"Bids Accepted",  value:o.bids_accepted||0,    color:"var(--green)"  },
          { label:"Conversion",     value:o.conversion_rate||"0%",color:"var(--gold)"  },
        ].map((k,i)=>(
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color:k.color, fontSize:"1.4rem" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Enrichment */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📧 Data Enrichment</div>
        </div>
        <div className="card-body">
          <p style={{ fontSize:13, color:"var(--muted)", marginBottom:16, lineHeight:1.6 }}>
            Run the email enrichment service to fill missing contractor email addresses
            from the CSLB database. This updates the <code>contractors.email</code> field
            and improves outreach targeting.
          </p>
          {msg && (
            <div style={{ padding:"10px 12px", marginBottom:12, borderRadius:8, fontSize:13,
              background:msg.startsWith("✓")?"#f0fdf4":"#fef2f2",
              border:`1px solid ${msg.startsWith("✓")?"#86efac":"#fecaca"}`,
              color:msg.startsWith("✓")?"var(--green)":"var(--red)" }}>
              {msg}
            </div>
          )}
          <div style={{ display:"flex", gap:12 }}>
            <button className="btn btn-primary" onClick={runEnrichment} disabled={enriching}>
              {enriching?"Running enrichment...":"Run Email Enrichment"}
            </button>
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      {s.status_breakdown && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Lead Status Breakdown</div>
          </div>
          <div className="card-body">
            {Object.entries(s.status_breakdown).map(([status, count]:any) => (
              <div key={status} className="score-row">
                <div style={{ textTransform:"capitalize" }}>{status.replace(/_/g," ")}</div>
                <div className="perf-bar-wrap" style={{ flex:1, margin:"0 20px" }}>
                  <div className="perf-bar">
                    <div className="perf-bar-fill"
                      style={{ width:`${((count/s.total||1)*100).toFixed(0)}%` }}/>
                  </div>
                </div>
                <div style={{ fontWeight:700, fontSize:13 }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
