import React, { useState, useEffect } from "react";
import { http } from "../lib/http";

const CRMPage: React.FC = () => {
  const [tab, setTab]           = useState<"reviews"|"complete">("reviews");
  const [summary, setSummary]   = useState<any>(null);
  const [reviews, setReviews]   = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  // Complete-job form
  const [leadId, setLeadId]       = useState("");
  const [contractorId, setContractorId] = useState("");
  const [jobAmount, setJobAmount] = useState("");
  const [jobNotes, setJobNotes]   = useState("");
  const [placeId, setPlaceId]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState<any>(null);

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const r = await http.get("/crm/reviews");
      setSummary(r.data.summary);
      setReviews(r.data.recent_reviews || []);
      setRankings(r.data.contractor_rankings || []);
    } catch {}
    setLoading(false);
  };

  const completeJob = async () => {
    if (!leadId || !contractorId) { alert("Lead ID and Contractor ID are required."); return; }
    setSubmitting(true); setResult(null);
    try {
      const r = await http.post("/crm/complete-job", {
        lead_id: parseInt(leadId),
        contractor_id: parseInt(contractorId),
        job_amount: jobAmount ? parseFloat(jobAmount) : null,
        job_notes: jobNotes || null,
        google_place_id: placeId || null,
      });
      setResult(r.data);
      if (r.data.success) { setLeadId(""); setContractorId(""); setJobAmount(""); setJobNotes(""); setPlaceId(""); loadReviews(); }
    } catch (e: any) { setResult({ error: e?.response?.data?.detail || "Error" }); }
    setSubmitting(false);
  };

  const starPct = (r: number, total: number) => total ? Math.round((r/total)*100) : 0;

  const card = (style?: React.CSSProperties) => ({
    background:"#fff", border:"1.5px solid var(--border)",
    borderRadius:12, padding:"20px 24px", ...style
  });

  const statCard = (label: string, value: any, color="#0d1e35") => (
    <div style={card({ textAlign:"center" })}>
      <div style={{ fontSize:28, fontWeight:900, color }}>{value ?? "—"}</div>
      <div style={{ fontSize:12, color:"var(--muted)", marginTop:4, fontWeight:600 }}>{label}</div>
    </div>
  );

  const stars = (n: number) => "⭐".repeat(n) + "☆".repeat(5-n);

  return (
    <div style={{ padding:"0 4px" }}>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, borderBottom:"2px solid var(--border)", paddingBottom:12 }}>
        {([["reviews","📊 Reviews Dashboard"], ["complete","✅ Complete a Job"]] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:"7px 18px", borderRadius:8, border:"none",
              background:tab===t?"var(--navy)":"transparent",
              color:tab===t?"#fff":"var(--muted)",
              fontWeight:700, fontSize:13, cursor:"pointer" }}>
            {label}
          </button>
        ))}
        <button onClick={loadReviews} style={{ marginLeft:"auto", padding:"7px 14px", borderRadius:8,
          border:"1.5px solid var(--border)", background:"#fff", color:"var(--muted)",
          fontSize:12, fontWeight:600, cursor:"pointer" }}>
          ↻ Refresh
        </button>
      </div>

      {tab === "reviews" && (
        <div>
          {/* Summary stats */}
          {summary && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:24 }}>
              {statCard("Pending Surveys", summary.pending_surveys, "#d97706")}
              {statCard("Completed", summary.completed, "#16a34a")}
              {statCard("Avg Rating", summary.avg_rating ? `${summary.avg_rating}⭐` : "—", "#C8922A")}
              {statCard("Positive (4-5★)", summary.positive, "#0891b2")}
              {statCard("Google Requests", summary.google_requests_sent, "#7c3aed")}
              {statCard("Opted Out", summary.opted_out, "#6b7280")}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start" }}>

            {/* Recent reviews */}
            <div style={card()}>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:16 }}>Recent Reviews</div>
              {loading ? <div style={{ color:"var(--muted)", fontSize:13 }}>Loading...</div>
              : reviews.length === 0
                ? <div style={{ color:"var(--muted)", fontSize:13, textAlign:"center", padding:24 }}>
                    No reviews yet. Complete your first job to start collecting feedback.
                  </div>
                : reviews.map(rv => (
                <div key={rv.id} style={{ borderBottom:"1px solid var(--border)", paddingBottom:14, marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div>
                      <span style={{ fontWeight:700, fontSize:13 }}>{rv.homeowner_name || "Anonymous"}</span>
                      <span style={{ color:"var(--muted)", fontSize:12, marginLeft:8 }}>
                        {rv.vertical?.replace(/-/g," ")} · {rv.contractor_company || "—"}
                      </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {rv.survey_rating && (
                        <span style={{ fontSize:14 }}>{stars(rv.survey_rating)}</span>
                      )}
                      <span style={{
                        fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:4,
                        background: rv.status==="completed"?"#dcfce7":rv.status==="survey_sent"?"#fef9c3":"#f1f5f9",
                        color: rv.status==="completed"?"#16a34a":rv.status==="survey_sent"?"#854d0e":"#475569",
                        textTransform:"uppercase", letterSpacing:".05em"
                      }}>{rv.status?.replace("_"," ")}</span>
                    </div>
                  </div>
                  {rv.survey_comment && (
                    <p style={{ fontSize:12, color:"var(--muted)", fontStyle:"italic", margin:0 }}>
                      "{rv.survey_comment}"
                    </p>
                  )}
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>
                    {rv.job_amount ? `$${Number(rv.job_amount).toLocaleString()} job · ` : ""}
                    {rv.created_at ? new Date(rv.created_at).toLocaleDateString() : ""}
                  </div>
                </div>
              ))}
            </div>

            {/* Contractor rankings */}
            <div style={card()}>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:16 }}>Top Contractors by Rating</div>
              {rankings.length === 0
                ? <div style={{ color:"var(--muted)", fontSize:12 }}>No ratings yet.</div>
                : rankings.map((cr, i) => (
                <div key={cr.contractor_id} style={{
                  borderBottom: i<rankings.length-1?"1px solid var(--border)":"none",
                  paddingBottom:12, marginBottom:12
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, fontWeight:700 }}>{cr.company_name || `Contractor #${cr.contractor_id}`}</span>
                    <span style={{ fontWeight:900, color:"#C8922A", fontSize:14 }}>{cr.avg_rating}⭐</span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--muted)" }}>
                    {cr.total_reviews} review{cr.total_reviews!==1?"s":""} ·
                    {cr.five_star} five-star · {cr.four_star} four-star
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "complete" && (
        <div style={{ maxWidth:560 }}>
          <div style={card()}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:6 }}>Mark Job as Complete</div>
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:20, lineHeight:1.6 }}>
              This marks the lead as completed and sends a survey email to the homeowner.
              If they rate 4-5 stars and a Google Place ID is provided, a Google review request
              follows automatically.
            </p>

            {[
              ["Lead ID *", leadId, setLeadId, "text", "e.g. 42"],
              ["Contractor Account ID *", contractorId, setContractorId, "text", "e.g. 1"],
              ["Job Amount ($)", jobAmount, setJobAmount, "number", "e.g. 12500"],
              ["Google Place ID (optional)", placeId, setPlaceId, "text", "ChIJ... from Google Business"],
            ].map(([label, val, setter, type, ph]: any) => (
              <div key={label} style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:".06em", color:"var(--muted)", display:"block", marginBottom:4 }}>
                  {label}
                </label>
                <input type={type} value={val} onChange={e=>setter(e.target.value)}
                  placeholder={ph}
                  style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)",
                    borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" as any }} />
              </div>
            ))}

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
                letterSpacing:".06em", color:"var(--muted)", display:"block", marginBottom:4 }}>
                Job Notes (optional)
              </label>
              <textarea value={jobNotes} onChange={e=>setJobNotes(e.target.value)}
                placeholder="e.g. Pool installation complete — passed final inspection"
                style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)",
                  borderRadius:8, fontSize:13, fontFamily:"inherit", minHeight:72,
                  resize:"vertical", boxSizing:"border-box" as any }} />
            </div>

            <button onClick={completeJob} disabled={submitting}
              style={{ width:"100%", padding:"13px", background:"#16a34a", color:"#fff",
                border:"none", borderRadius:10, fontSize:14, fontWeight:700,
                cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.6:1,
                fontFamily:"inherit" }}>
              {submitting ? "Processing..." : "✅ Complete Job & Send Survey"}
            </button>

            {result && (
              <div style={{
                marginTop:16, padding:"14px 16px", borderRadius:10, fontSize:13,
                background: result.error ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${result.error ? "#fca5a5" : "#86efac"}`,
                color: result.error ? "#dc2626" : "#16a34a",
              }}>
                {result.error ? `❌ ${result.error}` : (
                  <>
                    <div style={{ fontWeight:700 }}>✅ {result.message}</div>
                    {result.survey_url && (
                      <div style={{ marginTop:8, fontSize:12 }}>
                        Survey URL: <a href={result.survey_url} target="_blank"
                          style={{ color:"#0891b2", wordBreak:"break-all" }}>
                          {result.survey_url}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop:16, ...card({ background:"#fef9f3", borderColor:"#fcd34d" }) }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:8, color:"#92400e" }}>
              ℹ️ How to find the Google Place ID
            </div>
            <p style={{ fontSize:12, color:"#78350f", lineHeight:1.6, margin:0 }}>
              Go to <strong>Google Maps</strong> → search the contractor's business →
              click their profile → copy the <code>placeid=</code> parameter from the URL.
              Example: <code>ChIJN1t_tDeuEmsRUsoyG83frY4</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
