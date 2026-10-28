import React, { useEffect, useState } from "react";
import { fetchLeadTimeline, fetchRoutingScore } from "../../api/routingApi";
import { LeadTimelineResponse, RankedContractor } from "../../api/routingTypes";

const RoutingCockpit: React.FC = () => {
  const [leadId, setLeadId]       = useState<number>(55);
  const [inputVal, setInputVal]   = useState("55");
  const [timeline, setTimeline]   = useState<LeadTimelineResponse | null>(null);
  const [ranked, setRanked]       = useState<RankedContractor[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const load = async (id: number) => {
    setLoading(true); setError(""); setTimeline(null); setRanked([]);
    try {
      const [tl, rankedList] = await Promise.all([
        fetchLeadTimeline(id),
        fetchRoutingScore(id),
      ]);
      setTimeline(tl);
      setRanked(rankedList);
    } catch (e: any) {
      setError(e?.message || "Failed to load lead data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(leadId); }, []);

  const handleSearch = () => {
    const id = parseInt(inputVal);
    if (isNaN(id) || id < 1) { setError("Enter a valid lead ID"); return; }
    setLeadId(id);
    load(id);
  };

  return (
    <div>
      {/* Lead selector */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ fontWeight:700, fontSize:14, color:"var(--navy)" }}>Lead ID:</div>
        <input
          className="search-input"
          style={{ width:120, flex:"none" }}
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Lead ID"
        />
        <button className="btn btn-primary btn-sm" onClick={handleSearch}>
          Load Lead →
        </button>
        {loading && <div className="spinner" style={{ width:24, height:24 }} />}
        {error && (
          <div style={{ fontSize:13, color:"var(--red)", fontWeight:700 }}>{error}</div>
        )}
      </div>

      {/* 3-col cockpit — stacks on mobile via .routing-cockpit */}
      <div className="routing-cockpit" style={{ display:"flex", gap:16, alignItems:"flex-start" }}>

        {/* Left: Lead detail */}
        <div style={{ width:"25%", minWidth:200, display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ marginBottom:0 }}>
            <div className="card-header">
              <div className="card-title">📋 Lead #{leadId}</div>
            </div>
            <div className="card-body">
              {timeline ? (
                <div>
                  {timeline.vertical && (
                    <div style={{ marginBottom:8 }}>
                      <div className="detail-label">Vertical</div>
                      <div className="detail-value">{timeline.vertical}</div>
                    </div>
                  )}
                  {timeline.ai_score != null && (
                    <div style={{ marginBottom:8 }}>
                      <div className="detail-label">AI Score</div>
                      <div style={{ fontSize:"1.4rem", fontWeight:900,
                        color: timeline.ai_score >= 7 ? "var(--green)"
                          : timeline.ai_score >= 4 ? "var(--amber)" : "var(--red)" }}>
                        {timeline.ai_score}/10
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom:8 }}>
                    <div className="detail-label">Events</div>
                    <div className="detail-value">{timeline.events.length} recorded</div>
                  </div>
                  <a href={`/leads/${leadId}`}
                    className="btn btn-outline btn-sm"
                    style={{ width:"100%", justifyContent:"center", marginTop:8 }}>
                    Full Lead Detail →
                  </a>
                </div>
              ) : (
                <div style={{ color:"var(--muted)", fontSize:13 }}>
                  {loading ? "Loading..." : "Enter a lead ID above"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Timeline */}
        <div style={{ flex:1, minWidth:0 }}>
          <div className="card" style={{ marginBottom:0 }}>
            <div className="card-header">
              <div className="card-title">📅 Activity Timeline</div>
              <span style={{ fontSize:12, color:"var(--muted)" }}>
                {timeline?.events?.length || 0} events
              </span>
            </div>
            <div className="card-body" style={{ maxHeight:500, overflowY:"auto" }}>
              {!timeline || timeline.events.length === 0 ? (
                <div className="empty-state" style={{ padding:20 }}>
                  {loading ? "Loading timeline..." : "No events yet for this lead"}
                </div>
              ) : (
                <div className="tl-wrap">
                  {timeline.events.map((ev, i) => (
                    <div key={ev.id || i} className="tl-entry">
                      <div className="tl-time">
                        {ev.created_at
                          ? new Date(ev.created_at).toLocaleString("en-US", {
                              month:"short", day:"numeric",
                              hour:"numeric", minute:"2-digit"
                            })
                          : "—"}
                      </div>
                      <div className="tl-title">
                        {ev.event_type?.replace(/_/g," ")}
                      </div>
                      {ev.payload && Object.keys(ev.payload).length > 0 && (
                        <div className="tl-desc monospace">
                          {JSON.stringify(ev.payload).slice(0, 80)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Ranked contractors */}
        <div style={{ width:"25%", minWidth:200 }}>
          <div className="card" style={{ marginBottom:0 }}>
            <div className="card-header">
              <div className="card-title">👷 Ranked Contractors</div>
              <span style={{ fontSize:12, color:"var(--muted)" }}>{ranked.length}</span>
            </div>
            <div className="card-body" style={{ padding:0, maxHeight:500, overflowY:"auto" }}>
              {ranked.length === 0 ? (
                <div className="empty-state" style={{ padding:20, fontSize:13 }}>
                  {loading ? "Matching..." : "No contractors matched"}
                </div>
              ) : ranked.map((c, i) => (
                <div key={c.contractor_id}
                  style={{ padding:"12px 16px",
                    borderBottom: i < ranked.length-1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:6 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>
                      #{i + 1} — ID {c.contractor_id}
                    </div>
                    <div style={{ fontWeight:900, fontSize:14,
                      color: c.score >= 0.7 ? "var(--green)"
                           : c.score >= 0.4 ? "var(--amber)" : "var(--red)" }}>
                      {(c.score * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="perf-bar-wrap" style={{ marginBottom:8 }}>
                    <div className="perf-bar">
                      <div className="perf-bar-fill"
                        style={{ width:`${(c.score * 100).toFixed(0)}%`,
                          background: c.score >= 0.7 ? "var(--green)"
                            : c.score >= 0.4 ? "var(--amber)" : "var(--red)" }} />
                    </div>
                  </div>
                  {c.explanations.map((ex, j) => (
                    <div key={j} style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>
                      • {ex}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutingCockpit;
