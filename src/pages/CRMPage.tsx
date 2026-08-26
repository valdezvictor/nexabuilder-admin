import React,{useState,useEffect,useCallback} from "react";
import {http} from "../lib/http";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Lead{id:number;first_name:string;last_name:string;email:string;phone:string;
  vertical:string;lead_status:string;ai_score:number;source_domain:string;city:string;
  state:string;estimated_cost_low:number;estimated_cost_high:number;project_type:string;
  contractor_company:string;created_at:string;job_completed_at:string;job_amount:number;
  needs_financing:boolean;financing_status:string;lender_ref:string;}
interface Milestone{id:number;lead_id:number;milestone_number:number;title:string;
  description:string;phase_amount:number;nexabuilder_fee:number;status:string;
  dispute_reason:string;contractor_notes:string;homeowner_notes:string;
  first_name:string;last_name:string;vertical:string;city:string;
  contractor_company:string;created_at:string;updated_at:string;}
interface Review{id:number;homeowner_name:string;contractor_name:string;contractor_company:string;
  vertical:string;survey_rating:number;survey_comment:string;job_amount:number;
  status:string;created_at:string;}

const ADM={headers:{"X-Admin-Key":"GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU"}};
const card:React.CSSProperties={background:"var(--card)",border:"1.5px solid var(--border)",
  borderRadius:"var(--radius)",boxShadow:"var(--shadow)"};
const inp:React.CSSProperties={width:"100%",padding:"8px 11px",border:"1.5px solid var(--border)",
  borderRadius:8,fontSize:13,fontFamily:"inherit",background:"var(--bg)",color:"var(--text)",outline:"none",boxSizing:"border-box"};
const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:800,textTransform:"uppercase",
  letterSpacing:".07em",color:"var(--muted)",marginBottom:5};

const STATUS_COLORS:Record<string,{bg:string;color:string}>={
  submitted:{bg:"#f1f5f9",color:"#475569"},
  matched:  {bg:"#dbeafe",color:"#1d4ed8"},
  review:   {bg:"#fef9c3",color:"#854d0e"},
  contacted:{bg:"#f3e8ff",color:"#6d28d9"},
  bid_sent: {bg:"#ffedd5",color:"#c2410c"},
  accepted: {bg:"#cffafe",color:"#0e7490"},
  in_progress:{bg:"#d1fae5",color:"#065f46"},
  completed:{bg:"#dcfce7",color:"#166534"},
  cancelled:{bg:"#fee2e2",color:"#991b1b"},
  disputed: {bg:"#fee2e2",color:"#991b1b"},
  pending:  {bg:"#f1f5f9",color:"#475569"},
  frozen:   {bg:"#fee2e2",color:"#991b1b"},
  released: {bg:"#dcfce7",color:"#166534"},
};

function StatusPill({status}:{status:string}){
  const sc=STATUS_COLORS[status]||{bg:"#f1f5f9",color:"#475569"};
  return<span style={{padding:"2px 9px",borderRadius:10,fontSize:11,fontWeight:700,
    textTransform:"uppercase",letterSpacing:".04em",background:sc.bg,color:sc.color}}>
    {status.replace(/_/g," ")}
  </span>;
}

function stars(n:number){return"⭐".repeat(n)+"☆".repeat(5-n);}

