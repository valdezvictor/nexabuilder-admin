import { useState, useEffect, useCallback } from "react";
import { http } from "../lib/http";

const ADM = { headers: { "X-Admin-Key": "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU" } };
type GuideStatus = "STUB" | "GENERATING" | "DRAFT" | "PUBLISHED";
interface Guide { id:number; slug:string; title:string; category:string; status:GuideStatus; word_count:number|null; quality_score:number|null; content_notes:string|null; published_at:string|null; }
const STATUS_COLOR: Record<GuideStatus,string> = { STUB:"#dc2626", GENERATING:"#d97706", DRAFT:"#d97706", PUBLISHED:"#16a34a" };
const CAT: Record<string,string> = { service:"Service", region:"Region", regulatory:"Regulatory", how_to:"How-To", contractor:"Contractor" };

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Guide|null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const r = await http.get("/seo-content/guides", ADM); setGuides(r.data); }
    catch { setMsg("Failed to load guides"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!guides.some(g => g.status === "GENERATING")) return;
    const t = setInterval(load, 5000); return () => clearInterval(t);
  }, [guides, load]);

  const busyToggle = (slug:string, v:boolean) => setBusy(p => { const s=new Set(p); v?s.add(slug):s.delete(slug); return s; });

  const generate = async (g:Guide) => {
    busyToggle(g.slug,true); setMsg(`Generating "${g.title}"…`);
    try { await http.post(`/seo-content/guides/${g.slug}/generate`,{},ADM); load(); }
    catch(e:any) { setMsg("Generate failed: "+(e?.response?.data?.detail||e.message)); }
    finally { busyToggle(g.slug,false); }
  };

  const review = async (g:Guide) => {
    busyToggle(g.slug,true); setMsg(`Reviewing "${g.title}"…`);
    try {
      const r = await http.post(`/seo-content/guides/${g.slug}/review`,{},{...ADM,timeout:120000});
      setMsg(`Score: ${r.data.overall_score} — ${r.data.passed?"PASSED ✓":"needs work"}`);
      if (selected?.slug===g.slug) setSelected({...g,quality_score:r.data.overall_score,content_notes:r.data.notes});
      load();
    } catch(e:any) { setMsg("Review failed: "+(e?.response?.data?.detail||e.message)); }
    finally { busyToggle(g.slug,false); }
  };

  const publish = async (g:Guide) => {
    if (!window.confirm(`Publish "${g.title}"?`)) return;
    busyToggle(g.slug,true); setMsg(`Publishing…`);
    try { await http.post(`/seo-content/guides/${g.slug}/publish`,{},ADM); setMsg(`Published: /guides/${g.slug}/`); load(); }
    catch(e:any) { setMsg("Publish failed: "+(e?.response?.data?.detail||e.message)); }
    finally { busyToggle(g.slug,false); }
  };

  const bulkPublish = async () => {
    const n = guides.filter(g=>(g.quality_score||0)>=75&&g.status!=="PUBLISHED").length;
    if (!n) { setMsg("No guides with score ≥75 ready."); return; }
    if (!window.confirm(`Bulk publish ${n} guides?`)) return;
    try { const r=await http.post("/seo-content/guides/bulk-publish",{},ADM); setMsg(`Published ${r.data.published} guides.`); load(); }
    catch(e:any) { setMsg("Bulk publish failed: "+(e?.response?.data?.detail||e.message)); }
  };

  const counts:Record<string,number> = {ALL:guides.length,STUB:0,DRAFT:0,PUBLISHED:0};
  guides.forEach(g=>{ if(counts[g.status]!==undefined) counts[g.status]++; });
  const filtered = filter==="ALL" ? guides : guides.filter(g=>g.status===filter);

  return (
    <div style={{padding:24,maxWidth:1100}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:"#0a1628",margin:0}}>Guides CMS</h1>
          <p style={{fontSize:13,color:"#6b7280",margin:"4px 0 0"}}>{guides.length} guides &middot; Generate &rarr; AI Review &rarr; Publish</p>
        </div>
        <button onClick={bulkPublish} style={{padding:"8px 18px",background:"#16a34a",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13}}>
          &#9889; Bulk Publish All &ge;75
        </button>
      </div>

      {msg && <div style={{background:"#f0f9ff",border:"1px solid #7dd3fc",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#0c4a6e"}}>{msg}</div>}

      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["ALL","STUB","DRAFT","PUBLISHED"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",fontSize:12,fontWeight:700,cursor:"pointer",
            borderColor:filter===f?"#0a1628":"#e5e7eb",background:filter===f?"#0a1628":"#fff",color:filter===f?"#fff":"#374151"}}>
            {f} ({counts[f]??0})
          </button>
        ))}
      </div>

      {loading ? <p style={{color:"#6b7280"}}>Loading&hellip;</p> : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(g=>(
            <div key={g.slug} onClick={()=>setSelected(selected?.slug===g.slug?null:g)}
              style={{background:"#fff",border:"1.5px solid",borderColor:selected?.slug===g.slug?"#0a1628":"#e5e7eb",
                borderRadius:10,padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:STATUS_COLOR[g.status]+"18",color:STATUS_COLOR[g.status],flexShrink:0}}>
                {g.status==="GENERATING"?"⏳ GENERATING":g.status}
              </span>
              <span style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:"#f1f5f9",color:"#475569",flexShrink:0}}>
                {CAT[g.category]||g.category}
              </span>
              <span style={{fontWeight:700,fontSize:14,color:"#0a1628",flex:1,minWidth:200}}>{g.title}</span>
              <span style={{fontSize:12,color:"#6b7280",flexShrink:0}}>{g.word_count?`${g.word_count}w`:"—"}</span>
              <span style={{fontSize:13,fontWeight:800,flexShrink:0,
                color:g.quality_score?(g.quality_score>=75?"#16a34a":g.quality_score>=60?"#d97706":"#dc2626"):"#9ca3af"}}>
                {g.quality_score??"—"}
              </span>
              <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {g.status==="STUB" && (
                  <button onClick={()=>generate(g)} disabled={busy.has(g.slug)}
                    style={{padding:"5px 12px",background:"#1d6fde",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",opacity:busy.has(g.slug)?.5:1}}>
                    ✦ Generate
                  </button>
                )}
                {g.status==="GENERATING" && <span style={{fontSize:12,color:"#d97706",fontWeight:700}}>Generating…</span>}
                {(g.status==="DRAFT"||g.status==="PUBLISHED") && (
                  <button onClick={()=>review(g)} disabled={busy.has(g.slug)}
                    style={{padding:"5px 12px",background:"#f1f5f9",color:"#374151",border:"1px solid #e5e7eb",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",opacity:busy.has(g.slug)?.5:1}}>
                    ⚡ AI Review
                  </button>
                )}
                {g.status==="DRAFT"&&(g.quality_score||0)>=75 && (
                  <button onClick={()=>publish(g)} disabled={busy.has(g.slug)}
                    style={{padding:"5px 12px",background:"#16a34a",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",opacity:busy.has(g.slug)?.5:1}}>
                    ↑ Publish
                  </button>
                )}
                {g.status==="PUBLISHED" && (
                  <a href={`https://www.nexabuilder.com/guides/${g.slug}/`} target="_blank" rel="noreferrer"
                    style={{padding:"5px 12px",background:"#f0fdf4",color:"#16a34a",border:"1px solid #86efac",borderRadius:6,fontSize:12,fontWeight:700,textDecoration:"none"}}>
                    ↗ View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected?.content_notes && (
        <div style={{marginTop:24,background:"#f8fafc",border:"1.5px solid #e5e7eb",borderRadius:12,padding:"20px 24px"}}>
          <h3 style={{fontSize:14,fontWeight:800,color:"#0a1628",marginBottom:10}}>Review Notes — {selected.title}</h3>
          <pre style={{fontSize:12,color:"#374151",whiteSpace:"pre-wrap",margin:0,lineHeight:1.6}}>{selected.content_notes}</pre>
        </div>
      )}
    </div>
  );
}