import React,{useState,useEffect,useCallback} from "react";
import {http} from "../lib/http";

const CDM_HEADERS={headers:{"x-api-key":"24dejulio_internal"}};
const card:React.CSSProperties={background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)",boxShadow:"var(--shadow)"};
const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)",marginBottom:6};
const inp:React.CSSProperties={width:"100%",padding:"9px 12px",border:"1.5px solid var(--border)",borderRadius:9,fontSize:13,fontFamily:"inherit",background:"var(--bg)",color:"var(--text)",outline:"none",boxSizing:"border-box"};
const scoreColor=(n:number)=>n>=75?"#16a34a":n>=60?"#d97706":"#dc2626";
const scoreLabel=(r:string)=>({"publish_ready":"Publish Ready","human_edit":"Human Edit","auto_fix_recommended":"Auto-Fix Recommended","auto_fix_required":"Auto-Fix Required","generated":"Generated"}[r]||(r||"").replace(/_/g," "));

const ContentHealthTab:React.FC=()=>{
  const [health,setHealth]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{const r=await http.get("https://api.techcial.com/v1/content-health/nexabuilder",CDM_HEADERS);if(r?.data)setHealth(r.data);}catch{}setLoading(false);})();},[]);
  if(loading)return<div style={{padding:60,textAlign:"center",color:"var(--muted)"}}>Loading…</div>;
  const s=health?.submissions;const avg=Number(s?.avg_score)||0;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[{l:"Total CDM Reviews",v:s?.total??0,c:"var(--navy)",i:"📊"},{l:"Avg CDM Score",v:avg?`${avg.toFixed(1)}/100`:"—",c:scoreColor(avg),i:"⭐"},{l:"Passed",v:s?.passed_count??0,c:"#16a34a",i:"✓"},{l:"Need Auto-Fix",v:s?.needs_fix??0,c:"#dc2626",i:"🔧"},{l:"Active Links",v:health?.active_internal_links??0,c:"var(--blue)",i:"🔗"},{l:"Submitted",v:s?.total??0,c:"var(--navy)",i:"📝"}].map((k,i)=>(
          <div key={i} style={{...card,padding:"18px 20px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:28}}>{k.i}</div>
            <div><div style={{fontSize:24,fontWeight:900,color:k.c,marginBottom:4}}>{k.v}</div><div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)"}}>{k.l}</div></div>
          </div>
        ))}
      </div>
      {avg>0&&<div style={{...card,padding:"20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>Average CDM Score</span>
          <span style={{fontSize:24,fontWeight:900,color:scoreColor(avg)}}>{avg.toFixed(1)}/100</span>
        </div>
        <div style={{height:8,background:"var(--border)",borderRadius:8,marginBottom:8}}>
          <div style={{height:8,borderRadius:8,width:`${Math.min(avg,100)}%`,background:scoreColor(avg)}}/>
        </div>
        {avg<60&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:"1.5px solid #fca5a5",fontSize:13,color:"#991b1b",fontWeight:600}}>Run CDM Review + Auto-Fix on all drafts before publishing.</div>}
      </div>}
      {health?.recent_reviews?.length>0&&<div style={card}>
        <div style={{padding:"14px 24px",borderBottom:"1.5px solid var(--border)",fontSize:13,fontWeight:800,color:"var(--text)"}}>Recent CDM Reviews</div>
        {health.recent_reviews.map((r:any,i:number)=>(
          <div key={i} style={{padding:"12px 24px",borderBottom:i<health.recent_reviews.length-1?"1px solid var(--border)":"none",display:"grid",gridTemplateColumns:"1fr 80px 200px 100px",alignItems:"center",gap:12}}>
            <div style={{fontSize:13,color:"var(--text)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
            <div style={{fontSize:18,fontWeight:900,color:scoreColor(r.overall_score||0)}}>{r.overall_score}/100</div>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",color:scoreColor(r.overall_score||0)}}>{scoreLabel(r.recommendation)}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
          </div>
        ))}
      </div>}
    </div>
  );
};

