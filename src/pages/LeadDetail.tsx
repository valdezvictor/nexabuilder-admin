import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../lib/http";

type Lead = {
  id: number;
  first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null;
  vertical: string | null; project_type: string | null;
  project_description: string | null;
  postal_code: string | null; city: string | null; state: string | null;
  source: string | null; lead_status: string | null;
  ai_score: number | null; ai_assessment: any; estimate: any; pre_qual_score: number | null; pre_qual_tier: string | null; pre_qual_status: string | null; needs_financing: boolean | null; financing_amount: number | null; financing_type: string | null; annual_income: number | null; employment_status: string | null; ownership_tenure: string | null; years_at_address: number | null; property_address: string | null; property_type: string | null; stated_mortgage_balance: number | null; co_borrower: boolean | null;
  internal_notes: string | null; created_at: string | null;
  demo_flags: any;
};

type TimelineEntry = {
  id: string; timestamp: string | null; icon: string;
  title: string; description: string | null; status: "done"|"pending";
  actor: string;
};

const STATUS_BADGE: Record<string,string> = {
  submitted:"badge-blue", review:"badge-amber",
  matched:"badge-green", complete:"badge-gray",
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",
    year:"numeric",hour:"numeric",minute:"2-digit"}) : "—";

const Field: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div style={{ marginBottom:14 }}>
    <div className="detail-label">{label}</div>
    <div className="detail-value">{value || "—"}</div>
  </div>
);

