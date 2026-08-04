import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

type RoutingConfig = {
  weights: {
    classification_match: number; proximity: number;
    performance_score: number; license_age: number;
    availability: number;
  };
  thresholds: {
    min_score: number; max_distance_miles: number;
    max_bids_active: number;
  };
};

const DEFAULT: RoutingConfig = {
  weights: { classification_match:0.4, proximity:0.25, performance_score:0.2, license_age:0.1, availability:0.05 },
  thresholds: { min_score:0.3, max_distance_miles:50, max_bids_active:5 },
};

export const RoutingEnginePage: React.FC = () => {
  const [config, setConfig]   = useState<RoutingConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [testLeadId, setTestLeadId] = useState("");

  useEffect(() => {
    http.get("/routing/config")
      .then(r => setConfig(r.data))
      .catch(() => setConfig(DEFAULT))
      .finally(() => setLoading(false));
  }, []);

  const saveConfig = async () => {
    setSaving(true); setMsg("");
    try {
      await http.post("/routing/config", config);
      setMsg("✓ Routing configuration saved.");
    } catch(e:any) {
      setMsg("❌ " + (e?.response?.data?.detail||"Error saving config"));
    } finally { setSaving(false); }
  };

  const runPreview = async () => {
    if (!testLeadId) { setMsg("Enter a lead ID to preview"); return; }
    try {
      const r = await http.get(`/contractors/match/${testLeadId}`);
      setPreview(r.data);
    } catch(e:any) {
      setMsg("❌ " + (e?.response?.data?.detail||"Preview failed"));
    }
  };

  const totalWeight = Object.values(config.weights).reduce((a,b)=>a+b,0);

  const WeightSlider = ({ key: k, label }: { key: string; label: string }) => {
    const val = (config.weights as any)[k] || 0;
    return (
      <div className="weight-row">
        <div className="weight-label">{label}</div>
        <input type="range" min={0} max={1} step={0.05}
          value={val}
          onChange={e => setConfig(prev => ({
            ...prev,
            weights: { ...prev.weights, [k]: parseFloat(e.target.value) }
          }))} />
        <div className="weight-value">{(val*100).toFixed(0)}%</div>
        <div style={{ width:6, height:6, borderRadius:"50%",
          background: Math.abs(totalWeight-1) < 0.01 ? "var(--green)" : "var(--amber)" }} />
      </div>
    );
  };

  if (loading) return <div className="loading-wrap"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Weight Controls */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚖️ Scoring Weights</div>
            <span style={{ fontSize:12, color: Math.abs(totalWeight-1)<0.01 ? "var(--green)" : "var(--amber)",
              fontWeight:700 }}>
              {Math.abs(totalWeight-1)<0.01 ? "✓ Balanced" : `Sum: ${(totalWeight*100).toFixed(0)}%`}
            </span>
          </div>
          <div className="card-body">
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:16, lineHeight:1.6 }}>
              Weights determine how contractors are ranked for each lead. 
              All weights should sum to 100%.
            </p>
            {[
              ["classification_match", "License Classification Match"],
              ["proximity",            "Geographic Proximity"],
              ["performance_score",    "Performance History"],
              ["license_age",          "License Tenure"],
              ["availability",         "Current Availability"],
            ].map(([k, label]) => (
              <div key={k} className="weight-row">
                <div className="weight-label">{label}</div>
                <input type="range" min={0} max={1} step={0.05}
                  value={(config.weights as any)[k]||0}
                  onChange={e => setConfig(prev=>({
                    ...prev,
                    weights:{...prev.weights,[k]:parseFloat(e.target.value)}
                  }))} />
                <div className="weight-value">
                  {(((config.weights as any)[k]||0)*100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🎯 Routing Thresholds</div>
          </div>
          <div className="card-body">
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:16, lineHeight:1.6 }}>
              Minimum requirements for a contractor to be eligible for a bid invitation.
            </p>
            {[
              { label:"Minimum Score", key:"min_score", min:0, max:1, step:0.05, fmt:(v:number)=>`${(v*100).toFixed(0)}%` },
              { label:"Max Distance (miles)", key:"max_distance_miles", min:10, max:200, step:5, fmt:(v:number)=>`${v} mi` },
              { label:"Max Active Bids", key:"max_bids_active", min:1, max:20, step:1, fmt:(v:number)=>`${v} bids` },
            ].map(({label,key:k,min,max,step,fmt}) => (
              <div key={k} className="weight-row">
                <div className="weight-label">{label}</div>
                <input type="range" min={min} max={max} step={step}
                  value={(config.thresholds as any)[k]||min}
                  onChange={e=>setConfig(prev=>({
                    ...prev,
                    thresholds:{...prev.thresholds,[k]:parseFloat(e.target.value)}
                  }))} />
                <div className="weight-value">{fmt((config.thresholds as any)[k]||min)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save + Preview */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔍 Routing Preview</div>
        </div>
        <div className="card-body">
          {msg && (
            <div style={{ padding:"10px 12px", marginBottom:14, borderRadius:8, fontSize:13,
              background:msg.startsWith("✓")?"#f0fdf4":"#fef2f2",
              border:`1px solid ${msg.startsWith("✓")?"#86efac":"#fecaca"}`,
              color:msg.startsWith("✓")?"var(--green)":"var(--red)" }}>
              {msg}
            </div>
          )}
          <div style={{ display:"flex", gap:12, marginBottom:16 }}>
            <input className="search-input" style={{ flex:1 }}
              placeholder="Lead ID to test routing against..."
              value={testLeadId} onChange={e=>setTestLeadId(e.target.value)}
              type="number"/>
            <button className="btn btn-outline" onClick={runPreview}>Preview →</button>
            <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
              {saving?"Saving...":"Save Config"}
            </button>
          </div>

          {preview && (
            <div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12, color:"var(--navy)" }}>
                Top {preview.matches?.length||0} contractors for Lead #{preview.lead_id}
              </div>
              <table className="data-table">
                <thead><tr><th>#</th><th>Business</th><th>License</th><th>City</th><th>Score</th></tr></thead>
                <tbody>
                  {(preview.matches||[]).slice(0,10).map((c:any,i:number)=>(
                    <tr key={c.id||i}>
                      <td style={{ fontWeight:700, color:"var(--muted)" }}>{i+1}</td>
                      <td style={{ fontWeight:700 }}>{c.business_name||c.full_business_name}</td>
                      <td style={{ fontFamily:"monospace", fontSize:12 }}>#{c.license_no}</td>
                      <td style={{ color:"var(--muted)", fontSize:12 }}>{c.city}</td>
                      <td>
                        <div className="perf-bar-wrap">
                          <div className="perf-bar">
                            <div className="perf-bar-fill" style={{ width:`${((c.score||0.5)*100).toFixed(0)}%` }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700 }}>
                            {c.score ? (c.score*100).toFixed(0)+"%" : "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
