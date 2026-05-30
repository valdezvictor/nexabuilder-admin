import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

const STATUS_BADGE: Record<string,string> = {
  pending:"badge-gray", sent:"badge-amber", viewed:"badge-blue",
  accepted:"badge-green", declined:"badge-red", expired:"badge-gray",
};

export const BidsPage: React.FC = () => {
  const [bids, setBids]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadId, setLeadId] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg]       = useState("");

  const loadBids = () => {
    setLoading(true);
    http.get("/api/leads", { params:{ limit:50, ordering:"-created_at" } })
      .then((r:any)=>{
        const leads = r.data.results || r.data.leads || [];
        setBids(leads.filter((l:any)=>l.lead_status==="matched"||l.lead_status==="submitted"));
      })
      .catch(()=>setBids([]))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{ loadBids(); },[]);

  const sendBid = async () => {
    if(!leadId||!contractorId){setMsg("Enter both Lead ID and Contractor ID");return;}
    setSending(true); setMsg("");
    try {
      await http.post("/contractor/admin/bids/send",{
        lead_id:Number(leadId), contractor_id:Number(contractorId), commission_pct:10
      });
      setMsg("✓ Bid invitation sent!");
      setLeadId(""); setContractorId("");
    } catch(e:any){setMsg("❌ "+(e?.response?.data?.detail||"Error"));}
    finally{setSending(false);}
  };

  return (
    <div>
      {/* Send new bid */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header">
          <div className="card-title">📤 Send Bid Invitation</div>
        </div>
        <div className="card-body">
          {msg&&<div style={{ padding:"10px 12px", marginBottom:12, borderRadius:8,
            fontSize:13,
            background:msg.startsWith("✓")?"#f0fdf4":"#fef2f2",
            border:`1px solid ${msg.startsWith("✓")?"#86efac":"#fecaca"}`,
            color:msg.startsWith("✓")?"var(--green)":"var(--red)"}}>{msg}</div>}
          <div style={{ display:"flex", gap:12 }}>
            <input className="search-input" placeholder="Lead ID" type="number"
              value={leadId} onChange={e=>setLeadId(e.target.value)}
              style={{ flex:"0 0 140px" }}/>
            <input className="search-input" placeholder="Contractor DB ID" type="number"
              value={contractorId} onChange={e=>setContractorId(e.target.value)}
              style={{ flex:"0 0 180px" }}/>
            <button className="btn btn-primary" onClick={sendBid} disabled={sending}>
              {sending?"Sending...":"Send Bid →"}
            </button>
          </div>
          <p style={{ fontSize:12, color:"var(--muted)", marginTop:10 }}>
            Contractor will receive an email and see the bid in their portal inbox.
            Contact info stays masked until they accept.
          </p>
        </div>
      </div>

      {/* Active leads needing bids */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Active Leads</div>
          <button className="btn btn-outline btn-sm" onClick={loadBids}>↻ Refresh</button>
        </div>
        <div className="card-body-0">
          {loading?<div className="loading-wrap"><div className="spinner"></div></div>:(
            <table className="data-table">
              <thead><tr>
                <th>#</th><th>Homeowner</th><th>Project</th>
                <th>Location</th><th>Score</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>
                {bids.map((l:any)=>(
                  <tr key={l.id}>
                    <td style={{ color:"var(--muted)",fontSize:12 }}>#{l.id}</td>
                    <td style={{ fontWeight:700,fontSize:13 }}>
                      {[l.first_name,l.last_name].filter(Boolean).join(" ")||"Unknown"}
                    </td>
                    <td>{l.project_type||l.vertical||"—"}</td>
                    <td style={{ fontSize:12,color:"var(--muted)" }}>
                      {[l.city,l.postal_code].filter(Boolean).join(" ")||"—"}
                    </td>
                    <td>
                      {l.ai_score!=null?(
                        <span style={{ fontWeight:800,
                          color:l.ai_score>=7?"var(--green)":l.ai_score>=4?"var(--amber)":"var(--red)"}}>
                          {l.ai_score}/10
                        </span>
                      ):"—"}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[l.lead_status||""]||"badge-gray"}`}>
                        {(l.lead_status||"submitted").replace(/_/g," ")}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline"
                        onClick={()=>{setLeadId(String(l.id));
                          document.querySelector<HTMLInputElement>(".search-input")?.focus();}}>
                        Send Bid
                      </button>
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
