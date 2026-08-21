import { useState, useEffect } from "react";
import {http} from "../lib/http";

const ADM_KEY = "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const ADM = {headers:{"X-Admin-Key":ADM_KEY}};

interface Guide {
  id:number; slug:string; title:string; category:string;
  status:string; needs_hero_image:boolean; needs_diagram:boolean;
  word_count:number|null; quality_score:number|null; content_notes:string|null;
}

const STATUS:Record<string,{bg:string;color:string}> = {
  STUB:       {bg:"#f1f5f9", color:"#475569"},
  GENERATING: {bg:"#ede9fe", color:"#6d28d9"},
  DRAFT:      {bg:"#fef9c3", color:"#854d0e"},
  PUBLISHED:  {bg:"#dcfce7", color:"#166534"},
};

const CAT:Record<string,string> = {
  service:"Service", region:"Region", regulatory:"Regulatory",
  how_to:"How-To", contractor:"Contractor",
};

const scoreColor = (n:number) => n>=75?"var(--green)":n>=60?"var(--amber)":"var(--red)";

export default function GuidesAdminPage() {
  const [guides,    setGuides]    = useState<Guide[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [generating,setGenerating]= useState<number|null>(null);
  const [reviewing, setReviewing] = useState<number|null>(null);
  const [publishing,setPublishing]= useState<number|null>(null);
  const [bulkBusy,  setBulkBusy]  = useState(false);
  const [msg,       setMsg]       = useState("");
  const [filter,    setFilter]    = useState("ALL");

  const load = async () => {
    try {
      const r = await http.get("/seo-content/guides", ADM);
      setGuides(r.data);
    } catch { setMsg("Failed to load guides"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!guides.some(g => g.status === "GENERATING")) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [guides]);

  const generate = async (g:Guide) => {
    setGenerating(g.id);
    setMsg(`Generating "${g.title}"…`);
    try {
      await http.post(`/seo-content/guides/${g.slug}/generate`, {}, ADM);
      setMsg(`Generating "${g.title}" — polling every 5s…`);
      load();
    } catch(e:any) { setMsg("Generate failed: "+(e?.response?.data?.detail||e.message)); }
    setGenerating(null);
  };

  const review = async (g:Guide) => {
    setReviewing(g.id);
    setMsg(`Running AI Review on "${g.title}"…`);
    try {
      const r = await http.post(`/seo-content/guides/${g.slug}/review`, {}, {...ADM, timeout:120000});
      setMsg(`✓ "${g.title}" scored ${r.data.overall_score}/100`);
      load();
    } catch(e:any) { setMsg("Review failed: "+(e?.response?.data?.detail||e.message)); }
    setReviewing(null);
  };

  const publish = async (g:Guide) => {
    setPublishing(g.id);
    try {
      await http.post(`/seo-content/guides/${g.slug}/publish`, {}, ADM);
      setMsg(`✓ "${g.title}" published`);
      load();
    } catch(e:any) { setMsg("Publish failed: "+(e?.response?.data?.detail||e.message)); }
    setPublishing(null);
  };

  const bulkPublish = async () => {
    const ready = guides.filter(g => g.status==="DRAFT" && (g.quality_score??0)>=75);
    if (!ready.length) { setMsg("No guides with score ≥75 ready to publish"); return; }
    if (!window.confirm(`Publish ${ready.length} guides?`)) return;
    setBulkBusy(true);
    try {
      const r = await http.post("/seo-content/guides/bulk-publish", {}, ADM);
      setMsg(`✓ ${r.data.published} guides published`);
      load();
    } catch(e:any) { setMsg("Bulk publish failed: "+(e?.response?.data?.detail||e.message)); }
    setBulkBusy(false);
  };

  const filtered   = filter==="ALL" ? guides : guides.filter(g=>g.status===filter);
  const stubCount  = guides.filter(g=>g.status==="STUB").length;
  const draftCount = guides.filter(g=>g.status==="DRAFT").length;
  const pubCount   = guides.filter(g=>g.status==="PUBLISHED").length;
  const readyCount = guides.filter(g=>g.status==="DRAFT"&&(g.quality_score??0)>=75).length;

  // Shared styles
  const card:React.CSSProperties = {
    background:"var(--card)", border:"1.5px solid var(--border)",
    borderRadius:"var(--radius)", padding:"20px 24px",
  };
  const pill = (active:boolean, color="var(--blue)"):React.CSSProperties => ({
    padding:"5px 14px", borderRadius:20, border:"1.5px solid",
    fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" as const,
    fontFamily:"inherit",
    borderColor: active ? color : "var(--border)",
    background:  active ? color : "var(--card)",
    color:       active ? "#fff" : "var(--muted)",
  });
  const btn = (color:string, bg:string, border:string):React.CSSProperties => ({
    padding:"5px 12px", borderRadius:6, border:`1px solid ${border}`,
    fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" as const,
    fontFamily:"inherit", background:bg, color,
  });

  return (
    <div style={{padding:24, maxWidth:1100}}>
      {/* Page header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:"var(--text)",margin:0}}>Guides Admin</h1>
          <p style={{fontSize:13,color:"var(--muted)",margin:"4px 0 0"}}>
            {guides.length} guides · Generate → AI Review → Publish
          </p>
        </div>
        <button onClick={bulkPublish} disabled={bulkBusy||readyCount===0}
          style={{padding:"8px 18px",background:readyCount?"var(--green)":"var(--border)",
            color:readyCount?"#fff":"var(--muted)",border:"none",borderRadius:8,
            fontWeight:700,cursor:readyCount?"pointer":"not-allowed",fontSize:13,
            fontFamily:"inherit",opacity:bulkBusy?.6:1}}>
          ⚡ Bulk Publish All ≥75 {readyCount>0&&`(${readyCount})`}
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div style={{...card, marginBottom:16, padding:"10px 16px",
          background: msg.startsWith("✓")?"#f0fdf4":msg.includes("failed")||msg.includes("Failed")?"#fef2f2":"#fefce8",
          border:`1px solid ${msg.startsWith("✓")?"#86efac":msg.includes("failed")||msg.includes("Failed")?"#fca5a5":"#fde68a"}`,
          fontSize:13,
          color: msg.startsWith("✓")?"#166534":msg.includes("failed")||msg.includes("Failed")?"#991b1b":"#854d0e",
        }}>
          {msg}
        </div>
      )}

      {/* Stats + Filter tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        {/* Stat pills */}
        {([
          ["ALL",    guides.length, "ALL"],
          ["STUB",   stubCount,     "STUB"],
          ["DRAFT",  draftCount,    "DRAFT"],
          ["PUBLISHED", pubCount,   "PUBLISHED"],
        ] as [string,number,string][]).map(([label,count,val]) => (
          <button key={val} onClick={()=>setFilter(val)} style={pill(filter===val)}>
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Guide list */}
      {loading ? (
        <p style={{color:"var(--muted)"}}>Loading…</p>
      ) : filtered.length===0 ? (
        <div style={{...card, textAlign:"center", padding:"60px 24px",color:"var(--muted)"}}>
          No guides in this category.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(g => {
            const sc = STATUS[g.status] || {bg:"#f1f5f9",color:"#475569"};
            return (
              <div key={g.id} style={{...card, display:"grid",
                gridTemplateColumns:"1fr 90px 110px auto",
                gap:16, alignItems:"center", padding:"14px 20px"}}>

                {/* Title + meta */}
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"var(--text)",marginBottom:4}}>
                    {g.title}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",
                      color:"var(--blue)",background:"rgba(29,111,222,.08)",
                      padding:"1px 7px",borderRadius:4}}>
                      {CAT[g.category]||g.category}
                    </span>
                    <span style={{fontSize:11,color:"var(--muted)",fontFamily:"monospace"}}>
                      /guides/{g.slug}
                    </span>
                    {g.word_count&&(
                      <span style={{fontSize:11,color:"var(--muted)"}}>
                        {g.word_count.toLocaleString()}w
                      </span>
                    )}
                    {g.status==="GENERATING"&&(
                      <span style={{fontSize:11,color:"var(--purple)",fontWeight:700}}>
                        ⏳ Generating…
                      </span>
                    )}
                    {g.needs_hero_image&&(
                      <span style={{fontSize:9,color:"var(--red)",border:"0.5px solid rgba(220,38,38,.3)",
                        borderRadius:4,padding:"1px 5px",textTransform:"uppercase",letterSpacing:"0.05em"}}>
                        Needs Image
                      </span>
                    )}
                  </div>
                  {g.content_notes&&(
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:4,fontStyle:"italic",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:500}}>
                      {g.content_notes.slice(0,120)}…
                    </div>
                  )}
                </div>

                {/* Score */}
                <div style={{textAlign:"center"}}>
                  {g.quality_score ? (
                    <span style={{fontSize:20,fontWeight:800,color:scoreColor(g.quality_score)}}>
                      {g.quality_score}
                      <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>/100</span>
                    </span>
                  ) : (
                    <span style={{fontSize:11,color:"var(--muted)"}}>—</span>
                  )}
                </div>

                {/* Status badge */}
                <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,
                  textTransform:"uppercase",letterSpacing:"0.05em",textAlign:"center",
                  background:sc.bg, color:sc.color, display:"inline-block"}}>
                  {g.status}
                </span>

                {/* Actions */}
                <div style={{display:"flex",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
                  {g.status==="STUB"&&(
                    <button onClick={()=>generate(g)} disabled={generating!==null}
                      style={btn("var(--card)","var(--blue)","var(--blue)")}>
                      {generating===g.id?"Writing…":"✦ Generate"}
                    </button>
                  )}
                  {(g.status==="DRAFT"||g.status==="PUBLISHED")&&(
                    <button onClick={()=>review(g)} disabled={reviewing!==null}
                      style={btn("var(--amber)","rgba(217,119,6,.08)","rgba(217,119,6,.3)")}>
                      {reviewing===g.id?"⏳ Reviewing…":"⚡ AI Review"}
                    </button>
                  )}
                  {g.status==="DRAFT"&&(g.quality_score??0)>=75&&(
                    <button onClick={()=>publish(g)} disabled={publishing===g.id}
                      style={btn("#fff","var(--green)","var(--green)")}>
                      {publishing===g.id?"…":"↑ Publish"}
                    </button>
                  )}
                  {g.status==="DRAFT"&&(g.quality_score??0)<75&&g.quality_score!==null&&(
                    <span style={{fontSize:11,color:"var(--red)",fontWeight:700,padding:"4px 8px"}}>
                      Score &lt;75
                    </span>
                  )}
                  {g.status==="PUBLISHED"&&(
                    <a href={`https://www.nexabuilder.com/guides/${g.slug}/`}
                      target="_blank" rel="noreferrer"
                      style={{...btn("var(--green)","#f0fdf4","#86efac"),textDecoration:"none"}}>
                      ↗ View
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
