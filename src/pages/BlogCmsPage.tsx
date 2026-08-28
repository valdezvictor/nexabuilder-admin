import React,{useState,useEffect,useCallback,useRef} from "react";
import {http} from "../lib/http";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Topic{id:number;discovered_query:string;intent_category:string;impressions:number;clicks:number;avg_position:number;is_processed_to_article:boolean;source:string;created_at:string;}
interface Article{id:number;title:string;slug:string;primary_keyword:string;status:string;content_type:string;source?:string;created_at:string;completed_at?:string;meta_description?:string;has_body:boolean;body_preview?:string;error_message?:string;}
interface ArticleFull extends Article{body_html?:string;review_notes?:string;last_review_score?:number;verified_complete?:boolean;meta_title?:string;published_at?:string;}
interface ReviewResult{overall_score:number;passed:boolean;recommendation:string;scores:Record<string,number>;notes:string;}
interface Profile{id:number;profile_name:string;writing_style:string;}

// ── Shared styles ─────────────────────────────────────────────────────────────
const card:React.CSSProperties={background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)",boxShadow:"var(--shadow)"};
const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)",marginBottom:5};
const inp:React.CSSProperties={width:"100%",padding:"8px 11px",border:"1.5px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"var(--bg)",color:"var(--text)",outline:"none",boxSizing:"border-box"};
const ADM={headers:{"X-Admin-Key":"GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU"}};
const CMS_KEY="GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const TYPES=["comparison_article","guide_page","faq_page","location_page"];
const TYPE_LABELS:Record<string,string>={comparison_article:"Comparison",guide_page:"Guide",faq_page:"FAQ",location_page:"Location"};
const STATUS_COLORS:Record<string,{bg:string;color:string}>={
  DRAFT:    {bg:"#f1f5f9",color:"#475569"},
  REVIEW:   {bg:"#fef9c3",color:"#854d0e"},
  PUBLISHED:{bg:"#dcfce7",color:"#166534"},
  QUEUED:   {bg:"#dbeafe",color:"#1d4ed8"},
  GENERATING:{bg:"#ede9fe",color:"#6d28d9"},
  FAILED:   {bg:"#fee2e2",color:"#991b1b"},
};
const scoreColor=(n:number)=>n>=75?"#16a34a":n>=60?"#d97706":"#dc2626";

// ── ScoreBar ──────────────────────────────────────────────────────────────────
function ScoreBar({label,val,max=20}:{label:string;val:number;max?:number}){
  const pct=Math.min((val/max)*100,100);
  const color=pct>=75?"#16a34a":pct>=50?"#d97706":"#dc2626";
  return(
    <div style={{marginBottom:6}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
        <span style={{color:"var(--muted)"}}>{label}</span>
        <span style={{fontWeight:700,color}}>{val}/{max}</span>
      </div>
      <div style={{height:4,borderRadius:2,background:"var(--border)"}}>
        <div style={{width:`${pct}%`,height:"100%",borderRadius:2,background:color,transition:"width .4s"}}/>
      </div>
    </div>
  );
}

// ── Article Right Panel ───────────────────────────────────────────────────────
function ArticleRightPanel({article,onClose,onStatusChange,onRefresh}:{
  article:Article; onClose:()=>void;
  onStatusChange:(id:number,status:string)=>void;
  onRefresh:()=>void;
}){
  const isPage=article.content_type==="service_page"||!!(article as any).source&&(article as any).source==="page_generator";
  const [full,setFull]=useState<ArticleFull|null>(null);
  const [view,setView]=useState<"preview"|"body"|"meta"|"review">("preview");
  const [review,setReview]=useState<ReviewResult|null>(null);
  const [reviewing,setReviewing]=useState(false);
  const [autofixing,setAutofixing]=useState(false);
  const [suggesting,setSuggesting]=useState(false);
  const [saving,setSaving]=useState(false);
  const [applying,setApplying]=useState(false);
  const [verifying,setVerifying]=useState(false);
  const [isVerified,setIsVerified]=useState(false);
  const [statusSaving,setStatusSaving]=useState(false);
  const [metaSuggested,setMetaSuggested]=useState<any>(null);

  // Body edit state
  const [bodyHtml,setBodyHtml]=useState("");
  // Meta edit state
  const [metaTitle,setMetaTitle]=useState("");
  const [metaDesc,setMetaDesc]=useState("");
  const [metaSnippet,setMetaSnippet]=useState("");

  useEffect(()=>{
    setFull(null);setReview(null);setMetaSuggested(null);setView("preview");
    http.get(`/seo-content/articles/${article.id}`,ADM)
      .then(r=>{
        const d=r.data?.article||r.data;
        setFull(d);
        setIsVerified(!!d?.verified_complete);
        setBodyHtml(d?.body_html||"");
        setMetaTitle(d?.title||"");
        setMetaDesc(d?.meta_description||"");
        setMetaSnippet(d?.featured_snippet||"");
      }).catch(()=>{});
  },[article.id]);

  const setStatus=async(status:string)=>{
    setStatusSaving(true);
    try{
      await http.patch(`/seo-content/articles/${article.id}/status`,{status},ADM);
      onStatusChange(article.id,status);
    }catch(e:any){alert("Status update failed: "+(e?.response?.data?.detail||e.message));}
    setStatusSaving(false);
  };

  const runReview=async()=>{
    setReview(null);setReviewing(true);setView("review");
    try{
      const r=await http.post(`/seo-content/review/${article.id}`,{},ADM);
      setReview(r.data);
    }catch(e:any){alert("Review failed: "+(e?.response?.data?.detail||e.message));}
    setReviewing(false);
  };

  const runAutofix=async()=>{
    if(!confirm("Run AI Auto-Fix? This rewrites the article body."))return;
    setAutofixing(true);
    try{
      await http.post(`/seo-content/autofix/${article.id}`,{cdm_notes:review?.notes||"",cdm_score:review?.overall_score||0},ADM);
      onRefresh();
      // Reload
      const r=await http.get(`/seo-content/articles/${article.id}`,ADM);
      const d=r.data?.article||r.data;setFull(d);setBodyHtml(d?.body_html||"");
    }catch(e:any){alert("Auto-fix failed: "+(e?.response?.data?.detail||e.message));}
    setAutofixing(false);
  };

  const suggestMeta=async()=>{
    setSuggesting(true);
    try{
      const r=await http.post(`/seo-content/suggest-meta/${article.id}`,{},ADM);
      setMetaSuggested(r.data);
      setMetaTitle(r.data.suggested_title||metaTitle);
      setMetaDesc(r.data.suggested_meta||metaDesc);
      setMetaSnippet(r.data.suggested_snippet||metaSnippet);
    }catch(e:any){alert("AI suggest failed: "+(e?.response?.data?.detail||e.message));}
    setSuggesting(false);
  };

  const saveBody=async()=>{
    setSaving(true);
    try{
      await http.put(`/seo-content/articles/${article.id}`,{body_html:bodyHtml},ADM);
      onRefresh();
    }catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setSaving(false);
  };

  const applyAISuggestions=async()=>{
    if(!review&&!full?.review_notes){alert("Run AI Review first to generate review notes.");return;}
    if(!confirm("Apply AI Suggestions? This will patch the article body based on CDM review notes."))return;
    setApplying(true);
    try{
      const r=await http.post(`/seo-content/apply-suggestions/${article.id}`,{},ADM);
      setBodyHtml(r.data.body_html||bodyHtml);
      onRefresh();
    }catch(e:any){alert("Apply suggestions failed: "+(e?.response?.data?.detail||e.message));}
    setApplying(false);
  };

  const verifyComplete=async()=>{
    setVerifying(true);
    try{
      await http.post(`/seo-content/verify-complete/${article.id}`,{},ADM);
      setIsVerified(true);
    }catch(e:any){alert("Verify failed: "+(e?.response?.data?.detail||e.message));}
    setVerifying(false);
  };

  const saveMeta=async()=>{
    setSaving(true);
    try{
      await http.patch(`/seo-content/articles/${article.id}/meta`,{
        title:metaTitle||undefined,
        meta_title:metaTitle||undefined,
        meta_description:metaDesc||undefined,
      },ADM);
      onRefresh();
    }catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setSaving(false);
  };

  const sc=STATUS_COLORS[article.status]||STATUS_COLORS.DRAFT;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:"1.5px solid var(--border)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)"}}>Article Preview</span>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,padding:"2px 6px",lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        {isPage&&<span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",padding:"2px 8px",borderRadius:4,background:"rgba(124,58,237,.12)",color:"#7c3aed",letterSpacing:.5}}>Service Page</span>}
        {!isPage&&<span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",padding:"2px 8px",borderRadius:4,background:"rgba(29,111,222,.12)",color:"var(--blue)",letterSpacing:.5}}>Article</span>}
      </div>
      <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:6,lineHeight:1.3}}>{article.title}</div>
        {article.meta_description&&<div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5,marginBottom:8}}>{article.meta_description.slice(0,100)}…</div>}
        {/* Status buttons */}
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {(["DRAFT","REVIEW","PUBLISHED"] as const).map(s=>(
            <button key={s} onClick={()=>setStatus(s)} disabled={statusSaving||article.status===s}
              style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid var(--border)",
                background:article.status===s?sc.bg:"var(--card)",
                color:article.status===s?sc.color:"var(--muted)",
                fontWeight:article.status===s?800:600,fontSize:12,cursor:article.status===s?"default":"pointer",fontFamily:"inherit"}}>
              {s}
            </button>
          ))}
        </div>
        {/* Tool buttons */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {id:"body",icon:"✎",label:"Edit Body"},
            {id:"meta",icon:"◎",label:"Meta Tags"},
            {id:"review",icon:"⚡",label:"AI Review"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setView(t.id as any)}
              style={{padding:"6px 12px",borderRadius:7,border:"1.5px solid var(--border)",
                background:view===t.id?"var(--navy)":"var(--card)",
                color:view===t.id?"#fff":"var(--muted)",
                fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
          <button onClick={runAutofix} disabled={autofixing}
            style={{padding:"6px 12px",borderRadius:7,border:"1.5px solid var(--border)",
              background:"var(--card)",color:"var(--muted)",
              fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,opacity:autofixing?.5:1}}>
            <span>⚙</span><span>{autofixing?"Fixing…":"Auto-Fix"}</span>
          </button>
          <button onClick={verifyComplete} disabled={verifying||isVerified}
            title="Mark article as complete — suppresses false truncation in next AI Review"
            style={{padding:"6px 12px",borderRadius:7,
              border:isVerified?"1.5px solid var(--green)":"1.5px solid var(--border)",
              background:isVerified?"#dcfce7":"var(--card)",
              color:isVerified?"#166534":"var(--muted)",
              fontWeight:700,fontSize:12,cursor:isVerified?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            <span>✓</span><span>{isVerified?"Verified":"Verify"}</span>
          </button>
          {isPage&&(
            <div style={{fontSize:11,padding:"8px 12px",background:"rgba(124,58,237,.07)",border:"1px solid rgba(124,58,237,.2)",borderRadius:8,color:"#6d28d9",lineHeight:1.6,marginTop:4}}>
              <strong>To publish:</strong> run on EC2<br/>
              <code style={{fontSize:10,background:"rgba(0,0,0,.06)",padding:"1px 4px",borderRadius:3}}>python3 /home/ec2-user/deploy_service_pages.py --article-id {article.id}</code>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{flexGrow:1,flexShrink:1,flexBasis:"0%",overflowY:"auto",padding:"14px 18px"}}>

        {/* PREVIEW */}
        {view==="preview"&&(
          <div style={{fontSize:13,color:"var(--text)",lineHeight:1.8}}>
            {full?.body_preview
              ? <div dangerouslySetInnerHTML={{__html:full.body_html||full.body_preview||""}}/>
              : article.body_preview
                ? <div dangerouslySetInnerHTML={{__html:article.body_preview||""}}/>
                : <div style={{color:"var(--muted)",fontStyle:"italic"}}>No body content yet.</div>}
            {full?.error_message&&full.error_message.includes("CDM Score")&&(
              <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:"var(--bg)",border:"1.5px solid var(--border)",fontSize:12,color:"var(--muted)"}}>
                {full.error_message.split("\n")[0]}
              </div>
            )}
          </div>
        )}

        {/* BODY EDITOR */}
        {view==="body"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={lbl}>Article Body (HTML)</span>
              <span style={{fontSize:11,color:"var(--muted)"}}>{bodyHtml.replace(/<[^>]+>/g,"").split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <textarea value={bodyHtml} onChange={e=>setBodyHtml(e.target.value)} rows={20}
              style={{...inp,fontFamily:"'DM Mono',monospace",fontSize:11,lineHeight:1.6,resize:"vertical",minHeight:400}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={saveBody} disabled={saving||applying}
                style={{padding:"9px 20px",borderRadius:8,border:"none",background:"var(--gold)",color:"var(--navy)",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:saving||applying?.5:1}}>
                {saving?"Saving…":"💾 Save Changes"}
              </button>
              {(review||full?.review_notes)&&(
                <button onClick={applyAISuggestions} disabled={applying||saving}
                  style={{padding:"9px 20px",borderRadius:8,border:"none",background:"#7c3aed",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:applying||saving?.5:1,display:"flex",alignItems:"center",gap:6}}>
                  <span>✦</span><span>{applying?"Applying…":"Apply AI Suggestions"}</span>
                </button>
              )}
            </div>
            {applying&&(
              <div style={{fontSize:12,color:"var(--muted)",fontStyle:"italic"}}>
                Patching article based on CDM review notes — this takes 30-60 seconds…
              </div>
            )}
          </div>
        )}

        {/* META TAGS */}
        {view==="meta"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{...lbl,marginBottom:0}}>SEO Meta Tags</span>
              <button onClick={suggestMeta} disabled={suggesting}
                style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid var(--gold)",background:"#fef9c3",color:"#854d0e",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",opacity:suggesting?.5:1}}>
                {suggesting?"Generating…":"✦ AI Suggest"}
              </button>
            </div>
            {metaSuggested&&(
              <div style={{padding:"8px 12px",borderRadius:7,background:"#eff6ff",border:"1.5px solid #bfdbfe",fontSize:11,color:"#1d4ed8",fontWeight:600}}>
                AI suggestions applied — review and save.
              </div>
            )}
            <label style={{display:"flex",flexDirection:"column",gap:5}}>
              <span style={{...lbl,marginBottom:0}}>Page Title <span style={{fontWeight:400,textTransform:"none",color:metaTitle.length>60?"#dc2626":"var(--muted)"}}>{metaTitle.length}/60</span></span>
              <input value={metaTitle} onChange={e=>setMetaTitle(e.target.value)} style={{...inp,borderColor:metaTitle.length>60?"#dc2626":"var(--border)"}}/>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:5}}>
              <span style={{...lbl,marginBottom:0}}>Meta Description <span style={{fontWeight:400,textTransform:"none",color:metaDesc.length>155?"#dc2626":"var(--muted)"}}>{metaDesc.length}/155</span></span>
              <textarea value={metaDesc} onChange={e=>setMetaDesc(e.target.value)} rows={3}
                style={{...inp,resize:"vertical",borderColor:metaDesc.length>155?"#dc2626":"var(--border)"}}/>
            </label>
            {metaSnippet&&(
              <label style={{display:"flex",flexDirection:"column",gap:5}}>
                <span style={{...lbl,marginBottom:0}}>Featured Snippet <span style={{fontWeight:400,textTransform:"none",color:"var(--muted)"}}>{metaSnippet.split(/\s+/).length} words (40-60 target)</span></span>
                <textarea value={metaSnippet} onChange={e=>setMetaSnippet(e.target.value)} rows={3}
                  style={{...inp,resize:"vertical"}}/>
              </label>
            )}
            {/* SERP preview */}
            <div style={{padding:"14px 16px",background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:8}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginBottom:8}}>SERP Preview</div>
              <div style={{fontSize:17,color:"#1a0dab",fontWeight:500,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{metaTitle||"(no title)"}</div>
              <div style={{fontSize:13,color:"#006621",marginBottom:3}}>nexabuilder.com › blog › {article.slug}</div>
              <div style={{fontSize:13,color:"#4d5156",lineHeight:1.5}}>{metaDesc||"(no meta description)"}</div>
            </div>
            <button onClick={saveMeta} disabled={saving}
              style={{padding:"9px 20px",borderRadius:8,border:"none",background:"var(--navy)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:saving?.5:1}}>
              {saving?"Saving…":"Save Meta Tags"}
            </button>
          </div>
        )}

        {/* AI REVIEW */}
        {view==="review"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{textAlign:"right",marginBottom:12}}>
              <button onClick={runReview} disabled={reviewing}
                style={{padding:"8px 20px",borderRadius:9,border:"none",background:"var(--gold)",color:"var(--navy)",fontWeight:800,fontSize:13,cursor:reviewing?"not-allowed":"pointer",fontFamily:"inherit",opacity:reviewing?.5:1}}>
                {reviewing?"Reviewing…":review?"⚡ Re-run AI Review":"⚡ Run AI Review"}
              </button>
            </div>
            {!review&&!reviewing&&(
              <div style={{textAlign:"center",padding:"20px 0",fontSize:13,color:"var(--muted)"}}>
                Run CDM AI Review to get a 0-100 quality score and detailed feedback.
              </div>
            )}
            {reviewing&&(
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>Reviewing with CDM…</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>This takes 10-20 seconds</div>
              </div>
            )}
            {review&&!reviewing&&(
              <>
                {/* Score + status */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <div style={{...card,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:32,fontWeight:900,color:scoreColor(review.overall_score),lineHeight:1}}>{review.overall_score}</div>
                    <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginTop:4}}>Quality Score</div>
                  </div>
                  <div style={{...card,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:13,fontWeight:800,color:review.overall_score>=75?"var(--green)":"#dc2626",marginBottom:4}}>{review.overall_score>=75?"✓ Passed":"✗ Failed"}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{review.recommendation?.replace(/_/g," ")}</div>
                  </div>
                  <div style={{...card,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--navy)",marginBottom:4}}>
                      {review.overall_score>=90?"Publish Ready":review.overall_score>=75?"Human Edit":review.overall_score>=60?"Apply Suggestions":"Run Auto-Fix"}
                    </div>
                    <div style={{fontSize:10,color:"var(--muted)"}}>{review.overall_score>=90?"Score 90+":review.overall_score>=75?"Score 75-89":review.overall_score>=60?"Score 60-74":"Score below 60"}</div>
                  </div>
                </div>
                {/* Score bars */}
                <div style={{...card,padding:"14px"}}>
                  {Object.entries(review.scores||{}).map(([k,v])=>(
                    <ScoreBar key={k} label={k.replace(/_/g," ")} val={v as number} max={k==="reader_value"||k==="factual_accuracy"?20:k==="search_intent"||k==="eeat"?15:10}/>
                  ))}
                </div>
                {/* Threshold bar */}
                <div style={{...card,padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)"}}>
                    <span style={{color:"#dc2626"}}>0-59 Auto-Fix</span>
                    <span style={{color:"#d97706"}}>60-74 Fix Rec.</span>
                    <span style={{color:"#0891b2"}}>75-89 Human Edit</span>
                    <span style={{color:"var(--green)"}}>90-100 Publish</span>
                  </div>
                  <div style={{position:"relative",height:6,borderRadius:4,background:"linear-gradient(to right,#dc2626 0%,#d97706 40%,#0891b2 65%,#16a34a 85%)",marginTop:6}}>
                    <div style={{position:"absolute",top:-3,left:`${Math.min(review.overall_score,100)}%`,transform:"translateX(-50%)",width:12,height:12,borderRadius:"50%",background:scoreColor(review.overall_score),border:"2px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
                  </div>
                </div>
                {/* Review notes */}
                {review.notes&&(
                  <div style={{...card,padding:"14px"}}>
                    <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginBottom:8}}>Review Notes</div>
                    <div style={{fontSize:12,color:"var(--text)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{review.notes}</div>
                  </div>
                )}
                <button onClick={runAutofix} disabled={autofixing}
                  style={{padding:"9px 20px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:autofixing?.5:1}}>
                  {autofixing?"Running Auto-Fix…":"⚙ Run Auto-Fix"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Topic Discovery Tab ───────────────────────────────────────────────────────
function TopicDiscoveryTab({onGenerated}:{onGenerated:()=>void}){
  const [topics,setTopics]=useState<Topic[]>([]);
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [loading,setLoading]=useState(true);
  const [seedKw,setSeedKw]=useState(()=>{
    const p=new URLSearchParams(window.location.search);
    return p.get("seed")||"";
  });
  const [importing,setImporting]=useState(false);
  const [generating,setGenerating]=useState<number|null>(null);
  const [pollTimer,setPollTimer]=useState<Record<number,string>>({});
  const [filterUnprocessed,setFilterUnprocessed]=useState(true);
  const [contentType,setContentType]=useState("comparison_article");
  const [profileId,setProfileId]=useState(1);

  useEffect(()=>{
    const loadAll=async()=>{
      setLoading(true);
      try{
        const [tr,pr,ar]=await Promise.all([
          http.get(`/seo-content/topics?limit=50&unprocessed_only=${filterUnprocessed}`,ADM),
          http.get("/seo-content/profiles",ADM),
          http.get("/seo-content/articles",ADM),
        ]);
        // Build a set of published keywords for dedup comparison
        const pubArticles = (ar.data?.articles||[]).filter((a:any)=>a.status==="PUBLISHED"||a.status==="published");
        const pubKeys = pubArticles.map((a:any) =>
          (a.primary_keyword||a.slug||'').toLowerCase()
            .replace(/[-_]/g,' ')
            .replace(/(2025|2026|california|socal|southern|guide|price|cost|how to|in|the|a|an)/g,'')
            .trim()
        ).filter((s:string)=>s.length>3);
        // Mark topics that overlap significantly with published content
        const rawTopics = (tr.data?.topics||[]).map((t:Topic)=>{
          const tqNorm = t.discovered_query.toLowerCase()
            .replace(/(2025|2026|california|socal|southern|guide|price|cost|how to|in|the|a|an)/g,'')
            .trim();
          const isDup = tqNorm.length>4 && pubKeys.some((pk:string)=>
            pk.length>4 && (tqNorm.includes(pk)||pk.includes(tqNorm))
          );
          return {...t,_isDuplicate:isDup};
        });
        setTopics(rawTopics);
        setProfiles(pr.data?.profiles||[]);
        if(pr.data?.profiles?.length) setProfileId(pr.data.profiles[0].id);
      }catch{}
      setLoading(false);
    };
    loadAll();
  },[filterUnprocessed]);

  const importTopic=async()=>{
    if(!seedKw.trim())return;
    setImporting(true);
    try{
      await http.post("/seo-content/import-topic",{
        discovered_query:seedKw.trim(),
        seed_keyword:seedKw.trim().split(" ").slice(0,3).join(" "),
        intent_category:"QUESTION",
        topic_type:"article",
      },ADM);
      setSeedKw("");
      const r=await http.get(`/seo-content/topics?limit=50&unprocessed_only=${filterUnprocessed}`,ADM);
      setTopics(r.data?.topics||[]);
    }catch(e:any){alert("Import failed: "+(e?.response?.data?.detail||e.message));}
    setImporting(false);
  };

  const generate=async(topic:Topic)=>{
    setGenerating(topic.id);
    try{
      const r=await http.post("/seo-content/generate",{
        topic:topic.discovered_query,
        profile_id:profileId,
        content_type:contentType,
        discovery_id:topic.id,
        primary_keyword:topic.discovered_query,
        top_queries:[topic.discovered_query],
      },ADM);
      const jobId=r.data.job_id;
      // Poll for completion
      const poll=setInterval(async()=>{
        try{
          const s=await http.get(`/seo-content/status/${jobId}`,ADM);
          const state=s.data?.status||"";
          setPollTimer(p=>({...p,[topic.id]:state}));
          if(state==="DRAFT"||state==="FAILED"||state==="PUBLISHED"){
            clearInterval(poll);
            setGenerating(null);
            setPollTimer(p=>{const n={...p};delete n[topic.id];return n;});
            onGenerated();
          }
        }catch{clearInterval(poll);setGenerating(null);}
      },3000);
    }catch(e:any){
      alert("Generate failed: "+(e?.response?.data?.detail||e.message));
      setGenerating(null);
    }
  };

  const intentBadge=(cat:string)=>{
    const map:Record<string,string>={QUESTION:"bg-blue",LOCAL:"bg-green",COMPARISON:"bg-amber",NAVIGATIONAL:"bg-purple"};
    const colors:Record<string,{bg:string;color:string}>={
      "bg-blue":{bg:"#dbeafe",color:"#1d4ed8"},
      "bg-green":{bg:"#dcfce7",color:"#166534"},
      "bg-amber":{bg:"#fef9c3",color:"#854d0e"},
      "bg-purple":{bg:"#f3e8ff",color:"#6b21a8"},
    };
    const c=colors[map[cat.toUpperCase()]||"bg-blue"];
    return<span style={{padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:700,background:c.bg,color:c.color,textTransform:"capitalize"}}>{cat.toLowerCase()}</span>;
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Seed keyword input */}
      <div style={{...card,padding:"16px 20px"}}>
        <div style={{fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)",marginBottom:12}}>Add Keyword to Topic Queue</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:10,alignItems:"end"}}>
          <div>
            <label style={lbl}>Seed Keyword / Topic</label>
            <input value={seedKw} onChange={e=>setSeedKw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&importTopic()}
              placeholder="e.g. how much does a pool cost in Los Angeles"
              style={inp}/>
          </div>
          <div>
            <label style={lbl}>Content Type</label>
            <select value={contentType} onChange={e=>setContentType(e.target.value)}
              style={{...inp,width:"auto",cursor:"pointer"}}>
              {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Profile</label>
            <select value={profileId} onChange={e=>setProfileId(+e.target.value)}
              style={{...inp,width:"auto",cursor:"pointer"}}>
              {profiles.map(p=><option key={p.id} value={p.id}>{p.profile_name.replace("NexaBuilder ","").replace(" v1","")}</option>)}
            </select>
          </div>
          <button onClick={importTopic} disabled={importing||!seedKw.trim()}
            style={{padding:"9px 20px",borderRadius:8,border:"none",background:"var(--navy)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:importing||!seedKw.trim()?.5:1,marginBottom:1}}>
            {importing?"Adding…":"+ Add Topic"}
          </button>
        </div>
      </div>

      {/* Filter + topic list */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:"var(--muted)",flex:1}}>{topics.length} topic{topics.length!==1?"s":""} in queue
            {(topics as any[]).filter(t=>t._isDuplicate&&!t.is_processed_to_article).length > 0 && (
              <span style={{fontSize:11,color:"#f59e0b",marginLeft:8}}>
                · {(topics as any[]).filter(t=>t._isDuplicate&&!t.is_processed_to_article).length} possible overlaps ⚠
              </span>
            )}</span>
        <button onClick={()=>setFilterUnprocessed(f=>!f)}
          style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid var(--border)",
            background:filterUnprocessed?"var(--navy)":"var(--card)",
            color:filterUnprocessed?"#fff":"var(--muted)",
            fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          {filterUnprocessed?"Unprocessed only":"All topics"}
        </button>
      </div>

      {loading?<div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading topics…</div>
      :topics.length===0?<div style={{...card,padding:40,textAlign:"center",color:"var(--muted)",fontSize:13}}>No topics in queue. Add a keyword above.</div>
      :<div style={card}>
        {topics.map((t,i)=>(
          <div key={t.id} style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<topics.length-1?"1px solid var(--border)":"none"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                {intentBadge(t.intent_category)}
                {(t as any)._isDuplicate&&!t.is_processed_to_article&&<span title="Similar article already published — review before generating" style={{fontSize:11,color:"#f59e0b",fontWeight:700,cursor:"help"}}>⚠ Overlap</span>}
        {t.is_processed_to_article&&<span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>✓ Generated</span>}
              </div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{t.discovered_query}</div>
              {(t.impressions>0||t.clicks>0)&&<div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{t.impressions} impr · {t.clicks} clicks · pos {t.avg_position?.toFixed(1)}</div>}
            </div>
            <button
              disabled={generating===t.id||t.is_processed_to_article}
              onClick={()=>generate(t)}
              style={{padding:"7px 16px",borderRadius:8,border:"none",
                background:t.is_processed_to_article?"var(--bg)":generating===t.id?"var(--border)":"var(--navy)",
                color:t.is_processed_to_article?"var(--muted)":"#fff",
                fontWeight:700,fontSize:12,cursor:t.is_processed_to_article?"default":"pointer",fontFamily:"inherit",minWidth:100}}>
              {generating===t.id?(pollTimer[t.id]||"Queued…"):t.is_processed_to_article?"Generated":"Generate"}
            </button>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ── Articles Tab ──────────────────────────────────────────────────────────────
function ArticlesTab({articles,loading,onRefresh,statusFilter,setStatusFilter}:{
  articles:Article[];loading:boolean;onRefresh:()=>void;
  statusFilter:string;setStatusFilter:(s:string)=>void;
}){
  const [selected,setSelected]=useState<Article|null>(null);

  const filtered=statusFilter==="ALL"?articles:articles.filter(a=>a.status===statusFilter);
  const counts:Record<string,number>={ALL:articles.length};
  articles.forEach(a=>{counts[a.status]=(counts[a.status]||0)+1;});

  const updateStatus=(id:number,status:string)=>{
    // Optimistically update locally
    if(selected?.id===id)setSelected(s=>s?{...s,status}:null);
    onRefresh();
  };

  return(
    <div style={{display:"flex",gap:0,height:"calc(100vh - 200px)",minHeight:400}}>
      {/* Left: article list */}
      <div style={{width:selected?380:undefined,flexGrow:selected?0:1,flexShrink:0,flexBasis:selected?"380px":"auto",borderRight:selected?"1.5px solid var(--border)":"none",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Status filter */}
        <div style={{padding:"12px 16px",borderBottom:"1.5px solid var(--border)",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>
          {["ALL","DRAFT","REVIEW","PUBLISHED","FAILED"].map(s=>{
            const sc=STATUS_COLORS[s]||{bg:"var(--card)",color:"var(--muted)"};
            const isActive=statusFilter===s;
            return<button key={s} onClick={()=>setStatusFilter(s)}
              style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid var(--border)",
                background:isActive?sc.bg:"var(--card)",color:isActive?sc.color:"var(--muted)",
                fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {s}{counts[s]?` (${counts[s]})`:""}
            </button>;
          })}
        </div>
        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?<div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading…</div>
          :filtered.length===0?<div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:13}}>No articles.</div>
          :filtered.map(a=>{
            const sc=STATUS_COLORS[a.status]||STATUS_COLORS.DRAFT;
            const isSelected=selected?.id===a.id;
            return(
              <div key={a.id} onClick={()=>setSelected(isSelected?null:a)}
                style={{padding:"12px 16px",cursor:"pointer",borderBottom:"1px solid var(--border)",
                  background:isSelected?"var(--bg)":"var(--card)",
                  borderLeft:isSelected?"3px solid var(--navy)":"3px solid transparent",transition:"background .1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:5}}>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--text)",lineHeight:1.3,flex:1}}>{a.title}</div>
                  <span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:800,background:sc.bg,color:sc.color,flexShrink:0,textTransform:"uppercase"}}>{a.status}</span>
                </div>
                {a.meta_description&&<div style={{fontSize:12,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>{a.meta_description}</div>}
                <div style={{fontSize:11,color:"var(--muted)"}}>{new Date(a.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: preview panel */}
      {selected&&(
        <div style={{flexGrow:1,flexShrink:1,flexBasis:"0%",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <ArticleRightPanel
            article={selected}
            onClose={()=>setSelected(null)}
            onStatusChange={updateStatus}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}

// ── SEO Stats Tab ─────────────────────────────────────────────────────────────
function SeoStatsTab(){
  const [metrics,setMetrics]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    http.get("/seo-content/cdm-metrics",ADM)
      .then(r=>setMetrics(r.data))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);
  if(loading)return<div style={{padding:60,textAlign:"center",color:"var(--muted)"}}>Loading…</div>;
  const m=metrics?.metrics||{};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:600}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {[
          {l:"Total Reviews",v:m.total_submissions??0,c:"var(--navy)"},
          {l:"Avg CDM Score",v:m.avg_score?`${Number(m.avg_score).toFixed(1)}/100`:"—",c:scoreColor(Number(m.avg_score)||0)},
          {l:"Passed",v:m.passed_count??0,c:"var(--green)"},
          {l:"Needs Fix",v:m.needs_fix??0,c:"#dc2626"},
          {l:"Publish Ready",v:m.publish_ready??0,c:"var(--green)"},
        ].map((k,i)=>(
          <div key={i} style={{...card,padding:"14px 16px"}}>
            <div style={{fontSize:22,fontWeight:900,color:k.c,marginBottom:4}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)"}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{...card,padding:"14px 16px"}}>
        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginBottom:10}}>Publication Thresholds</div>
        {[["0-59","Auto-Fix Required","#dc2626"],["60-74","Auto-Fix Recommended","#d97706"],["75-89","Human Edit Preferred","#0891b2"],["90-100","Publish Ready","#16a34a"]].map(([r,l,c])=>(
          <div key={r} style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:13,fontWeight:900,color:c,fontFamily:"monospace",width:50}}>{r}</span>
            <span style={{fontSize:13,color:"var(--text)"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const BlogCmsPage:React.FC=()=>{
  const _initTab = () => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tab") === "articles_pages") return "articles_pages" as const;
    if (p.get("tab") === "articles" || p.get("search")) return "articles" as const;
    if (p.get("tab") === "pages" || p.get("type") === "page") return "pages" as const;
    return "topics" as const;
  };
  const [tab,setTab]=useState<"topics"|"articles"|"articles_pages"|"pages"|"stats">(_initTab);
  const [articles,setArticles]=useState<Article[]>([]);
  const [loadingArticles,setLoadingArticles]=useState(false);
  const [statusFilter,setStatusFilter]=useState("ALL");

  const loadArticles=useCallback(async()=>{
    setLoadingArticles(true);
    try{
      const r=await http.get("/seo-content/articles",ADM);
      setArticles(r.data?.articles||[]);
    }catch{}
    setLoadingArticles(false);
  },[]);

  useEffect(()=>{
    if(tab==="articles")loadArticles();
  },[tab,loadArticles]);

  const counts:Record<string,number>={ALL:articles.length,...articles.reduce((acc:Record<string,number>,a)=>{acc[a.status]=(acc[a.status]||0)+1;return acc;},{} as Record<string,number>)};

  const TABS=[
    {id:"topics" as const,label:"Topic Discovery",icon:"🔎"},
    {id:"articles_pages" as const,label:"Pages",icon:"🏗️"},
    {id:"pages" as const,label:"Page Queue",icon:"📄"},
    {id:"articles" as const,label:`Articles (${counts.ALL||0})`,icon:"📝"},
    {id:"stats" as const,label:"SEO Stats",icon:"📊"},
  ];

  return(
    <div style={{padding:24,maxWidth:1300,margin:"0 auto"}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"var(--muted)",marginBottom:6}}>NexaBuilder Content</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:12}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:900,color:"var(--text)",margin:"0 0 4px"}}>
              SEO <span style={{fontStyle:"italic",fontWeight:400}}>Engine</span>
            </h1>
            <p style={{fontSize:13,color:"var(--muted)",margin:0}}>Topic discovery — Article generation — CDM quality scoring</p>
          </div>
          {counts.DRAFT>0&&<span style={{fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20,background:"#fef9c3",color:"#854d0e",marginBottom:2}}>{counts.DRAFT} draft{(counts.DRAFT as number)!==1?"s":""} need review</span>}
          {counts.PUBLISHED>0&&<span style={{fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20,background:"#dcfce7",color:"#166534",marginBottom:2}}>{counts.PUBLISHED} published</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"2px solid var(--border)",marginBottom:24}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id==="articles")loadArticles();}}
            style={{padding:"11px 20px",border:"none",background:"transparent",fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:7,borderBottom:tab===t.id?"2px solid var(--navy)":"2px solid transparent",marginBottom:"-2px",color:tab===t.id?"var(--navy)":"var(--muted)",fontWeight:tab===t.id?800:600,fontSize:13}}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab==="topics"&&<TopicDiscoveryTab onGenerated={()=>{setTab("articles");loadArticles();}}/>}
          {tab==="articles_pages"&&<ServicePagesTab/>}
          {tab==="pages"&&<PageQueueTab/>}
      {tab==="articles"&&<ArticlesTab articles={articles} loading={loadingArticles} onRefresh={loadArticles} statusFilter={statusFilter} setStatusFilter={setStatusFilter}/>}
      {tab==="stats"&&<SeoStatsTab/>}
    </div>
  );
};
export default BlogCmsPage;

// ── Page Queue Tab ─────────────────────────────────────────────────────────
// Service/Location page generator — queues and generates from SEO Intelligence
interface PageTarget {
  id: string; query: string; addedAt: string;
  position?: number; impressions?: number;
  notes?: string; status: 'queued'|'generating'|'draft'|'live';
  pageUrl?: string; pageId?: number; aiContext?: string;
  cslbLicense?: string; licenseName?: string; city?: string; vertical?: string;
}

const LICENSE_MAP: Record<string, {name:string; vertical:string}> = {
  'c-10': {name:'Electrical', vertical:'electrical'},
  'c10':  {name:'Electrical', vertical:'electrical'},
  'c-27': {name:'Landscaping', vertical:'landscaping'},
  'c27':  {name:'Landscaping', vertical:'landscaping'},
  'c-36': {name:'Plumbing', vertical:'plumbing'},
  'c36':  {name:'Plumbing', vertical:'plumbing'},
  'c-39': {name:'Roofing', vertical:'roofing'},
  'c39':  {name:'Roofing', vertical:'roofing'},
  'c-53': {name:'Pool & Spa', vertical:'pool'},
  'c53':  {name:'Pool & Spa', vertical:'pool'},
  'c-20': {name:'HVAC', vertical:'hvac'},
  'c20':  {name:'HVAC', vertical:'hvac'},
  'c-33': {name:'Painting', vertical:'painting'},
  'c-8':  {name:'Concrete', vertical:'concrete'},
  'c-17': {name:'Glazing', vertical:'windows'},
  'b':    {name:'General Building', vertical:'general'},
};

function detectLicense(query: string): {cslb:string; name:string; vertical:string} | null {
  const q = query.toLowerCase();
  for (const [code, info] of Object.entries(LICENSE_MAP)) {
    if (q.includes(code)) return {cslb: code.toUpperCase(), ...info};
  }
  return null;
}

function PageQueueTab() {
  const ADM_KEY = "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
  const ADM = { headers: { "X-Admin-Key": ADM_KEY } };
  const [items, setItems] = React.useState<PageTarget[]>([]);
  const [note, setNote]   = React.useState<Record<string,string>>({});
  const [genStatus, setGenStatus] = React.useState<Record<string,string>>({});

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('nb_page_queue');
      if (stored) setItems(JSON.parse(stored));
    } catch {}
    const p = new URLSearchParams(window.location.search);
    if (p.get('type') === 'page' && p.get('seed')) {
      const seed = p.get('seed')!;
      const lic = detectLicense(seed);
      setItems(prev => {
        if (prev.find(i => i.query === seed)) return prev;
        const next = [...prev, {
          id: Date.now().toString(), query: seed,
          addedAt: new Date().toISOString(), status: 'queued' as const,
          cslbLicense: lic?.cslb, licenseName: lic?.name, vertical: lic?.vertical,
        }];
        localStorage.setItem('nb_page_queue', JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const save = (updated: PageTarget[]) => {
    setItems(updated);
    localStorage.setItem('nb_page_queue', JSON.stringify(updated));
  };

  const update = (id: string, patch: Partial<PageTarget>) =>
    save(items.map(i => i.id === id ? {...i, ...patch} : i));

  const remove = (id: string) => save(items.filter(i => i.id !== id));

  const generate = async (item: PageTarget) => {
    setGenStatus(s => ({...s, [item.id]: 'generating'}));
    update(item.id, {status: 'generating'});
    try {
      const lic = detectLicense(item.query);
      const r = await http.post('/seo-content/generate-service-page', {
        query:        item.query,
        page_type:    'service_license',
        vertical:     item.vertical || lic?.vertical || 'general',
        ai_context:   item.aiContext || item.notes || '',
        cslb_license: item.cslbLicense || lic?.cslb || '',
        license_name: item.licenseName || lic?.name || '',
        city:         item.city || '',
        impressions:  item.impressions || 0,
        avg_position: item.position || 0,
      }, ADM);
      const {page_id, slug, title} = r.data;
      update(item.id, {
        status: 'draft', pageId: page_id,
        pageUrl: `https://www.nexabuilder.com/${slug}/`
      });
      setGenStatus(s => ({...s, [item.id]: `✓ Draft ready — ID ${page_id}`}));
    } catch(e: any) {
      setGenStatus(s => ({...s, [item.id]: `✗ Error: ${e.response?.data?.detail || e.message}`}));
      update(item.id, {status: 'queued'});
    }
  };

  const STATUS_COLORS = {
    queued:'#f59e0b', generating:'#3b82f6', draft:'#8b5cf6', live:'#16a34a'
  };
  const card: React.CSSProperties = {
    border:'1.5px solid var(--border)',borderRadius:10,
    padding:'14px 16px',background:'var(--card)',marginBottom:8
  };

  return (
    <div>
      <div style={{padding:'16px 20px 8px',borderBottom:'1.5px solid var(--border)',
        display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:'var(--text)'}}>Service & Location Page Generator</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
            Generate dedicated pages for CSLB license class + geo queries. Use the <strong style={{color:'#7c3aed'}}>+ Page</strong> button in SEO Intelligence to add items.
          </div>
        </div>
        <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',whiteSpace:'nowrap'}}>
          {items.filter(i=>i.status==='queued').length} queued ·{' '}
          {items.filter(i=>i.status==='draft').length} draft ·{' '}
          {items.filter(i=>i.status==='live').length} live
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{padding:48,textAlign:'center',color:'var(--muted)',fontSize:13,lineHeight:1.8}}>
          <div style={{fontSize:32,marginBottom:12}}>📄</div>
          No pages queued yet.<br/>
          Use the <strong style={{color:'#7c3aed'}}>+ Page</strong> button in SEO Intelligence<br/>
          or <strong>+ Add manually</strong> below for CSLB license class queries.
          <div style={{marginTop:16}}>
            <button onClick={()=>{
              const q = prompt('Enter the query (e.g. "c-10 electrical contractors southern california"):');
              if (!q) return;
              const lic = detectLicense(q);
              const next = [...items, {
                id: Date.now().toString(), query: q,
                addedAt: new Date().toISOString(), status: 'queued' as const,
                cslbLicense: lic?.cslb, licenseName: lic?.name, vertical: lic?.vertical,
              }];
              save(next);
            }} style={{padding:'8px 18px',background:'#7c3aed',color:'#fff',border:'none',
              borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
              + Add manually
            </button>
          </div>
        </div>
      ) : (
        <div style={{padding:'12px 20px'}}>
          {items.map(item => {
            const lic = detectLicense(item.query);
            const detectedLic = item.cslbLicense || lic?.cslb;
            const detectedName = item.licenseName || lic?.name;
            const isGenerating = item.status === 'generating';
            return (
              <div key={item.id} style={card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:4}}>
                      {item.query}
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                      {detectedLic && (
                        <span style={{fontSize:11,padding:'2px 8px',background:'rgba(29,111,222,.1)',
                          border:'1px solid rgba(29,111,222,.3)',borderRadius:20,color:'#1d6fde',fontWeight:700}}>
                          {detectedLic} {detectedName}
                        </span>
                      )}
                      {item.impressions && (
                        <span style={{fontSize:11,color:'var(--muted)'}}>
                          {item.impressions} impr · pos {item.position?.toFixed(1)}
                        </span>
                      )}
                      {item.pageId && (
                        <a href={`/blog?tab=articles&search=${encodeURIComponent(item.query)}`}
                          style={{fontSize:11,color:'#8b5cf6',fontWeight:700}}>
                          View draft →
                        </a>
                      )}
                      {item.pageUrl && item.status === 'live' && (
                        <a href={item.pageUrl} target='_blank' rel='noopener noreferrer'
                          style={{fontSize:11,color:'#16a34a',fontWeight:700}}>
                          {item.pageUrl} ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'flex-start',flexWrap:'wrap'}}>
                    {(['queued','draft','live'] as const).map(s => (
                      <button key={s} onClick={()=>update(item.id, {status:s})}
                        disabled={isGenerating}
                        style={{fontSize:11,padding:'3px 10px',borderRadius:20,border:'1.5px solid',
                          fontWeight:600,cursor:isGenerating?'not-allowed':'pointer',fontFamily:'inherit',
                          borderColor: item.status===s ? STATUS_COLORS[s] : 'var(--border)',
                          background: item.status===s ? `${STATUS_COLORS[s]}18` : 'var(--bg)',
                          color: item.status===s ? STATUS_COLORS[s] : 'var(--muted)',
                          opacity: isGenerating?0.5:1}}>
                        {s==='queued'?'Queued':s==='draft'?'Draft':'Live'}
                      </button>
                    ))}
                    <button onClick={()=>remove(item.id)} disabled={isGenerating}
                      style={{fontSize:11,color:'var(--muted)',background:'none',border:'none',
                        cursor:isGenerating?'not-allowed':'pointer',opacity:isGenerating?0.3:1}}>✕</button>
                  </div>
                </div>

                {/* AI Context notes */}
                <textarea
                  value={note[item.id] ?? item.notes ?? ''}
                  onChange={e => setNote(n => ({...n, [item.id]: e.target.value}))}
                  onBlur={() => update(item.id, {notes: note[item.id] ?? item.notes})}
                  placeholder='Paste SEO Intelligence context here (Quick Wins, Content Gaps, Internal Linking)...'
                  rows={3}
                  style={{width:'100%',padding:'6px 10px',border:'1.5px solid var(--border)',
                    borderRadius:7,fontSize:12,fontFamily:'inherit',background:'var(--bg)',
                    color:'var(--text)',outline:'none',resize:'vertical',boxSizing:'border-box' as const,
                    marginBottom:10}}/>

                {/* Generate button */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                  <div style={{fontSize:11,color: genStatus[item.id]?.startsWith('✓') ? '#16a34a'
                    : genStatus[item.id]?.startsWith('✗') ? '#ef4444' : 'var(--muted)'}}>
                    {genStatus[item.id] || (item.status==='draft' ? '✓ Draft generated — review in Articles tab' : '')}
                  </div>
                  <button
                    onClick={()=>generate(item)}
                    disabled={isGenerating || item.status==='live'}
                    style={{padding:'8px 20px',background: isGenerating?'var(--muted)':'#7c3aed',
                      color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:13,
                      cursor:isGenerating||item.status==='live'?'not-allowed':'pointer',
                      fontFamily:'inherit',flexShrink:0,
                      opacity: item.status==='live'?0.4:1}}>
                    {isGenerating ? '⏳ Generating...' : item.status==='draft' ? '↺ Regenerate' : '✦ Generate Page'}
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={()=>{
            const q = prompt('Enter query (e.g. "c-27 landscaping contractors los angeles"):');
            if (!q) return;
            const lic = detectLicense(q);
            save([...items, {
              id: Date.now().toString(), query: q,
              addedAt: new Date().toISOString(), status: 'queued',
              cslbLicense: lic?.cslb, licenseName: lic?.name, vertical: lic?.vertical,
            }]);
          }} style={{marginTop:8,padding:'8px 18px',background:'none',
            border:'1.5px dashed var(--border)',color:'var(--muted)',
            borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit',width:'100%'}}>
            + Add another query
          </button>
        </div>
      )}
    </div>
  );
}



// ── Service Pages Tab ───────────────────────────────────────────────────────
interface ServicePage{
  id:number;title:string;slug:string;primary_keyword:string;
  status:string;content_type:string;source:string;
  created_at:string;published_at?:string;meta_description?:string;
  last_review_score?:number;verified_complete?:boolean;has_body?:boolean;
}
const PG_STATUS_COLORS:Record<string,{bg:string;color:string}>={
  DRAFT:{bg:"#f1f5f9",color:"#475569"},REVIEW:{bg:"#fef9c3",color:"#854d0e"},
  PUBLISHED:{bg:"#dcfce7",color:"#166534"},FAILED:{bg:"#fee2e2",color:"#991b1b"},
};
function cslbBadge(kw:string):{label:string;color:string}|null{
  const k=kw.toLowerCase();
  if(k.includes("c-10")||k.includes("electrical"))return{label:"C-10 Electrical",color:"#1d6fde"};
  if(k.includes("c-27")||k.includes("landscaping"))return{label:"C-27 Landscaping",color:"#16a34a"};
  if(k.includes("c-36")||k.includes("plumbing"))return{label:"C-36 Plumbing",color:"#0891b2"};
  if(k.includes("c-39")||k.includes("roofing"))return{label:"C-39 Roofing",color:"#7c3aed"};
  if(k.includes("c-53")||k.includes("pool"))return{label:"C-53 Pool",color:"#0284c7"};
  if(k.includes("c-20")||k.includes("hvac"))return{label:"C-20 HVAC",color:"#d97706"};
  return null;
}
function ServicePagesTab(){
  const [pages,setPages]=useState<ServicePage[]>([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState<ServicePage|null>(null);
  const [statusFilter,setStatusFilter]=useState("ALL");
  const [full,setFull]=useState<any>(null);
  const [reviewing,setReviewing]=useState(false);
  const [applying,setApplying]=useState(false);
  const [review,setReview]=useState<any>(null);
  const [savingMeta,setSavingMeta]=useState(false);
  const [editTitle,setEditTitle]=useState("");
  const [editMeta,setEditMeta]=useState("");
  const [editSlug,setEditSlug]=useState("");
  const [activePanel,setActivePanel]=useState<"preview"|"meta"|"review">("preview");

  const loadPages=useCallback(async()=>{
    setLoading(true);
    try{const r=await http.get("/seo-content/pages",ADM);setPages(r.data?.pages||[]);}catch{}
    setLoading(false);
  },[]);
  useEffect(()=>{loadPages();},[loadPages]);
  useEffect(()=>{
    if(!selected){setFull(null);setReview(null);return;}
    setEditTitle(selected.title);setEditMeta(selected.meta_description||"");setEditSlug(selected.slug);
    http.get(`/seo-content/articles/${selected.id}`,ADM).then(r=>setFull(r.data)).catch(()=>{});
  },[selected]);

  const updateStatus=async(id:number,status:string)=>{
    await http.patch(`/seo-content/articles/${id}`,{status},ADM);
    setPages(ps=>ps.map(p=>p.id===id?{...p,status}:p));
    if(selected?.id===id)setSelected(s=>s?{...s,status}:null);
  };
  const runReview=async()=>{
    if(!selected)return;setReviewing(true);
    try{const r=await http.post(`/seo-content/review/${selected.id}`,{},ADM);setReview(r.data);}
    catch(e:any){alert("Review failed: "+(e?.response?.data?.detail||e.message));}
    setReviewing(false);
  };
  const saveMeta=async()=>{
    if(!selected)return;setSavingMeta(true);
    try{
      await http.patch(`/seo-content/articles/${selected.id}`,
        {title:editTitle,meta_description:editMeta,slug:editSlug},ADM);
      setPages(ps=>ps.map(p=>p.id===selected.id?{...p,title:editTitle,meta_description:editMeta,slug:editSlug}:p));
      setSelected(s=>s?{...s,title:editTitle,meta_description:editMeta,slug:editSlug}:null);
      alert("Saved");
    }catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setSavingMeta(false);
  };

  const filtered=statusFilter==="ALL"?pages:pages.filter(p=>p.status===statusFilter);
  const counts:Record<string,number>={ALL:pages.length};
  pages.forEach(p=>{counts[p.status]=(counts[p.status]||0)+1;});
  const deployCmd=selected?`python3 /home/ec2-user/deploy_service_pages.py --article-id ${selected.id}`:"";

  return(
    <div style={{display:"flex",height:"calc(100vh - 200px)",minHeight:400}}>
      {/* Left list */}
      <div style={{width:selected?360:undefined,flexGrow:selected?0:1,flexShrink:0,
        flexBasis:selected?"360px":"auto",borderRight:"1.5px solid var(--border)",
        display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1.5px solid var(--border)",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:800,fontSize:13,color:"var(--text)"}}>Service &amp; Location Pages</span>
          <span style={{fontSize:12,color:"var(--muted)"}}>{pages.length} pages</span>
        </div>
        <div style={{padding:"8px 12px",borderBottom:"1px solid var(--border)",display:"flex",gap:4,flexWrap:"wrap"}}>
          {["ALL","DRAFT","REVIEW","PUBLISHED"].map(s=>{
            const sc=PG_STATUS_COLORS[s]||{bg:"var(--navy)",color:"#fff"};const isA=statusFilter===s;
            return<button key={s} onClick={()=>setStatusFilter(s)}
              style={{padding:"3px 10px",borderRadius:20,border:"1.5px solid var(--border)",
                background:isA?sc.bg:"var(--card)",color:isA?sc.color:"var(--muted)",
                fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {s}{counts[s]?` (${counts[s]})`:""}</button>;
          })}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?<div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading…</div>
          :filtered.length===0?<div style={{padding:40,textAlign:"center",color:"var(--muted)",fontSize:13,lineHeight:2}}>
            <div style={{fontSize:28,marginBottom:8}}>🏗️</div>
            No service pages yet.<br/>
            Use <strong>Page Queue</strong> tab to generate<br/>pages from GSC queries.
          </div>
          :filtered.map(p=>{
            const sc=PG_STATUS_COLORS[p.status]||PG_STATUS_COLORS.DRAFT;
            const badge=cslbBadge(p.primary_keyword||p.title||"");
            const isSel=selected?.id===p.id;
            return(
              <div key={p.id} onClick={()=>setSelected(isSel?null:p)}
                style={{padding:"12px 16px",cursor:"pointer",borderBottom:"1px solid var(--border)",
                  background:isSel?"var(--bg)":"var(--card)",
                  borderLeft:isSel?"3px solid var(--navy)":"3px solid transparent",transition:"background .1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1.3,flex:1}}>{p.title}</div>
                  <span style={{padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:800,
                    background:sc.bg,color:sc.color,flexShrink:0}}>{p.status}</span>
                </div>
                <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                  {badge&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:4,
                    background:"rgba(29,111,222,.1)",color:badge.color}}>{badge.label}</span>}
                  <span style={{fontSize:11,color:"var(--muted)"}}>/{p.slug}/</span>
                </div>
                {p.last_review_score!=null&&<div style={{fontSize:11,marginTop:2,fontWeight:600,
                  color:p.last_review_score>=75?"var(--green)":"#d97706"}}>
                  CDM: {p.last_review_score}/100</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      {selected&&(
        <div style={{flexGrow:1,flexShrink:1,flexBasis:"0%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:"1.5px solid var(--border)",
            display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <div style={{flex:1,overflow:"hidden"}}>
              <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:.5,
                padding:"2px 7px",borderRadius:4,background:"rgba(124,58,237,.1)",color:"#7c3aed",
                display:"inline-block",marginBottom:3}}>Service Page</span>
              <div style={{fontSize:14,fontWeight:800,color:"var(--text)",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.title}</div>
            </div>
            <button onClick={()=>setSelected(null)}
              style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:"var(--muted)"}}>✕</button>
          </div>
          {/* Status bar */}
          <div style={{padding:"8px 16px",borderBottom:"1px solid var(--border)",display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>Status:</span>
            {(["DRAFT","REVIEW","PUBLISHED"] as const).map(s=>{
              const sc=PG_STATUS_COLORS[s];
              return<button key={s} onClick={()=>updateStatus(selected.id,s)}
                style={{padding:"3px 10px",borderRadius:20,border:"1.5px solid",
                  borderColor:selected.status===s?sc.color:"var(--border)",
                  background:selected.status===s?sc.bg:"var(--card)",
                  color:selected.status===s?sc.color:"var(--muted)",
                  fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s}</button>;
            })}
          </div>
          {/* Panel nav */}
          <div style={{padding:"0 16px",borderBottom:"1px solid var(--border)",display:"flex",gap:0}}>
            {[{id:"preview",label:"Preview & Deploy"},{id:"meta",label:"Meta & Slug"},{id:"review",label:"AI Review"}]
              .map(t=>(
                <button key={t.id} onClick={()=>setActivePanel(t.id as any)}
                  style={{padding:"10px 16px",background:"none",border:"none",
                    borderBottom:activePanel===t.id?"2px solid var(--navy)":"2px solid transparent",
                    color:activePanel===t.id?"var(--navy)":"var(--muted)",
                    fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:"-1px"}}>
                  {t.label}</button>
              ))}
          </div>
          {/* Body */}
          <div style={{flex:1,overflowY:"auto",padding:16}}>
            {activePanel==="preview"&&(
              <div>
                <div style={{background:"linear-gradient(135deg,rgba(124,58,237,.06),rgba(124,58,237,.02))",
                  border:"1.5px solid rgba(124,58,237,.2)",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#7c3aed",marginBottom:6,
                    textTransform:"uppercase",letterSpacing:.5}}>
                    Deploy to nexabuilder.com/services/{selected.slug}/
                  </div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:8,lineHeight:1.6}}>
                    Run on EC2 to publish. Status updates to PUBLISHED automatically.
                  </div>
                  <code style={{display:"block",padding:"8px 12px",background:"rgba(0,0,0,.06)",
                    borderRadius:6,fontSize:11,color:"var(--text)",wordBreak:"break-all",userSelect:"all"}}>
                    {deployCmd}
                  </code>
                  {selected.status==="PUBLISHED"&&(
                    <a href={`https://www.nexabuilder.com/services/${selected.slug}/`}
                      target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-block",marginTop:8,fontSize:11,color:"#7c3aed",fontWeight:700}}>
                      View live page ↗
                    </a>
                  )}
                </div>
                {full?.body_html?(
                  <div style={{...card,padding:16}}>
                    <div style={{...lbl,marginBottom:8}}>Generated Content</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>
                      {full.body_html.replace(/<[^>]+>/g,"").split(/\s+/).filter(Boolean).length} words
                    </div>
                    <div style={{maxHeight:360,overflow:"auto",fontSize:13,lineHeight:1.7,color:"var(--text)"}}
                      dangerouslySetInnerHTML={{__html:full.body_html.substring(0,3000)}}/>
                  </div>
                ):<div style={{textAlign:"center",padding:"24px 0",color:"var(--muted)"}}>Loading…</div>}
              </div>
            )}
            {activePanel==="meta"&&(
              <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:560}}>
                <label style={lbl}>SEO Title</label>
                <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={inp}/>
                <div style={{fontSize:11,color:editTitle.length>65?"#dc2626":"var(--muted)"}}>{editTitle.length}/65</div>
                <label style={lbl}>Meta Description</label>
                <textarea value={editMeta} onChange={e=>setEditMeta(e.target.value)}
                  rows={3} style={{...inp,height:"auto",resize:"vertical"}}/>
                <div style={{fontSize:11,color:editMeta.length>155?"#dc2626":"var(--muted)"}}>{editMeta.length}/155</div>
                <label style={lbl}>URL Slug</label>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:"var(--muted)"}}>nexabuilder.com/services/</span>
                  <input value={editSlug}
                    onChange={e=>setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))}
                    style={{...inp,flex:1}}/>
                  <span style={{fontSize:12,color:"var(--muted)"}}>/</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={saveMeta} disabled={savingMeta}
                    style={{padding:"9px 20px",background:"var(--blue)",
                      color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13,
                      cursor:savingMeta?"not-allowed":"pointer",fontFamily:"inherit",opacity:savingMeta?.6:1}}>
                    {savingMeta?"Saving…":"Save Meta"}
                  </button>
                  <button onClick={async()=>{
                    if(!selected)return;
                    setSavingMeta(true);
                    try{
                      const r=await http.post(`/seo-content/suggest-meta/${selected.id}`,{},ADM);
                      if(r.data.suggested_title)setEditTitle(r.data.suggested_title);
                      if(r.data.suggested_meta)setEditMeta(r.data.suggested_meta);
                    }catch(e:any){alert("Suggest failed: "+(e?.response?.data?.detail||e.message));}
                    setSavingMeta(false);
                  }} disabled={savingMeta}
                    style={{padding:"9px 18px",background:"var(--bg)",border:"1.5px solid var(--border)",
                      color:"var(--muted)",borderRadius:8,fontWeight:700,fontSize:13,
                      cursor:savingMeta?"not-allowed":"pointer",fontFamily:"inherit"}}>
                    ✦ AI Suggest
                  </button>
                </div>
                <div style={{fontSize:11,color:"var(--muted)"}}>
                  AI Suggest generates title + meta from the page content and keyword.
                </div>
              </div>
            )}
            {activePanel==="review"&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>

                {/* Score card + run button */}
                <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                  {review&&(
                    <div style={{...card,padding:"16px 20px",minWidth:120,textAlign:"center"}}>
                      <div style={{fontSize:36,fontWeight:900,lineHeight:1,
                        color:review.overall_score>=75?"var(--green)":review.overall_score>=60?"#d97706":"#dc2626"}}>
                        {review.overall_score}
                      </div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>/100</div>
                      <div style={{fontSize:11,fontWeight:700,marginTop:6,
                        color:review.passed?"var(--green)":"#d97706"}}>
                        {review.passed?"✓ Deploy ready":"⚠ Needs fixes"}
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
                    <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>
                      AI Review scores on E-E-A-T, CSLB citations, internal links, FAQ structure, and cost data. Score ≥75 = deploy ready.
                    </div>
                    <button onClick={runReview} disabled={reviewing||applying}
                      style={{alignSelf:"flex-start",padding:"8px 18px",background:"var(--navy)",
                        color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:12,
                        cursor:(reviewing||applying)?"not-allowed":"pointer",fontFamily:"inherit",
                        opacity:(reviewing||applying)?.6:1}}>
                      {reviewing?"⏳ Reviewing…":review?"⚡ Re-run Review":"⚡ Run AI Review"}
                    </button>
                  </div>
                </div>

                {/* Review notes */}
                {review?.notes&&(
                  <div style={{...card,padding:"14px 16px",background:"#fafafa"}}>
                    <div style={{...lbl,marginBottom:8,color:"var(--muted)"}}>CDM Review Notes</div>
                    <div style={{fontSize:12,lineHeight:1.8,color:"var(--text)",whiteSpace:"pre-wrap",
                      fontFamily:"monospace",background:"#f1f5f9",padding:"10px 12px",borderRadius:6}}>
                      {review.notes}
                    </div>
                  </div>
                )}

                {/* Tools — only show after review */}
                {review&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{...lbl,color:"var(--muted)"}}>Fix Tools</div>

                    {/* Apply AI Suggestions — surgical patch based on review notes */}
                    <div style={{...card,padding:"14px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:"var(--text)",marginBottom:3}}>
                            ✦ Apply AI Suggestions
                          </div>
                          <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>
                            Surgically patches the page body based on the review notes above — adds missing CSLB citations, expands FAQ, fixes internal links, adds cost data. Does not rewrite the page.
                          </div>
                        </div>
                        <button onClick={async()=>{
                          if(!confirm("Apply AI Suggestions? This patches the page body based on CDM review notes."))return;
                          setApplying(true);
                          try{
                            const r=await http.post(`/seo-content/apply-suggestions/${selected?.id}`,{},ADM);
                            setFull((f:any)=>f?{...f,body_html:r.data.body_html}:f);
                            alert("Suggestions applied. Re-run AI Review to check new score.");
                          }catch(e:any){alert("Failed: "+(e?.response?.data?.detail||e.message));}
                          setApplying(false);
                        }} disabled={applying||reviewing}
                          style={{flexShrink:0,padding:"8px 16px",
                            background:applying?"var(--muted)":"var(--blue)",
                            color:"#fff",border:"none",borderRadius:8,
                            fontWeight:700,fontSize:12,cursor:(applying||reviewing)?"not-allowed":"pointer",
                            fontFamily:"inherit",opacity:(applying||reviewing)?.6:1}}>
                          {applying?"⏳ Applying…":"Apply →"}
                        </button>
                      </div>
                      {review.overall_score<60&&(
                        <div style={{fontSize:11,padding:"6px 10px",background:"rgba(220,38,38,.06)",
                          border:"1px solid rgba(220,38,38,.15)",borderRadius:6,color:"#991b1b"}}>
                          Score below 60 — Apply Suggestions may not be enough. Consider regenerating the page from Page Queue with more context.
                        </div>
                      )}
                    </div>

                    {/* Verify — marks page as complete */}
                    <div style={{...card,padding:"14px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:"var(--text)",marginBottom:3}}>
                            ✓ Verify Complete
                          </div>
                          <div style={{fontSize:12,color:"var(--muted)"}}>
                            Mark this page as manually reviewed and ready. Suppresses false truncation warnings in future reviews.
                          </div>
                        </div>
                        <button onClick={async()=>{
                          try{
                            await http.post(`/seo-content/verify-complete/${selected?.id}`,{},ADM);
                            alert("Page marked as verified.");
                            loadPages();
                          }catch(e:any){alert("Failed: "+(e?.response?.data?.detail||e.message));}
                        }} style={{flexShrink:0,padding:"8px 16px",background:"var(--green)",
                          color:"#fff",border:"none",borderRadius:8,
                          fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                          Verify ✓
                        </button>
                      </div>
                    </div>

                    {/* Score breakdown */}
                    {review.scores&&(
                      <div style={{...card,padding:"14px 16px"}}>
                        <div style={{...lbl,marginBottom:10,color:"var(--muted)"}}>Score Breakdown</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px"}}>
                          {Object.entries(review.scores).map(([k,v])=>{
                            const score=Number(v);
                            const maxes:Record<string,number>={
                              reader_value:20,factual_accuracy:20,search_intent:15,
                              eeat:15,structure:10,readability:10,internal_links:10
                            };
                            const max=maxes[k.toLowerCase()]||10;
                            const pct=(score/max)*100;
                            return(
                              <div key={k}>
                                <div style={{display:"flex",justifyContent:"space-between",
                                  marginBottom:2,fontSize:11}}>
                                  <span style={{color:"var(--muted)",fontWeight:600,textTransform:"capitalize"}}>
                                    {k.replace(/_/g," ")}
                                  </span>
                                  <span style={{fontWeight:700,
                                    color:pct>=75?"var(--green)":pct>=50?"#d97706":"#dc2626"}}>
                                    {score}/{max}
                                  </span>
                                </div>
                                <div style={{height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
                                  <div style={{height:"100%",borderRadius:2,
                                    background:pct>=75?"var(--green)":pct>=50?"#d97706":"#dc2626",
                                    width:`${Math.min(100,pct)}%`,transition:"width .4s"}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