const EditorialBibleTab:React.FC=()=>{
  const RUBRIC=[{cat:"Reader Value",pts:20,desc:"Direct answer? Engaging? Teaches the homeowner something actionable?"},{cat:"Factual Accuracy",pts:20,desc:"CSLB claims correct? Permit requirements accurate for California? Cost ranges cited?"},{cat:"Search Intent",pts:15,desc:"40-60 word direct answer opening? Meta under 160 chars?"},{cat:"E-E-A-T",pts:15,desc:"CSLB citations? Contractor credentials? California Building Code references?"},{cat:"Structure",pts:10,desc:"H2s? FAQ with 4 Q&As? CTA? Conclusion? Comparison table?"},{cat:"Readability",pts:10,desc:"Grade 8 target. Active voice. Sentences under 25 words."},{cat:"Internal Links",pts:10,desc:"3-5 links to /services/, /locations/, /get-quote/."}];
  const TH=[{range:"0-59",label:"Auto-Fix Required",color:"#dc2626",bg:"#fef2f2",action:"CDM rewrites automatically."},{range:"60-74",label:"Auto-Fix Recommended",color:"#d97706",bg:"#fef9c3",action:"CDM rewrite recommended before human review."},{range:"75-89",label:"Human Edit Preferred",color:"#0891b2",bg:"#dbeafe",action:"Targeted edits only."},{range:"90-100",label:"Publish Ready",color:"#16a34a",bg:"#dcfce7",action:"Publish directly or minor polish."}];
  const CTYPES=[{type:"Comparison Article",icon:"⚖️",trigger:"Pool vs spa, vinyl vs fiberglass",structure:["40-60 word DIRECT ANSWER","Quick Answer box (2 sentences)","Summary bullets (4-5)","3-4 H2s each with opener","Cost comparison table","H2: FAQ — 4 Q&As (40-80 words)","Conclusion + CTA"],target:"900-1200 words"},{type:"Guide Page",icon:"📖",trigger:"How-to, CSLB verification, step-by-step",structure:["40-60 word DIRECT ANSWER","Quick Answer box","H2: What It Is","H2: Requirements & Costs","H2: How to Hire","H2: FAQ — 4 Q&As","Conclusion + CTA"],target:"800-1100 words"},{type:"FAQ Page",icon:"❓",trigger:"PAA clusters, quick-answer queries",structure:["40-60 word opening","6-8 Q&A pairs (40-80 words each)","Conclusion + CTA"],target:"700-900 words"},{type:"Location Page",icon:"📍",trigger:"[service] in [city] queries",structure:["40-60 word city-specific answer","H2: [Service] in [City]","H2: Cost ranges table","H2: Why NexaBuilder","H2: FAQ — 3 city Q&As","CTA"],target:"600-900 words"}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={card}>
        <div style={{padding:"18px 24px",borderBottom:"1.5px solid var(--border)"}}><div style={{...lbl,marginBottom:4}}>CDM Scoring Rubric</div><div style={{fontSize:20,fontWeight:900,color:"var(--text)"}}>100-Point Editorial Standard</div></div>
        {RUBRIC.map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:16,padding:"14px 24px",borderBottom:i<RUBRIC.length-1?"1px solid var(--border)":"none"}}>
            <div style={{textAlign:"center",flexShrink:0,width:52}}><div style={{fontSize:22,fontWeight:900,color:"var(--navy)",lineHeight:1}}>{r.pts}</div><div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)"}}>pts</div></div>
            <div><div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:3}}>{r.cat}</div><div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>{r.desc}</div></div>
          </div>
        ))}
      </div>
      <div style={{...card,padding:"20px 24px"}}><div style={{...lbl,marginBottom:14}}>Publication Thresholds</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {TH.map((t,i)=>(
            <div key={i} style={{padding:"14px 16px",borderRadius:10,background:t.bg,border:`1.5px solid ${t.color}33`}}>
              <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:6}}><span style={{fontSize:16,fontWeight:900,color:t.color,fontFamily:"monospace"}}>{t.range}</span><span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",color:t.color}}>{t.label}</span></div>
              <div style={{fontSize:12,color:t.color,lineHeight:1.5}}>{t.action}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{padding:"18px 24px",borderBottom:"1.5px solid var(--border)"}}><div style={{...lbl,marginBottom:4}}>Content Type Templates</div><div style={{fontSize:18,fontWeight:800,color:"var(--text)"}}>Structure requirements by article type</div></div>
        <div style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {CTYPES.map((ct,i)=>(
            <div key={i} style={{border:"1.5px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
              <div style={{background:"var(--navy)",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>{ct.icon}</span><div><div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{ct.type}</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:1}}>Use when: {ct.trigger}</div></div></div>
              <div style={{padding:"12px 16px"}}><ol style={{margin:0,paddingLeft:18,fontSize:12,color:"var(--muted)",lineHeight:1.75}}>{ct.structure.map((s,j)=><li key={j}>{s}</li>)}</ol><div style={{marginTop:10,padding:"5px 10px",borderRadius:6,background:"var(--bg)",fontSize:11,fontWeight:700,color:"var(--blue)"}}>Target: {ct.target}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{...card,padding:"18px 24px"}}><div style={{...lbl,marginBottom:12}}>Banned Words</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{["delve","testament","furthermore","landscape","tapestry","leverage","underscore","crucial","vital","comprehensive","realm","embark","robust","seamlessly","game-changer","in conclusion"].map(w=><span key={w} style={{padding:"4px 12px",borderRadius:20,background:"#fee2e2",color:"#991b1b",fontSize:12,fontWeight:700}}>{w}</span>)}</div></div>
    </div>
  );
};

const WritingProfilesTab:React.FC=()=>{
  const [profiles,setProfiles]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[editing,setEditing]=useState<any>(null);const[draft,setDraft]=useState("");const[saving,setSaving]=useState(false);const[saved,setSaved]=useState(false);
  useEffect(()=>{http.get("https://api.techcial.com/v1/profiles/nexabuilder",CDM_HEADERS).then(r=>{setProfiles((r.data?.profiles||[]).filter((p:any)=>p.profile_name.toLowerCase().includes("nexabuilder")));setLoading(false);}).catch(()=>setLoading(false));},[]);
  const openEdit=(p:any)=>{setEditing(p);setDraft(p.custom_system_guidelines||"");setSaved(false);};
  const save=async()=>{if(!editing)return;setSaving(true);try{await http.put(`https://api.techcial.com/v1/profiles/${editing.id}`,{custom_system_guidelines:draft},CDM_HEADERS);setProfiles(ps=>ps.map(p=>p.id===editing.id?{...p,custom_system_guidelines:draft}:p));setSaved(true);setTimeout(()=>setSaved(false),3000);}catch{alert("Save failed");}setSaving(false);};
  if(loading)return<div style={{padding:60,textAlign:"center",color:"var(--muted)"}}>Loading profiles…</div>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {profiles.length===0&&<div style={{...card,padding:40,textAlign:"center",color:"var(--muted)"}}>No NexaBuilder profiles found.</div>}
      {profiles.map(p=>(
        <div key={p.id} style={card}>
          <div style={{padding:"18px 24px",borderBottom:"1.5px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:6}}>{p.profile_name}</div><div style={{display:"flex",gap:8}}>{[p.writing_style,`Lang: ${(p.language||"en").toUpperCase()}`,`Grade ${p.target_readability_grade||8}`].map(t=><span key={t} style={{fontSize:11,padding:"2px 9px",borderRadius:10,background:"var(--bg)",color:"var(--muted)",fontWeight:700,border:"1px solid var(--border)"}}>{t}</span>)}</div></div>
            {editing?.id===p.id?<div style={{display:"flex",gap:8}}><button onClick={save} disabled={saving} style={{padding:"8px 18px",borderRadius:8,border:"none",background:saved?"var(--green)":"var(--gold)",color:saved?"#fff":"var(--navy)",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Saving…":saved?"✓ Saved":"Save to CDM"}</button><button onClick={()=>setEditing(null)} style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid var(--border)",background:"none",color:"var(--muted)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button></div>:<button onClick={()=>openEdit(p)} style={{padding:"8px 18px",borderRadius:8,border:"1.5px solid var(--navy)",background:"var(--card)",color:"var(--navy)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✎ Edit Guidelines</button>}
          </div>
          {editing?.id===p.id?<div style={{padding:"20px 24px"}}><label style={lbl}>System Guidelines — sent to Claude with every generation</label><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={20} style={{...inp,fontFamily:"monospace",fontSize:12,lineHeight:1.65,resize:"vertical"}}/><div style={{marginTop:6,fontSize:11,color:"var(--muted)"}}>{draft.length.toLocaleString()} characters</div></div>:<div style={{padding:"20px 24px"}}><label style={lbl}>Current Guidelines</label><pre style={{fontSize:12,fontFamily:"monospace",color:"var(--text)",lineHeight:1.65,background:"var(--bg)",padding:"14px 16px",borderRadius:9,border:"1.5px solid var(--border)",whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:280,overflowY:"auto",margin:0}}>{p.custom_system_guidelines||"(no guidelines)"}</pre></div>}
        </div>
      ))}
    </div>
  );
};

const InternalLinksTab:React.FC=()=>{
  const [links,setLinks]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[adding,setAdding]=useState(false);const[deleting,setDeleting]=useState<number|null>(null);const[nl,setNl]=useState({entity_text:"",anchor_text:"",target_url:"",category:"service",priority:5});const[saving,setSaving]=useState(false);const[filterCat,setFilterCat]=useState("all");
  const load=useCallback(async()=>{setLoading(true);try{const r=await http.get("https://api.techcial.com/v1/links/suggest?brand_id=nexabuilder&limit=50",CDM_HEADERS);setLinks(r.data||[]);}catch{}setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const addLink=async()=>{if(!nl.entity_text||!nl.anchor_text||!nl.target_url){alert("All fields required.");return;}setSaving(true);try{await http.post("https://api.techcial.com/v1/links",{brand_id:"nexabuilder",...nl},CDM_HEADERS);setNl({entity_text:"",anchor_text:"",target_url:"",category:"service",priority:5});setAdding(false);await load();}catch{alert("Add failed");}setSaving(false);};
  const del=async(id:number)=>{if(!confirm("Remove?"))return;setDeleting(id);try{await http.delete(`https://api.techcial.com/v1/links/${id}`,CDM_HEADERS);await load();}catch{alert("Failed");}setDeleting(null);};
  const TAG:Record<string,{bg:string;color:string}>={service:{bg:"#dbeafe",color:"#1d4ed8"},location:{bg:"#dcfce7",color:"#166534"},regulatory:{bg:"#fef9c3",color:"#854d0e"},guide:{bg:"#f3e8ff",color:"#6b21a8"},cta:{bg:"#fee2e2",color:"#991b1b"}};
  const cats=["all",...Array.from(new Set(links.map((l:any)=>l.category)))];
  const filtered=filterCat==="all"?links:links.filter((l:any)=>l.category===filterCat);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{flex:1,fontSize:13,color:"var(--muted)"}}>{links.length} active links. CDM injects top 10 by priority into every generation.</div><button onClick={()=>setAdding(a=>!a)} style={{padding:"9px 18px",borderRadius:9,border:"none",background:"var(--navy)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{adding?"✕ Cancel":"+ Add Link"}</button></div>
      {adding&&<div style={{...card,padding:"20px 24px"}}>
        <div style={{fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:16}}>New Internal Link</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          {([["Entity Text","entity_text","e.g. HVAC contractor","What AI looks for in body"],["Anchor Text","anchor_text","e.g. licensed HVAC contractors SoCal","Visible link text"],["Target URL","target_url","/services/hvac-contractors/",""]]) .map(([l,k,ph,hint])=>(
            <label key={k} style={{display:"flex",flexDirection:"column",gap:6}}><span style={lbl}>{l}{hint&&<span style={{fontWeight:400,textTransform:"none"}}> ({hint})</span>}</span><input value={(nl as any)[k]} placeholder={ph} onChange={e=>setNl((n:any)=>({...n,[k]:e.target.value}))} style={inp}/></label>
          ))}
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:10}}>
            <label style={{display:"flex",flexDirection:"column",gap:6}}><span style={lbl}>Category</span><select value={nl.category} onChange={e=>setNl(n=>({...n,category:e.target.value}))} style={{...inp,cursor:"pointer"}}>{["service","location","regulatory","guide","cta"].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
            <label style={{display:"flex",flexDirection:"column",gap:6}}><span style={lbl}>Priority</span><input type="number" min={1} max={10} value={nl.priority} onChange={e=>setNl(n=>({...n,priority:+e.target.value}))} style={inp}/></label>
          </div>
        </div>
        <button onClick={addLink} disabled={saving} style={{padding:"9px 20px",borderRadius:9,border:"none",background:"var(--gold)",color:"var(--navy)",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Adding…":"✓ Add Link"}</button>
      </div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {cats.map(c=><button key={c} onClick={()=>setFilterCat(c)} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:filterCat===c?"var(--navy)":"var(--card)",color:filterCat===c?"#fff":"var(--muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{c==="all"?`All (${links.length})`:`${c} (${links.filter((l:any)=>l.category===c).length})`}</button>)}
      </div>
      {loading?<div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading…</div>:<div style={card}>
        <div style={{display:"grid",gridTemplateColumns:"170px 1fr 150px 70px 44px 36px",padding:"10px 16px",background:"var(--bg)",borderBottom:"1.5px solid var(--border)"}}>
          {["Entity Text","Anchor → URL","Category","Priority","Active",""].map((h,i)=><div key={i} style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)"}}>{h}</div>)}
        </div>
        {filtered.length===0&&<div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:13}}>No links.</div>}
        {filtered.map((l:any,i:number)=>{const tc=TAG[l.category]||{bg:"var(--bg)",color:"var(--muted)"};const b=i<filtered.length-1?"1px solid var(--border)":"none";return(
          <div key={l.id} style={{display:"grid",gridTemplateColumns:"170px 1fr 150px 70px 44px 36px",padding:"11px 16px",borderBottom:b,alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{l.entity_text}</div>
            <div><div style={{fontSize:13,color:"var(--text)"}}>{l.anchor_text}</div><div style={{fontSize:11,color:"var(--blue)",fontFamily:"monospace"}}>{l.target_url}</div></div>
            <div><span style={{padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:700,background:tc.bg,color:tc.color,textTransform:"capitalize"}}>{l.category}</span></div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{l.priority}/10</div>
            <div style={{fontSize:14,color:l.is_active?"var(--green)":"var(--red)"}}>{l.is_active?"✓":"✗"}</div>
            <div><button onClick={()=>del(l.id)} disabled={deleting===l.id} title="Remove" style={{border:"none",background:"none",cursor:"pointer",fontSize:13,color:"var(--muted)",padding:4,opacity:deleting===l.id?0.3:0.6}}>✕</button></div>
          </div>
        );})}
      </div>}
    </div>
  );
};

export const EditorialPage:React.FC=()=>{
  const [tab,setTab]=useState<"health"|"bible"|"profiles"|"links">("health");
  const TABS=[{id:"health" as const,icon:"💚",label:"Content Health"},{id:"bible" as const,icon:"📖",label:"Editorial Bible"},{id:"profiles" as const,icon:"✍️",label:"Writing Profiles"},{id:"links" as const,icon:"🔗",label:"Internal Links"}];
  return(
    <div style={{padding:24,maxWidth:1100,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"var(--muted)",marginBottom:6}}>Techcial CDM · NexaBuilder</div>
            <h1 style={{fontSize:26,fontWeight:900,color:"var(--text)",margin:"0 0 6px"}}>Editorial Intelligence Hub</h1>
            <p style={{fontSize:13,color:"var(--muted)",margin:0,lineHeight:1.6}}>Rubric, writing standards, link dictionary, and content health — the foundation every NexaBuilder article is built on.</p>
          </div>
          <span style={{fontSize:11,fontWeight:700,padding:"5px 14px",borderRadius:20,background:"#dcfce7",color:"#166534",alignSelf:"flex-start",marginTop:6}}>CDM Live · api.techcial.com</span>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"2px solid var(--border)",marginBottom:24}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"11px 20px",border:"none",background:"transparent",fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:7,borderBottom:tab===t.id?"2px solid var(--navy)":"2px solid transparent",marginBottom:"-2px",color:tab===t.id?"var(--navy)":"var(--muted)",fontWeight:tab===t.id?800:600,fontSize:13}}><span>{t.icon}</span><span>{t.label}</span></button>)}
      </div>
      {tab==="health"&&<ContentHealthTab/>}
      {tab==="bible"&&<EditorialBibleTab/>}
      {tab==="profiles"&&<WritingProfilesTab/>}
      {tab==="links"&&<InternalLinksTab/>}
    </div>
  );
};
export default EditorialPage;
