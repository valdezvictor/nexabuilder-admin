import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

type Contractor = {
  id: number; license_no: string; business_name: string;
  city: string; phone: string; portal_status: string;
  portal_email: string|null; last_sms_at: string|null;
  email_captured_at: string|null; classifications: string;
};

const STATUS_LABEL: Record<string,string> = {
  not_contacted:"Not Contacted", sms_sent:"SMS Sent",
  email_captured:"Email Captured", registered:"Registered", active:"Active",
};
const STATUS_BADGE: Record<string,string> = {
  not_contacted:"badge-gray", sms_sent:"badge-amber",
  email_captured:"badge-blue", registered:"badge-purple", active:"badge-green",
};

export const OutreachPage: React.FC = () => {
  const [stats, setStats]   = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [vertical, setVertical] = useState("pool");
  const [zip, setZip]       = useState("");
  const [county, setCounty] = useState("Orange");
  const [statusFilter, setStatusFilter] = useState("all");
  const [acting, setActing] = useState<number|null>(null);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    http.get("/outreach/stats").then(r=>setStats(r.data)).catch(()=>{});
    search();
  }, []);

  const search = (offset=0) => {
    setLoading(true);
    const params: Record<string,any> = { limit:30, offset, vertical };
    if (zip) params.zip_code = zip;
    if (county) params.county = county;
    http.get("/outreach/contractors/search", { params })
      .then(r=>setResults(r.data))
      .catch(()=>setResults(null))
      .finally(()=>setLoading(false));
  };

  const sendSMS = async (c: Contractor) => {
    setActing(c.id);
    try {
      await http.post(`/outreach/contractors/${c.id}/sms`, { vertical });
      setActionMsg(`✓ SMS sent to ${c.business_name} (${c.phone})`);
      search();
    } catch(e:any) { setActionMsg("❌ " + (e?.response?.data?.detail||"SMS failed")); }
    finally { setActing(null); }
  };

  const sendInvite = async (c: Contractor) => {
    setActing(c.id);
    try {
      await http.post(`/outreach/contractors/${c.id}/send-invite`, {});
      setActionMsg(`✓ Portal invite sent to ${c.portal_email}`);
      search();
    } catch(e:any) { setActionMsg("❌ " + (e?.response?.data?.detail||"Error")); }
    finally { setActing(null); }
  };

  const contractors = (results?.contractors||[]).filter((c:Contractor)=>
    statusFilter==="all" || c.portal_status===statusFilter
  );

  return (
    <div>
      {/* Funnel stats */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(6,1fr)", marginBottom:20 }}>
          {[
            { label:"SMS Sent",       value:stats.sms_sent||0,        color:"var(--amber)"  },
            { label:"Emails Captured",value:stats.emails_captured||0, color:"var(--blue)"   },
            { label:"Invites Sent",   value:stats.invites_sent||0,    color:"var(--purple)" },
            { label:"Portal Accounts",value:stats.portal_accounts||0, color:"var(--navy)"   },
            { label:"Bids Accepted",  value:stats.bids_accepted||0,   color:"var(--green)"  },
            { label:"Conversion",     value:stats.conversion_rate||"0%", color:"var(--gold)"},
          ].map((k,i)=>(
            <div key={i} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color:k.color, fontSize:"1.4rem" }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="search-bar" style={{ marginBottom:16 }}>
        <select className="search-input" style={{ flex:"0 0 160px" }}
          value={vertical} onChange={e=>setVertical(e.target.value)}>
          {[["pool","Pool (C-53)"],["roofing","Roofing (C-39)"],["electrical","Electrical (C-10)"],
            ["plumbing","Plumbing (C-36)"],["hvac","HVAC (C-20)"],["remodel","General (B)"]].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input className="search-input" style={{ flex:"0 0 120px" }} placeholder="ZIP"
          value={zip} onChange={e=>setZip(e.target.value)}/>
        <input className="search-input" style={{ flex:"0 0 160px" }} placeholder="County"
          value={county} onChange={e=>setCounty(e.target.value)}/>
        <button className="btn btn-primary btn-sm" onClick={()=>search()}>Search</button>
        <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
          {["all","not_contacted","sms_sent","email_captured","registered","active"].map(s=>(
            <button key={s}
              className={`btn btn-sm ${statusFilter===s?"btn-primary":"btn-outline"}`}
              onClick={()=>setStatusFilter(s)}>
              {s==="all"?"All":STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {actionMsg && (
        <div style={{ padding:"10px 14px", marginBottom:14, borderRadius:8, fontSize:13,
          background:actionMsg.startsWith("✓")?"#f0fdf4":"#fef2f2",
          border:`1px solid ${actionMsg.startsWith("✓")?"#86efac":"#fecaca"}`,
          color:actionMsg.startsWith("✓")?"var(--green)":"var(--red)" }}>
          {actionMsg}
          <button onClick={()=>setActionMsg("")}
            style={{ marginLeft:12, background:"none", border:"none", cursor:"pointer", fontSize:16 }}>×</button>
        </div>
      )}

      <div className="card">
        <div className="card-body-0">
          {loading ? <div className="loading-wrap"><div className="spinner"></div></div>
          : contractors.length===0 ? <div className="empty-state">No contractors found</div>
          : (
            <table className="data-table">
              <thead><tr>
                <th>License</th><th>Business</th><th>Location</th>
                <th>Phone</th><th>Portal Status</th><th>Email</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {contractors.map((c:Contractor)=>(
                  <tr key={c.id}>
                    <td style={{ fontFamily:"monospace", fontSize:12 }}>#{c.license_no}</td>
                    <td style={{ fontWeight:700, fontSize:13 }}>{c.business_name}</td>
                    <td style={{ fontSize:12, color:"var(--muted)" }}>{c.city}</td>
                    <td style={{ fontSize:12 }}>{c.phone||"—"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[c.portal_status]||"badge-gray"}`}>
                        {STATUS_LABEL[c.portal_status]||c.portal_status}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:"var(--blue)" }}>
                      {c.portal_email||<span style={{ color:"var(--muted)" }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display:"flex", gap:6 }}>
                        {!c.last_sms_at && c.phone && (
                          <button className="btn btn-sm btn-outline"
                            disabled={acting===c.id} onClick={()=>sendSMS(c)}>
                            📱 SMS
                          </button>
                        )}
                        {c.portal_email && c.portal_status!=="active" && (
                          <button className="btn btn-sm btn-primary"
                            disabled={acting===c.id} onClick={()=>sendInvite(c)}>
                            🔗 Invite
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
