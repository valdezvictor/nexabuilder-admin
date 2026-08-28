import React, { useEffect, useState } from "react";
import { SEOInsightPanel } from "../components/SEOInsightPanel";
import { UTMLinkBuilder } from "../components/UTMLinkBuilder";
import { http } from "../lib/http";

export const MetricsPage: React.FC = () => {
  const [summary, setSummary]   = useState<any>(null);
  const [enriching, setEnriching] = useState(false);
  const [msg, setMsg]           = useState("");
  const [outreach, setOutreach] = useState<any>(null);
  const [utmData,   setUtmData]   = useState<any>(null);
  const [utmLoading,setUtmLoading]= useState(false);
  const ADM = { headers: { "X-Admin-Key": "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU" } };
  const [gscData,   setGscData]   = useState<any>(null);
  const [gscLoading,setGscLoading]= useState(false);
  const [selectedQuery,setSelectedQuery] = useState<any>(null);
  const [bingData,  setBingData]  = useState<any>(null);
  const [bingLoading,setBingLoading]= useState(false);
  const [attrData,  setAttrData]  = useState<any>(null);
  const [attrLoading,setAttrLoading]= useState(false);
  const [attrGroup, setAttrGroup]  = useState<"source"|"medium"|"campaign"|"vertical"|"day">("source");
  const [attrDays,  setAttrDays]   = useState(30);
  const [rankData,  setRankData]  = useState<any>(null);
  const [rankLoading,setRankLoading]= useState(false);

  useEffect(() => {
    http.get("/admin/metrics/leads/summary").then(r=>setSummary(r.data)).catch(()=>{});
    http.get("/outreach/stats").then(r=>setOutreach(r.data)).catch(()=>{});
  }, []);

  const loadUTM = async () => {
    setUtmLoading(true);
    try {
      const r = await http.get("/social/utm/stats");
      setUtmData(r.data);
    } catch(e) { console.warn("UTM stats unavailable", e); }
    finally { setUtmLoading(false); }
  };

  const loadGSC = async () => {
    setGscLoading(true);
    try {
      const r = await http.get("/gsc/keywords/top");
      setGscData(r.data);
    } catch(e) { console.warn("GSC unavailable", e); }
    finally { setGscLoading(false); }
  };

  const loadBing = async () => {
    setBingLoading(true);
    try {
      const r = await http.get("/bing/keywords/top");
      setBingData(r.data);
    } catch(e) { console.warn("Bing unavailable", e); }
    finally { setBingLoading(false); }
  };

  const loadRankSummary = async () => {
    setRankLoading(true);
    try {
      const r = await http.get("/rank/summary");
      setRankData(r.data);
    } catch(e) { console.warn("Rank unavailable", e); }
    finally { setRankLoading(false); }
  };

  const triggerSnapshot = async () => {
    try {
      await http.get("/rank/snapshot");
      setTimeout(() => loadRankSummary(), 8000);
    } catch(e) { console.warn("Snapshot error", e); }
  };

  const loadAttribution = async (days?: number, group?: string) => {
    const d = days ?? attrDays;
    const g = group ?? attrGroup;
    setAttrLoading(true);
    try {
      const r = await http.get(`/attribution/summary?days=${d}&group_by=${g}`);
      setAttrData(r.data);
    } catch(e) { console.warn("Attribution unavailable", e); }
    finally { setAttrLoading(false); }
  };

  useEffect(() => { loadUTM(); loadGSC(); loadBing(); loadAttribution(90, "vertical"); loadRankSummary(); }, []);

  const runEnrichment = async () => {
    setEnriching(true); setMsg("");
    try {
      const r = await http.post("/enrichment/run", {});
      setMsg(`✓ Enrichment complete: ${r.data.enriched||0} contractors updated.`);
    } catch(e:any) {
      setMsg("❌ " + (e?.response?.data?.detail||"Enrichment failed"));
    } finally { setEnriching(false); }
  };

  const s = summary || {};
  const o = outreach || {};

  return (
    <div>

      {/* ── UTM Traffic Widget ─────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".6px", color:"var(--muted)" }}>
            Traffic Sources — Last 30 Days
          </div>
          <button onClick={loadUTM} disabled={utmLoading}
            style={{ fontSize:11, padding:"4px 10px", background:"var(--surface)",
              border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", color:"var(--muted)" }}>
            {utmLoading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {/* Total visits KPI */}
        {utmData && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
            <div className="kpi-card" style={{ borderColor:"var(--gold)", borderWidth:1 }}>
              <div className="kpi-label">Total Tracked Visits</div>
              <div className="kpi-value" style={{ color:"var(--gold)" }}>{utmData.total_visits?.toLocaleString() || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Unique Sources</div>
              <div className="kpi-value">{utmData.by_source?.length || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Active Campaigns</div>
              <div className="kpi-value">{utmData.campaigns?.filter((c:any)=>c.campaign!=="(none)").length || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Top Pages Tracked</div>
              <div className="kpi-value">{utmData.top_pages?.length || 0}</div>
            </div>
          </div>
        )}

        {utmData ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

            {/* Sources table */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".05em" }}>
                By Source / Medium
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"rgba(0,0,0,.15)" }}>
                    <th style={{ padding:"7px 14px", textAlign:"left", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Source</th>
                    <th style={{ padding:"7px 14px", textAlign:"left", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Medium</th>
                    <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {(utmData.by_source || []).slice(0,10).map((row:any, i:number) => (
                    <tr key={i} style={{ borderTop:"1px solid var(--border)" }}>
                      <td style={{ padding:"7px 14px", color:"var(--text)", fontWeight:600 }}>
                        <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
                          background: row.source==="google"?"#4285f4":row.source==="pinterest"?"#e60023":row.source==="(direct)"?"var(--muted)":"var(--gold)",
                          marginRight:6 }}/>
                        {row.source}
                      </td>
                      <td style={{ padding:"7px 14px", color:"var(--muted)" }}>{row.medium}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", fontWeight:700, color:"var(--text)" }}>{row.visits}</td>
                    </tr>
                  ))}
                  {(!utmData.by_source || utmData.by_source.length === 0) && (
                    <tr><td colSpan={3} style={{ padding:"20px 14px", textAlign:"center", color:"var(--muted)", fontSize:12 }}>
                      No UTM traffic yet. Share links with utm_source= params to start tracking.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Top pages table */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".05em" }}>
                Top Landing Pages
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"rgba(0,0,0,.15)" }}>
                    <th style={{ padding:"7px 14px", textAlign:"left", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Page</th>
                    <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Visits</th>
                    <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Uniq.</th>
                  </tr>
                </thead>
                <tbody>
                  {(utmData.top_pages || []).slice(0,10).map((row:any, i:number) => (
                    <tr key={i} style={{ borderTop:"1px solid var(--border)" }}>
                      <td style={{ padding:"7px 14px", color:"var(--text)", fontFamily:"monospace", fontSize:11 }}>
                        {row.page_path.length > 38 ? "..." + row.page_path.slice(-35) : row.page_path}
                      </td>
                      <td style={{ padding:"7px 14px", textAlign:"right", fontWeight:700, color:"var(--text)" }}>{row.visits}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:"var(--muted)" }}>{row.unique_visitors}</td>
                    </tr>
                  ))}
                  {(!utmData.top_pages || utmData.top_pages.length === 0) && (
                    <tr><td colSpan={3} style={{ padding:"20px 14px", textAlign:"center", color:"var(--muted)", fontSize:12 }}>
                      No page data yet.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : utmLoading ? (
          <div style={{ padding:"24px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>Loading traffic data...</div>
        ) : (
          <div style={{ padding:"24px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>
            UTM tracking is active. Data appears as visitors arrive via UTM-tagged links.
          </div>
        )}
      </div>



      {/* ── UTM Link Builder ────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".6px", color:"var(--muted)" }}>
            UTM Link Builder
          </div>
          <span style={{ fontSize:11, color:"var(--muted)" }}>Generate tracked links for Pinterest, email, and social</span>
        </div>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"4px 16px 16px" }}>
          <UTMLinkBuilder />
        </div>
      </div>

      {/* ── GSC Keyword Widget ──────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".6px", color:"var(--muted)" }}>
            Google Search Console — Organic Keywords
          </div>
          <button onClick={loadGSC} disabled={gscLoading}
            style={{ fontSize:11, padding:"4px 10px", background:"var(--surface)",
              border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", color:"var(--muted)" }}>
            {gscLoading ? "Syncing..." : "↻ Refresh"}
          </button>
        </div>

        {gscData ? (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:14 }}>
              <div className="kpi-card" style={{ borderColor:"#4285f4", borderWidth:1 }}>
                <div className="kpi-label">Total Keywords</div>
                <div className="kpi-value" style={{ color:"#4285f4" }}>{gscData.total_queries || 0}</div>
              </div>
              {(gscData.by_vertical||[]).slice(0,3).map((v:any,i:number) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{v.vertical} impressions</div>
                  <div className="kpi-value">{v.impressions}</div>
                </div>
              ))}
            </div>

            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".05em" }}>
                Top Search Queries (last 28 days)
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"rgba(0,0,0,.15)" }}>
                    <th style={{ padding:"7px 14px", textAlign:"left", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Query</th>
                    <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Imp.</th>
                    <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Clicks</th>
                    <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Pos.</th>
                    <th style={{ padding:"7px 14px", textAlign:"left", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Vertical</th>
                  </tr>
                </thead>
                <tbody>
                  {(gscData.top_queries||[]).slice(0,12).map((row:any, i:number) => (
                    <tr key={i} onClick={() => setSelectedQuery(row)}
                      style={{ borderTop:"1px solid var(--border)", cursor:"pointer",
                        transition:"background .12s" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="rgba(66,133,244,.06)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="")}>
                      <td style={{ padding:"7px 14px", color:"#4285f4", fontWeight:600 }}>
                        <span style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:10, opacity:.6 }}>🔍</span>
                          {row.query}
                          <span style={{ fontSize:9, color:"var(--muted)", fontWeight:400,
                            background:"rgba(66,133,244,.1)", border:"1px solid rgba(66,133,244,.2)",
                            borderRadius:4, padding:"1px 5px", letterSpacing:".04em" }}>
                            AI ✦
                          </span>

                        </span>
                      </td>
                      <td style={{ padding:"7px 14px", textAlign:"right", fontWeight:700, color:"var(--text)" }}>{row.impressions}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color: row.clicks > 0 ? "var(--green)" : "var(--muted)" }}>{row.clicks}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color: Number(row.avg_position) <= 10 ? "var(--green)" : Number(row.avg_position) <= 30 ? "var(--amber)" : "var(--muted)" }}>
                        {Number(row.avg_position).toFixed(1)}
                      </td>
                      <td style={{ padding:"7px 14px", color:"var(--muted)", fontSize:11 }}>{row.vertical}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding:"8px 14px", fontSize:11, color:"var(--muted)", borderTop:"1px solid var(--border)" }}>
                Last synced: {gscData.last_synced ? new Date(gscData.last_synced).toLocaleString() : "never"} ·
                <button onClick={async () => {
                  await http.post("/gsc/sync", {});
                await http.post("/seo-content/sync-gsc", {}, ADM);
                  setTimeout(loadGSC, 15000);
                }} style={{ background:"none", border:"none", color:"#4285f4", cursor:"pointer", fontSize:11, marginLeft:6 }}>
                  Sync GSC → Topic Queue
                </button>
              </div>
            </div>
          </>
        ) : gscLoading ? (
          <div style={{ padding:"24px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>Loading keyword data...</div>
        ) : (
          <div style={{ padding:"24px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>
            GSC connected. Click Refresh to load keyword data.
          </div>
        )}
      </div>


      {/* ── Bing Webmaster Widget ─────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".6px", color:"var(--muted)" }}>
              Bing Webmaster Tools — Organic Keywords
            </div>
            <span style={{ fontSize:10, padding:"2px 7px", background:"rgba(0,120,212,.15)", border:"1px solid rgba(0,120,212,.3)", borderRadius:4, color:"#0078d4", fontWeight:700 }}>BING</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {bingData && !bingData.connected && (
              <span style={{ fontSize:11, color:"#f97316" }}>⚠ API key not set</span>
            )}
            <button onClick={loadBing} disabled={bingLoading}
              style={{ fontSize:11, padding:"4px 10px", background:"var(--surface)",
                border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", color:"var(--muted)" }}>
              {bingLoading ? "Syncing..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {bingData ? (
          bingData.connected ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:14 }}>
                <div className="kpi-card" style={{ borderColor:"#0078d4", borderWidth:1 }}>
                  <div className="kpi-label">Bing Keywords</div>
                  <div className="kpi-value" style={{ color:"#0078d4" }}>{bingData.total_queries || 0}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Last Synced</div>
                  <div style={{ fontSize:12, color:"var(--text)", fontWeight:600, marginTop:4 }}>
                    {bingData.last_synced ? new Date(bingData.last_synced).toLocaleDateString() : "Never"}
                  </div>
                </div>
              </div>

              {(bingData.top_queries||[]).length > 0 && (
                <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
                  <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".05em" }}>
                    Top Bing Queries (last 28 days)
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"rgba(0,0,0,.15)" }}>
                        <th style={{ padding:"7px 14px", textAlign:"left", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Query</th>
                        <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Imp.</th>
                        <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Clicks</th>
                        <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bingData.top_queries||[]).map((row:any, i:number) => (
                        <tr key={i} style={{ borderTop:"1px solid var(--border)" }}>
                          <td style={{ padding:"7px 14px", color:"var(--text)", fontWeight:500 }}>{row.query}</td>
                          <td style={{ padding:"7px 14px", textAlign:"right", fontWeight:700, color:"var(--text)" }}>{row.impressions}</td>
                          <td style={{ padding:"7px 14px", textAlign:"right", color: row.clicks > 0 ? "var(--green)" : "var(--muted)" }}>{row.clicks}</td>
                          <td style={{ padding:"7px 14px", textAlign:"right", color: Number(row.avg_position) <= 10 ? "var(--green)" : Number(row.avg_position) <= 30 ? "var(--amber)" : "var(--muted)" }}>
                            {Number(row.avg_position || 0).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding:"8px 14px", fontSize:11, color:"var(--muted)", borderTop:"1px solid var(--border)" }}>
                    <button onClick={async () => { await http.post("/bing/sync", {}); setTimeout(loadBing, 20000); }}
                      style={{ background:"none", border:"none", color:"#0078d4", cursor:"pointer", fontSize:11 }}>
                      Sync from Bing Webmaster Tools
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding:"20px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10 }}>
              <div style={{ fontSize:13, color:"var(--text)", fontWeight:700, marginBottom:6 }}>Connect Bing Webmaster Tools</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12, lineHeight:1.6 }}>
                1. Go to <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" style={{ color:"#0078d4" }}>bing.com/webmasters</a><br/>
                2. Click the ⚙️ Settings gear → <strong>API Access</strong><br/>
                3. Copy your API key<br/>
                4. POST it to: <code style={{ fontSize:11, color:"var(--gold)" }}>POST /api/bing/set-key</code> with body <code style={{ fontSize:11 }}>{`{"api_key":"YOUR_KEY"}`}</code>
              </div>
              <div style={{ fontSize:11, color:"var(--muted)", padding:"8px 12px", background:"rgba(0,120,212,.06)", border:"1px solid rgba(0,120,212,.2)", borderRadius:6 }}>
                Bing shows 16 impressions for nexabuilder.com — data available once API key is set.
              </div>
            </div>
          )
        ) : bingLoading ? (
          <div style={{ padding:"24px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>Loading Bing data...</div>
        ) : null}
      </div>


      {/* ── Conversions & Attribution Widget — #17 + #18 ──────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".6px", color:"var(--muted)" }}>
              Conversions & Attribution
            </div>
            <span style={{ fontSize:10, padding:"2px 7px", background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.3)", borderRadius:4, color:"var(--green)", fontWeight:700 }}>LIVE</span>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            {/* Group by selector */}
            {(["source","medium","campaign","vertical","day"] as const).map(g => (
              <button key={g} onClick={() => { setAttrGroup(g); loadAttribution(attrDays, g); }}
                style={{ padding:"3px 8px", fontSize:10, fontWeight:700, borderRadius:6, cursor:"pointer",
                  border: attrGroup===g ? "1.5px solid var(--blue)" : "1px solid var(--border)",
                  background: attrGroup===g ? "rgba(29,111,222,.1)" : "transparent",
                  color: attrGroup===g ? "var(--blue)" : "var(--muted)" }}>
                {g}
              </button>
            ))}
            {/* Days selector */}
            <select value={attrDays} onChange={e => { const d=Number(e.target.value); setAttrDays(d); loadAttribution(d, attrGroup); }}
              style={{ padding:"3px 8px", fontSize:11, borderRadius:6, border:"1px solid var(--border)",
                background:"var(--surface)", color:"var(--muted)", cursor:"pointer" }}>
              <option value={7}>7d</option><option value={30}>30d</option>
              <option value={60}>60d</option><option value={90}>90d</option>
            </select>
            <button onClick={() => loadAttribution(attrDays, attrGroup)} disabled={attrLoading}
              style={{ fontSize:11, padding:"4px 10px", background:"var(--surface)",
                border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", color:"var(--muted)" }}>
              {attrLoading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {attrData ? (
          <div>
            {/* KPI summary cards */}
            {attrData && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:14 }}>
                {[
                  { label:"Total Leads", value: (attrData.rows||[]).reduce((a:number,r:any)=>a+(r.leads||0),0), color:"var(--text)" },
                  { label:"Qualified", value: (attrData.rows||[]).reduce((a:number,r:any)=>a+(r.qualified||0),0), color:"var(--green)" },
                  { label:"Matched", value: (attrData.rows||[]).reduce((a:number,r:any)=>a+(r.matched||0),0), color:"var(--blue)" },
                  { label:"From Meta", value: (attrData.rows||[]).reduce((a:number,r:any)=>a+(r.from_meta||0),0), color:"#1877f2" },
                  { label:"From Google", value: (attrData.rows||[]).reduce((a:number,r:any)=>a+(r.from_google||0),0), color:"#4285f4" },
                ].map((kpi,i) => (
                  <div key={i} className="kpi-card" style={{ padding:"10px 14px" }}>
                    <div className="kpi-label">{kpi.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:kpi.color, marginTop:4 }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
            )}

          {/* Table */}
            {attrData.rows?.length > 0 ? (
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700,
                  color:"var(--muted)", textTransform:"uppercase", letterSpacing:".05em" }}>
                  Leads by {attrGroup} — last {attrDays} days
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"rgba(0,0,0,.12)" }}>
                      <th style={{ padding:"7px 14px", textAlign:"left", fontWeight:600, color:"var(--muted)", fontSize:11 }}>{attrGroup}</th>
                      <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Leads</th>
                      <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Qualified</th>
                      <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Matched</th>
                      <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Avg Score</th>
                      <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Meta</th>
                      <th style={{ padding:"7px 14px", textAlign:"right", fontWeight:600, color:"var(--muted)", fontSize:11 }}>Google</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attrData.rows||[]).map((row:any, i:number) => (
                      <tr key={i} style={{ borderTop:"1px solid var(--border)" }}>
                        <td style={{ padding:"7px 14px", fontWeight:600, color:"var(--text)",
                          maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {String(row.group_key || "direct").substring(0,40) || "(none)"}
                        </td>
                        <td style={{ padding:"7px 14px", textAlign:"right", fontWeight:700, color:"var(--text)" }}>
                          {row.leads}
                        </td>
                        <td style={{ padding:"7px 14px", textAlign:"right",
                          color: row.qualified > 0 ? "var(--green)" : "var(--muted)" }}>
                          {row.qualified || 0}
                        </td>
                        <td style={{ padding:"7px 14px", textAlign:"right",
                          color: row.matched > 0 ? "var(--blue)" : "var(--muted)" }}>
                          {row.matched || 0}
                        </td>
                        <td style={{ padding:"7px 14px", textAlign:"right",
                          color: (row.avg_ai_score||0) >= 60 ? "var(--green)" : (row.avg_ai_score||0) >= 40 ? "var(--amber)" : "var(--muted)" }}>
                          {row.avg_ai_score ?? "—"}
                        </td>
                        <td style={{ padding:"7px 14px", textAlign:"right", color: row.from_meta > 0 ? "#1877f2" : "var(--muted)" }}>
                          {row.from_meta > 0 ? `📘 ${row.from_meta}` : "—"}
                        </td>
                        <td style={{ padding:"7px 14px", textAlign:"right", color: row.from_google > 0 ? "#4285f4" : "var(--muted)" }}>
                          {row.from_google > 0 ? `🔍 ${row.from_google}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding:"8px 14px", fontSize:11, color:"var(--muted)", borderTop:"1px solid var(--border)",
                  display:"flex", justifyContent:"space-between" }}>
                  <span>{attrData.rows?.length || 0} rows · {attrDays}d window</span>
                  <a href="https://admin.nexabuilder.com/leads" style={{ color:"var(--blue)", fontSize:11, fontWeight:600 }}>
                    View all leads →
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ padding:"20px", background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:10, textAlign:"center", color:"var(--muted)", fontSize:13 }}>
                No rows for this grouping in the selected period.
                <div style={{ fontSize:11, marginTop:6, opacity:.7, lineHeight:1.6 }}>
                  Try switching to <strong>vertical</strong> or expanding to <strong>90d</strong>.<br/>
                  UTM attribution populates as new tracked leads come in.
                </div>
              </div>
            )}
          </div>
        ) : attrLoading ? (
          <div style={{ padding:"24px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>Loading attribution data...</div>
        ) : null}
      </div>

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
      {/* AI SEO Insight Panel */}
      <SEOInsightPanel
        row={selectedQuery}
        onClose={() => setSelectedQuery(null)}
      />
    </div>
  );
};
