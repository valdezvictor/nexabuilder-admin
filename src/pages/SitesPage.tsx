import { useState, useEffect, useCallback } from "react";
import {http} from "../lib/http";
const ADM={headers:{"X-Admin-Key":"GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU"}};

interface Site {
  id: string; name: string; domain: string; type: string; slug: string;
  block_count: number; article_count: number; has_bucket: boolean;
}
interface Block {
  id: number; tenant_id: string; page_slug: string; block_key: string;
  content_type: string; value: string; is_published: boolean; version: number; updated_at: string;
}
interface Article {
  id: number; site_id: string; slug: string; h1: string; seo_title: string;
  status: string; published_at: string; word_count: number; meta_description: string;
  category?: string;
}
interface ReviewResult {
  overall_score: number;
  scores: Record<string,number>;
  notes: string;
  recommendation: string;
}
interface GscSummary { impressions: number; clicks: number; avg_ctr: number; avg_pos: number; }
interface GscQuery  { query: string; imp: number; cli: number; pos: number; }

const TYPE_COLORS: Record<string,{bg:string;color:string}> = {
  main:       {bg:"#dbeafe",color:"#1d4ed8"},
  microsite:  {bg:"#dcfce7",color:"#166534"},
  admin:      {bg:"#f1f5f9",color:"#475569"},
  partner:    {bg:"#fef9c3",color:"#854d0e"},
  contractor: {bg:"#ede9fe",color:"#6d28d9"},
  lead:       {bg:"#fee2e2",color:"#991b1b"},
  agent:      {bg:"#f0fdf4",color:"#15803d"},
};





// ─── Critical Issues Tab ──────────────────────────────────────────────────────

interface CoverageIssue {
  id: number; domain: string; reason: string; source: string;
  validation: string; page_count: number; priority: string;
  status: string; notes: string | null; updated_at: string;
}

const PRIORITY_STYLE: Record<string,{bg:string;color:string}> = {
  high:   {bg:"#fee2e2",color:"#991b1b"},
  medium: {bg:"#fef9c3",color:"#854d0e"},
  low:    {bg:"#f1f5f9",color:"#475569"},
};
const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  open:        {bg:"#fee2e2",color:"#991b1b"},
  in_progress: {bg:"#fef9c3",color:"#854d0e"},
  resolved:    {bg:"#dcfce7",color:"#166534"},
  wontfix:     {bg:"#f1f5f9",color:"#475569"},
};