const LeadDetail: React.FC = () => {
  const { id }                = useParams<{ id: string }>();
  const navigate              = useNavigate();
  const [lead, setLead]       = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [bids, setBids]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote]       = useState("");
  const [sendingBid, setSendingBid] = useState(false);
  const [contractorId, setContractorId] = useState("");
  const [msg, setMsg]         = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      http.get(`/leads/${id}`).then(r => r.data),
      http.get(`/leads/${id}/timeline`).then(r => r.data).catch(() => ({ entries:[] })),
      http.get(`/contractor/admin/bids/send`, { params:{ lead_id:id } }).catch(() => null),
    ]).then(([l, tl]) => {
      setLead(l);
      setTimeline(tl.entries || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const sendBid = async () => {
    if (!contractorId) { setMsg("Enter a contractor ID"); return; }
    setSendingBid(true);
    try {
      await http.post("/contractor/admin/bids/send", {
        lead_id: Number(id),
        contractor_id: Number(contractorId),
        commission_pct: 10
      });
      setMsg("✓ Bid invitation sent!");
      setContractorId("");
    } catch (e: any) {
      setMsg("❌ " + (e?.response?.data?.detail || "Error sending bid"));
    } finally { setSendingBid(false); }
  };

  if (loading) return <div className="loading-wrap"><div className="spinner"></div></div>;
  if (!lead) return (
    <div className="empty-state">
      <div style={{ fontSize:40 }}>❌</div>
      <p>Lead not found</p>
      <button className="btn btn-outline" onClick={() => navigate("/leads")}>← Back</button>
    </div>
  );

  const ai    = lead.ai_assessment || {};
  const isVIP = lead.demo_flags?.vip || lead.demo_flags?.show_all_contractors;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/leads")}
            style={{ marginBottom:8, paddingLeft:0 }}>
            ← All Leads
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <h1 style={{ fontSize:"1.3rem", fontWeight:900, color:"var(--navy)", margin:0 }}>
              {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown Homeowner"}
            </h1>
            <span className={`badge ${STATUS_BADGE[lead.lead_status||""] || "badge-gray"}`}>
              {(lead.lead_status||"submitted").replace("_"," ")}
            </span>
            {isVIP && <span className="badge badge-purple">VIP Demo</span>}
          </div>
          <div style={{ fontSize:13, color:"var(--muted)", marginTop:4 }}>
            Lead #{lead.id} · Submitted {fmtDate(lead.created_at)}
          </div>
        </div>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {lead.phone && <a href={`tel:${lead.phone}`} className="btn btn-green btn-sm">📞 {lead.phone}</a>}
          {lead.email && <a href={`mailto:${lead.email}`} className="btn btn-outline btn-sm">✉ Email</a>}
          <a href={`https://member.nexabuilder.com/dashboard?lead_id=${lead.id}`}
            target="_blank" className="btn btn-outline btn-sm">
            View Member Portal ↗
          </a>
        </div>
      </div>

      {/* Two column layout */}
      <div className="detail-grid">
        {/* Left — main content */}
        <div>
          {/* Project details */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📋 Project Details</div>
            </div>
            <div className="card-body">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                <Field label="Vertical"      value={lead.vertical} />
                <Field label="Project Type"  value={lead.project_type} />
                <Field label="City"          value={lead.city} />
                <Field label="ZIP Code"      value={lead.postal_code} />
                <Field label="State"         value={lead.state} />
                <Field label="Source"        value={lead.source} />
                <Field label="Email"         value={lead.email} />
                <Field label="Phone"         value={lead.phone} />
              </div>
              {lead.project_description && (
                <div>
                  <div className="detail-label">Project Description</div>
                  <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.7,
                    background:"var(--bg)", padding:"12px 14px", borderRadius:8 }}>
                    {lead.project_description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Assessment */}
          {ai && Object.keys(ai).length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">🤖 AI Assessment</div>
                {lead.ai_score != null && (
                  <span style={{ fontWeight:900, fontSize:18,
                    color: lead.ai_score >= 7 ? "var(--green)" :
                           lead.ai_score >= 4 ? "var(--amber)" : "var(--red)" }}>
                    {lead.ai_score}/10
                  </span>
                )}
              </div>
              <div className="card-body">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                  <Field label="Complexity"      value={ai.complexity_label} />
                  <Field label="Estimated Cost"  value={ai.estimated_cost_range} />
                  <Field label="Permit Required" value={ai.permit_required ? "Yes" : "No"} />
                  <Field label="License Types"   value={(ai.license_types_needed||[]).join(", ")} />
                </div>
                {ai.summary && (
                  <div>
                    <div className="detail-label">Summary</div>
                    <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.7,
                      background:"var(--bg)", padding:"12px 14px", borderRadius:8 }}>
                      {ai.summary}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Send bid invitation */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📤 Send Bid Invitation</div>
            </div>
            <div className="card-body">
              <p style={{ fontSize:13, color:"var(--muted)", marginBottom:14, lineHeight:1.6 }}>
                Enter a contractor DB ID to send them a bid invitation for this lead.
                They will receive an email and see it in their contractor portal inbox.
              </p>
              {msg && (
                <div style={{ padding:"10px 12px", marginBottom:12, borderRadius:8, fontSize:13,
                  background: msg.startsWith("✓") ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${msg.startsWith("✓") ? "#86efac" : "#fecaca"}`,
                  color: msg.startsWith("✓") ? "var(--green)" : "var(--red)" }}>
                  {msg}
                </div>
              )}
              <div style={{ display:"flex", gap:10 }}>
                <input className="search-input" style={{ flex:1 }}
                  placeholder="Contractor DB ID (e.g. 85911)"
                  value={contractorId}
                  onChange={e => setContractorId(e.target.value)}
                  type="number" />
                <button className="btn btn-primary"
                  disabled={sendingBid} onClick={sendBid}>
                  {sendingBid ? "Sending..." : "Send Bid →"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right — timeline */}
        <div>
          <div className="card" style={{ position:"sticky", top:76 }}>
            <div className="card-header">
              <div className="card-title">📋 Timeline</div>
              <span style={{ fontSize:12, color:"var(--muted)" }}>
                {timeline.filter(e=>e.status==="done").length} events
              </span>
            </div>
            <div className="card-body" style={{ maxHeight:600, overflowY:"auto" }}>
              {timeline.length === 0 ? (
                <div className="empty-state" style={{ padding:20 }}>No events yet</div>
              ) : (
                <div className="tl-wrap">
                  {timeline.map(entry => (
                    <div key={entry.id}
                      className={`tl-entry ${entry.status === "pending" ? "pending" : ""}`}>
                      <div className="tl-time">
                        {entry.timestamp
                          ? new Date(entry.timestamp).toLocaleString("en-US",
                              {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})
                          : "Pending"
                        }
                        {" · "}
                        <span style={{ color:"var(--muted)" }}>{entry.actor}</span>
                      </div>
                      <div className="tl-title">
                        {entry.icon} {entry.title}
                      </div>
                      {entry.description && (
                        <div className="tl-desc">{entry.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

            {/* ── Financing Pre-Qual Block ────────────────────────── */}
            {lead.needs_financing && (
              <div style={{ marginTop:20, background:"var(--surface)",
                border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)",
                  display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
                    letterSpacing:".06em", color:"var(--muted)" }}>💰 Financing Pre-Qualification</div>
                  {lead.pre_qual_tier && (
                    <span style={{ fontSize:12, fontWeight:800, padding:"4px 10px", borderRadius:6,
                      background: lead.pre_qual_tier==='A' ? 'rgba(34,197,94,.12)'
                        : lead.pre_qual_tier==='B' ? 'rgba(8,145,178,.12)'
                        : lead.pre_qual_tier==='C' ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)',
                      color: lead.pre_qual_tier==='A' ? 'var(--green)'
                        : lead.pre_qual_tier==='B' ? '#0891b2'
                        : lead.pre_qual_tier==='C' ? 'var(--amber)' : 'var(--red)',
                      border: '1px solid currentColor' }}>
                      Tier {lead.pre_qual_tier} — {lead.pre_qual_score}/100
                    </span>
                  )}
                </div>
                <div style={{ padding:"16px", display:"grid",
                  gridTemplateColumns:"1fr 1fr", gap:16 }}>

                  {/* Score breakdown */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
                      textTransform:"uppercase", marginBottom:8 }}>Pre-Qual Score</div>
                    {lead.pre_qual_score != null && (
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <div style={{ flex:1, height:8, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:4,
                            width: `${lead.pre_qual_score}%`,
                            background: lead.pre_qual_score >= 80 ? 'var(--green)'
                              : lead.pre_qual_score >= 65 ? '#0891b2'
                              : lead.pre_qual_score >= 50 ? 'var(--amber)' : 'var(--red)' }} />
                        </div>
                        <span style={{ fontSize:18, fontWeight:900,
                          color: lead.pre_qual_score >= 80 ? 'var(--green)'
                            : lead.pre_qual_score >= 65 ? '#0891b2'
                            : lead.pre_qual_score >= 50 ? 'var(--amber)' : 'var(--red)' }}>
                          {lead.pre_qual_score}<span style={{fontSize:12,fontWeight:500}}>/100</span>
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize:12, color:"var(--muted)" }}>
                      <div><strong>Loan Requested:</strong> {lead.financing_amount ? `$${lead.financing_amount.toLocaleString()}` : '—'}</div>
                      <div><strong>Type:</strong> {lead.financing_type || '—'}</div>
                      <div><strong>Status:</strong> <span style={{
                        color: lead.pre_qual_status==='pre_qualified' ? 'var(--green)'
                          : lead.pre_qual_status==='funded' ? 'var(--blue)' : 'var(--muted)'
                      }}>{lead.pre_qual_status || 'Not requested'}</span></div>
                    </div>
                  </div>

                  {/* Borrower profile */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
                      textTransform:"uppercase", marginBottom:8 }}>Borrower Profile</div>
                    <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.8 }}>
                      <div><strong>Annual Income:</strong> {lead.annual_income ? `$${lead.annual_income.toLocaleString()}` : '—'}</div>
                      <div><strong>Employment:</strong> {lead.employment_status || '—'}</div>
                      <div><strong>Ownership:</strong> {lead.ownership_tenure || '—'}</div>
                      <div><strong>Years at Address:</strong> {lead.years_at_address ?? '—'}</div>
                      <div><strong>Co-Borrower:</strong> {lead.co_borrower ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {/* Property */}
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
                      textTransform:"uppercase", marginBottom:8 }}>Property</div>
                    <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.8 }}>
                      <div><strong>Address:</strong> {lead.property_address || '—'}</div>
                      <div><strong>Type:</strong> {lead.property_type || '—'}</div>
                      <div><strong>Mortgage Balance:</strong> {lead.stated_mortgage_balance ? `$${lead.stated_mortgage_balance.toLocaleString()}` : '—'}</div>
                    </div>
                  </div>

                </div>
              </div>
            )}
      </div>
    </div>
  );
};

export { LeadDetail };
