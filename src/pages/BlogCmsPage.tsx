import React,{useState,useEffect,useCallback,useRef} from "react";
import {http} from "../lib/http";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Topic{id:number;discovered_query:string;intent_category:string;impressions:number;clicks:number;avg_position:number;is_processed_to_article:boolean;source:string;created_at:string;}
interface Article{id:number;title:string;slug:string;primary_keyword:string;status:string;content_type:string;created_at:string;completed_at?:string;meta_description?:string;has_body:boolean;body_preview?:string;error_message?:string;}
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
  const [seedKw,setSeedKw]=useState("");
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
        const [tr,pr]=await Promise.all([
          http.get(`/seo-content/topics?limit=50&unprocessed_only=${filterUnprocessed}`,ADM),
          http.get("/seo-content/profiles",ADM),
        ]);
        setTopics(tr.data?.topics||[]);
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
        <span style={{fontSize:13,color:"var(--muted)",flex:1}}>{topics.length} topic{topics.length!==1?"s":""} in queue</span>
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
  const [tab,setTab]=useState<"topics"|"articles"|"stats">("topics");
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
      {tab==="articles"&&<ArticlesTab articles={articles} loading={loadingArticles} onRefresh={loadArticles} statusFilter={statusFilter} setStatusFilter={setStatusFilter}/>}
      {tab==="stats"&&<SeoStatsTab/>}
    </div>
  );
};
export default BlogCmsPage;
