// pages/BlogCmsPage.tsx — WYSIWYG Blog CMS Editor
import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { http } from "../lib/http";
import { blogApi, BlogArticle, SITE_OPTIONS, CATEGORIES, STATUS_COLORS } from "../api/blog";

const countWords = (html: string) =>
  (html || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
const readingTime = (wc: number) => Math.max(1, Math.round(wc / 200));

const StatusBadge = ({ status }: { status: string }) => (
  <span style={{
    display:"inline-block", padding:"2px 10px", borderRadius:12,
    fontSize:11, fontWeight:600, textTransform:"uppercase" as const, letterSpacing:".04em",
    background:STATUS_COLORS[status]+"22", color:STATUS_COLORS[status],
    border:`1px solid ${STATUS_COLORS[status]}44`,
  }}>{status}</span>
);

const SeoMeter = ({ label, value, max, warn, ok }:{label:string;value:number;max:number;warn:number;ok:number}) => {
  const pct = Math.min(100, Math.round((value/max)*100));
  const color = value>=ok?"#10b981":value>=warn?"#f59e0b":"#ef4444";
  return (
    <div style={{marginBottom:6}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
        <span style={{color:"var(--color-text-secondary)"}}>{label}</span>
        <span style={{color,fontWeight:600}}>{value}/{max}</span>
      </div>
      <div style={{height:4,borderRadius:2,background:"var(--color-background-secondary)"}}>
        <div style={{width:`${pct}%`,height:"100%",borderRadius:2,background:color,transition:"width .3s"}}/>
      </div>
    </div>
  );
};

const Btn = ({cmd,arg,icon,title,editor}:{cmd:string;arg?:string;icon:string;title:string;editor:React.RefObject<HTMLDivElement>}) => (
  <button title={title}
    onMouseDown={(e)=>{e.preventDefault();editor.current?.focus();document.execCommand(cmd,false,arg);}}
    style={{background:"none",border:"none",cursor:"pointer",padding:"4px 7px",borderRadius:5,fontSize:14,color:"var(--color-text-secondary)"}}>
    {icon}
  </button>
);

const insertBlock = (editor:React.RefObject<HTMLDivElement>, html:string) => {
  editor.current?.focus();
  document.execCommand("insertHTML",false,html);
};

const BLOCK_TEMPLATES = [
  {label:"📊 Data Table",html:`<figure class="data-table"><figcaption>Table title</figcaption><table><thead><tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr></thead><tbody><tr><td>Row 1</td><td>Data</td><td>Data</td></tr><tr><td>Row 2</td><td>Data</td><td>Data</td></tr></tbody></table><p class="data-source"><em>Source: your source here</em></p></figure><p><br></p>`},
  {label:"❓ FAQ Item",html:`<details class="faq-item"><summary class="faq-question">Your question here?</summary><div class="faq-answer"><p>Your complete answer here.</p></div></details><p><br></p>`},
  {label:"📢 CTA Block",html:`<div class="article-cta-inline"><h3>CTA headline</h3><p>Supporting copy.</p><a href="/cotizacion/" class="cta-button">Button text →</a><p class="cta-footnote">Trust signals · No commitment</p></div><p><br></p>`},
  {label:"💡 Info Callout",html:`<div class="callout callout--info"><strong>Key insight:</strong> Your point here.</div><p><br></p>`},
  {label:"⚠️ Warning Callout",html:`<div class="callout callout--warning"><strong>Important:</strong> Your warning here.</div><p><br></p>`},
  {label:"✅ Included/Not List",html:`<div class="two-column-list"><div class="col-included"><h3>✓ Included</h3><ul><li>Item one</li><li>Item two</li></ul></div><div class="col-not-included"><h3>✗ Not included</h3><ul><li>Item one</li><li>Item two</li></ul></div></div><p><br></p>`},
  {label:"❔ Decision Question",html:`<div class="decision-question"><h3>1. Your decision question?</h3><p><strong>Option A:</strong> When this is right.<br/><strong>Option B:</strong> When this is right.</p></div><p><br></p>`},
];

// ── ArticleEditor ─────────────────────────────────────────────────────────────
function ArticleEditor({article,siteId,onSaved,onClose}: {
  article: BlogArticle|null; siteId:string;
  onSaved:(a:BlogArticle)=>void; onClose:()=>void;
}) {
  const isNew = !article;
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"write"|"seo"|"local"|"schema">("write");
  const [saving,setSaving]         = useState(false);
  const [publishing,setPublishing] = useState(false);
  const [error,setError]           = useState("");
  const [success,setSuccess]       = useState("");
  const [showBlocks,setShowBlocks] = useState(false);
  const [checkingScore,setCheckingScore] = useState(false);
  const [editorSeoScore,setEditorSeoScore] = useState<any>(null);
  const [previewMode,setPreviewMode] = useState(false);
  const [wordCount,setWordCount]   = useState(0);
  const siteOption = SITE_OPTIONS.find(s=>s.value===siteId);
  const defaultLang = siteOption?.lang||"en";
  const categories  = CATEGORIES[siteId]||CATEGORIES.default;

  const [f,setF] = useState<Partial<BlogArticle>>({
    site_id:siteId, language:article?.language||defaultLang,
    slug:article?.slug||"", h1:article?.h1||"",
    seo_title:article?.seo_title||"", meta_description:article?.meta_description||"",
    primary_keyword:article?.primary_keyword||"", deck:article?.deck||"",
    body_html:article?.body_html||"", toc_auto:article?.toc_auto??true,
    category:article?.category||categories[0], tags:article?.tags||"",
    author_name:article?.author_name||"Equipo Una Piscina",
    author_bio:article?.author_bio||"",
    featured_image_url:article?.featured_image_url||"",
    featured_image_alt:article?.featured_image_alt||"",
    featured_image_caption:article?.featured_image_caption||"",
    canonical_url:article?.canonical_url||"",
    geo_region:article?.geo_region||"SoCal",
    geo_cities:article?.geo_cities||"",
    aeo_target_questions:article?.aeo_target_questions||"",
    schema_types:article?.schema_types||"Article,FAQPage",
    og_title:article?.og_title||"", og_description:article?.og_description||"",
    hreflang_pair_slug:article?.hreflang_pair_slug||"",
    schema_json:article?.schema_json||"",
  });
  const set = (k:keyof BlogArticle,v:any) => setF(p=>({...p,[k]:v}));

  const onEditorInput = useCallback(()=>{
    const html = editorRef.current?.innerHTML||"";
    setF(p=>({...p,body_html:html}));
    setWordCount(countWords(html));
  },[]);

  // Hide sidebar & topbar when editor is fullscreen
  useEffect(()=>{
    document.body.style.overflow = "hidden";
    // Hide sidebar and topbar elements directly
    const sidebar = document.querySelector(".admin-sidebar") as HTMLElement|null;
    const topbar  = document.querySelector(".admin-topbar")  as HTMLElement|null;
    const overlay = document.querySelector(".sidebar-overlay") as HTMLElement|null;
    const els = [sidebar, topbar, overlay].filter(Boolean) as HTMLElement[];
    els.forEach(el => el.style.setProperty("visibility","hidden","important"));
    return () => {
      document.body.style.overflow = "";
      els.forEach(el => el.style.removeProperty("visibility"));
    };
  }, []);

  useEffect(()=>{
    if(editorRef.current&&f.body_html){
      editorRef.current.innerHTML=f.body_html;
      setWordCount(countWords(f.body_html));
    }
  },[]); // eslint-disable-line

  const autoSlug = (h:string) => h.toLowerCase()
    .replace(/[áàäâã]/g,"a").replace(/[éèëê]/g,"e")
    .replace(/[íìïî]/g,"i").replace(/[óòöôõ]/g,"o")
    .replace(/[úùüû]/g,"u").replace(/[ñ]/g,"n")
    .replace(/[¿?¡!]/g,"").replace(/[^a-z0-9\s-]/g,"")
    .trim().replace(/\s+/g,"-").replace(/-+/g,"-").substring(0,80);

  const handleH1 = (v:string) => {
    set("h1",v);
    if(!f.slug||f.slug===autoSlug(f.h1||"")) set("slug",autoSlug(v));
    if(!f.seo_title) set("seo_title",v.substring(0,60));
  };

  const save = async(andPublish=false)=>{
    setError(""); setSuccess("");
    if(!f.slug){setError("Slug required");return;}
    if(!f.h1){setError("H1 required");return;}
    if(!f.seo_title){setError("SEO title required");return;}
    if(!f.meta_description){setError("Meta description required");return;}
    setSaving(true);
    try{
      const payload={...f,body_html:editorRef.current?.innerHTML||f.body_html};
      let saved:BlogArticle;
      if(isNew){saved=(await blogApi.create(payload)).data;}
      else{saved=(await blogApi.update(article!.id,payload)).data;}
      if(andPublish){
        setPublishing(true);
        saved=(await blogApi.publish(saved.id)).data;
        setSuccess("Published!");
      }else{setSuccess("Saved as draft.");}
      onSaved(saved);
    }catch(e:any){setError(e?.response?.data?.detail||e.message||"Save failed");}
    finally{setSaving(false);setPublishing(false);}
  };

  const inp:React.CSSProperties={width:"100%",padding:"8px 10px",
    border:"1px solid var(--color-border-secondary)",borderRadius:7,fontSize:13,
    background:"var(--color-background-primary)",color:"var(--color-text-primary)",
    outline:"none",fontFamily:"inherit"};
  const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:600,
    letterSpacing:".04em",textTransform:"uppercase" as const,
    color:"var(--color-text-tertiary)",marginBottom:4};
  const fw:React.CSSProperties={marginBottom:14};
  const tab=(t:string):React.CSSProperties=>({
    padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:500,
    borderBottom:activeTab===t?"2px solid #0891b2":"2px solid transparent",
    color:activeTab===t?"#0891b2":"var(--color-text-secondary)",
    background:"none",border:"none",
    borderBottomWidth:2,borderBottomStyle:"solid" as const,
    borderBottomColor:activeTab===t?"#0891b2":"transparent",
    whiteSpace:"nowrap" as const,
  });

  const seoTitleLen=(f.seo_title||"").length;
  const metaDescLen=(f.meta_description||"").length;

  return createPortal(
    <div style={{
      position:"fixed", top:0, left:0, right:0, bottom:0,
      width:"100vw", height:"100vh",
      background:"var(--color-background-primary)",
      zIndex:99999, display:"flex", flexDirection:"column",
      overflow:"hidden",
    }}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",
        borderBottom:"1px solid var(--color-border-secondary)",flexShrink:0}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
          fontSize:18,color:"var(--color-text-secondary)",padding:"0 6px"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>
            {isNew?"New Article":f.h1||"Edit Article"}
          </div>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>
            {siteOption?.label} · {f.language} · {wordCount} words · {readingTime(wordCount)} min
            {article&&<> · <StatusBadge status={article.status}/></>}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPreviewMode(!previewMode)} style={{
            padding:"6px 12px",borderRadius:7,border:"1px solid var(--color-border-secondary)",
            background:previewMode?"#f0fdf4":"var(--color-background-secondary)",
            color:previewMode?"#059669":"var(--color-text-secondary)",
            fontSize:12,cursor:"pointer",fontWeight:500}}>
            👁 {previewMode?"Edit":"Preview"}
          </button>
          <button onClick={onClose} style={{
            padding:"7px 14px",borderRadius:7,border:"1.5px solid rgba(255,255,255,.2)",
            background:"transparent",color:"rgba(255,255,255,.65)",
            fontSize:12,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={()=>{
            const html=editorRef.current?.innerHTML||f.body_html||"";
            setF(prev=>({...prev,body_html:html}));
            const kw=f.primary_keyword||f.h1||"";
            const wc=html.replace(/<[^>]+>/g," ").split(/\s+/).filter(Boolean).length;
            setEditorSeoScore({
              word_count:wc,has_h2:/<h2/i.test(html),has_table:/<table/i.test(html),
              has_list:/<ul|<ol/i.test(html),
              keyword_in_body:kw?html.toLowerCase().includes(kw.toLowerCase()):true,
              internal_links:(html.match(/href=["'][^"']*["']/g)||[]).length,
              seo_title_len:(f.seo_title||f.h1||"").length,meta_len:(f.meta_description||"").length,
            });
          }} style={{padding:"7px 12px",borderRadius:7,border:"1.5px solid rgba(255,255,255,.3)",
            background:"transparent",color:"rgba(200,220,255,.85)",
            fontSize:12,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>
            ⚡ SEO Check
          </button>
          <button onClick={()=>save(false)} disabled={saving} style={{
            padding:"7px 16px",borderRadius:7,border:"1.5px solid rgba(255,255,255,.25)",
            background:"transparent",color:"rgba(255,255,255,.9)",
            fontSize:12,cursor:saving?"not-allowed":"pointer",fontWeight:700,fontFamily:"inherit"}}>
            {saving&&!publishing?"Saving…":"💾 Save Changes"}
          </button>
          <button onClick={()=>save(true)} disabled={saving} style={{
            padding:"6px 16px",borderRadius:7,border:"none",
            background:publishing?"#059669aa":"#059669",color:"#fff",
            fontSize:12,cursor:saving?"not-allowed":"pointer",fontWeight:700}}>
            {publishing?"Publishing…":article?.status==="published"?"Update":"Publish"}
          </button>
        </div>
      </div>

      {(error||success)&&(
        <div style={{padding:"8px 16px",fontSize:12,flexShrink:0,
          background:error?"#fef2f2":"#f0fdf4",color:error?"#dc2626":"#059669",
          borderBottom:"1px solid var(--color-border-secondary)"}}>
          {error&&`⚠️ ${error}`}{success&&`✓ ${success}`}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid var(--color-border-secondary)",
        padding:"0 16px",flexShrink:0,overflowX:"auto"}}>
        {[["write","✏️ Write"],["seo","🔍 SEO & Meta"],["local","📍 Local & AEO"],["schema","📋 Schema"]].map(([t,label])=>(
          <button key={t} onClick={()=>{
              if(editorRef.current && activeTab==="write"){
                setF(prev=>({...prev, body_html: editorRef.current!.innerHTML}));
              }
              setActiveTab(t as any);
            }} style={tab(t)}>{label}</button>
        ))}
      </div>

      <div style={{flex:1,overflow:"hidden",display:"flex"}}>

        {/* WRITE TAB - always in DOM, hidden by CSS to preserve contentEditable state */}
        <div style={{flex:1,display:activeTab==="write"?"flex":"none",overflow:"hidden"}}>
            {/* Left sidebar */}
            <div style={{width:280,borderRight:"1px solid var(--color-border-secondary)",
              padding:16,overflowY:"auto",flexShrink:0}}>
              <div style={fw}>
                <label style={lbl}>H1 Headline *</label>
                <textarea value={f.h1||""} rows={3} onChange={e=>handleH1(e.target.value)}
                  placeholder="Article headline..." style={{...inp,resize:"vertical"}}/>
              </div>
              <div style={fw}>
                <label style={lbl}>URL Slug *</label>
                <input value={f.slug||""} onChange={e=>set("slug",e.target.value)}
                  placeholder="your-slug-here" style={{...inp,fontFamily:"monospace",fontSize:11}}/>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:3}}>
                  /blog/{f.slug||"your-slug"}
                </div>
              </div>
              <div style={fw}>
                <label style={lbl}>Deck (AEO direct answer)</label>
                <textarea value={f.deck||""} rows={4} onChange={e=>set("deck",e.target.value)}
                  placeholder="Direct answer paragraph — what AI engines will cite..." style={{...inp,resize:"vertical"}}/>
              </div>
              <div style={fw}>
                <label style={lbl}>Category</label>
                <select value={f.category||""} onChange={e=>set("category",e.target.value)} style={inp}>
                  {categories.map((c:string)=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={fw}>
                <label style={lbl}>Tags (comma-separated)</label>
                <input value={f.tags||""} onChange={e=>set("tags",e.target.value)} style={inp}/>
              </div>
              <div style={fw}>
                <label style={lbl}>Author Name</label>
                <input value={f.author_name||""} onChange={e=>set("author_name",e.target.value)} style={inp}/>
              </div>
              <div style={fw}>
                <label style={lbl}>Featured Image URL</label>
                <input value={f.featured_image_url||""} onChange={e=>set("featured_image_url",e.target.value)}
                  placeholder="https://..." style={inp}/>
              </div>
              <div style={fw}>
                <label style={lbl}>Image Alt Text *</label>
                <input value={f.featured_image_alt||""} onChange={e=>set("featured_image_alt",e.target.value)} style={inp}/>
              </div>
              <div style={fw}>
                <label style={lbl}>Language</label>
                <select value={f.language||"es"} onChange={e=>set("language",e.target.value)} style={inp}>
                  <option value="es">Spanish (es)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
                <input type="checkbox" id="toc" checked={f.toc_auto??true}
                  onChange={e=>set("toc_auto",e.target.checked)}/>
                <label htmlFor="toc" style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                  Auto Table of Contents
                </label>
              </div>
              {/* ── Inline SEO score panel ── */}
              {editorSeoScore&&(
                <div style={{marginTop:16,padding:"12px 14px",borderRadius:10,
                  background:"var(--bg)",border:"1.5px solid var(--border)"}}>
                  <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",
                    letterSpacing:".07em",color:"var(--muted)",marginBottom:10}}>SEO Check</div>
                  {[
                    ["Word Count", editorSeoScore.word_count>=900?"✅":"⚠", editorSeoScore.word_count+" words", editorSeoScore.word_count/1200],
                    ["SEO Title", editorSeoScore.seo_title_len>=40&&editorSeoScore.seo_title_len<=70?"✅":"⚠", editorSeoScore.seo_title_len+"/70 chars", editorSeoScore.seo_title_len/70],
                    ["Meta Desc", editorSeoScore.meta_len>=140&&editorSeoScore.meta_len<=160?"✅":"⚠", editorSeoScore.meta_len+"/160 chars", editorSeoScore.meta_len/160],
                    ["Has H2", editorSeoScore.has_h2?"✅":"❌", editorSeoScore.has_h2?"Present":"Missing", editorSeoScore.has_h2?1:0],
                    ["Has Table", editorSeoScore.has_table?"✅":"⚠", editorSeoScore.has_table?"Present":"Missing (adds 2pts)", editorSeoScore.has_table?1:0],
                    ["Has List", editorSeoScore.has_list?"✅":"⚠", editorSeoScore.has_list?"Present":"Missing", editorSeoScore.has_list?1:0],
                    ["Int. Links", editorSeoScore.internal_links>=3?"✅":"⚠", editorSeoScore.internal_links+" found (need 3+)", Math.min(editorSeoScore.internal_links/5,1)],
                    ["Keyword", editorSeoScore.keyword_in_body?"✅":"❌", editorSeoScore.keyword_in_body?"In body":"Not found", editorSeoScore.keyword_in_body?1:0],
                  ].map(([label,icon,val,pct]:any)=>(
                    <div key={label} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontSize:11,color:"var(--muted)"}}>{icon} {label}</span>
                        <span style={{fontSize:10,color:"var(--muted)"}}>{val}</span>
                      </div>
                      <div style={{height:3,background:"var(--border)",borderRadius:3}}>
                        <div style={{height:3,borderRadius:3,background:pct>=0.9?"#16a34a":pct>=0.6?"#d97706":"#dc2626",width:Math.min(pct*100,100)+"%"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={fw}>
                <label style={lbl}>hreflang Partner Slug</label>
                <input value={f.hreflang_pair_slug||""} onChange={e=>set("hreflang_pair_slug",e.target.value)}
                  placeholder="en-slug or es-slug" style={{...inp,fontSize:11,fontFamily:"monospace"}}/>
              </div>
            </div>

            {/* Editor area */}
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {!previewMode?(
                <>
                  <div style={{display:"flex",gap:2,padding:"6px 12px",flexWrap:"wrap",
                    borderBottom:"1px solid var(--color-border-secondary)",
                    background:"var(--color-background-secondary)",flexShrink:0,alignItems:"center"}}>
                    <Btn cmd="bold"                   icon="B"   title="Bold"          editor={editorRef}/>
                    <Btn cmd="italic"                 icon="I"   title="Italic"        editor={editorRef}/>
                    <Btn cmd="underline"              icon="U"   title="Underline"     editor={editorRef}/>
                    <span style={{width:1,height:20,background:"var(--color-border-secondary)",margin:"0 4px",display:"inline-block"}}/>
                    <Btn cmd="formatBlock" arg="h2"   icon="H2"  title="Heading 2"    editor={editorRef}/>
                    <Btn cmd="formatBlock" arg="h3"   icon="H3"  title="Heading 3"    editor={editorRef}/>
                    <Btn cmd="formatBlock" arg="p"    icon="¶"   title="Paragraph"    editor={editorRef}/>
                    <span style={{width:1,height:20,background:"var(--color-border-secondary)",margin:"0 4px",display:"inline-block"}}/>
                    <Btn cmd="insertUnorderedList"    icon="• —" title="Bullet list"  editor={editorRef}/>
                    <Btn cmd="insertOrderedList"      icon="1."  title="Numbered list" editor={editorRef}/>
                    <Btn cmd="removeFormat"           icon="✕"   title="Clear format" editor={editorRef}/>
                    <span style={{width:1,height:20,background:"var(--color-border-secondary)",margin:"0 4px",display:"inline-block"}}/>
                    <div style={{position:"relative"}}>
                      <button onClick={()=>setShowBlocks(!showBlocks)} style={{
                        padding:"4px 10px",borderRadius:5,border:"1px solid var(--color-border-secondary)",
                        background:showBlocks?"#e0f7fa":"var(--color-background-primary)",
                        color:showBlocks?"#0891b2":"var(--color-text-secondary)",
                        fontSize:12,cursor:"pointer",fontWeight:600}}>
                        + Block ▾
                      </button>
                      {showBlocks&&(
                        <div style={{position:"absolute",top:"100%",left:0,zIndex:100,
                          background:"var(--color-background-primary)",
                          border:"1px solid var(--color-border-secondary)",
                          borderRadius:8,minWidth:210,boxShadow:"0 4px 20px rgba(0,0,0,.15)",padding:6}}>
                          {BLOCK_TEMPLATES.map(bt=>(
                            <button key={bt.label}
                              onClick={()=>{insertBlock(editorRef,bt.html);setShowBlocks(false);}}
                              style={{display:"block",width:"100%",textAlign:"left",
                                padding:"7px 10px",borderRadius:6,border:"none",
                                background:"none",cursor:"pointer",fontSize:12,
                                color:"var(--color-text-primary)"}}>
                              {bt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{marginLeft:"auto",fontSize:11,color:"var(--color-text-tertiary)"}}>
                      {wordCount} words · {readingTime(wordCount)} min
                    </div>
                  </div>
                  <div ref={editorRef} contentEditable suppressContentEditableWarning
                    onInput={onEditorInput}
                    style={{flex:1,overflowY:"auto",padding:"24px 32px",outline:"none",
                      fontSize:15,lineHeight:1.75,color:"var(--color-text-primary)",
                      fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}/>
                </>
              ):(
                <div style={{flex:1,overflowY:"auto",padding:32,background:"#fff"}}>
                  <div style={{maxWidth:760,margin:"0 auto"}}>
                    {f.featured_image_url&&<img src={f.featured_image_url} alt={f.featured_image_alt||""}
                      style={{width:"100%",borderRadius:10,marginBottom:24}}/>}
                    <h1 style={{fontSize:"2rem",fontWeight:900,marginBottom:12,color:"#0d1f33"}}>
                      {f.h1||"(No H1 yet)"}
                    </h1>
                    {f.deck&&<p style={{fontSize:"1.05rem",color:"#4a5568",lineHeight:1.7,marginBottom:24}}>{f.deck}</p>}
                    <div style={{fontSize:15,lineHeight:1.75,color:"#1a2332"}}
                      dangerouslySetInnerHTML={{__html:editorRef.current?.innerHTML||f.body_html||"(No content)"}}/>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* SEO TAB */}
        {activeTab==="seo"&&(
          <div style={{flex:1,overflowY:"auto",padding:24,maxWidth:800}}>
            <h3 style={{marginBottom:20}}>SEO &amp; Meta Settings</h3>
            <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:16,marginBottom:24}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:12,color:"var(--color-text-secondary)"}}>SEO HEALTH</div>
              <SeoMeter label="SEO Title length"         value={seoTitleLen} max={70}   warn={40}  ok={50}/>
              <SeoMeter label="Meta Description length"  value={metaDescLen} max={170}  warn={100} ok={140}/>
              <SeoMeter label="Word count"               value={wordCount}   max={2000} warn={600} ok={900}/>
            </div>
            <div style={fw}>
              <label style={lbl}>SEO Title * ({seoTitleLen}/70)</label>
              <input value={f.seo_title||""} onChange={e=>set("seo_title",e.target.value)}
                maxLength={120} style={inp} placeholder="Title as shown in Google — 50-60 chars ideal"/>
            </div>
            <div style={fw}>
              <label style={lbl}>Meta Description * ({metaDescLen}/170)</label>
              <textarea value={f.meta_description||""} rows={3} maxLength={320}
                onChange={e=>set("meta_description",e.target.value)}
                style={{...inp,resize:"vertical"}} placeholder="150-160 chars. Include keyword. End with CTA."/>
            </div>
            <div style={fw}>
              <label style={lbl}>Primary Keyword</label>
              <input value={f.primary_keyword||""} onChange={e=>set("primary_keyword",e.target.value)} style={inp}/>
            </div>
            <div style={fw}>
              <label style={lbl}>Canonical URL (auto if empty)</label>
              <input value={f.canonical_url||""} onChange={e=>set("canonical_url",e.target.value)}
                style={{...inp,fontFamily:"monospace",fontSize:12}}/>
            </div>
            <div style={{borderTop:"1px solid var(--color-border-secondary)",paddingTop:20,marginTop:8}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:12,color:"var(--color-text-secondary)"}}>OPEN GRAPH</div>
              <div style={fw}>
                <label style={lbl}>OG Title (defaults to SEO Title)</label>
                <input value={f.og_title||""} onChange={e=>set("og_title",e.target.value)} style={inp}/>
              </div>
              <div style={fw}>
                <label style={lbl}>OG Description (defaults to Meta)</label>
                <textarea value={f.og_description||""} rows={2} onChange={e=>set("og_description",e.target.value)}
                  style={{...inp,resize:"vertical"}}/>
              </div>
            </div>
            <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:16,marginTop:16}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)",marginBottom:10}}>SERP PREVIEW</div>
              <div style={{fontSize:16,color:"#1a0dab",fontWeight:500,marginBottom:2}}>{f.seo_title||f.h1||"(SEO title)"}</div>
              <div style={{fontSize:12,color:"#006621",marginBottom:4}}>
                {f.canonical_url||`https://unapiscina.com/blog/${f.slug||"your-slug"}/`}
              </div>
              <div style={{fontSize:13,color:"#545454",lineHeight:1.5}}>
                {f.meta_description||"(Meta description)"}
              </div>
            </div>
          </div>
        )}

        {/* LOCAL & AEO TAB */}
        {activeTab==="local"&&(
          <div style={{flex:1,overflowY:"auto",padding:24,maxWidth:800}}>
            <h3 style={{marginBottom:12}}>Local SEO &amp; AEO / GEO</h3>
            <div style={{background:"#e0f7fa",borderRadius:10,padding:14,marginBottom:24,
              fontSize:12,color:"#0891b2",lineHeight:1.6}}>
              <strong>AEO</strong> fields help AI engines like ChatGPT, Perplexity, and Google SGE
              cite your article. Target questions should match how people ask verbally or in search.
            </div>
            <div style={fw}>
              <label style={lbl}>Geographic Region</label>
              <select value={f.geo_region||"SoCal"} onChange={e=>set("geo_region",e.target.value)} style={inp}>
                <option value="SoCal">Southern California</option>
                <option value="NorCal">Northern California</option>
                <option value="California">All California</option>
                <option value="National">National (US)</option>
              </select>
            </div>
            <div style={fw}>
              <label style={lbl}>Geo Cities (comma-separated → LocalBusiness areaServed)</label>
              <textarea value={f.geo_cities||""} rows={3} onChange={e=>set("geo_cities",e.target.value)}
                placeholder="Los Angeles, Anaheim, Riverside, Fontana, Ontario, Corona, Rancho Cucamonga"
                style={{...inp,resize:"vertical"}}/>
            </div>
            <div style={fw}>
              <label style={lbl}>AEO Target Questions (one per line → FAQPage schema)</label>
              <textarea value={(f.aeo_target_questions||"").replace(/\|/g,"\n")} rows={8}
                onChange={e=>set("aeo_target_questions",e.target.value.trim().replace(/\n+/g,"|"))}
                placeholder={"¿Cuánto cuesta una piscina en el Sur de California?\n¿Cuánto tiempo tarda construir una piscina?"}
                style={{...inp,resize:"vertical"}}/>
              <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:3}}>
                Match these exactly with your FAQ section headings.
              </div>
            </div>
            <div style={fw}>
              <label style={lbl}>Related Article IDs (comma-separated)</label>
              <input value={f.related_article_ids||""} onChange={e=>set("related_article_ids",e.target.value)}
                placeholder="2,3" style={inp}/>
            </div>
          </div>
        )}

        {/* SCHEMA TAB */}
        {activeTab==="schema"&&(
          <div style={{flex:1,overflowY:"auto",padding:24,maxWidth:900}}>
            <h3 style={{marginBottom:8}}>Schema.org JSON-LD</h3>
            <p style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:20,lineHeight:1.6}}>
              Injected into &lt;head&gt; as &lt;script type="application/ld+json"&gt;.
              Auto-generate from article fields or edit manually.
            </p>
            <div style={fw}>
              <label style={lbl}>Schema Types Active</label>
              <input value={f.schema_types||""} onChange={e=>set("schema_types",e.target.value)}
                placeholder="Article,FAQPage,LocalBusiness,BreadcrumbList" style={inp}/>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>{
                const schema={
                  "@context":"https://schema.org","@graph":[
                    {"@type":"Article","headline":f.h1||"","description":f.meta_description||"",
                      "author":{"@type":"Organization","name":f.author_name||""},
                      "datePublished":new Date().toISOString().split("T")[0],
                      "dateModified":new Date().toISOString().split("T")[0],
                      "image":f.featured_image_url||"","inLanguage":f.language||"es",
                      "mainEntityOfPage":{"@type":"WebPage","@id":f.canonical_url||""}},
                    ...((f.aeo_target_questions)?[{"@type":"FAQPage",
                      "mainEntity":(f.aeo_target_questions||"").split("|").filter(Boolean).map((q:string)=>({
                        "@type":"Question","name":q.trim(),
                        "acceptedAnswer":{"@type":"Answer","text":"Fill in answer here."}
                      }))}]:[]),
                    ...((f.geo_cities)?[{"@type":"LocalBusiness",
                      "name":siteOption?.label||"",
                      "areaServed":(f.geo_cities||"").split(",").map((c:string)=>({
                        "@type":"City","name":c.trim()}))}]:[]),
                    {"@type":"BreadcrumbList","itemListElement":[
                      {"@type":"ListItem","position":1,"name":"Inicio","item":f.canonical_url?.split("/blog")[0]||""},
                      {"@type":"ListItem","position":2,"name":"Blog","item":(f.canonical_url?.split("/blog")[0]||"")+"/blog/"},
                      {"@type":"ListItem","position":3,"name":f.h1||"","item":f.canonical_url||""}
                    ]}
                  ]};
                set("schema_json",JSON.stringify(schema,null,2));
                set("schema_types","Article,FAQPage,LocalBusiness,BreadcrumbList");
              }} style={{padding:"7px 14px",borderRadius:7,border:"1px solid #bae6fd",
                background:"#e0f7fa",color:"#0891b2",fontSize:12,cursor:"pointer",fontWeight:600}}>
                ⚡ Auto-generate from fields
              </button>
              <button onClick={()=>set("schema_json","")} style={{
                padding:"7px 14px",borderRadius:7,border:"1px solid var(--color-border-secondary)",
                background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",
                fontSize:12,cursor:"pointer"}}>Clear</button>
            </div>
            <textarea value={f.schema_json||""} onChange={e=>set("schema_json",e.target.value)} rows={28}
              placeholder={'{\n  "@context": "https://schema.org",\n  "@graph": [...]\n}'}
              style={{...inp,resize:"vertical",fontFamily:"monospace",fontSize:12,lineHeight:1.6}}/>
            <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:6}}>
              Validate at: <a href="https://search.google.com/test/rich-results" target="_blank"
                rel="noopener" style={{color:"#0891b2"}}>Google Rich Results Test</a>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BLOG CMS PAGE — Article list
// ═════════════════════════════════════════════════════════════════════════════
export const BlogCmsPage: React.FC = () => {
  const [cmsTab, setCmsTab] = useState<"articles"|"seo"|"keywords">("articles");
  const [articles,setArticles]     = useState<BlogArticle[]>([]);
  const [total,setTotal]           = useState(0);
  const [page,setPage]             = useState(1);
  const [loading,setLoading]       = useState(false);
  const [selectedSite,setSelectedSite] = useState(SITE_OPTIONS[0].value);
  const [filterStatus,setFilterStatus] = useState("all");
  const [editing,setEditing]       = useState<BlogArticle|null|"new">(null);
  const [error,setError]           = useState("");
  // Per-card AI tools state
  const [cardScores,   setCardScores]   = useState<Record<number,any>>({});
  const [cardReviewing,setCardReviewing]= useState<Record<number,boolean>>({});
  const [cardAutofixing,setCardAutofixing]= useState<Record<number,boolean>>({});
  const [cardExpanded, setCardExpanded] = useState<Record<number,boolean>>({});
  const [metaEditId,   setMetaEditId]   = useState<number|null>(null);
  const [metaEditData, setMetaEditData] = useState<{title:string;meta:string;slug:string}>({title:"",meta:"",slug:""});
  const [metaSaving,   setMetaSaving]   = useState(false);
  const [metaAiLoading,setMetaAiLoading]= useState(false);

  const load = useCallback(async()=>{
    setLoading(true); setError("");
    try{
      const res = await blogApi.list(selectedSite,page,filterStatus==="all"?undefined:filterStatus);
      setArticles(res.data.articles);
      setTotal(res.data.total);
    }catch(e:any){setError(e?.response?.data?.detail||"Failed to load");}
    finally{setLoading(false);}
  },[selectedSite,page,filterStatus]);

  useEffect(()=>{load();},[load]);

  const handleSaved=(a:BlogArticle)=>{load();setEditing(a);};

  const togglePublish=async(a:BlogArticle)=>{
    try{
      if(a.status==="published") await blogApi.unpublish(a.id);
      else await blogApi.publish(a.id);
      load();
    }catch(e:any){setError(e?.response?.data?.detail||"Failed");}
  };

  const archive=async(a:BlogArticle)=>{
    if(!confirm(`Archive "${a.h1}"?`)) return;
    try{await blogApi.archive(a.id);load();}
    catch(e:any){setError(e?.response?.data?.detail||"Failed");}
  };

  const fmtDate=(ts?:string)=>ts
    ?new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";

  const runReview = async (a: BlogArticle) => {
    setCardReviewing(r=>({...r,[a.id]:true}));
    setCardExpanded(e=>({...e,[a.id]:true}));
    try {
      const r = await http.post(`/seo-content/review/${a.id}`,{},{timeout:120000});
      setCardScores(s=>({...s,[a.id]:r.data}));
    } catch(e:any) {
      const msg = e?.code==="ECONNABORTED"?"Timed out — try again":e?.response?.data?.detail||"Review failed";
      setCardScores(s=>({...s,[a.id]:{error:msg}}));
    }
    setCardReviewing(r=>({...r,[a.id]:false}));
  };

  const runAutofix = async (a: BlogArticle) => {
    const sc = cardScores[a.id];
    if(!sc||sc.error){alert("Run AI Review first to get editing notes.");return;}
    setCardAutofixing(x=>({...x,[a.id]:true}));
    try {
      const r = await http.post(`/seo-content/autofix/${a.id}`,{cdm_notes:sc.notes||"",cdm_score:sc.overall_score||0});
      if(r.data.body_html){
        // Open editor with the auto-fixed body
        const full = await http.get(`/blog/admin/article/${a.id}`);
        setEditing({...full.data, body_html: r.data.body_html});
      }
      await load();
    } catch(e:any){alert("Auto-Fix failed: "+(e?.response?.data?.detail||e.message));}
    setCardAutofixing(x=>({...x,[a.id]:false}));
  };

  const openMetaEdit = async (a: BlogArticle) => {
    setMetaEditId(a.id);
    setMetaEditData({title:a.seo_title||a.h1||"",meta:a.meta_description||"",slug:a.slug||""});
  };

  const aiSuggestMeta = async () => {
    setMetaAiLoading(true);
    try {
      const a = articles.find(x=>x.id===metaEditId);
      if(!a) return;
      const sc = cardScores[a.id];
      const cdmNotes = sc?.notes||"";
      const r = await http.post("/seo-content/review/"+a.id+"/suggest-meta",{
        h1: a.h1||"", slug: a.slug||"", primary_keyword: a.primary_keyword||"",
        cdm_notes: cdmNotes,
      }).catch(()=>null);
      if(r?.data?.seo_title) setMetaEditData(d=>({...d,title:r.data.seo_title}));
      if(r?.data?.meta_description) setMetaEditData(d=>({...d,meta:r.data.meta_description}));
    } catch{}
    setMetaAiLoading(false);
  };

  const saveMetaTags = async () => {
    if(!metaEditId) return;
    setMetaSaving(true);
    try {
      await http.put(`/blog/admin/article/${metaEditId}`,{
        seo_title: metaEditData.title,
        meta_description: metaEditData.meta,
        slug: metaEditData.slug,
      });
      setMetaEditId(null);
      await load();
    } catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setMetaSaving(false);
  };

  const scoreColor=(n:number)=>n>=75?"#16a34a":n>=60?"#d97706":"#dc2626";
  const scoreBarW=(n:number,max:number=100)=>Math.round((n/max)*100)+"%";

  if(editing!==null){
    return <ArticleEditor
      article={editing==="new"?null:editing as BlogArticle}
      siteId={editing==="new"?selectedSite:(editing as BlogArticle).site_id}
      onSaved={handleSaved}
      onClose={()=>{setEditing(null);load();}}/>;
  }

  return (
    <div style={{padding:24,maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",marginBottom:4}}>
            Blog CMS
          </h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary)"}}>
            {total} article{total!==1?"s":""} · SEO + AEO + GEO + Local
          </p>
        </div>
        <button onClick={()=>setEditing("new")} style={{
          padding:"10px 20px",borderRadius:8,border:"none",
          background:"#0891b2",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          + New Article
        </button>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <select value={selectedSite} onChange={e=>{setSelectedSite(e.target.value);setPage(1);}}
          style={{padding:"7px 12px",borderRadius:7,
            border:"1px solid var(--color-border-secondary)",
            background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13}}>
          {SITE_OPTIONS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {["all","draft","review","scheduled","published","archived"].map(s=>(
          <button key={s} onClick={()=>{setFilterStatus(s);setPage(1);}} style={{
            padding:"6px 12px",borderRadius:7,fontSize:12,fontWeight:500,cursor:"pointer",
            border:"1px solid var(--color-border-secondary)",
            background:filterStatus===s?"#e0f7fa":"var(--color-background-secondary)",
            color:filterStatus===s?"#0891b2":"var(--color-text-secondary)"}}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {error&&<div style={{padding:"10px 14px",background:"#fef2f2",color:"#dc2626",
        borderRadius:8,marginBottom:16,fontSize:13}}>⚠️ {error}</div>}

      {loading?(
        <div style={{textAlign:"center",padding:60,color:"var(--color-text-tertiary)",fontSize:14}}>
          Loading articles…
        </div>
      ):articles.length===0?(
        <div style={{textAlign:"center",padding:60,
          border:"2px dashed var(--color-border-secondary)",borderRadius:12}}>
          <div style={{fontSize:36,marginBottom:12}}>✍️</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)",marginBottom:8}}>
            No articles yet for {SITE_OPTIONS.find(s=>s.value===selectedSite)?.label}
          </div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:20}}>
            Create your first article — it will be visible after publishing.
          </div>
          <button onClick={()=>setEditing("new")} style={{
            padding:"10px 24px",borderRadius:8,border:"none",
            background:"#0891b2",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            + New Article
          </button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {articles.map(a=>{
            const sc = cardScores[a.id];
            const expanded = cardExpanded[a.id];
            return (
            <div key={a.id} style={{
              border:"1.5px solid var(--color-border-secondary)",borderRadius:12,
              background:"var(--color-background-primary)",overflow:"hidden",
              boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>

              {/* ── Card top row ── */}
              <div style={{display:"flex",alignItems:"flex-start",gap:16,padding:"16px 20px"}}>
                {a.featured_image_url?(
                  <img src={a.featured_image_url} alt={a.featured_image_alt||""}
                    style={{width:72,height:50,objectFit:"cover",borderRadius:7,flexShrink:0}}/>
                ):(
                  <div style={{width:72,height:50,borderRadius:7,flexShrink:0,
                    background:"var(--color-background-secondary)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:20,color:"var(--color-text-tertiary)"}}>📝</div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                    <StatusBadge status={a.status}/>
                    {a.category&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{a.category}</span>}
                    {a.language&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:10,
                      background:"var(--color-background-secondary)",
                      color:"var(--color-text-tertiary)",fontWeight:600}}>{a.language.toUpperCase()}</span>}
                    {sc?.overall_score!=null&&!sc.error&&(
                      <span style={{fontSize:11,fontWeight:800,padding:"2px 9px",borderRadius:10,
                        background:sc.overall_score>=75?"#dcfce7":sc.overall_score>=60?"#fef9c3":"#fee2e2",
                        color:scoreColor(sc.overall_score)}}>
                        CDM {sc.overall_score}/100
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--color-text-primary)",marginBottom:4,lineHeight:1.3}}>
                    {a.h1||a.slug}
                  </div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5,lineHeight:1.5}}>
                    {(a.meta_description||"").substring(0,120)}{(a.meta_description?.length||0)>120?"…":""}
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:11,color:"var(--color-text-tertiary)",flexWrap:"wrap",alignItems:"center"}}>
                    {a.word_count&&<span>📝 {a.word_count} words</span>}
                    {a.reading_time_minutes&&<span>⏱ {a.reading_time_minutes} min</span>}
                    {a.published_at&&<span>📅 {fmtDate(a.published_at)}</span>}
                    <span style={{fontFamily:"monospace",fontSize:10}}>/blog/{a.slug}</span>
                  </div>
                </div>

                {/* ── Right action column ── */}
                <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0,minWidth:120}}>
                  {/* Primary: Edit Body */}
                  <button onClick={async()=>{
                    try{const full=await http.get(`/blog/admin/article/${a.id}`);setEditing(full.data);}
                    catch{setEditing(a);}
                  }} style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",
                    fontFamily:"inherit",fontWeight:700,fontSize:12,
                    background:"var(--navy)",color:"#fff"}}>
                    ✎ Edit Body
                  </button>
                  {/* Meta Tags */}
                  <button onClick={()=>openMetaEdit(a)} style={{padding:"7px 14px",borderRadius:8,
                    border:"1.5px solid var(--color-border-secondary)",cursor:"pointer",
                    fontFamily:"inherit",fontWeight:700,fontSize:12,
                    background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}>
                    ⚙ Meta Tags
                  </button>
                  {/* AI Review */}
                  <button onClick={()=>runReview(a)} disabled={cardReviewing[a.id]}
                    style={{padding:"7px 14px",borderRadius:8,
                      border:"1.5px solid #0891b2",cursor:"pointer",
                      fontFamily:"inherit",fontWeight:700,fontSize:12,
                      background:cardReviewing[a.id]?"#e0f7fa":"var(--color-background-primary)",
                      color:"#0891b2",opacity:cardReviewing[a.id]?0.7:1}}>
                    {cardReviewing[a.id]?"Reviewing…":"⚡ AI Review"}
                  </button>
                  {/* Auto-Fix — only visible when score < 75 */}
                  {sc&&!sc.error&&sc.overall_score<75&&(
                    <button onClick={()=>runAutofix(a)} disabled={cardAutofixing[a.id]}
                      style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",
                        fontFamily:"inherit",fontWeight:700,fontSize:12,
                        background:cardAutofixing[a.id]?"#e0f7fa":"#7c3aed",color:"#fff",
                        opacity:cardAutofixing[a.id]?0.7:1}}>
                      {cardAutofixing[a.id]?"Fixing…":"🔧 Auto-Fix"}
                    </button>
                  )}
                  {/* Separator */}
                  <div style={{borderTop:"1px solid var(--color-border-secondary)",margin:"2px 0"}}/>
                  {/* Status transitions */}
                  {a.status==="draft"&&(
                    <button onClick={()=>togglePublish(a)} style={{padding:"6px 14px",borderRadius:8,
                      border:"1.5px solid #059669",cursor:"pointer",
                      fontFamily:"inherit",fontWeight:700,fontSize:12,
                      background:"var(--color-background-primary)",color:"#059669"}}>
                      → Review
                    </button>
                  )}
                  {a.status==="review"&&(
                    <button onClick={()=>togglePublish(a)} style={{padding:"6px 14px",borderRadius:8,
                      border:"none",background:"#059669",color:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12}}>
                      ✓ PUBLISH
                    </button>
                  )}
                  {a.status==="published"&&(
                    <button onClick={()=>togglePublish(a)} style={{padding:"6px 14px",borderRadius:8,
                      border:"none",background:"#fee2e2",color:"#dc2626",
                      cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12}}>
                      Unpublish
                    </button>
                  )}
                  <button onClick={()=>archive(a)} style={{padding:"5px 14px",borderRadius:8,
                    border:"1px solid var(--color-border-secondary)",cursor:"pointer",
                    fontFamily:"inherit",fontSize:11,
                    background:"none",color:"var(--color-text-tertiary)"}}>
                    Archive
                  </button>
                </div>
              </div>

              {/* ── CDM Score panel — shown after AI Review ── */}
              {sc&&!sc.error&&(
                <div style={{borderTop:"1.5px solid var(--color-border-secondary)",
                  background:"var(--color-background-secondary)",padding:"14px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}}>
                    <div style={{fontSize:28,fontWeight:900,color:scoreColor(sc.overall_score),lineHeight:1}}>
                      {sc.overall_score}/100
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",
                        padding:"3px 10px",borderRadius:6,display:"inline-block",
                        background:sc.overall_score>=75?"#dcfce7":sc.overall_score>=60?"#fef9c3":"#fee2e2",
                        color:sc.overall_score>=75?"#166534":sc.overall_score>=60?"#854d0e":"#991b1b"}}>
                        {sc.recommendation==="publish_ready"?"✓ Publish Ready"
                          :sc.recommendation==="human_edit"?"✎ Human Edit Needed"
                          :sc.recommendation==="auto_fix_required"?"🔧 Auto-Fix Required"
                          :(sc.recommendation||"Review").replace(/_/g," ")}
                      </div>
                      {sc.passed!=null&&<span style={{fontSize:11,color:"var(--color-text-tertiary)",marginLeft:8}}>
                        {sc.passed?"Passed CDM threshold":"Below threshold"}
                      </span>}
                    </div>
                    <button onClick={()=>setCardExpanded(e=>({...e,[a.id]:!expanded}))}
                      style={{marginLeft:"auto",fontSize:11,fontWeight:700,cursor:"pointer",
                        padding:"4px 10px",borderRadius:6,border:"1px solid var(--color-border-secondary)",
                        background:"none",color:"var(--color-text-secondary)",fontFamily:"inherit"}}>
                      {expanded?"Hide Details ▲":"View Details ▼"}
                    </button>
                  </div>
                  {/* Category score bars */}
                  {expanded&&sc.scores&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",marginBottom:10}}>
                      {Object.entries(sc.scores).map(([k,v]:any)=>(
                        <div key={k}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                            <span style={{fontSize:11,color:"var(--color-text-secondary)",textTransform:"capitalize"}}>
                              {k.replace(/_/g," ")}
                            </span>
                            <span style={{fontSize:11,fontWeight:700,color:scoreColor(v)}}>{v}/10</span>
                          </div>
                          <div style={{height:4,background:"#e5e7eb",borderRadius:4}}>
                            <div style={{height:4,borderRadius:4,width:scoreBarW(v,10),
                              background:scoreColor(v),transition:"width .3s"}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* CDM Review Notes */}
                  {expanded&&sc.notes&&(
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65,
                      padding:"10px 14px",background:"var(--color-background-primary)",
                      borderRadius:8,border:"1px solid var(--color-border-secondary)",
                      whiteSpace:"pre-wrap",maxHeight:160,overflowY:"auto"}}>
                      <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",
                        letterSpacing:".06em",color:"var(--color-text-tertiary)",marginBottom:6}}>
                        CDM REVIEW NOTES
                      </div>
                      {sc.notes}
                    </div>
                  )}
                </div>
              )}
              {sc?.error&&(
                <div style={{borderTop:"1.5px solid #fca5a5",padding:"10px 20px",
                  background:"#fef2f2",fontSize:12,color:"#dc2626"}}>
                  ❌ {sc.error}
                </div>
              )}
            </div>
          );})}
        </div>
      )}


      {/* ── Meta Tags editor modal ── */}
      {metaEditId&&(()=>{
        const a = articles.find(x=>x.id===metaEditId);
        const sc = cardScores[metaEditId];
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.55)",zIndex:9999,
            display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--color-background-primary)",borderRadius:14,
              boxShadow:"0 20px 60px rgba(0,0,0,.25)",width:"100%",maxWidth:560,overflow:"hidden"}}>
              {/* Header */}
              <div style={{background:"var(--navy)",padding:"14px 22px",display:"flex",alignItems:"center",gap:12}}>
                <span style={{flex:1,color:"#fff",fontWeight:800,fontSize:15}}>⚙ Meta Tags</span>
                <span style={{fontSize:12,color:"rgba(255,255,255,.55)"}}>{a?.h1?.substring(0,40)||"Article"}</span>
              </div>
              {/* CDM notes hint */}
              {sc?.notes&&(
                <div style={{padding:"10px 22px",background:"#eff6ff",borderBottom:"1.5px solid #bfdbfe",
                  fontSize:11,color:"#1e40af",lineHeight:1.6}}>
                  <strong>CDM Notes:</strong> {sc.notes.substring(0,200)}{sc.notes.length>200?"…":""}
                </div>
              )}
              {/* Fields */}
              <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:16}}>
                <label style={{display:"flex",flexDirection:"column",gap:6}}>
                  <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",
                    letterSpacing:".07em",color:"var(--color-text-secondary)"}}>
                    SEO Title ({metaEditData.title.length}/70)
                  </span>
                  <input value={metaEditData.title}
                    onChange={e=>setMetaEditData(d=>({...d,title:e.target.value}))}
                    style={{padding:"10px 14px",border:`1.5px solid ${metaEditData.title.length>70?"#dc2626":"var(--color-border-secondary)"}`,
                      borderRadius:9,fontSize:14,fontFamily:"inherit",outline:"none",
                      background:"var(--color-background-secondary)"}}/>
                </label>
                <label style={{display:"flex",flexDirection:"column",gap:6}}>
                  <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",
                    letterSpacing:".07em",color:"var(--color-text-secondary)"}}>
                    Meta Description ({metaEditData.meta.length}/160)
                  </span>
                  <textarea value={metaEditData.meta}
                    onChange={e=>setMetaEditData(d=>({...d,meta:e.target.value}))}
                    rows={4}
                    style={{padding:"10px 14px",border:`1.5px solid ${metaEditData.meta.length>160?"#dc2626":"var(--color-border-secondary)"}`,
                      borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",
                      background:"var(--color-background-secondary)"}}/>
                </label>
                <label style={{display:"flex",flexDirection:"column",gap:6}}>
                  <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",
                    letterSpacing:".07em",color:"var(--color-text-secondary)"}}>URL Slug</span>
                  <input value={metaEditData.slug}
                    onChange={e=>setMetaEditData(d=>({...d,slug:e.target.value}))}
                    style={{padding:"10px 14px",border:"1.5px solid var(--color-border-secondary)",
                      borderRadius:9,fontSize:13,fontFamily:"monospace",outline:"none",
                      background:"var(--color-background-secondary)"}}/>
                </label>
                {/* AI Suggest + Save row */}
                <div style={{display:"flex",gap:10,paddingTop:4}}>
                  <button onClick={aiSuggestMeta} disabled={metaAiLoading}
                    style={{flex:1,padding:"10px 14px",borderRadius:9,
                      border:"1.5px solid #0891b2",cursor:"pointer",
                      fontFamily:"inherit",fontWeight:700,fontSize:13,
                      background:metaAiLoading?"#e0f7fa":"var(--color-background-primary)",
                      color:"#0891b2",opacity:metaAiLoading?0.7:1}}>
                    {metaAiLoading?"✦ Generating…":"✦ AI Suggest"}
                  </button>
                  <button onClick={saveMetaTags} disabled={metaSaving}
                    style={{flex:1,padding:"10px 14px",borderRadius:9,border:"none",cursor:"pointer",
                      fontFamily:"inherit",fontWeight:700,fontSize:13,
                      background:metaSaving?"#d1fae5":"var(--gold)",
                      color:metaSaving?"#065f46":"var(--navy)",opacity:metaSaving?0.7:1}}>
                    {metaSaving?"Saving…":"💾 Save Meta Tags"}
                  </button>
                  <button onClick={()=>setMetaEditId(null)}
                    style={{padding:"10px 14px",borderRadius:9,
                      border:"1.5px solid var(--color-border-secondary)",cursor:"pointer",
                      fontFamily:"inherit",fontWeight:700,fontSize:13,
                      background:"none",color:"var(--color-text-secondary)"}}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {total>20&&(
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:20}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{
            padding:"6px 14px",borderRadius:7,border:"1px solid var(--color-border-secondary)",
            background:"var(--color-background-secondary)",fontSize:13,
            cursor:page===1?"not-allowed":"pointer",color:"var(--color-text-secondary)"}}>← Prev</button>
          <span style={{padding:"6px 14px",fontSize:13,color:"var(--color-text-secondary)"}}>
            Page {page} of {Math.ceil(total/20)}
          </span>
          <button onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/20)} style={{
            padding:"6px 14px",borderRadius:7,border:"1px solid var(--color-border-secondary)",
            background:"var(--color-background-secondary)",fontSize:13,
            cursor:page>=Math.ceil(total/20)?"not-allowed":"pointer",color:"var(--color-text-secondary)"}}>Next →</button>
        </div>
      )}
    </div>
  );
};