// ── Lead Pipeline Tab ──────────────────────────────────────────────────────────
function PipelineTab(){
  const [pipeline,setPipeline]=useState<Record<string,Lead[]>>({});
  const [total,setTotal]=useState(0);
  const [statusOrder,setStatusOrder]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState<Lead|null>(null);
  const [statusFilter,setStatusFilter]=useState("all");
  const [updatingId,setUpdatingId]=useState<number|null>(null);
  const [listPage,setListPage]=useState(1);
  const [listSearch,setListSearch]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await http.get("/crm/leads/pipeline",ADM);
      const pData=r.data.pipeline||{};
      setPipeline(pData);
      setTotal(r.data.total||0);
      setStatusOrder(r.data.status_order||[]);
      // Re-hydrate selected lead with fresh data after any update
      if(selected){
        const allFresh:Lead[]=([] as Lead[]).concat(...(Object.values(pData) as Lead[][]));
        const fresh=allFresh.find((l:Lead)=>l.id===selected.id);
        if(fresh) setSelected(fresh);
      }
    }catch{}
    setLoading(false);
  },[selected]);

  useEffect(()=>{load();},[load]);

  const updateStatus=async(leadId:number,status:string)=>{
    setUpdatingId(leadId);
    try{
      await http.patch(`/crm/leads/${leadId}/status`,{status},ADM);
      await load();
      if(selected?.id===leadId)setSelected(s=>s?{...s,lead_status:status}:null);
    }catch(e:any){alert("Update failed: "+(e?.response?.data?.detail||e.message));}
    setUpdatingId(null);
  };

  const toggleFinancing=async(leadId:number,val:boolean)=>{
    try{
      await http.patch(`/crm/leads/${leadId}/financing`,
        {needs_financing:val,financing_status:val?"requested":"none",lender_ref:val?"raul-cruz":null},
        ADM);
      if(selected?.id===leadId)setSelected(s=>s?{...s,needs_financing:val}:null);
      await load();
    }catch(e:any){alert("Financing toggle failed: "+(e?.response?.data?.detail||e.message));}
  };

  const allLeads:Lead[]=statusOrder.reduce((acc:Lead[],s)=>acc.concat((pipeline[s]||[]) as Lead[]),[]);
  const financingLeads=allLeads.filter(l=>l.needs_financing);
  const searchedLeads=(statusFilter==="all"?allLeads:statusFilter==="FINANCING"?financingLeads:(pipeline[statusFilter]||[]))
    .filter(l=>!listSearch||`${l.first_name||""} ${l.last_name||""} ${l.email||""} ${l.vertical||""} ${l.city||""}`.toLowerCase().includes(listSearch.toLowerCase()));
  const LIST_PER_PAGE=25;
  const listPages=Math.max(1,Math.ceil(searchedLeads.length/LIST_PER_PAGE));
  const filtered=searchedLeads.slice((listPage-1)*LIST_PER_PAGE,listPage*LIST_PER_PAGE);

  const statuses=statusOrder.filter(s=>(pipeline[s]||[]).length>0);

  return(
    <div style={{display:"flex",gap:0,height:"calc(100vh - 200px)"}}>
      {/* Left list */}
      <div style={{width:selected?380:undefined,flexGrow:selected?0:1,flexShrink:0,flexBasis:selected?380:undefined,
        borderRight:selected?"1.5px solid var(--border)":"none",
        display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Search */}
        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <input value={listSearch} onChange={e=>{setListSearch(e.target.value);setListPage(1);}}
            placeholder="Search leads…" style={{width:"100%",padding:"7px 10px",
            border:"1.5px solid var(--border)",borderRadius:8,fontSize:12,
            fontFamily:"inherit",color:"var(--text)",background:"var(--bg)",outline:"none",boxSizing:"border-box" as const}}/>
        </div>
        {/* Filter pills */}
        <div style={{padding:"8px 14px",borderBottom:"1.5px solid var(--border)",
          display:"flex",gap:6,flexWrap:"wrap",flexShrink:0,alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:"var(--muted)",marginRight:4}}>
            {searchedLeads.length} lead{searchedLeads.length!==1?"s":""}
          </span>
          <button onClick={()=>{setStatusFilter("all");setListPage(1);}}
            style={{padding:"3px 10px",borderRadius:12,border:"1.5px solid var(--border)",
              background:statusFilter==="all"?"var(--navy)":"var(--card)",
              color:statusFilter==="all"?"#fff":"var(--muted)",
              fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            All
          </button>
          {statuses.map(s=>{
            const sc=STATUS_COLORS[s]||{bg:"var(--card)",color:"var(--muted)"};
            return<button key={s} onClick={()=>{setStatusFilter(s);setListPage(1);}}
              style={{padding:"3px 10px",borderRadius:12,border:"1.5px solid var(--border)",
                background:statusFilter===s?sc.bg:"var(--card)",
                color:statusFilter===s?sc.color:"var(--muted)",
                fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {s.replace(/_/g," ")} ({(pipeline[s]||[]).length})
            </button>;
          })}
        </div>
        {/* Lead rows */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?<div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading…</div>
          :filtered.length===0?<div style={{padding:40,textAlign:"center",color:"var(--muted)",fontSize:13}}>No leads.</div>
          :filtered.map(lead=>(
            <div key={lead.id} onClick={()=>setSelected(selected?.id===lead.id?null:lead)}
              style={{padding:"12px 14px",cursor:"pointer",
                borderBottom:"1px solid var(--border)",
                borderLeft:selected?.id===lead.id?"3px solid var(--navy)":"3px solid transparent",
                background:selected?.id===lead.id?"var(--bg)":"var(--card)",transition:"background .1s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:5}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>
                  {lead.first_name} {lead.last_name}
                </div>
                <StatusPill status={lead.lead_status}/>
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:3}}>
                {lead.vertical||"General"} · {lead.city||"—"}, {lead.state||"CA"}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:"var(--muted)"}}>
                {lead.ai_score?<span style={{color:"var(--gold)",fontWeight:700}}>AI {Math.round(lead.ai_score)}</span>:null}
                {lead.estimated_cost_low?<span>${(lead.estimated_cost_low/1000).toFixed(0)}k–${(lead.estimated_cost_high/1000).toFixed(0)}k</span>:null}
                <span>{lead.source_domain||"direct"}</span>
              </div>
            </div>
          ))}
          {/* Pagination */}
          {listPages>1&&(
            <div style={{padding:"10px 14px",borderTop:"1px solid var(--border)",
              display:"flex",gap:6,justifyContent:"center",flexShrink:0}}>
              <button onClick={()=>setListPage(p=>Math.max(1,p-1))} disabled={listPage===1}
                style={{padding:"4px 10px",borderRadius:6,border:"1.5px solid var(--border)",
                background:"var(--card)",fontSize:11,fontWeight:700,cursor:listPage===1?"not-allowed":"pointer",
                color:"var(--muted)",fontFamily:"inherit",opacity:listPage===1?0.4:1}}>‹</button>
              <span style={{fontSize:11,color:"var(--muted)",padding:"4px 6px",fontWeight:600}}>
                {listPage}/{listPages}
              </span>
              <button onClick={()=>setListPage(p=>Math.min(listPages,p+1))} disabled={listPage===listPages}
                style={{padding:"4px 10px",borderRadius:6,border:"1.5px solid var(--border)",
                background:"var(--card)",fontSize:11,fontWeight:700,cursor:listPage===listPages?"not-allowed":"pointer",
                color:"var(--muted)",fontFamily:"inherit",opacity:listPage===listPages?0.4:1}}>›</button>
            </div>
          )}
          {financingLeads.length>0&&(
            <button onClick={()=>setStatusFilter(statusFilter==="FINANCING"?"all":"FINANCING")}
              style={{padding:"4px 10px",borderRadius:12,border:"1.5px solid",fontSize:11,fontWeight:700,
                cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",
                borderColor:statusFilter==="FINANCING"?"#16a34a":"#e5e7eb",
                background:statusFilter==="FINANCING"?"#16a34a":"#fff",
                color:statusFilter==="FINANCING"?"#fff":"#374151"}}>
              💰 Financing ({financingLeads.length})
            </button>
          )}
        </div>
      </div>

      {/* Right detail panel */}
      {selected&&(
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:4}}>
                {selected.first_name} {selected.last_name}
              </div>
              <div style={{fontSize:12,color:"var(--muted)"}}>Lead #{selected.id} · {new Date(selected.created_at).toLocaleDateString()}</div>
            </div>
            <button onClick={()=>setSelected(null)}
              style={{border:"none",background:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,padding:4}}>✕</button>
          </div>

          {/* Status update */}
          <div style={{...card,padding:"14px 16px",marginBottom:14}}>
            <div style={lbl}>Update Status</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["matched","review","contacted","bid_sent","accepted","in_progress","completed","cancelled"].map(s=>{
                const sc=STATUS_COLORS[s]||{bg:"var(--card)",color:"var(--muted)"};
                const isActive=selected.lead_status===s;
                return<button key={s} disabled={updatingId===selected.id}
                  onClick={()=>updateStatus(selected.id,s)}
                  style={{padding:"5px 12px",borderRadius:8,border:"1.5px solid var(--border)",
                    background:isActive?sc.bg:"var(--card)",color:isActive?sc.color:"var(--muted)",
                    fontWeight:isActive?800:600,fontSize:12,cursor:"pointer",fontFamily:"inherit",
                    opacity:updatingId===selected.id?.5:1}}>
                  {s.replace(/_/g," ")}
                </button>;
              })}
            </div>
          </div>

          {/* Contact info */}
          <div style={{...card,padding:"14px 16px",marginBottom:14}}>
            <div style={lbl}>Contact</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
              {[["Email",selected.email],["Phone",selected.phone],
                ["City",`${selected.city||"—"}, ${selected.state||"CA"}`],
                ["Vertical",selected.vertical||"General"],
                ["Source",selected.source_domain||"direct"],
                ["Contractor",selected.contractor_company||"—"]].map(([k,v])=>(
                <div key={k}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"var(--muted)",marginBottom:2}}>{k}</div>
                <div style={{color:"var(--text)"}}>{v||"—"}</div></div>
              ))}
            </div>
          </div>

          {/* Project + financials */}
          <div style={{...card,padding:"14px 16px",marginBottom:14}}>
            <div style={lbl}>Project</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
              {[["Type",selected.project_type||"—"],
                ["Est. Cost",selected.estimated_cost_low?`$${(selected.estimated_cost_low/1000).toFixed(0)}k–$${(selected.estimated_cost_high/1000).toFixed(0)}k`:"—"],
                ["AI Score",selected.ai_score?Math.round(selected.ai_score).toString():"—"],

                ["Job Amount",selected.job_amount?`$${selected.job_amount.toLocaleString()}`:"—"],
                ["Completed",selected.job_completed_at?new Date(selected.job_completed_at).toLocaleDateString():"—"]].map(([k,v])=>(
                <div key={k}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"var(--muted)",marginBottom:2}}>{k}</div>
                <div style={{color:"var(--text)"}}>{v}</div></div>
              ))}

              <div style={{marginTop:16,padding:"12px 16px",background:"var(--surface)",borderRadius:8,border:"1px solid var(--border)"}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>Financing</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <input type="checkbox" checked={selected.needs_financing||false}
                      onChange={e=>toggleFinancing(selected.id,e.target.checked)}
                      style={{width:16,height:16,cursor:"pointer"}}/>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Needs Financing</span>
                  </label>
                  {selected.needs_financing&&(
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"rgba(22,163,74,.12)",color:"#16a34a",fontWeight:700}}>
                      Routed → Raul Cruz</span>
                  )}
                </div>
                {selected.needs_financing&&(
                  <div style={{marginTop:8,fontSize:12,color:"var(--muted)"}}>
                    Finance 911 / RC Lending · $5K–$500K · Soft pull · SoCal focus
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Milestones Tab ─────────────────────────────────────────────────────────────
function MilestonesTab(){
  const [milestones,setMilestones]=useState<Milestone[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");
  const [selected,setSelected]=useState<Milestone|null>(null);
  const [disputeReason,setDisputeReason]=useState("");
  const [resolveNotes,setResolveNotes]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [msg,setMsg]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const params=filter==="disputed"?"?disputed_only=true":filter!=="all"?`?status=${filter}`:"";
      const r=await http.get(`/crm/milestones${params}`,ADM);
      setMilestones(r.data.milestones||[]);
    }catch{}
    setLoading(false);
  },[filter]);

  useEffect(()=>{load();},[load]);

  const fileDispute=async()=>{
    if(!selected||!disputeReason.trim())return;
    setSubmitting(true);
    try{
      const r=await http.post(`/crm/milestones/${selected.id}/dispute`,{reason:disputeReason},ADM);
      setMsg(`✅ ${r.data.message}`);
      setDisputeReason("");
      await load();
      setSelected(s=>s?{...s,status:"disputed",dispute_reason:disputeReason}:null);
    }catch(e:any){setMsg("❌ "+(e?.response?.data?.detail||e.message));}
    setSubmitting(false);
  };

  const resolveDispute=async(resolution:"approved"|"rejected")=>{
    if(!selected)return;
    setSubmitting(true);
    try{
      await http.patch(`/crm/milestones/${selected.id}/resolve`,{resolution,notes:resolveNotes},ADM);
      setMsg(`✅ Dispute resolved: ${resolution}`);
      setResolveNotes("");
      await load();
    }catch(e:any){setMsg("❌ "+(e?.response?.data?.detail||e.message));}
    setSubmitting(false);
  };

  const disputed=milestones.filter(m=>m.status==="disputed"||m.dispute_reason);

  return(
    <div style={{display:"flex",gap:0,height:"calc(100vh - 200px)"}}>
      <div style={{width:selected?380:undefined,flexGrow:selected?0:1,flexShrink:0,flexBasis:selected?380:undefined,
        borderRight:selected?"1.5px solid var(--border)":"none",
        display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Filter */}
        <div style={{padding:"10px 14px",borderBottom:"1.5px solid var(--border)",flexShrink:0,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {disputed.length>0&&<span style={{padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:800,background:"#fee2e2",color:"#991b1b"}}>
            {disputed.length} DISPUTED
          </span>}
          {["all","disputed","pending","completed","cancelled"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:"3px 10px",borderRadius:12,border:"1.5px solid var(--border)",
                background:filter===f?"var(--navy)":"var(--card)",
                color:filter===f?"#fff":"var(--muted)",
                fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?<div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading…</div>
          :milestones.length===0?<div style={{padding:40,textAlign:"center",color:"var(--muted)",fontSize:13}}>No milestones.</div>
          :milestones.map(m=>(
            <div key={m.id} onClick={()=>setSelected(selected?.id===m.id?null:m)}
              style={{padding:"12px 14px",cursor:"pointer",borderBottom:"1px solid var(--border)",
                borderLeft:selected?.id===m.id?"3px solid var(--navy)":m.status==="disputed"?"3px solid #dc2626":"3px solid transparent",
                background:selected?.id===m.id?"var(--bg)":"var(--card)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{m.title}</div>
                <StatusPill status={m.status}/>
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:3}}>
                {m.first_name} {m.last_name} · {m.vertical||"General"} · {m.city||"—"}
              </div>
              <div style={{fontSize:12,fontWeight:700,color:m.status==="disputed"?"#dc2626":"var(--navy)"}}>
                ${(m.phase_amount||0).toLocaleString()}
                {m.dispute_reason&&<span style={{marginLeft:8,color:"#dc2626",fontWeight:400}}>⚠ Disputed</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      {selected&&(
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:4}}>
                Milestone {selected.milestone_number}: {selected.title}
              </div>
              <div style={{fontSize:12,color:"var(--muted)"}}>
                Lead #{selected.lead_id} · {selected.first_name} {selected.last_name} · {selected.contractor_company||"—"}
              </div>
            </div>
            <button onClick={()=>{setSelected(null);setMsg("");}}
              style={{border:"none",background:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,padding:4}}>✕</button>
          </div>

          {msg&&<div style={{padding:"10px 14px",borderRadius:8,marginBottom:12,
            background:msg.startsWith("✅")?"#dcfce7":"#fee2e2",
            color:msg.startsWith("✅")?"#166534":"#991b1b",fontSize:13,fontWeight:600}}>{msg}</div>}

          {/* Details */}
          <div style={{...card,padding:"14px 16px",marginBottom:14}}>
            <div style={lbl}>Milestone Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
              {[["Status",<StatusPill key="s" status={selected.status}/>],
                ["Amount",`$${(selected.phase_amount||0).toLocaleString()}`],
                ["NB Fee",selected.nexabuilder_fee?`$${selected.nexabuilder_fee.toLocaleString()}`:"—"],
                ["Vertical",selected.vertical||"—"],
                ["Contractor",selected.contractor_company||"—"],
                ["Created",selected.created_at?new Date(selected.created_at).toLocaleDateString():"—"]].map(([k,v])=>(
                <div key={String(k)}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"var(--muted)",marginBottom:2}}>{k}</div>
                <div>{v}</div></div>
              ))}
            </div>
            {selected.description&&<div style={{marginTop:10,fontSize:13,color:"var(--text)",lineHeight:1.6}}>{selected.description}</div>}
          </div>

          {/* Dispute reason */}
          {selected.dispute_reason&&(
            <div style={{...card,padding:"14px 16px",marginBottom:14,borderColor:"#dc2626"}}>
              <div style={{...lbl,color:"#dc2626"}}>Dispute Reason</div>
              <div style={{fontSize:13,color:"var(--text)",lineHeight:1.6}}>{selected.dispute_reason}</div>
              {/* Resolve buttons */}
              <div style={{marginTop:12}}>
                <label style={lbl}>Resolution Notes</label>
                <textarea value={resolveNotes} onChange={e=>setResolveNotes(e.target.value)} rows={3}
                  style={{...inp,resize:"vertical",marginBottom:8}} placeholder="Notes for the record…"/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>resolveDispute("approved")} disabled={submitting}
                    style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#16a34a",color:"#fff",
                      fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:submitting?.5:1}}>
                    ✓ Approve &amp; Release Escrow
                  </button>
                  <button onClick={()=>resolveDispute("rejected")} disabled={submitting}
                    style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",
                      fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:submitting?.5:1}}>
                    ✗ Reject &amp; Forfeit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* File new dispute */}
          {selected.status!=="disputed"&&(
            <div style={{...card,padding:"14px 16px",marginBottom:14}}>
              <div style={lbl}>File Milestone Dispute</div>
              <textarea value={disputeReason} onChange={e=>setDisputeReason(e.target.value)} rows={3}
                style={{...inp,resize:"vertical",marginBottom:8}}
                placeholder="Describe the defect or issue (per MIDRP Section 2 — 48hr notice requirement)…"/>
              <button onClick={fileDispute} disabled={submitting||!disputeReason.trim()}
                style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",
                  fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                  opacity:submitting||!disputeReason.trim()?.5:1}}>
                {submitting?"Filing…":"File Dispute + Freeze Escrow"}
              </button>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>
                Per MIDRP: escrow frozen immediately. Meet &amp; Confer required within 3 business days.
              </div>
            </div>
          )}

          {/* Notes */}
          {(selected.contractor_notes||selected.homeowner_notes)&&(
            <div style={{...card,padding:"14px 16px"}}>
              <div style={lbl}>Notes</div>
              {selected.contractor_notes&&<div style={{fontSize:13,marginBottom:8}}><strong>Contractor:</strong> {selected.contractor_notes}</div>}
              {selected.homeowner_notes&&<div style={{fontSize:13}}><strong>Homeowner:</strong> {selected.homeowner_notes}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reviews Tab ────────────────────────────────────────────────────────────────
function ReviewsTab(){
  const [reviews,setReviews]=useState<Review[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    http.get("/crm/reviews",ADM)
      .then(r=>{setReviews(r.data.reviews||[]);setSummary(r.data.summary||null);})
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  if(loading)return<div style={{padding:60,textAlign:"center",color:"var(--muted)"}}>Loading…</div>;

  return(
    <div style={{maxWidth:900}}>
      {/* Summary */}
      {summary&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[["Total Reviews",summary.total_reviews],["Avg Rating",`${(summary.avg_rating||0).toFixed(1)} ⭐`],
            ["5-Star",summary.five_star],["Google Confirmed",summary.google_confirmed]].map(([l,v])=>(
            <div key={String(l)} style={{...card,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:900,color:"var(--navy)",marginBottom:4}}>{v??0}</div>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)"}}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {reviews.length===0?<div style={{...card,padding:40,textAlign:"center",color:"var(--muted)",fontSize:13}}>No reviews yet.</div>
      :reviews.map(r=>(
        <div key={r.id} style={{...card,padding:"14px 16px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:4}}>
                {r.homeowner_name||"Anonymous"} → {r.contractor_company||r.contractor_name||"—"}
              </div>
              <div style={{fontSize:13,marginBottom:6}}>{stars(r.survey_rating||0)}</div>
              {r.survey_comment&&<div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>{r.survey_comment}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <StatusPill status={r.status}/>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>
                {r.vertical||"General"}<br/>
                {r.job_amount?`$${r.job_amount.toLocaleString()}`:""}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Complete Job Tab ────────────────────────────────────────────────────────────
function CompleteJobTab(){
  const [leadId,setLeadId]=useState("");
  const [contractorId,setContractorId]=useState("");
  const [jobAmount,setJobAmount]=useState("");
  const [jobNotes,setJobNotes]=useState("");
  const [placeId,setPlaceId]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [result,setResult]=useState<any>(null);

  const submit=async()=>{
    if(!leadId||!contractorId){alert("Lead ID and Contractor ID required.");return;}
    setSubmitting(true);setResult(null);
    try{
      const r=await http.post("/crm/complete-job",{
        lead_id:parseInt(leadId),contractor_id:parseInt(contractorId),
        job_amount:jobAmount?parseFloat(jobAmount):null,
        job_notes:jobNotes||null,google_place_id:placeId||null,
      },ADM);
      setResult(r.data);
    }catch(e:any){setResult({error:e?.response?.data?.detail||e.message});}
    setSubmitting(false);
  };

  return(
    <div style={{maxWidth:600}}>
      <div style={{...card,padding:"20px 24px",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:4}}>
          Mark Job Complete + Trigger Review Request
        </div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>
          Updates lead status to "completed", creates a review_request record, and sends the homeowner a NexaBuilder survey email. If Google Place ID is provided, a second email requesting a Google Review fires after the internal survey.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[["Lead ID",leadId,setLeadId,"number","e.g. 42"],
            ["Contractor ID",contractorId,setContractorId,"number","e.g. 7"],
            ["Job Amount ($)",jobAmount,setJobAmount,"number","e.g. 15000"],
            ["Google Place ID (optional)",placeId,setPlaceId,"text","ChIJ..."],
          ].map(([label,val,setter,type,ph])=>(
            <label key={String(label)} style={{display:"flex",flexDirection:"column",gap:5}}>
              <span style={lbl}>{label as string}</span>
              <input type={type as string} value={val as string}
                onChange={e=>(setter as any)(e.target.value)}
                placeholder={ph as string} style={inp}/>
            </label>
          ))}
          <label style={{display:"flex",flexDirection:"column",gap:5}}>
            <span style={lbl}>Job Notes</span>
            <textarea value={jobNotes} onChange={e=>setJobNotes(e.target.value)} rows={3}
              style={{...inp,resize:"vertical"}} placeholder="Optional notes about the completed job…"/>
          </label>
          <button onClick={submit} disabled={submitting}
            style={{padding:"10px 24px",borderRadius:9,border:"none",background:"var(--navy)",color:"#fff",
              fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",opacity:submitting?.5:1}}>
            {submitting?"Processing…":"✓ Mark Complete + Send Review Request"}
          </button>
        </div>
      </div>
      {result&&(
        <div style={{...card,padding:"14px 16px",
          borderColor:result.error?"#dc2626":"#16a34a"}}>
          <div style={{fontSize:13,fontWeight:700,color:result.error?"#dc2626":"#166534",marginBottom:8}}>
            {result.error?"❌ Error":"✅ Success"}
          </div>
          <pre style={{fontSize:11,color:"var(--muted)",whiteSpace:"pre-wrap",margin:0}}>
            {JSON.stringify(result,null,2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main CRM Page ──────────────────────────────────────────────────────────────
const CRMPage:React.FC=()=>{
  const [tab,setTab]=useState<"pipeline"|"milestones"|"reviews"|"complete">("pipeline");

  const TABS=[
    {id:"pipeline" as const,icon:"📋",label:"Lead Pipeline"},
    {id:"milestones" as const,icon:"🏗",label:"Milestones & Disputes"},
    {id:"reviews" as const,icon:"⭐",label:"Reviews"},
    {id:"complete" as const,icon:"✓",label:"Complete Job"},
  ];

  return(
    <div style={{padding:24,maxWidth:1300,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"var(--muted)",marginBottom:6}}>NexaBuilder</div>
        <h1 style={{fontSize:26,fontWeight:900,color:"var(--text)",margin:"0 0 4px"}}>CRM</h1>
        <p style={{fontSize:13,color:"var(--muted)",margin:0}}>Lead pipeline · Milestone disputes · Contractor reviews · Escrow governance</p>
      </div>
      <div style={{display:"flex",borderBottom:"2px solid var(--border)",marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 18px",border:"none",background:"transparent",
              fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:6,
              borderBottom:tab===t.id?"2px solid var(--navy)":"2px solid transparent",
              marginBottom:"-2px",color:tab===t.id?"var(--navy)":"var(--muted)",
              fontWeight:tab===t.id?800:600,fontSize:13}}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      {tab==="pipeline"&&<PipelineTab/>}
      {tab==="milestones"&&<MilestonesTab/>}
      {tab==="reviews"&&<ReviewsTab/>}
      {tab==="complete"&&<CompleteJobTab/>}
    </div>
  );
};
export default CRMPage;
