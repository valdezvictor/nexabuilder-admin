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


// ─── Articles Tab Component ────────────────────────────────────────────────

function ArticlesTab({site, onRefresh}: {site: Site; onRefresh: ()=>void}) {
  const [articles, setArticles]     = useState<Article[]>([]);
  const [loading, setLoading]       = useState(true);
  const [keyword, setKeyword]       = useState("");
  const [titleHint, setTitleHint]   = useState("");
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg]         = useState("");
  const [selected, setSelected]     = useState<Article|null>(null);
  const [body, setBody]             = useState("");
  const [editingBody, setEditingBody] = useState(false);
  const [reviewing, setReviewing]   = useState(false);
  const [review, setReview]         = useState<ReviewResult|null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deploying, setDeploying]   = useState(false);
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
          <input placeholder="Keyword (e.g. costo piscina 2026)" value={keyword}
            onChange={e=>setKeyword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&generate()}
            style={{width:"100%",padding:"7px 10px",border:"1.5px solid var(--border)",borderRadius:6,
              fontSize:12,marginBottom:6,fontFamily:"inherit",background:"#fff",color:"var(--text)"}}/>
          <input placeholder="Focus / angle (optional)" value={titleHint}
            onChange={e=>setTitleHint(e.target.value)}
            style={{width:"100%",padding:"7px 10px",border:"1.5px solid var(--border)",borderRadius:6,
              fontSize:12,marginBottom:8,fontFamily:"inherit",background:"#fff",color:"var(--text)"}}/>
          <button disabled={generating||!keyword.trim()} onClick={generate}
            style={{width:"100%",padding:"8px",background:generating?"var(--muted)":"var(--navy)",
              color:"#fff",border:"none",borderRadius:7,fontWeight:700,fontSize:12,
              cursor:generating||!keyword.trim()?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {generating?"⏳ Generating…":"✦ Generate Article"}
          </button>
          {genMsg&&<div style={{fontSize:11,marginTop:6,fontWeight:600,
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
  const [tab, setTab] = useState<"overview"|"legal"|"articles"|"gsc">("overview");
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
            {(["overview","legal","articles","gsc"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:"8px 14px",border:"none",background:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:13,fontWeight:tab===t?800:500,
                  color:tab===t?"var(--navy)":"var(--muted)",
                  borderBottom:tab===t?"2px solid var(--navy)":"2px solid transparent"}}>
                {t==="gsc"?"GSC Data":t.charAt(0).toUpperCase()+t.slice(1)}
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
              <div>
                <div style={{fontWeight:700,marginBottom:12}}>Search Console — {gsc?.domain}</div>
                {!gsc?<div style={{color:"var(--muted)"}}>Loading…</div>:(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
                      {[
                        {label:"Impressions",val:gsc.summary.impressions||0},
                        {label:"Clicks",val:gsc.summary.clicks||0},
                        {label:"Avg CTR",val:`${gsc.summary.avg_ctr||0}%`},
                        {label:"Avg Position",val:gsc.summary.avg_pos||"—"},
                      ].map(s=>(
                        <div key={s.label} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 14px"}}>
                          <div style={{fontSize:10,color:"var(--muted)",fontWeight:600,marginBottom:3}}>{s.label}</div>
                          <div style={{fontSize:20,fontWeight:800,color:"var(--navy)"}}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontWeight:700,marginBottom:8}}>Top Queries</div>
                    {gsc.top_queries.length===0?<div style={{color:"var(--muted)",fontSize:13}}>No GSC data in database for this domain.</div>:
                      gsc.top_queries.map((q,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                          <span>{q.query}</span>
                          <span style={{color:"var(--muted)",fontSize:11}}>i:{q.imp} c:{q.cli} pos:{q.pos}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
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