// ── SEO Topic Hub ─────────────────────────────────────────────────────────────
const SEOTopicHub: React.FC = () => {
  const [tab,setTab]=useState<"topics"|"queue">("topics");
  const [topics,setTopics]=useState<any[]>([]);
  const [articles,setArticles]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState("");
  const [generating,setGenerating]=useState<Record<number,string>>({});
  const [pickingType,setPickingType]=useState<number|null>(null);
  const [dupCheck,setDupCheck]=useState<Record<number,any>>({});
  const [reviewing,setReviewing]=useState<Record<number,boolean>>({});
  const [autofixing,setAutofixing]=useState<Record<number,boolean>>({});
  const [scores,setScores]=useState<Record<number,any>>({});
  const [editingArt,setEditingArt]=useState<number|null>(null);
  const [editMode,setEditMode]=useState<"body"|"meta">("body");
  const [editBody,setEditBody]=useState("");
  const [editMeta,setEditMeta]=useState("");
  const [editTitle,setEditTitle]=useState("");
  const [editSlug,setEditSlug]=useState("");
  const [savingArt,setSavingArt]=useState(false);

  const load=async()=>{
    setLoading(true);
    try{const[tR,aR]=await Promise.all([http.get("/seo-content/topics"),http.get("/seo-content/articles").catch(()=>({data:{articles:[]}}))]);setTopics(tR.data?.topics||[]);setArticles(aR.data?.articles||[]);}catch{}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const syncGSC=async()=>{setSyncing(true);setSyncMsg("Syncing...");
    try{const r=await http.post("/seo-content/sync-gsc",{});setSyncMsg("Synced "+r.data?.synced+" topics");await load();}
    catch{setSyncMsg("Sync failed");}setSyncing(false);};

  const checkAndGenerate=async(topic:any)=>{
    try{const d=await http.get("/seo-content/check-duplicate?title="+encodeURIComponent(topic.discovered_query||topic.seed_keyword)+"&brand_id=nexabuilder").catch(()=>null);
      if(d?.data)setDupCheck(x=>({...x,[topic.id]:d.data}));}catch{}
    setPickingType(topic.id);};

  const generate=async(topic:any,ct:string)=>{
    setPickingType(null);const id=topic.id;const q=topic.discovered_query||topic.seed_keyword;
    setGenerating(g=>({...g,[id]:"queuing"}));
    try{const r=await http.post("/seo-content/generate",{topic:q,primary_keyword:topic.seed_keyword,writing_profile_id:1,discovery_id:id,content_type:ct});
      const jid=r.data?.job_id;setGenerating(g=>({...g,[id]:"gen:"+jid}));
      const poll=async()=>{try{const s=await http.get("/seo-content/status/"+jid);const st=s.data?.status;
          if(st==="DRAFT"||st==="PUBLISHED"){setGenerating(g=>({...g,[id]:"done"}));await load();}
          else if(st==="FAILED")setGenerating(g=>({...g,[id]:"error"}));else setTimeout(poll,8000);}
        catch{setTimeout(poll,10000);}};setTimeout(poll,5000);}
    catch{setGenerating(g=>({...g,[id]:"error"}));}};

  const reviewArt=async(id:number)=>{setReviewing(r=>({...r,[id]:true}));
    try{const r=await http.post("/seo-content/review/"+id,{},{timeout:120000});setScores(s=>({...s,[id]:r.data}));}
    catch(e:any){const msg=e?.code==="ECONNABORTED"?"Timed out — try again":e?.response?.data?.detail||"Network error";setScores(s=>({...s,[id]:{error:msg}}));}
    setReviewing(r=>({...r,[id]:false}));};

  const autofix=async(id:number)=>{const sc=scores[id];if(!sc){alert("Run CDM Review first.");return;}
    setAutofixing(a=>({...a,[id]:true}));
    try{const r=await http.post("/seo-content/autofix/"+id,{cdm_notes:sc.notes||"",cdm_score:sc.overall_score||0});
      setArticles(a=>a.map(x=>x.id===id?{...x,body_html:r.data.body_html,status:"DRAFT"}:x));
      if(r.data.body_html){const art=articles.find(a=>a.id===id);if(art)openEdit({...art,body_html:r.data.body_html});}}
    catch(e:any){alert("Auto-fix failed: "+(e?.response?.data?.detail||e.message));}
    setAutofixing(a=>({...a,[id]:false}));};

  const setStatus=async(id:number,status:string)=>{
    try{await http.patch("/seo-content/articles/"+id+"/status",{status});setArticles(a=>a.map(x=>x.id===id?{...x,status}:x));}
    catch(e:any){alert("Failed: "+(e?.response?.data?.detail||e.message));}};

  const openEdit=async(art:any)=>{
    setEditingArt(art.id);setEditMode("body");
    setEditTitle(art.title||"");setEditSlug(art.slug||"");setEditMeta(art.meta_description||"");setEditBody("");
    try{const full=await http.get("/seo-content/articles/"+art.id);setEditBody(full.data.body_html||art.body_html||"");}
    catch{setEditBody(art.body_html||art.body_preview||"");}};

  const saveEdit=async()=>{if(!editingArt)return;setSavingArt(true);
    try{await http.put("/seo-content/articles/"+editingArt,{title:editTitle,slug:editSlug,body_html:editBody,meta_description:editMeta});
      setEditingArt(null);await load();}
    catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setSavingArt(false);};

  const gl=(id:number)=>{const s=generating[id]||"";return s==="queuing"?"Queuing...":s.startsWith("gen")?"Generating...":s==="done"?"Done":s==="error"?"Error":null;};
  const sc2=(n:number)=>n>=75?"var(--green)":n>=60?"var(--amber)":"var(--red)";
  const SBG:Record<string,string>={DRAFT:"#fef9c3",REVIEW:"#dbeafe",PUBLISHED:"#dcfce7",GENERATING:"#f3e8ff",FAILED:"#fee2e2"};
  const SFG:Record<string,string>={DRAFT:"#854d0e",REVIEW:"#1e40af",PUBLISHED:"#166534",GENERATING:"#6b21a8",FAILED:"#991b1b"};
  const cd={background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)"};

  return (<div>
    {pickingType&&(()=>{const t=topics.find(x=>x.id===pickingType);const dup=dupCheck[pickingType||0];return(
      <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.6)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{...cd,width:"100%",maxWidth:500,overflow:"hidden"}}>
          <div style={{background:"var(--navy)",padding:"14px 20px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{flex:1,color:"#fff",fontWeight:800,fontSize:15}}>Choose Article Type</span>
            <button onClick={()=>setPickingType(null)} style={{background:"transparent",border:"1.5px solid rgba(255,255,255,.25)",color:"#fff",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
          <div style={{padding:"18px 20px"}}>
            {dup&&dup.action!=="ALLOW"&&(<div style={{padding:"10px 14px",borderRadius:8,marginBottom:14,background:dup.action==="BLOCK"?"#fef2f2":"#fef9c3",fontSize:12,color:dup.action==="BLOCK"?"#991b1b":"#854d0e"}}>
              {dup.action==="BLOCK"?"Duplicate detected":"Similar article exists"} ({Math.round(dup.similarity_score*100)}%)
            </div>)}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["comparison_article","Comparison Article","Best/worst comparisons, cost tables"],
                ["guide_page","Guide Page","How-to, step-by-step, CSLB guides"],
                ["faq_page","FAQ Page","6-8 Q&As, PAA clusters"],
                ["location_page","Location Page","[Service] in [City] local SEO"]].map(([ct,label,desc])=>(
                <button key={ct} onClick={()=>{if(dup?.action==="BLOCK")return;if(t)generate(t,ct);}}
                  disabled={dup?.action==="BLOCK"}
                  style={{padding:"14px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",textAlign:"left",cursor:dup?.action==="BLOCK"?"not-allowed":"pointer",opacity:dup?.action==="BLOCK"?0.5:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:4}}>{label}</div>
                  <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );})()}

    {editingArt&&(<div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.55)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 20px",overflowY:"auto"}}>
      <div style={{...cd,width:"100%",maxWidth:940,overflow:"hidden"}}>
        <div style={{background:"var(--navy)",padding:"14px 22px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{flex:1,color:"#fff",fontWeight:800,fontSize:15}}>Edit Article</span>
          <button onClick={saveEdit} disabled={savingArt} style={{padding:"8px 20px",borderRadius:8,border:"none",background:"var(--gold)",color:"var(--navy)",fontWeight:800,fontSize:13,cursor:"pointer",opacity:savingArt?0.6:1,fontFamily:"inherit"}}>{savingArt?"Saving...":"Save Changes"}</button>
          <button onClick={()=>setEditingArt(null)} style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid rgba(255,255,255,.25)",background:"transparent",color:"rgba(255,255,255,.7)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
        <div style={{display:"flex",borderBottom:"1.5px solid var(--border)",background:"var(--bg)",padding:"0 22px"}}>
          {([["body","Body HTML"],["meta","Meta Tags"]] as const).map(([t,l])=>(<button key={t} onClick={()=>setEditMode(t)}
            style={{padding:"11px 18px",border:"none",background:"transparent",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",borderBottom:editMode===t?"3px solid var(--navy)":"3px solid transparent",color:editMode===t?"var(--navy)":"var(--muted)",marginBottom:"-1.5px"}}>{l}</button>))}
        </div>
        <div style={{padding:"20px 22px"}}>
          {editMode==="body"?(<textarea value={editBody} onChange={e=>setEditBody(e.target.value)}
            style={{width:"100%",minHeight:460,padding:"12px",fontFamily:"monospace",fontSize:12.5,lineHeight:1.7,border:"1.5px solid var(--border)",borderRadius:10,resize:"vertical",outline:"none",boxSizing:"border-box",background:"var(--bg)"}}/>):(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {[["Title",editTitle,setEditTitle],["URL Slug",editSlug,setEditSlug]].map(([label,val,set]:any)=>(<label key={label} style={{display:"flex",flexDirection:"column",gap:6}}>
                <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)"}}>{label}</span>
                <input value={val} onChange={(e:any)=>set(e.target.value)} style={{padding:"10px 14px",border:"1.5px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:"inherit",outline:"none",background:"var(--bg)"}}/>
              </label>))}
              <label style={{display:"flex",flexDirection:"column",gap:6}}>
                <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)"}}>Meta Description ({editMeta.length}/160)</span>
                <textarea value={editMeta} onChange={e=>setEditMeta(e.target.value)} style={{padding:"10px 14px",border:"1.5px solid var(--border)",borderRadius:9,fontSize:13,fontFamily:"inherit",minHeight:90,resize:"vertical",outline:"none",background:"var(--bg)"}}/>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>)}

    <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:20,padding:"0 2px",borderBottom:"2px solid var(--border)"}}>
      {([["topics","Topic Queue"],["queue","Generated Articles"]] as const).map(([t,l])=>(<button key={t} onClick={()=>setTab(t)}
        style={{padding:"9px 20px",border:"none",background:"transparent",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer",borderBottom:tab===t?"2px solid var(--navy)":"2px solid transparent",color:tab===t?"var(--navy)":"var(--muted)",marginBottom:"-2px"}}>{l}</button>))}
      <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center",paddingBottom:8}}>
        {syncMsg&&<span style={{fontSize:12,fontWeight:600,color:syncMsg.includes("failed")?"var(--red)":"var(--green)"}}>{syncMsg}</span>}
        <button onClick={syncGSC} disabled={syncing} style={{padding:"7px 14px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--card)",color:"var(--muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:syncing?0.6:1}}>{syncing?"Syncing...":"Sync GSC"}</button>
        <button onClick={load} style={{padding:"7px 14px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--card)",color:"var(--muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Refresh</button>
      </div>
    </div>

    {loading?<div style={{textAlign:"center",padding:48,color:"var(--muted)"}}>Loading...</div>
    :tab==="topics"?(<div>
      {topics.length===0?(<div style={{textAlign:"center",padding:48,background:"var(--bg)",borderRadius:"var(--radius)",color:"var(--muted)",border:"1.5px dashed var(--border)"}}>No topics. Click Sync GSC to pull from Google Search Console.</div>)
      :[...topics].sort((a,b)=>(b.impressions||0)-(a.impressions||0)).map((t:any)=>{const glb=gl(t.id);return(
        <div key={t.id} style={{...cd,padding:"14px 18px",marginBottom:10,display:"grid",gridTemplateColumns:"1fr auto",gap:14,alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"var(--text)",marginBottom:5}}>{t.discovered_query||t.seed_keyword}</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"var(--muted)"}}>Seed: <strong>{t.seed_keyword}</strong></span>
              {t.impressions>0&&<span style={{fontSize:11,color:"var(--muted)"}}>Impressions: <strong>{t.impressions.toLocaleString()}</strong></span>}
              <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",padding:"2px 8px",borderRadius:5,background:"var(--bg)",color:"var(--muted)"}}>{t.intent_category||"—"}</span>
              {t.is_processed_to_article&&<span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:5,background:"#dcfce7",color:"#166534"}}>Done</span>}
            </div>
          </div>
          {glb?<span style={{fontSize:12,fontWeight:700,color:"var(--blue)"}}>{glb}</span>
          :<button onClick={()=>!t.is_processed_to_article&&checkAndGenerate(t)} disabled={t.is_processed_to_article}
            style={{padding:"9px 20px",borderRadius:8,border:"none",fontFamily:"inherit",background:t.is_processed_to_article?"var(--border)":"var(--navy)",color:t.is_processed_to_article?"var(--muted)":"#fff",fontWeight:700,fontSize:13,cursor:t.is_processed_to_article?"not-allowed":"pointer"}}>
            {t.is_processed_to_article?"Generated":"Generate"}
          </button>}
        </div>);})}
    </div>):(<div>
      {articles.length===0?(<div style={{textAlign:"center",padding:48,background:"var(--bg)",borderRadius:"var(--radius)",color:"var(--muted)",border:"1.5px dashed var(--border)"}}>No articles yet. Go to Topic Queue and click Generate.</div>)
      :articles.map((art:any)=>{const sc=scores[art.id];return(
        <div key={art.id} style={{...cd,marginBottom:12,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"start"}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"var(--text)",marginBottom:6}}>{art.title||art.primary_keyword||"Article #"+art.id}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontWeight:800,padding:"3px 9px",borderRadius:5,fontSize:11,textTransform:"uppercase",background:SBG[art.status]||"var(--bg)",color:SFG[art.status]||"var(--muted)"}}>{art.status}</span>
                {art.primary_keyword&&<span style={{fontSize:11,color:"var(--muted)"}}>{art.primary_keyword}</span>}
                {art.source&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:800,textTransform:"uppercase",background:art.source==="cdm"?"#dcfce7":"#f1f5f9",color:art.source==="cdm"?"#166534":"#64748b"}}>{art.source==="cdm"?"CDM":"local"}</span>}
                {sc?.overall_score!=null&&<span style={{fontSize:11,fontWeight:800,color:sc2(sc.overall_score)}}>CDM {sc.overall_score}/100</span>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
              <div style={{display:"flex",gap:5}}>
                {art.status==="DRAFT"&&<button onClick={()=>setStatus(art.id,"REVIEW")} style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid var(--blue)",background:"var(--card)",color:"var(--blue)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Review</button>}
                {art.status==="REVIEW"&&<><button onClick={()=>setStatus(art.id,"DRAFT")} style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid var(--border)",background:"var(--card)",color:"var(--muted)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Draft</button>
                  <button onClick={()=>setStatus(art.id,"PUBLISHED")} style={{padding:"5px 12px",borderRadius:7,border:"none",background:"var(--green)",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Publish</button></>}
                {art.status==="PUBLISHED"&&<span style={{fontSize:11,color:"var(--green)",fontWeight:800}}>Live</span>}
              </div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>openEdit(art)} style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid var(--border)",background:"var(--card)",color:"var(--muted)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                {art.status==="DRAFT"&&<button onClick={()=>reviewArt(art.id)} disabled={reviewing[art.id]} style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid var(--blue)",background:"var(--card)",color:"var(--blue)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",opacity:reviewing[art.id]?0.6:1}}>{reviewing[art.id]?"...":"CDM Review"}</button>}
                {sc&&sc.overall_score<75&&<button onClick={()=>autofix(art.id)} disabled={autofixing[art.id]} style={{padding:"5px 12px",borderRadius:7,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",opacity:autofixing[art.id]?0.6:1}}>{autofixing[art.id]?"Fixing...":"Auto-Fix"}</button>}
                {(art.body_html||art.body_preview)&&<button onClick={()=>{const w=window.open("","_blank");if(w){w.document.write("<html><body style='font-family:serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.8'>"+( art.body_html||art.body_preview||"")+"</body></html>");w.document.close();}}} style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid var(--border)",background:"var(--card)",color:"var(--muted)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Preview</button>}
              </div>
            </div>
          </div>
          {sc&&!sc.error&&(<div style={{padding:"10px 18px",borderTop:"1.5px solid var(--border)",background:"var(--bg)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontWeight:900,fontSize:20,color:sc2(sc.overall_score)}}>{sc.overall_score}/100</span>
              <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,textTransform:"uppercase",background:sc.recommendation==="publish_ready"?"#dcfce7":sc.recommendation==="human_edit"?"#dbeafe":"#fee2e2",color:sc.recommendation==="publish_ready"?"#166534":sc.recommendation==="human_edit"?"#1e40af":"#991b1b"}}>{(sc.recommendation||"").replace(/_/g," ")}</span>
              {sc.scores&&Object.entries(sc.scores).map(([k,v]:any)=>(<span key={k} style={{fontSize:11,color:"var(--muted)"}}>{k.replace(/_/g," ")}: <strong>{v}</strong></span>))}
            </div>
            {sc.notes&&<details style={{marginTop:4}}><summary style={{fontSize:11,color:"var(--muted)",cursor:"pointer",fontWeight:600}}>CDM notes</summary><div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6,marginTop:4,whiteSpace:"pre-wrap"}}>{sc.notes}</div></details>}
          </div>)}
          {sc?.error&&<div style={{padding:"8px 18px",borderTop:"1.5px solid var(--border)",fontSize:12,color:"var(--red)",background:"#fef2f2"}}>{sc.error}</div>}
        </div>);})}
    </div>)}
  </div>);
};

// ── Keyword Research Tab ───────────────────────────────────────────────────────
const KeywordTab: React.FC = () => {
  const [vertical,setVertical]=useState("pool");
  const [seedKw,setSeedKw]=useState("");
  const [language,setLanguage]=useState<"en"|"es">("en");
  const [results,setResults]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [importing,setImporting]=useState<Record<string,string>>({});
  const [aeoB,setAeoB]=useState<Record<string,boolean>>({});

  const VX=[{id:"pool",label:"Pool & Spa (C-53)",seed:"pool construction California"},{id:"roofing",label:"Roofing (C-39)",seed:"roof replacement California"},{id:"electrical",label:"Electrical (C-10)",seed:"electrical panel upgrade California"},{id:"plumbing",label:"Plumbing (C-36)",seed:"plumbing repair California"},{id:"landscaping",label:"Landscaping (C-27)",seed:"backyard landscaping California"},{id:"hvac",label:"HVAC (C-20)",seed:"air conditioning installation California"},{id:"remodel",label:"General Remodel (B)",seed:"home remodel California"}];
  const cv=VX.find(v=>v.id===vertical)!;

  const run=async()=>{setLoading(true);setError("");setResults(null);
    try{const r=await http.post("/keywords/research",{vertical:cv.label,seed_keyword:seedKw.trim()||cv.seed,language});setResults(r.data);}
    catch(e:any){setError("Research failed: "+(e.message||"error"));}setLoading(false);};

  const importT=async(title:string,intent:string,type:string)=>{setImporting(s=>({...s,[title]:"saving"}));
    try{const r=await http.post("/seo-content/import-topic",{discovered_query:title,seed_keyword:seedKw.trim()||cv.seed,intent_category:intent,topic_type:type});
      setImporting(s=>({...s,[title]:r.data.duplicate?"exists":"saved"}));}
    catch{setImporting(s=>({...s,[title]:"error"}));}};

  const genNow=async(title:string)=>{setImporting(s=>({...s,[title]:"saving"}));
    try{await http.post("/seo-content/import-topic",{discovered_query:title,seed_keyword:seedKw.trim()||cv.seed,intent_category:"INFORMATIONAL",topic_type:"article"});
      setImporting(s=>({...s,[title]:"go_generate"}));}
    catch{setImporting(s=>({...s,[title]:"error"}));}};

  const createAEO=async(q:string,angle:string)=>{setAeoB(s=>({...s,[q]:true}));
    try{await http.post("/seo-content/create-aeo-page",{question:q,aeo_angle:angle,seed_keyword:seedKw.trim()||cv.seed,vertical,language});setImporting(s=>({...s,[q]:"aeo_created"}));}
    catch{}setAeoB(s=>({...s,[q]:false}));};

  const cd={background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)"};

  return (<div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:900}}>
    <div style={{...cd,padding:"20px 22px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:14,alignItems:"end"}}>
        <label style={{display:"flex",flexDirection:"column",gap:6}}>
          <span style={{fontSize:11,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em"}}>Vertical</span>
          <select value={vertical} onChange={e=>setVertical(e.target.value)} style={{padding:"10px 12px",fontSize:13,border:"1.5px solid var(--border)",borderRadius:9,background:"var(--card)",color:"var(--text)",fontFamily:"inherit",outline:"none"}}>
            {VX.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label style={{display:"flex",flexDirection:"column",gap:6}}>
          <span style={{fontSize:11,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em"}}>Seed Keyword</span>
          <input value={seedKw} onChange={e=>setSeedKw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} placeholder={cv.seed}
            style={{padding:"10px 12px",fontSize:13,border:"1.5px solid var(--border)",borderRadius:9,background:"var(--card)",fontFamily:"inherit",outline:"none"}}/>
        </label>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",gap:6}}>
            {["en","es"].map(l=>(<button key={l} onClick={()=>setLanguage(l as "en"|"es")}
              style={{flex:1,padding:"7px 10px",fontSize:12,fontWeight:700,borderRadius:8,border:"1.5px solid var(--border)",cursor:"pointer",fontFamily:"inherit",background:language===l?"var(--navy)":"var(--card)",color:language===l?"#fff":"var(--muted)"}}>{l==="en"?"EN":"ES"}</button>))}
          </div>
          <button onClick={run} disabled={loading} style={{padding:"10px 20px",fontSize:13,fontWeight:700,borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",background:"var(--blue)",color:"#fff",opacity:loading?0.7:1}}>{loading?"Researching...":"Research Keywords"}</button>
        </div>
      </div>
    </div>
    {error&&<div style={{color:"var(--red)",fontSize:13,padding:"12px 16px",background:"#fef2f2",borderRadius:"var(--radius)"}}>{error}</div>}
    {loading&&<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Researching {cv.label}...</div>}
    {results&&(<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"var(--navy)",borderRadius:"var(--radius)",padding:"20px 24px",display:"flex",alignItems:"center",gap:16}}>
        <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"rgba(255,255,255,.45)",marginBottom:6,letterSpacing:"1px"}}>Primary Keyword</div><div style={{fontSize:22,fontWeight:900,color:"#fff"}}>{results.primary_keyword}</div></div>
        <div style={{display:"flex",gap:8}}>
          {[{l:"Volume",v:results.search_volume_estimate,c:"var(--gold)"},{l:"Difficulty",v:results.difficulty,c:"#fff"},{l:"Intent",v:results.intent,c:"rgba(255,255,255,.85)"}].map((x,i)=>(<div key={i} style={{textAlign:"center",background:"rgba(255,255,255,.07)",borderRadius:10,padding:"10px 16px",minWidth:80}}><div style={{fontSize:10,color:"rgba(255,255,255,.45)",marginBottom:3,textTransform:"uppercase"}}>{x.l}</div><div style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</div></div>))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{...cd,padding:"18px 20px"}}>
          <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginBottom:14}}>Article Ideas</div>
          {(results.article_titles||[]).map((t:string,i:number)=>{const st=importing[t];return(
            <div key={i} style={{...cd,padding:"11px 14px",marginBottom:8,background:"var(--bg)"}}>
              <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5,marginBottom:st?8:0}}>{i+1}. {t}</div>
              {!st?(<div style={{display:"flex",gap:6}}>
                <button onClick={()=>importT(t,"INFORMATIONAL","article")} style={{padding:"4px 11px",fontSize:11,fontWeight:700,borderRadius:6,border:"1.5px solid var(--blue)",background:"var(--card)",color:"var(--blue)",cursor:"pointer",fontFamily:"inherit"}}>+ Add to Queue</button>
                <button onClick={()=>genNow(t)} style={{padding:"4px 11px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",background:"var(--navy)",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Generate Now</button>
              </div>):st==="saving"?<span style={{fontSize:11,color:"var(--amber)"}}>Saving...</span>
              :st==="saved"?<span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>Added to queue</span>
              :st==="exists"?<span style={{fontSize:11,color:"var(--muted)",fontWeight:700}}>Already in queue</span>
              :st==="go_generate"?(<div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>Added!</span>
                <button onClick={()=>{const b=Array.from(document.querySelectorAll<HTMLButtonElement>("button"));b.find(x=>x.textContent?.includes("SEO Topics"))?.click();}} style={{padding:"3px 9px",fontSize:11,fontWeight:700,borderRadius:5,border:"1.5px solid var(--navy)",background:"var(--card)",color:"var(--navy)",cursor:"pointer",fontFamily:"inherit"}}>Go to SEO Topics</button>
              </div>):<span style={{fontSize:11,color:"var(--red)"}}>Error</span>}
            </div>);})}
        </div>
        <div style={{...cd,padding:"18px 20px"}}>
          <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginBottom:14}}>People Also Ask</div>
          {(results.questions_people_ask||[]).map((q:string,i:number)=>{const stQ=importing[q];return(
            <div key={i} style={{...cd,padding:"11px 14px",marginBottom:8,background:"var(--bg)"}}>
              <div style={{fontSize:12,color:"var(--text)",lineHeight:1.5,marginBottom:8,fontWeight:600}}>{q}</div>
              {!stQ?(<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={()=>importT(q,"QUESTION","aeo_page")} style={{padding:"4px 11px",fontSize:11,fontWeight:700,borderRadius:6,border:"1.5px solid var(--blue)",background:"var(--card)",color:"var(--blue)",cursor:"pointer",fontFamily:"inherit"}}>+ Add to Queue</button>
                {results.aeo_angle&&<button onClick={()=>createAEO(q,results.aeo_angle)} disabled={aeoB[q]} style={{padding:"4px 11px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",background:"#7c3aed",color:"#fff",cursor:aeoB[q]?"not-allowed":"pointer",opacity:aeoB[q]?0.6:1,fontFamily:"inherit"}}>{aeoB[q]?"Creating...":"Create AEO Page"}</button>}
              </div>):stQ==="saved"?<span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>Added</span>
              :stQ==="exists"?<span style={{fontSize:11,color:"var(--muted)",fontWeight:700}}>In queue</span>
              :stQ==="aeo_created"?<span style={{fontSize:11,color:"#7c3aed",fontWeight:700}}>AEO page created</span>
              :<span style={{fontSize:11,color:"var(--red)"}}>Error</span>}
            </div>);})}
          {results.aeo_angle&&(<div style={{marginTop:10,padding:"12px 14px",background:"#eff6ff",borderRadius:"var(--radius)",border:"1.5px solid #bfdbfe"}}>
            <div style={{fontSize:11,fontWeight:800,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>AEO Angle</div>
            <div style={{fontSize:12,color:"#1e3a8a",lineHeight:1.65}}>{results.aeo_angle}</div>
          </div>)}
        </div>
      </div>
    </div>)}
  </div>);
};
