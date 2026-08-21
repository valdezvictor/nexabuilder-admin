import { useState, useEffect } from "react";
import {http} from "../lib/http";

const ADM_KEY = "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const ADM = {headers:{"X-Admin-Key":ADM_KEY}};
const gold = "#F59E0B";
const green = "#10B981";
const red = "#EF4444";

interface Guide {
  id:number; slug:string; title:string; category:string;
  status:string; needs_hero_image:boolean; needs_diagram:boolean;
  word_count:number|null; quality_score:number|null; content_notes:string|null;
}

const statusColors:Record<string,string> = {STUB:red, DRAFT:gold, PUBLISHED:green};
const catLabels:Record<string,string> = {
  service:"Service", region:"Region", regulatory:"Regulatory",
  how_to:"How-To", contractor:"Contractor"
};

export default function GuidesAdminPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number|null>(null);
  const [reviewing, setReviewing] = useState<number|null>(null);
  const [publishing, setPublishing] = useState<number|null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [jobStatus, setJobStatus] = useState("");
  const [filter, setFilter] = useState("ALL");

  const loadGuides = async () => {
    try {
      const r = await http.get("/seo-content/guides", ADM);
      setGuides(r.data);
    } catch { setJobStatus("Failed to load guides"); }
    setLoading(false);
  };

  useEffect(() => { loadGuides(); }, []);

  // Poll while generating
  useEffect(() => {
    if (!guides.some(g => g.status === "GENERATING")) return;
    const t = setInterval(loadGuides, 5000);
    return () => clearInterval(t);
  }, [guides]);

  const generateGuide = async (guide:Guide) => {
    setGenerating(guide.id);
    setJobStatus(`Generating: ${guide.title}...`);
    try {
      await http.post(`/seo-content/guides/${guide.slug}/generate`, {}, ADM);
      setJobStatus(`Generating "${guide.title}" — polling every 5s...`);
      loadGuides();
    } catch(e:any) {
      setJobStatus("Error starting generation: " + (e?.response?.data?.detail||e.message));
    }
    setGenerating(null);
  };

  const reviewGuide = async (guide:Guide) => {
    setReviewing(guide.id);
    setJobStatus(`Running AI Review: ${guide.title}...`);
    try {
      const r = await http.post(`/seo-content/guides/${guide.slug}/review`, {}, {...ADM, timeout:120000});
      setJobStatus(`✓ "${guide.title}" scored ${r.data.overall_score}/100`);
      loadGuides();
    } catch(e:any) {
      setJobStatus("Review failed: " + (e?.response?.data?.detail||e.message));
    }
    setReviewing(null);
  };

  const updateStatus = async (guide:Guide, newStatus:string) => {
    setPublishing(guide.id);
    try {
      await http.post(`/seo-content/guides/${guide.slug}/publish`, {}, ADM);
      setJobStatus(`✓ "${guide.title}" → ${newStatus}`);
      loadGuides();
    } catch(e:any) {
      setJobStatus("Publish failed: " + (e?.response?.data?.detail||e.message));
    }
    setPublishing(null);
  };

  const bulkPublish = async () => {
    const drafts = guides.filter(g => g.status === "DRAFT" && (g.quality_score??0) >= 75);
    if (!drafts.length) { setJobStatus("No qualifying drafts (score ≥75) to publish"); return; }
    if (!window.confirm(`Publish ${drafts.length} guides scoring ≥75?`)) return;
    setBulkPublishing(true);
    setJobStatus(`Publishing ${drafts.length} guides...`);
    try {
      const r = await http.post("/seo-content/guides/bulk-publish", {}, ADM);
      setJobStatus(`✓ ${r.data.published} guides published`);
    } catch(e:any) { setJobStatus("Bulk publish failed: " + (e?.response?.data?.detail||e.message)); }
    setBulkPublishing(false);
    loadGuides();
  };

  const filtered = filter === "ALL" ? guides : guides.filter(g => g.status === filter);
  const stubCount  = guides.filter(g => g.status === "STUB").length;
  const draftCount = guides.filter(g => g.status === "DRAFT").length;
  const pubCount   = guides.filter(g => g.status === "PUBLISHED").length;
  const readyCount = guides.filter(g => g.status === "DRAFT" && (g.quality_score??0) >= 75).length;

  return (
    <div style={{background:"#0A0A0A",minHeight:"100vh",color:"#fff",fontFamily:"Inter,sans-serif"}}>
      {/* Header */}
      <div style={{padding:"20px 32px",borderBottom:"0.5px solid rgba(255,255,255,0.06)",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:9,letterSpacing:"0.3em",textTransform:"uppercase",color:gold,marginBottom:4}}>
            NexaBuilder Admin
          </div>
          <h1 style={{fontSize:20,fontWeight:500,color:"#fff",margin:0}}>SEO Guides</h1>
        </div>
        <a href="/admin" style={{fontSize:10,color:"rgba(255,255,255,0.3)",
          textDecoration:"none",letterSpacing:"0.1em",textTransform:"uppercase"}}>
          ← Dashboard
        </a>
      </div>

      {/* Stats + Actions bar */}
      <div style={{padding:"16px 32px",borderBottom:"0.5px solid rgba(255,255,255,0.05)",
        display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        {([["All",guides.length,"ALL","rgba(255,255,255,0.4)"],
           ["Need Content",stubCount,"STUB",red],
           ["In Draft",draftCount,"DRAFT",gold],
           ["Published",pubCount,"PUBLISHED",green],
        ] as [string,number,string,string][]).map(([label,count,val,color]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            background:filter===val ? color+"14" : "none",
            border:"0.5px solid "+(filter===val ? color : "rgba(255,255,255,0.08)"),
            borderRadius:6, padding:"8px 16px", cursor:"pointer", color:"#fff",
            fontFamily:"Inter,sans-serif"
          }}>
            <div style={{fontSize:16,fontWeight:300,color:filter===val?color:"rgba(255,255,255,0.6)"}}>
              {count}
            </div>
            <div style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",
              color:"rgba(255,255,255,0.3)",marginTop:2}}>
              {label}
            </div>
          </button>
        ))}

        {readyCount > 0 && (
          <button onClick={bulkPublish} disabled={bulkPublishing} style={{
            marginLeft:"auto", background:"rgba(16,185,129,0.1)",
            border:"0.5px solid rgba(16,185,129,0.3)", borderRadius:6,
            padding:"8px 18px", cursor:"pointer", color:green,
            fontSize:11, fontWeight:500, letterSpacing:"0.05em",
            fontFamily:"Inter,sans-serif"
          }}>
            {bulkPublishing ? "Publishing..." : `⚡ Bulk Publish ${readyCount} Ready`}
          </button>
        )}

        {jobStatus && (
          <span style={{fontSize:11, color:jobStatus.includes("✗")||jobStatus.includes("failed")?red
            :jobStatus.includes("✓")?green:gold, marginLeft:readyCount>0?0:"auto"}}>
            {jobStatus}
          </span>
        )}
      </div>

      {/* Guide list */}
      <div style={{padding:"24px 32px 64px"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:80,color:"rgba(255,255,255,0.2)"}}>Loading guides...</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:80,color:"rgba(255,255,255,0.2)"}}>No guides in this category.</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:1,
            background:"rgba(255,255,255,0.02)",borderRadius:10,
            overflow:"hidden",border:"0.5px solid rgba(255,255,255,0.05)"}}>
            {filtered.map(g => (
              <div key={g.id} style={{padding:"16px 20px",background:"#0F0F0F",
                display:"grid",gridTemplateColumns:"1fr 110px 100px auto",
                gap:16,alignItems:"center"}}>
                {/* Title + meta */}
                <div>
                  <div style={{fontSize:14,color:"#fff",marginBottom:4}}>{g.title}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:9,color:"rgba(255,255,255,0.25)",
                      letterSpacing:"0.1em",textTransform:"uppercase"}}>
                      {catLabels[g.category]||g.category}
                    </span>
                    <span style={{fontSize:9,color:"rgba(255,255,255,0.15)"}}>·</span>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>
                      /guides/{g.slug}
                    </span>
                    {g.word_count && (
                      <span style={{fontSize:9,color:"rgba(255,255,255,0.2)"}}>
                        {g.word_count.toLocaleString()} words
                      </span>
                    )}
                    {g.status === "GENERATING" && (
                      <span style={{fontSize:9,color:gold,letterSpacing:"0.1em",
                        textTransform:"uppercase",animation:"pulse 1s infinite"}}>⏳ Generating...</span>
                    )}
                  </div>
                  {g.content_notes && (
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4,fontStyle:"italic"}}>
                      {g.content_notes.slice(0,120)}...
                    </div>
                  )}
                </div>

                {/* Score */}
                <div style={{textAlign:"center"}}>
                  {g.quality_score ? (
                    <div style={{fontSize:18,fontWeight:300,
                      color:g.quality_score>=75?green:g.quality_score>=60?gold:red}}>
                      {g.quality_score}
                      <span style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>/100</span>
                    </div>
                  ) : (
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>Not scored</div>
                  )}
                </div>

                {/* Status */}
                <span style={{fontSize:10,padding:"4px 10px",borderRadius:100,
                  textTransform:"uppercase",letterSpacing:"0.1em",textAlign:"center",
                  background:(statusColors[g.status]??"#fff")+"14",
                  color:statusColors[g.status]??"#fff",
                  border:"0.5px solid "+(statusColors[g.status]??"#fff")+"30"}}>
                  {g.status}
                </span>

                {/* Actions */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {g.status === "STUB" && (
                    <button onClick={() => generateGuide(g)} disabled={generating!==null}
                      style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",
                        background:generating===g.id?"rgba(255,255,255,0.05)":"#fff",
                        border:"none",borderRadius:4,padding:"6px 12px",
                        cursor:generating!==null?"not-allowed":"pointer",
                        color:generating===g.id?"rgba(255,255,255,0.3)":"#0A0A0A",
                        fontFamily:"Inter,sans-serif",fontWeight:500,whiteSpace:"nowrap"}}>
                      {generating===g.id ? "Writing..." : "✦ Generate"}
                    </button>
                  )}

                  {(g.status === "DRAFT" || g.status === "PUBLISHED") && (
                    <button onClick={() => reviewGuide(g)} disabled={reviewing!==null}
                      style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",
                        background:"rgba(245,158,11,0.08)",border:"0.5px solid rgba(245,158,11,0.25)",
                        borderRadius:4,padding:"6px 12px",cursor:reviewing!==null?"not-allowed":"pointer",
                        color:reviewing===g.id?"rgba(255,255,255,0.3)":gold,whiteSpace:"nowrap"}}>
                      {reviewing===g.id ? "⏳ Reviewing..." : "⚡ AI Review"}
                    </button>
                  )}

                  {g.status === "DRAFT" && (g.quality_score??0) >= 75 && (
                    <button onClick={() => updateStatus(g,"PUBLISHED")} disabled={publishing===g.id}
                      style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",
                        background:"rgba(16,185,129,0.1)",border:"0.5px solid rgba(16,185,129,0.3)",
                        borderRadius:4,padding:"6px 12px",cursor:"pointer",
                        color:green,whiteSpace:"nowrap"}}>
                      {publishing===g.id ? "..." : "↑ Publish"}
                    </button>
                  )}

                  {g.status === "DRAFT" && (g.quality_score??0) < 75 && g.quality_score !== null && (
                    <span style={{fontSize:9,color:red,padding:"6px 10px",
                      letterSpacing:"0.08em",textTransform:"uppercase"}}>
                      Score &lt;75
                    </span>
                  )}

                  {g.status === "PUBLISHED" && (
                    <a href={`https://www.nexabuilder.com/guides/${g.slug}/`} target="_blank"
                      rel="noreferrer" style={{fontSize:10,letterSpacing:"0.1em",
                        textTransform:"uppercase",color:"rgba(255,255,255,0.3)",
                        border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:4,
                        padding:"6px 10px",textDecoration:"none",whiteSpace:"nowrap"}}>
                      ↗ View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