function CriticalIssuesTab({site}: {site: Site}) {
  const [issues, setIssues]       = useState<CoverageIssue[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<CoverageIssue|null>(null);
  const [insight, setInsight]     = useState<{loading:boolean;text:string|null}>({loading:false,text:null});
  const [statusMsg, setStatusMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await http.get(`/gsc/coverage?domain=${site.domain}`, ADM);
      setIssues(r.data.issues || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [site.domain]);

  const updateStatus = async (issue: CoverageIssue, status: string) => {
    try {
      await http.patch(`/gsc/coverage/${issue.id}`, {status}, ADM);
      setIssues(prev => prev.map(i => i.id===issue.id ? {...i, status} : i));
      if (selected?.id===issue.id) setSelected({...issue, status});
      setStatusMsg("✓ Updated");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch(e:any) { setStatusMsg("✗ Update failed"); }
  };

  const runAiAnalysis = async (issue: CoverageIssue) => {
    setInsight({loading:true, text:null});
    try {
      const r = await http.post(`/gsc/coverage/ai-fix/${issue.id}`, {}, ADM);
      setInsight({loading:false, text:r.data.insight});
      // Refresh to pick up saved notes
      load();
    } catch(e:any) {
      setInsight({loading:false, text:"Analysis failed. Try again."});
    }
  };

  const totalHigh   = issues.filter(i=>i.priority==="high"&&i.status!=="resolved").reduce((a,i)=>a+i.page_count,0);
  const totalMedium = issues.filter(i=>i.priority==="medium"&&i.status!=="resolved").reduce((a,i)=>a+i.page_count,0);
  const totalPages  = issues.reduce((a,i)=>a+i.page_count,0);

  const renderInsight = (text: string) => {
    return text.split(/^## /m).filter(Boolean).map((s,i) => {
      const nl = s.indexOf("\n");
      const heading = nl>0 ? s.slice(0,nl) : s;
      const body    = nl>0 ? s.slice(nl+1).trim() : "";
      return (
        <div key={i} style={{marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#60a5fa",marginBottom:5}}>## {heading}</div>
          <div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{body}</div>
        </div>
      );
    });
  };

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
      {/* Left — issue list */}
      <div style={{width:340,flexShrink:0,display:"flex",flexDirection:"column",borderRight:"1.5px solid var(--border)",overflow:"hidden"}}>
        {/* Summary bar */}
        <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",flexShrink:0,background:"var(--bg)"}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:8}}>Index Coverage — {site.domain}</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,background:"#fee2e2",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:"#991b1b"}}>{totalHigh}</div>
              <div style={{fontSize:10,fontWeight:700,color:"#991b1b"}}>HIGH PRIORITY PAGES</div>
            </div>
            <div style={{flex:1,background:"#fef9c3",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:"#854d0e"}}>{totalMedium}</div>
              <div style={{fontSize:10,fontWeight:700,color:"#854d0e"}}>MEDIUM PRIORITY</div>
            </div>
            <div style={{flex:1,background:"var(--card)",border:"1px solid var(--border)",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:"var(--muted)"}}>{totalPages}</div>
              <div style={{fontSize:10,fontWeight:700,color:"var(--muted)"}}>TOTAL AFFECTED</div>
            </div>
          </div>
        </div>
        {/* Issue rows */}
        <div style={{overflowY:"auto",flex:1}}>
          {loading ? <div style={{padding:16,color:"var(--muted)",fontSize:13}}>Loading…</div> :
            issues.length===0 ? <div style={{padding:16,color:"var(--muted)",fontSize:13}}>No coverage issues found.</div> :
            issues.map(issue => {
              const ps  = PRIORITY_STYLE[issue.priority]  || PRIORITY_STYLE.low;
              const ss  = STATUS_STYLE[issue.status]      || STATUS_STYLE.open;
              const isSel = selected?.id===issue.id;
              return (
                <div key={issue.id} onClick={()=>{setSelected(issue);setInsight({loading:false,text:issue.notes||null});}}
                  style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",cursor:"pointer",
                    background:isSel?"var(--bg)":"var(--card)",
                    borderLeft:isSel?`3px solid ${ps.color}`:"3px solid transparent",
                    opacity:issue.status==="resolved"||issue.status==="wontfix"?.6:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6,marginBottom:5}}>
                    <div style={{fontSize:12,fontWeight:700,lineHeight:1.4,flex:1}}>{issue.reason}</div>
                    <div style={{fontSize:18,fontWeight:900,color:ps.color,flexShrink:0}}>{issue.page_count}</div>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,...ps}}>{issue.priority.toUpperCase()}</span>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,...ss}}>{issue.status.replace("_"," ").toUpperCase()}</span>
                    <span style={{fontSize:9,color:"var(--muted)",marginLeft:"auto"}}>{issue.source}</span>
                  </div>
                  {issue.notes && <div style={{fontSize:10,color:"var(--muted)",marginTop:4,lineHeight:1.4,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✦ AI analysis saved</div>}
                </div>
              );
            })
          }
        </div>
        {statusMsg&&<div style={{padding:"8px 14px",fontSize:12,fontWeight:600,
          color:statusMsg.startsWith("✓")?"var(--green)":"#dc2626",
          borderTop:"1px solid var(--border)"}}>{statusMsg}</div>}
      </div>

      {/* Right — detail panel */}
      {selected ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#141b26"}}>
          {/* Header */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1e2d42",flexShrink:0,background:"rgba(0,0,0,.2)"}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"#4285f4",marginBottom:4}}>
              Coverage Issue
            </div>
            <div style={{fontSize:15,fontWeight:800,color:"#fff",lineHeight:1.3,marginBottom:8}}>
              {selected.reason}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:22,fontWeight:900,...PRIORITY_STYLE[selected.priority]||PRIORITY_STYLE.low,
                padding:"2px 10px",borderRadius:6}}>{selected.page_count} pages</span>
              {/* Status buttons */}
              {(["open","in_progress","resolved","wontfix"] as const).map(s=>(
                <button key={s} onClick={()=>updateStatus(selected,s)}
                  style={{padding:"4px 10px",fontSize:10,fontWeight:700,borderRadius:5,
                    border:"none",cursor:"pointer",fontFamily:"inherit",
                    ...(selected.status===s ? STATUS_STYLE[s]||STATUS_STYLE.open : {background:"#1e2d42",color:"#8b9ab0"})}}>
                  {s.replace("_"," ").toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {/* Action bar */}
          <div style={{padding:"10px 16px",borderBottom:"1px solid #1e2d42",flexShrink:0,display:"flex",gap:8}}>
            <button disabled={insight.loading} onClick={()=>runAiAnalysis(selected)}
              style={{padding:"6px 14px",background:insight.loading?"#1e2d42":"#4285f4",color:"#fff",
                border:"none",borderRadius:7,fontWeight:700,fontSize:12,
                cursor:insight.loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {insight.loading?"⏳ Analyzing…":"⚡ AI Fix Analysis"}
            </button>
            {selected.notes&&!insight.text&&(
              <button onClick={()=>setInsight({loading:false,text:selected.notes!})}
                style={{padding:"6px 12px",background:"#1e2d42",color:"#8b9ab0",
                  border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                📋 Load Saved Analysis
              </button>
            )}
          </div>
          {/* Content */}
          <div style={{flex:1,overflowY:"auto",padding:16}}>
            {insight.loading && (
              <div style={{textAlign:"center",padding:"40px 0",color:"#8b9ab0"}}>
                <div style={{fontSize:24,marginBottom:8}}>⏳</div>
                <div style={{fontSize:12}}>Analyzing with Claude…</div>
              </div>
            )}
            {insight.text && !insight.loading && (
              <div>
                {renderInsight(insight.text)}
                <button onClick={()=>runAiAnalysis(selected)}
                  style={{marginTop:12,padding:"5px 12px",background:"none",
                    border:"1px solid #3b5270",borderRadius:6,color:"#8b9ab0",
                    cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                  ↻ Re-analyze
                </button>
              </div>
            )}
            {!insight.loading && !insight.text && (
              <div style={{color:"#8b9ab0",fontSize:13,textAlign:"center",padding:"40px 0",lineHeight:1.9}}>
                <div style={{fontSize:28,marginBottom:10}}>⚠</div>
                <div style={{fontWeight:700,color:"#fff",marginBottom:8}}>{selected.reason}</div>
                <div style={{fontSize:12,marginBottom:20}}>
                  Affects <strong style={{color:"#f87171"}}>{selected.page_count} pages</strong><br/>
                  Source: {selected.source} · Priority: {selected.priority}
                </div>
                <button onClick={()=>runAiAnalysis(selected)}
                  style={{padding:"10px 20px",background:"#4285f4",color:"#fff",
                    border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  ⚡ Get AI Fix Analysis
                </button>
                <div style={{fontSize:11,marginTop:12,color:"#4b5563"}}>
                  Claude will explain why this is happening<br/>and give you exact steps to fix it.
                </div>
              </div>
            )}
          </div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
          flexDirection:"column",gap:8,color:"var(--muted)",background:"#141b26"}}>
          <div style={{fontSize:28}}>⚠</div>
          <div style={{fontWeight:700,color:"#8b9ab0"}}>Select an issue to analyze</div>
          <div style={{fontSize:12,color:"#4b5563"}}>Click any row to view details and get AI fix recommendations</div>
        </div>
      )}
    </div>
  );
}

// ─── GSC Sites Panel ──────────────────────────────────────────────────────────

function GscSitesPanel({site}: {site: Site}) {
  const [gscSites, setGscSites]   = useState<any[]>([]);
  const [syncing, setSyncing]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText]     = useState("");
  const [showImport, setShowImport] = useState(false);
  const [msg, setMsg]             = useState("");

  useEffect(() => {
    http.get("/gsc/sites", ADM).then(r => setGscSites(r.data.sites || [])).catch(()=>{});
  }, []);

  const syncAll = async () => {
    setSyncing(true); setMsg("⏳ Syncing all GSC properties…");
    try {
      const r = await http.post("/gsc/sync-all", {}, ADM);
      setMsg(`✓ Sync triggered for: ${(r.data.properties||[]).join(", ")}`);
      setTimeout(() => {
        http.get("/gsc/sites", ADM).then(r => setGscSites(r.data.sites || []));
      }, 5000);
    } catch(e:any) { setMsg("✗ " + (e?.response?.data?.detail || e.message)); }
    setSyncing(false);
  };

  const importCsv = async () => {
    if (!csvText.trim()) return;
    setImporting(true); setMsg("⏳ Parsing CSV…");
    try {
      // Parse CSV — GSC format: Top queries/pages, Clicks, Impressions, CTR, Position
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());
      const qIdx = headers.findIndex(h => h.includes("quer") || h.includes("page"));
      const cIdx = headers.findIndex(h => h==="clicks");
      const iIdx = headers.findIndex(h => h==="impressions");
      const ctrIdx = headers.findIndex(h => h==="ctr");
      const posIdx = headers.findIndex(h => h==="position");
      const rows = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g,""));
        return {
          query: qIdx>=0 ? cols[qIdx] : "",
          page:  "",
          clicks: parseInt(cols[cIdx] || "0") || 0,
          impressions: parseInt(cols[iIdx] || "0") || 0,
          ctr: parseFloat((cols[ctrIdx] || "0").replace("%","")) / 100 || 0,
          position: parseFloat(cols[posIdx] || "0") || 0,
        };
      }).filter(r => r.query || r.page);

      const r = await http.post("/gsc/import-csv", {domain: site.domain, rows}, ADM);
      setMsg(`✓ Imported ${r.data.inserted} rows for ${site.domain}`);
      setCsvText(""); setShowImport(false);
      http.get("/gsc/sites", ADM).then(r => setGscSites(r.data.sites || []));
    } catch(e:any) { setMsg("✗ " + (e?.response?.data?.detail || e.message)); }
    setImporting(false);
  };

  const thisSite = gscSites.find(s => s.domain === site.domain);

  return (
    <div style={{flexShrink:0,borderTop:"1.5px solid var(--border)",padding:"12px 16px",background:"var(--bg)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <div style={{fontWeight:700,fontSize:12,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.4}}>
          GSC Property Status
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>setShowImport(v=>!v)}
            style={{padding:"4px 10px",fontSize:11,fontWeight:700,border:"1.5px solid var(--border)",
              borderRadius:6,background:showImport?"var(--navy)":"none",color:showImport?"#fff":"var(--text)",
              cursor:"pointer",fontFamily:"inherit"}}>
            ⬆ Import CSV
          </button>
          <button disabled={syncing} onClick={syncAll}
            style={{padding:"4px 10px",fontSize:11,fontWeight:700,border:"1.5px solid var(--border)",
              borderRadius:6,background:"none",cursor:syncing?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {syncing?"⏳":"↻"} Sync All
          </button>
        </div>
      </div>

      {thisSite&&(
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>
          <span style={{marginRight:12}}>
            <strong style={{color:"var(--text)"}}>{thisSite.row_count || 0}</strong> cached queries
          </span>
          <span style={{marginRight:12}}>
            Last sync: <strong style={{color:"var(--text)"}}>{thisSite.last_synced_at ? new Date(thisSite.last_synced_at).toLocaleDateString() : "never"}</strong>
          </span>
          <span style={{padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:700,
            background:(thisSite.row_count||0)>0?"#dcfce7":"#fee2e2",
            color:(thisSite.row_count||0)>0?"#166534":"#991b1b"}}>
            {(thisSite.row_count||0)>0?"CONNECTED":"NO DATA"}
          </span>
        </div>
      )}

      {!thisSite&&(
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>
          Add <strong>{site.domain}</strong> to Google Search Console, then use Import CSV or connect via OAuth.
        </div>
      )}

      {showImport&&(
        <div style={{marginTop:8}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6,lineHeight:1.5}}>
            Paste CSV from GSC → Performance → Queries tab. Headers: <em>Top queries, Clicks, Impressions, CTR, Position</em>
          </div>
          <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} placeholder="Top queries,Clicks,Impressions,CTR,Position&#10;ejemplo de busqueda,0,45,0%,23.4"
            style={{width:"100%",height:120,padding:8,border:"1.5px solid var(--border)",borderRadius:6,
              fontSize:11,fontFamily:"monospace",resize:"vertical",background:"var(--card)",color:"var(--text)"}}/>
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <button disabled={importing||!csvText.trim()} onClick={importCsv}
              style={{padding:"5px 14px",background:"var(--navy)",color:"#fff",border:"none",
                borderRadius:6,fontWeight:700,fontSize:11,cursor:importing?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {importing?"⏳ Importing…":"Import"}
            </button>
            <button onClick={()=>{setShowImport(false);setCsvText("");}}
              style={{padding:"5px 10px",background:"none",border:"1px solid var(--border)",
                borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {msg&&<div style={{fontSize:11,fontWeight:600,marginTop:6,
        color:msg.startsWith("✓")?"var(--green)":"#dc2626"}}>{msg}</div>}
    </div>
  );
}

// ─── GSC Intelligence Tab ─────────────────────────────────────────────────────

interface GscRow { query: string; imp: number; cli: number; pos: number; }
interface GscData { summary: GscSummary; top_queries: GscRow[]; domain?: string; }

function GscTab({site, gsc}: {site: Site; gsc: GscData|null}) {
  const [insight, setInsight] = useState<{loading:boolean;text:string|null;error:string|null}>({loading:false,text:null,error:null});
  const [activeRow, setActiveRow] = useState<GscRow|null>(null);

  const runAnalysis = async (row: GscRow) => {
    setActiveRow(row);
    setInsight({loading:true,text:null,error:null});
    try {
      const r = await http.post("/ai/seo-insights-site", {
        query:      row.query,
        page:       `/${site.slug}/`,
        impressions: row.imp,
        clicks:     row.cli,
        position:   row.pos,
        vertical:   site.type,
        domain:     site.domain,
        site_name:  site.name,
        language:   ["unapiscina","eelectricista","piscinasy","losruferos","ijardinero"].includes(site.slug) ? "es" : "en",
      }, ADM);
      setInsight({loading:false,text:r.data.insight,error:null});
    } catch(e:any) {
      setInsight({loading:false,text:null,error:"Analysis failed. Try again."});
    }
  };

  const posColor = (p: number) => p<=10?"var(--green)":p<=30?"#d97706":"var(--muted)";

  const renderInsight = (text: string) => {
    const sections = text.split(/^## /m).filter(Boolean);
    return sections.map((s,i) => {
      const [heading, ...rest] = s.split('\n');
      const body = rest.join('\n').trim();
      return (
        <div key={i} style={{marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:13,color:"#60a5fa",marginBottom:6}}>## {heading}</div>
          <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{body}</div>
        </div>
      );
    });
  };

  if (!gsc) return <div style={{padding:20,color:"var(--muted)"}}>Loading GSC data…</div>;

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
      {/* Left — stats + query table */}
      <div style={{flex:1,overflowY:"auto",padding:16,minWidth:0}}>
        {/* Summary stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
          {[
            {label:"Impressions",val:gsc.summary.impressions||0},
            {label:"Clicks",val:gsc.summary.clicks||0},
            {label:"Avg CTR",val:`${gsc.summary.avg_ctr||0}%`},
            {label:"Avg Position",val:gsc.summary.avg_pos||"—"},
          ].map(s=>(
            <div key={s.label} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 14px"}}>
              <div style={{fontSize:10,color:"var(--muted)",fontWeight:600,marginBottom:3,textTransform:"uppercase",letterSpacing:.4}}>{s.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--navy)"}}>{String(s.val)}</div>
            </div>
          ))}
        </div>

        {/* Query table */}
        <div style={{fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>Top Queries</span>
          {gsc.top_queries.length===0&&<span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>No data — GSC data syncs nightly</span>}
        </div>
        {gsc.top_queries.length===0?(
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"20px 16px",
            textAlign:"center",color:"var(--muted)",fontSize:13}}>
            No GSC data in database for {gsc.domain}.<br/>
            <span style={{fontSize:12}}>GSC data syncs from nexabuilder.com only. Micro-site data is from the session CSV import.</span>
          </div>
        ):(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:"2px solid var(--border)"}}>
                <th style={{textAlign:"left",padding:"8px 10px",fontWeight:700,fontSize:11,color:"var(--muted)"}}>QUERY</th>
                <th style={{textAlign:"right",padding:"8px 10px",fontWeight:700,fontSize:11,color:"var(--muted)"}}>IMPR</th>
                <th style={{textAlign:"right",padding:"8px 10px",fontWeight:700,fontSize:11,color:"var(--muted)"}}>CLICKS</th>
                <th style={{textAlign:"right",padding:"8px 10px",fontWeight:700,fontSize:11,color:"var(--muted)"}}>POS</th>
                <th style={{padding:"8px 10px"}}></th>
              </tr>
            </thead>
            <tbody>
              {gsc.top_queries.map((q,i)=>(
                <tr key={i} style={{borderBottom:"1px solid var(--border)",
                  background:activeRow?.query===q.query?"var(--bg)":"transparent",cursor:"pointer"}}
                  onClick={()=>runAnalysis(q)}>
                  <td style={{padding:"9px 10px"}}>
                    {q.query}
                    <span style={{marginLeft:6,fontSize:9,fontWeight:700,
                      background:"rgba(66,133,244,.12)",border:"1px solid rgba(66,133,244,.25)",
                      borderRadius:3,padding:"1px 5px",color:"#4285f4",letterSpacing:".04em"}}>AI ✦</span>
                  </td>
                  <td style={{padding:"9px 10px",textAlign:"right",fontWeight:700}}>{q.imp}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:q.cli>0?"var(--green)":"var(--muted)"}}>{q.cli}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",fontWeight:700,color:posColor(q.pos)}}>{q.pos}</td>
                  <td style={{padding:"9px 10px"}}>
                    <button onClick={e=>{e.stopPropagation();runAnalysis(q);}}
                      style={{padding:"3px 8px",fontSize:10,fontWeight:700,background:"var(--navy)",
                        color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit"}}>
                      AI+
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CSV Import + Sites Status — below the query table */}
      <GscSitesPanel site={site}/>
      {/* Right — AI insight panel */}
      {activeRow&&(
        <div style={{width:340,flexShrink:0,borderLeft:"1.5px solid var(--border)",overflowY:"auto",
          background:"#141b26",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1e2d42",flexShrink:0,
            background:"rgba(0,0,0,.2)",position:"sticky",top:0}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"#4285f4",marginBottom:4}}>
              SEO Intelligence
            </div>
            <div style={{fontSize:13,fontWeight:800,color:"#fff",lineHeight:1.3,wordBreak:"break-word"}}>
              "{activeRow.query}"
            </div>
            <div style={{display:"flex",gap:12,marginTop:6,fontSize:11,color:"#8b9ab0"}}>
              <span>Pos: <strong style={{color:posColor(activeRow.pos)}}>{activeRow.pos}</strong></span>
              <span>Impr: {activeRow.imp}</span>
              <span>Clicks: {activeRow.cli}</span>
            </div>
          </div>
          <div style={{flex:1,padding:16,overflowY:"auto"}}>
            {insight.loading&&(
              <div style={{textAlign:"center",padding:"40px 0",color:"#8b9ab0"}}>
                <div style={{fontSize:24,marginBottom:8}}>⏳</div>
                <div style={{fontSize:12}}>Analyzing with Claude…</div>
              </div>
            )}
            {insight.error&&(
              <div style={{color:"#f87171",fontSize:13,padding:"12px",background:"rgba(248,113,113,.1)",borderRadius:8}}>
                {insight.error}
                <button onClick={()=>runAnalysis(activeRow)}
                  style={{display:"block",marginTop:8,padding:"4px 10px",background:"none",
                    border:"1px solid #f87171",borderRadius:5,color:"#f87171",cursor:"pointer",fontSize:11}}>
                  ↻ Retry
                </button>
              </div>
            )}
            {insight.text&&(
              <div>
                {renderInsight(insight.text)}
                <button onClick={()=>runAnalysis(activeRow)}
                  style={{marginTop:16,padding:"6px 14px",background:"none",border:"1px solid #3b5270",
                    borderRadius:7,color:"#8b9ab0",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                  ↻ Re-analyze
                </button>
              </div>
            )}
            {!insight.loading&&!insight.text&&!insight.error&&(
              <div style={{color:"#8b9ab0",fontSize:13,textAlign:"center",padding:"40px 0",lineHeight:1.8}}>
                <div style={{fontSize:24,marginBottom:8}}>🔍</div>
                Click <strong style={{color:"#4285f4"}}>AI+</strong> on any query<br/>
                to get specific recommendations<br/>
                for improving its ranking.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Articles Tab Component ────────────────────────────────────────────────

function ArticlesTab({site, onRefresh}: {site: Site; onRefresh: ()=>void}) {
  const [articles, setArticles]     = useState<Article[]>([]);
  const [loading, setLoading]       = useState(true);
  const [keyword, setKeyword]       = useState("");
  const [titleHint, setTitleHint]   = useState("");
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg]         = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [topicIdeas, setTopicIdeas] = useState<any[]>([]);
  const [selected, setSelected]     = useState<Article|null>(null);
  const [body, setBody]             = useState("");
  const [editingBody, setEditingBody] = useState(false);
  const [reviewing, setReviewing]   = useState(false);
  const [review, setReview]         = useState<ReviewResult|null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deploying, setDeploying]   = useState(false);
  const [suggestingMeta, setSuggestingMeta] = useState(false);
  const [metaSuggestion, setMetaSuggestion] = useState<{seo_title:string;meta_description:string}|null>(null);
  const [actionMsg, setActionMsg]   = useState("");

  const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
    published: {bg:"#dcfce7",color:"#166534"},
    draft:     {bg:"#fef9c3",color:"#854d0e"},
    archived:  {bg:"#f1f5f9",color:"#475569"},
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await http.get(`/blog/admin/${site.slug}`, ADM);
      setArticles(r.data.articles || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [site.slug]);

  useEffect(() => { load(); }, [load]);

  const discoverTopics = async () => {
    if (!keyword.trim()) return;
    setDiscovering(true); setTopicIdeas([]);
    try {
      const r = await http.post("/ai/topic-discovery", {
        site_id:  site.slug,
        seed:     keyword.trim(),
        language: ["unapiscina","eelectricista","piscinasy","losruferos","ijardinero"].includes(site.slug) ? "es" : "en",
        count: 8,
      }, ADM);
      setTopicIdeas(r.data.topics || []);
    } catch(e:any) { setGenMsg("✗ Topic discovery failed"); }
    setDiscovering(false);
  };

  const suggestMeta = async () => {
    if (!selected) return;
    setSuggestingMeta(true); setMetaSuggestion(null); setActionMsg("⏳ Suggesting meta…");
    try {
      const r = await http.post(`/blog/admin/article/${selected.id}/suggest-meta`, {
        h1: selected.h1, primary_keyword: selected.slug, cdm_notes: review?.notes || "",
      }, ADM);
      setMetaSuggestion(r.data); setActionMsg("");
    } catch(e:any) { setActionMsg("✗ Meta suggestion failed"); }
    setSuggestingMeta(false);
  };

  const openArticle = async (art: Article) => {
    setSelected(art); setReview(null); setActionMsg(""); setEditingBody(false);
    const r = await http.get(`/blog/admin/article/${art.id}`, ADM);
    setBody(r.data.body_html || "");
  };

  const generate = async () => {
    if (!keyword.trim()) return;
    setGenerating(true); setGenMsg("⏳ Generating article with Claude…");
    try {
      const r = await http.post(`/blog/admin/${site.slug}/generate`,
        {keyword: keyword.trim(), title_hint: titleHint.trim()}, ADM);
      setGenMsg(`✓ Created: "${r.data.h1}" (${r.data.word_count} words)`);
      setKeyword(""); setTitleHint("");
      await load();
    } catch(e:any) {
      setGenMsg("✗ " + (e?.response?.data?.detail || e.message));
    }
    setGenerating(false);
  };

  const saveBody = async () => {
    if (!selected) return;
    await http.put(`/blog/admin/article/${selected.id}`, {body_html: body}, ADM);
    setEditingBody(false); setActionMsg("✓ Saved");
  };

  const runReview = async () => {
    if (!selected) return;
    setReviewing(true); setActionMsg("⏳ AI Review running…"); setReview(null);
    try {
      const r = await http.post(`/blog/admin/article/${selected.id}/review`, {}, ADM);
      setReview(r.data); setActionMsg("");
    } catch(e:any) { setActionMsg("✗ " + (e?.response?.data?.detail || e.message)); }
    setReviewing(false);
  };

  const publish = async () => {
    if (!selected) return;
    setPublishing(true); setActionMsg("⏳ Publishing…");
    try {
      await http.post(`/blog/${selected.id}/publish`, {}, ADM);
      setActionMsg("✓ Published in DB");
      setSelected({...selected, status:"published"});
      await load();
    } catch(e:any) { setActionMsg("✗ " + (e?.response?.data?.detail || e.message)); }
    setPublishing(false);
  };

  const deploy = async () => {
    if (!selected) return;
    setDeploying(true); setActionMsg("⏳ Deploying to S3…");
    try {
      const r = await http.post(`/blog/admin/article/${selected.id}/deploy`, {}, ADM);
      setActionMsg(`✓ Live at ${r.data.url}`);
    } catch(e:any) { setActionMsg("✗ " + (e?.response?.data?.detail || e.message)); }
    setDeploying(false);
  };

  const scoreColor = (s: number) => s>=80?"#166534":s>=65?"#854d0e":"#991b1b";
  const scoreBg    = (s: number) => s>=80?"#dcfce7":s>=65?"#fef9c3":"#fee2e2";

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
      {/* Article list */}
      <div style={{width:280,flexShrink:0,borderRight:"1.5px solid var(--border)",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Generate form */}
        <div style={{padding:12,borderBottom:"1px solid var(--border)",flexShrink:0,background:"var(--bg)"}}>
          <div style={{fontWeight:700,fontSize:12,color:"var(--muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Generate New Article</div>
          {topicIdeas.length===0?(
            <>
              <input placeholder="Keyword or seed topic" value={keyword}
                onChange={e=>setKeyword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&generate()}
                style={{width:"100%",padding:"7px 10px",border:"1.5px solid var(--border)",borderRadius:6,
                  fontSize:12,marginBottom:6,fontFamily:"inherit",background:"#fff",color:"var(--text)"}}/>
              <input placeholder="Focus / angle (optional)" value={titleHint}
                onChange={e=>setTitleHint(e.target.value)}
                style={{width:"100%",padding:"7px 10px",border:"1.5px solid var(--border)",borderRadius:6,
                  fontSize:12,marginBottom:6,fontFamily:"inherit",background:"#fff",color:"var(--text)"}}/>
              <div style={{display:"flex",gap:5,marginBottom:genMsg?6:0}}>
                <button disabled={generating||!keyword.trim()} onClick={generate}
                  style={{flex:1,padding:"7px",background:generating?"var(--muted)":"var(--navy)",
                    color:"#fff",border:"none",borderRadius:7,fontWeight:700,fontSize:11,
                    cursor:generating||!keyword.trim()?"not-allowed":"pointer",fontFamily:"inherit"}}>
                  {generating?"⏳ Writing…":"✦ Generate"}
                </button>
                <button disabled={discovering||!keyword.trim()} onClick={discoverTopics}
                  style={{flex:1,padding:"7px",background:discovering?"var(--muted)":"var(--card)",
                    color:"var(--text)",border:"1.5px solid var(--border)",borderRadius:7,fontWeight:700,fontSize:11,
                    cursor:discovering||!keyword.trim()?"not-allowed":"pointer",fontFamily:"inherit"}}>
                  {discovering?"⏳ Ideas…":"💡 Topic Ideas"}
                </button>
              </div>
            </>
          ):(
            <div>
              <div style={{fontWeight:700,fontSize:11,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
                <span>Topic Ideas for "{keyword}"</span>
                <button onClick={()=>setTopicIdeas([])} style={{background:"none",border:"none",
                  color:"var(--muted)",cursor:"pointer",fontSize:11}}>✕ Clear</button>
              </div>
              {topicIdeas.map((t,i)=>(
                <div key={i} onClick={()=>{setKeyword(t.primary_keyword);setTitleHint(t.title_hint);setTopicIdeas([]);}}
                  style={{padding:"8px 10px",marginBottom:5,borderRadius:6,cursor:"pointer",
                    border:"1px solid var(--border)",background:"var(--card)"}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:2}}>{t.primary_keyword}</div>
                  <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.4}}>{t.title_hint}</div>
                  <div style={{display:"flex",gap:6,marginTop:4}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,
                      background:"var(--bg)",color:"var(--muted)"}}>{t.search_intent}</span>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,
                      background:t.difficulty==="easy"?"#dcfce7":t.difficulty==="medium"?"#fef9c3":"#fee2e2",
                      color:t.difficulty==="easy"?"#166534":t.difficulty==="medium"?"#854d0e":"#991b1b"}}>
                      {t.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {genMsg&&<div style={{fontSize:11,marginTop:4,fontWeight:600,
            color:genMsg.startsWith("✓")?"var(--green)":"#dc2626",lineHeight:1.4}}>{genMsg}</div>}
        </div>
        {/* Article list */}
        <div style={{overflowY:"auto",flex:1}}>
          {loading?<div style={{padding:16,color:"var(--muted)",fontSize:13}}>Loading…</div>:
            articles.length===0?<div style={{padding:16,color:"var(--muted)",fontSize:13}}>No articles yet.<br/>Generate one above.</div>:
            articles.map(a=>{
              const sc = STATUS_COLORS[a.status]||STATUS_COLORS.draft;
              const isSel = selected?.id===a.id;
              return (
                <div key={a.id} onClick={()=>openArticle(a)}
                  style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid var(--border)",
                    background:isSel?"var(--bg)":"var(--card)",
                    borderLeft:isSel?"3px solid var(--navy)":"3px solid transparent"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:3,lineHeight:1.3}}>
                    {a.h1||a.seo_title||a.slug}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,color:"var(--muted)"}}>{a.word_count||0}w</span>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,
                      background:sc.bg,color:sc.color}}>{a.status.toUpperCase()}</span>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Article detail */}
      {selected ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:2}}>{selected.h1||selected.slug}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{selected.slug} · {selected.word_count||0} words · {selected.status}</div>
            {actionMsg&&<div style={{fontSize:12,fontWeight:600,marginTop:4,
              color:actionMsg.startsWith("✓")?"var(--green)":"#dc2626"}}>{actionMsg}</div>}
          </div>

          {/* Action bar */}
          <div style={{padding:"8px 16px",borderBottom:"1px solid var(--border)",flexShrink:0,
            display:"flex",gap:8,flexWrap:"wrap",background:"var(--bg)"}}>
            <button disabled={reviewing} onClick={runReview}
              style={{padding:"6px 12px",background:"var(--card)",border:"1.5px solid var(--border)",
                borderRadius:7,fontWeight:700,fontSize:11,cursor:reviewing?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {reviewing?"⏳ Reviewing…":"⚡ AI Review"}
            </button>
            {selected.status!=="published"&&(
              <button disabled={publishing} onClick={publish}
                style={{padding:"6px 12px",background:"var(--blue)",color:"#fff",border:"none",
                  borderRadius:7,fontWeight:700,fontSize:11,cursor:publishing?"not-allowed":"pointer",fontFamily:"inherit"}}>
                {publishing?"⏳":"↑ Publish"}
              </button>
            )}
            {selected.status==="published"&&(
              <button disabled={deploying} onClick={deploy}
                style={{padding:"6px 12px",background:"var(--navy)",color:"#fff",border:"none",
                  borderRadius:7,fontWeight:700,fontSize:11,cursor:deploying?"not-allowed":"pointer",fontFamily:"inherit"}}>
                {deploying?"⏳ Deploying…":"🚀 Deploy to S3"}
              </button>
            )}
            <button onClick={()=>setEditingBody(v=>!v)}
              style={{padding:"6px 12px",background:"none",border:"1.5px solid var(--border)",
                borderRadius:7,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {editingBody?"Close Editor":"✏ Edit Body"}
            </button>
            {editingBody&&(
              <button onClick={saveBody}
                style={{padding:"6px 12px",background:"var(--green)",color:"#fff",border:"none",
                  borderRadius:7,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                💾 Save
              </button>
            )}
            <button disabled={suggestingMeta} onClick={suggestMeta}
              style={{padding:"6px 12px",background:"none",border:"1.5px solid #4285f4",
                borderRadius:7,fontWeight:700,fontSize:11,cursor:suggestingMeta?"not-allowed":"pointer",
                color:"#4285f4",fontFamily:"inherit"}}>
              {suggestingMeta?"⏳":"✦ AI Meta"}
            </button>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:16}}>
            {/* Review result */}
            {review&&(
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,
                padding:14,marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{fontSize:28,fontWeight:900,
                    color:scoreColor(review.overall_score)}}>{review.overall_score}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>AI Review Score</div>
                    <div style={{fontSize:11,fontWeight:600,
                      padding:"1px 8px",borderRadius:4,display:"inline-block",marginTop:2,
                      background:scoreBg(review.overall_score),color:scoreColor(review.overall_score)}}>
                      {review.recommendation?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {Object.entries(review.scores||{}).map(([k,v])=>(
                    <div key={k} style={{fontSize:10,padding:"2px 8px",borderRadius:10,
                      background:scoreBg(Number(v)*10),color:scoreColor(Number(v)*10),fontWeight:700}}>
                      {k}: {v}/10
                    </div>
                  ))}
                </div>
                {review.notes&&<div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6,
                  background:"var(--bg)",padding:10,borderRadius:6}}>{review.notes}</div>}
              </div>
            )}

            {/* Meta suggestion */}
            {metaSuggestion&&(
              <div style={{background:"var(--card)",border:"1.5px solid #4285f4",borderRadius:10,
                padding:14,marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"#4285f4"}}>✦ AI Meta Suggestion</div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",marginBottom:3}}>
                    SEO TITLE ({metaSuggestion.seo_title.length} chars)
                  </div>
                  <div style={{fontSize:13,fontWeight:700,background:"var(--bg)",padding:"6px 10px",borderRadius:6}}>
                    {metaSuggestion.seo_title}
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",marginBottom:3}}>
                    META DESCRIPTION ({metaSuggestion.meta_description.length} chars)
                  </div>
                  <div style={{fontSize:13,background:"var(--bg)",padding:"6px 10px",borderRadius:6,lineHeight:1.5}}>
                    {metaSuggestion.meta_description}
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={async()=>{
                    await http.put(`/blog/admin/article/${selected!.id}`,
                      {seo_title:metaSuggestion.seo_title,meta_description:metaSuggestion.meta_description},ADM);
                    setActionMsg("✓ Meta saved"); setMetaSuggestion(null);
                  }} style={{padding:"5px 12px",background:"var(--navy)",color:"#fff",border:"none",
                    borderRadius:6,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                    Apply
                  </button>
                  <button onClick={()=>setMetaSuggestion(null)}
                    style={{padding:"5px 10px",background:"none",border:"1px solid var(--border)",
                      borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {/* Body editor or preview */}
            {editingBody?(
              <textarea value={body} onChange={e=>setBody(e.target.value)}
                style={{width:"100%",minHeight:500,padding:12,border:"1.5px solid var(--border)",
                  borderRadius:8,fontSize:12,fontFamily:"monospace",resize:"vertical",
                  background:"var(--bg)",color:"var(--text)",lineHeight:1.6}}/>
            ):(
              <div style={{fontSize:14,lineHeight:1.8,color:"var(--text)"}}
                dangerouslySetInnerHTML={{__html: body || "<p style='color:var(--muted)'>No body content yet.</p>"}}/>
            )}
          </div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
          color:"var(--muted)",flexDirection:"column",gap:8}}>
          <div style={{fontSize:28}}>📝</div>
          <div style={{fontWeight:700}}>Select or generate an article</div>
        </div>
      )}
    </div>
  );
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState<Site|null>(null);
  const [tab, setTab] = useState<"overview"|"legal"|"articles"|"gsc"|"issues">("overview");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [gsc, setGsc] = useState<{summary:GscSummary;top_queries:GscQuery[];domain?:string}|null>(null);
  const [editBlock, setEditBlock] = useState<Block|null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"all"|"microsite"|"main">("all");

  const loadSites = useCallback(async () => {
    const r = await http.get("/sites", ADM);
    setSites(r.data.sites || []);
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  const selectSite = async (site: Site) => {
    setSelected(site); setTab("overview"); setMsg("");
    setBlocks([]); setArticles([]); setGsc(null);
  };

  useEffect(() => {
    if (!selected) return;
    if (tab === "legal") {
      http.get(`/sites/${selected.slug}/blocks?page_slug=shared`, ADM)
        .then(r => setBlocks(r.data.blocks || []));
    } else if (tab === "articles") {
      http.get(`/sites/${selected.slug}/articles`, ADM)
        .then(r => setArticles(r.data.articles || []));
    } else if (tab === "gsc") {
      http.get(`/sites/${selected.slug}/gsc`, ADM)
        .then(r => setGsc(r.data));
    }
  }, [selected, tab]);

  const saveBlock = async () => {
    if (!editBlock || !selected) return;
    setSaving(true);
    try {
      await http.put(`/sites/${selected.slug}/blocks/${editBlock.page_slug}/${editBlock.block_key}`,
        {value: editValue, content_type: editBlock.content_type, is_published: true}, ADM);
      setBlocks(bs => bs.map(b => b.id===editBlock.id ? {...b, value: editValue} : b));
      setEditBlock(null);
      setMsg("✓ Saved");
    } catch(e:any) { setMsg("✗ " + (e?.response?.data?.detail || e.message)); }
    setSaving(false);
  };

  const pushLegal = async (all=false) => {
    if (!selected && !all) return;
    setPushing(true); setMsg(all ? "⏳ Pushing legal to all sites…" : `⏳ Pushing legal to ${selected!.name}…`);
    try {
      const url = all ? "/sites/push-legal-all" : `/sites/${selected!.slug}/push-legal`;
      const r = await http.post(url, {}, ADM);
      if (all) {
        const results = r.data.results || [];
        const ok = results.filter((x:any) => x.ok).length;
        setMsg(`✓ Pushed to ${ok}/${results.length} sites`);
      } else {
        setMsg(`✓ Pushed ${r.data.pushed?.length || 0} pages to ${selected!.domain}`);
      }
      await loadSites();
    } catch(e:any) { setMsg("✗ " + (e?.response?.data?.detail || e.message)); }
    setPushing(false);
  };

  const filtered = sites.filter(s =>
    filter==="all" || s.type===filter || (filter==="microsite" && s.type==="microsite")
  );

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
      {/* Left — site list */}
      <div style={{width:260,flexShrink:0,borderRight:"1.5px solid var(--border)",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:10}}>Sites</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {(["all","microsite","main"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:"3px 9px",borderRadius:12,border:"1px solid var(--border)",
                  fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                  background:filter===f?"var(--navy)":"var(--card)",
                  color:filter===f?"#fff":"var(--muted)"}}>
                {f==="all"?"All":f==="microsite"?"Micro Sites":"Main"}
              </button>
            ))}
          </div>
        </div>
        {filtered.map(site=>{
          const tc = TYPE_COLORS[site.type]||TYPE_COLORS.admin;
          const isSel = selected?.slug===site.slug;
          return (
            <div key={site.id} onClick={()=>selectSite(site)}
              style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid var(--border)",
                background:isSel?"var(--bg)":"var(--card)",
                borderLeft:isSel?"3px solid var(--navy)":"3px solid transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,
                  background:tc.bg,color:tc.color}}>{site.type.toUpperCase()}</span>
                <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{site.name}</span>
              </div>
              <div style={{fontSize:11,color:"var(--muted)"}}>{site.domain}</div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>
                {site.block_count} blocks · {site.article_count} articles
                {site.has_bucket&&<span style={{marginLeft:4,color:"var(--green)"}}>✓ S3</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right — detail */}
      {selected ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:"1.5px solid var(--border)",flexShrink:0,display:"flex",alignItems:"center",gap:12}}>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>{selected.name}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{selected.domain}</div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              {msg&&<span style={{fontSize:12,fontWeight:600,color:msg.startsWith("✓")?"var(--green)":"#dc2626"}}>{msg}</span>}
              {selected.has_bucket&&(
                <button disabled={pushing} onClick={()=>pushLegal(false)}
                  style={{padding:"7px 14px",background:pushing?"var(--muted)":"var(--blue)",color:"#fff",
                    border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:pushing?"not-allowed":"pointer",fontFamily:"inherit"}}>
                  {pushing?"⏳ Pushing…":"⬆ Push Legal to S3"}
                </button>
              )}
              <a href={`https://${selected.domain}`} target="_blank" rel="noopener noreferrer"
                style={{padding:"7px 14px",background:"var(--card)",border:"1.5px solid var(--border)",
                  borderRadius:7,fontWeight:700,fontSize:12,textDecoration:"none",color:"var(--text)"}}>
                View Site ↗
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid var(--border)",padding:"0 16px",flexShrink:0}}>
            {(["overview","legal","articles","gsc","issues"] as ("overview"|"legal"|"articles"|"gsc"|"issues")[]).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:"8px 14px",border:"none",background:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:13,fontWeight:tab===t?800:500,
                  color:tab===t?"var(--navy)":"var(--muted)",
                  borderBottom:tab===t?"2px solid var(--navy)":"2px solid transparent"}}>
                {t==="gsc"?"GSC Data":t==="issues"?"⚠ Issues":t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{flex:1,overflowY:"auto",padding:20}}>

            {/* Overview */}
            {tab==="overview"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                  {[
                    {label:"Content Blocks",val:selected.block_count},
                    {label:"Blog Articles",val:selected.article_count},
                    {label:"S3 Bucket",val:selected.has_bucket?"Connected":"—"},
                  ].map(stat=>(
                    <div key={stat.label} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"14px 16px"}}>
                      <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,marginBottom:4}}>{stat.label}</div>
                      <div style={{fontSize:22,fontWeight:800,color:"var(--navy)"}}>{stat.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:16}}>
                  <div style={{fontWeight:700,marginBottom:8}}>Quick Actions</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={()=>setTab("legal")}
                      style={{padding:"7px 14px",border:"1.5px solid var(--border)",borderRadius:7,background:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                      ✏️ Edit Legal Content
                    </button>
                    <button onClick={()=>setTab("articles")}
                      style={{padding:"7px 14px",border:"1.5px solid var(--border)",borderRadius:7,background:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                      📝 View Articles
                    </button>
                    <button onClick={()=>setTab("gsc")}
                      style={{padding:"7px 14px",border:"1.5px solid var(--border)",borderRadius:7,background:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                      📊 GSC Data
                    </button>
                    {selected.has_bucket&&(
                      <button disabled={pushing} onClick={()=>pushLegal(false)}
                        style={{padding:"7px 14px",border:"1.5px solid var(--border)",borderRadius:7,background:pushing?"var(--muted)":"none",cursor:pushing?"not-allowed":"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                        ⬆ Push Legal to S3
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Legal content blocks */}
            {tab==="legal"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontWeight:700}}>Shared Legal Content</div>
                  <div style={{display:"flex",gap:8}}>
                    {selected.has_bucket&&(
                      <button disabled={pushing} onClick={()=>pushLegal(false)}
                        style={{padding:"6px 12px",background:"var(--blue)",color:"#fff",border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:pushing?"not-allowed":"pointer",fontFamily:"inherit"}}>
                        {pushing?"⏳":"⬆"} Push to S3
                      </button>
                    )}
                    <button disabled={pushing} onClick={()=>pushLegal(true)}
                      style={{padding:"6px 12px",background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      ⬆ Push ALL Sites
                    </button>
                  </div>
                </div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:14,lineHeight:1.6}}>
                  Edit privacy and terms content here. Click <strong>Push to S3</strong> to deploy changes to the live site.
                  Use <strong>Push ALL Sites</strong> to sync this content to every micro site at once.
                </div>
                {blocks.length===0?<div style={{color:"var(--muted)",fontSize:13}}>No legal blocks found.</div>:
                  blocks.map(block=>(
                    <div key={block.id} style={{background:"var(--card)",border:"1px solid var(--border)",
                      borderRadius:8,padding:14,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div>
                          <span style={{fontWeight:700,fontSize:13}}>{block.block_key.replace(/_/g," ").replace(/\w/g,c=>c.toUpperCase())}</span>
                          <span style={{marginLeft:8,fontSize:10,color:"var(--muted)"}}>/{block.page_slug}</span>
                        </div>
                        <button onClick={()=>{setEditBlock(block);setEditValue(block.value);setMsg("");}}
                          style={{padding:"4px 10px",border:"1px solid var(--border)",borderRadius:6,background:"none",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
                          ✏ Edit
                        </button>
                      </div>
                      {editBlock?.id===block.id?(
                        <div>
                          <textarea value={editValue} onChange={e=>setEditValue(e.target.value)}
                            style={{width:"100%",minHeight:200,padding:8,border:"1.5px solid var(--border)",borderRadius:6,
                              fontSize:12,fontFamily:"monospace",background:"var(--bg)",color:"var(--text)",resize:"vertical"}}/>
                          <div style={{display:"flex",gap:8,marginTop:8}}>
                            <button disabled={saving} onClick={saveBlock}
                              style={{padding:"6px 14px",background:"var(--navy)",color:"#fff",border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
                              {saving?"Saving…":"Save"}
                            </button>
                            <button onClick={()=>setEditBlock(null)}
                              style={{padding:"6px 12px",background:"none",border:"1px solid var(--border)",borderRadius:7,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ):(
                        <div style={{fontSize:11,color:"var(--muted)",fontFamily:"monospace",
                          maxHeight:60,overflow:"hidden",background:"var(--bg)",padding:6,borderRadius:4}}>
                          {block.value.slice(0,200)}…
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            )}

            {/* Articles */}
            {tab==="articles"&&(
              <ArticlesTab site={selected} onRefresh={loadSites}/>
            )}

            {/* GSC */}
            {tab==="gsc"&&(
              <GscTab site={selected} gsc={gsc}/>
            )}
            {/* Critical Issues */}
            {tab==="issues"&&(
              <CriticalIssuesTab site={selected}/>
            )}
          </div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",flexDirection:"column",gap:10}}>
          <div style={{fontSize:32}}>🌐</div>
          <div style={{fontWeight:700,fontSize:16}}>Select a site to manage</div>
          <div style={{fontSize:13}}>Click any site in the left panel</div>
          <div style={{marginTop:16,display:"flex",gap:8}}>
            <button disabled={pushing} onClick={()=>pushLegal(true)}
              style={{padding:"8px 16px",background:"var(--blue)",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {pushing?"⏳ Pushing…":"⬆ Push Legal to ALL Sites"}
            </button>
          </div>
          {msg&&<div style={{fontSize:12,fontWeight:600,color:msg.startsWith("✓")?"var(--green)":"#dc2626"}}>{msg}</div>}
        </div>
      )}
    </div>
  );
}
