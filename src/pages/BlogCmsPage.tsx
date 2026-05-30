// pages/BlogCmsPage.tsx — WYSIWYG Blog CMS Editor
import React, { useEffect, useState, useCallback, useRef } from "react";
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
const ArticleEditor: React.FC<{
  article: BlogArticle|null; siteId:string;
  onSaved:(a:BlogArticle)=>void; onClose:()=>void;
}> = ({article,siteId,onSaved,onClose}) => {
  const isNew = !article;
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"write"|"seo"|"local"|"schema">("write");
  const [saving,setSaving]         = useState(false);
  const [publishing,setPublishing] = useState(false);
  const [error,setError]           = useState("");
  const [success,setSuccess]       = useState("");
  const [showBlocks,setShowBlocks] = useState(false);
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

  // Add body class to break out of sidebar stacking context
  useEffect(()=>{
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
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

  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, bottom:0,
      width:"100vw", height:"100vh",
      background:"var(--color-background-primary)",
      zIndex:99999, display:"flex", flexDirection:"column",
      overflow:"hidden", marginLeft:0, transform:"none",
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
          <button onClick={()=>save(false)} disabled={saving} style={{
            padding:"6px 14px",borderRadius:7,border:"1px solid var(--color-border-secondary)",
            background:"var(--color-background-secondary)",color:"var(--color-text-primary)",
            fontSize:12,cursor:saving?"not-allowed":"pointer",fontWeight:500}}>
            {saving&&!publishing?"Saving…":"Save Draft"}
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
          <button key={t} onClick={()=>setActiveTab(t as any)} style={tab(t)}>{label}</button>
        ))}
      </div>

      <div style={{flex:1,overflow:"hidden",display:"flex"}}>

        {/* WRITE TAB */}
        {activeTab==="write"&&(
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
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
        )}

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
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// BLOG CMS PAGE — Article list
// ═════════════════════════════════════════════════════════════════════════════
export const BlogCmsPage: React.FC = () => {
  const [articles,setArticles]     = useState<BlogArticle[]>([]);
  const [total,setTotal]           = useState(0);
  const [page,setPage]             = useState(1);
  const [loading,setLoading]       = useState(false);
  const [selectedSite,setSelectedSite] = useState(SITE_OPTIONS[0].value);
  const [filterStatus,setFilterStatus] = useState("all");
  const [editing,setEditing]       = useState<BlogArticle|null|"new">(null);
  const [error,setError]           = useState("");

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
          {articles.map(a=>(
            <div key={a.id} style={{
              border:"1px solid var(--color-border-secondary)",borderRadius:10,
              padding:"16px 20px",background:"var(--color-background-primary)",
              display:"flex",alignItems:"flex-start",gap:16}}>
              {a.featured_image_url?(
                <img src={a.featured_image_url} alt={a.featured_image_alt||""}
                  style={{width:80,height:56,objectFit:"cover",borderRadius:6,flexShrink:0}}/>
              ):(
                <div style={{width:80,height:56,borderRadius:6,flexShrink:0,
                  background:"var(--color-background-secondary)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,color:"var(--color-text-tertiary)"}}>📝</div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <StatusBadge status={a.status}/>
                  {a.category&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{a.category}</span>}
                  {a.language&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,
                    background:"var(--color-background-secondary)",
                    color:"var(--color-text-tertiary)"}}>{a.language.toUpperCase()}</span>}
                </div>
                <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)",marginBottom:3}}>
                  {a.h1||a.slug}
                </div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>
                  {(a.meta_description||"").substring(0,100)}{(a.meta_description?.length||0)>100?"…":""}
                </div>
                <div style={{display:"flex",gap:16,fontSize:11,color:"var(--color-text-tertiary)",flexWrap:"wrap"}}>
                  {a.word_count&&<span>📝 {a.word_count} words</span>}
                  {a.reading_time_minutes&&<span>⏱ {a.reading_time_minutes} min</span>}
                  {a.published_at&&<span>📅 {fmtDate(a.published_at)}</span>}
                  <span style={{fontFamily:"monospace"}}>/blog/{a.slug}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0,flexDirection:"column"}}>
                <button onClick={()=>setEditing(a)} style={{
                  padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:500,
                  border:"1px solid var(--color-border-secondary)",
                  background:"var(--color-background-secondary)",color:"var(--color-text-primary)"}}>
                  ✏️ Edit
                </button>
                <button onClick={()=>togglePublish(a)} style={{
                  padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,
                  background:a.status==="published"?"#fef2f2":"#f0fdf4",
                  color:a.status==="published"?"#dc2626":"#059669"}}>
                  {a.status==="published"?"Unpublish":"Publish"}
                </button>
                <button onClick={()=>archive(a)} style={{
                  padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,
                  border:"1px solid var(--color-border-secondary)",
                  background:"none",color:"var(--color-text-tertiary)"}}>
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
