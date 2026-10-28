import React, { useState, useEffect, useRef } from "react";

const GMAPS_KEY = "AIzaSyAoGAbEPtAvUkKLHP-vxB43_6abYyGtvxY";

// Load Google Maps with async pattern (required since March 2025)
function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps?.places) { resolve(); return; }
    // Use the new async loading pattern
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&loading=async&callback=__gmInit`;
    s.async = true;
    s.defer = true;
    (window as any).__gmInit = () => { resolve(); };
    document.head.appendChild(s);
  });
}
import { http } from "../lib/http";

const CMS_KEY = "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const TIER_CLR: Record<string,string> = { A:"var(--green)", B:"#0891b2", C:"var(--amber)", D:"var(--red)", decline:"var(--muted)" };
const STS_LBL: Record<string,string> = {
  pre_qual_pending:"Pending", pre_qualified:"Pre-Qualified", submitted_to_lender:"Submitted",
  under_review:"Under Review", approved:"Approved ✓", offer_presented:"Offer Sent",
  accepted:"Accepted", funded:"Funded ✓", declined_by_lender:"Lender Declined",
  declined_by_borrower:"Borrower Declined", ping_tree_routed:"Ping Tree", expired:"Expired",
};
const STS_CLR: Record<string,string> = {
  pre_qualified:"var(--blue)", approved:"var(--green)", funded:"var(--green)",
  accepted:"var(--green)", offer_presented:"#0891b2",
  declined_by_lender:"var(--red)", declined_by_borrower:"var(--red)",
};
const fmt = (n: number|null|undefined, p="$") => n!=null ? `${p}${Math.round(n).toLocaleString()}` : "—";
const pct = (n: number|null|undefined) => n!=null ? `${n}%` : "—";
const sl  = { fontSize:11, fontWeight:700 as any, color:"var(--muted)", textTransform:"uppercase" as any,
              letterSpacing:".06em", display:"block" as any, marginBottom:5 };
const inp = { width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:8,
              fontSize:14, fontFamily:"inherit", background:"var(--surface)", color:"var(--text)" };

export default function FinancingPage() {
  const [tab,     setTab]     = useState<"pipeline"|"products"|"revenue">("pipeline");
  const [data,    setData]    = useState<any>(null);
  const [prods,   setProds]   = useState<any[]>([]);
  const [rev,     setRev]     = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sel,     setSel]     = useState<any>(null);
  const [days,    setDays]    = useState(30);
  const [sfil,    setSfil]    = useState("all");
  const [modal,   setModal]   = useState(false);
  const [lid,     setLid]     = useState("");
  const [form,    setForm]    = useState<Record<string,string>>({
    requested_amount:"", project_budget:"", annual_income:"",
    stated_mortgage_balance:"", stated_monthly_debts:"",
    property_address:"", years_at_address:"",
    employment_status:"employed", ownership_tenure:"own_with_mortgage",
  });
  const [res,    setRes]    = useState<any>(null);
  const [pqLoad, setPqLoad] = useState(false);

  // Initialize Google Places autocomplete on Pre-Qual address field
  useEffect(() => {
    if (!modal) return;
    loadGoogleMaps().then(() => {
      const container = document.getElementById('pq-address-container');
      if (!container || !(window as any).google?.maps?.places) return;
      // Clear previous instance
      container.innerHTML = '';
      
      const g = (window as any).google.maps.places;
      
      // Use new PlaceAutocompleteElement if available, else fall back
      if (g.PlaceAutocompleteElement) {
        const acEl = new g.PlaceAutocompleteElement({
          types: ['address'],
          componentRestrictions: { country: 'us' },
        });
        // Style to match our input
        acEl.style.cssText = 'width:100%;font-size:14px;font-family:inherit;';
        container.appendChild(acEl);
        acEl.addEventListener('gmp-placeselect', async (ev: any) => {
          const place = ev.place;
          await place.fetchFields({ fields: ['formattedAddress'] });
          if (place.formattedAddress) {
            setForm(f => ({ ...f, property_address: place.formattedAddress }));
          }
        });
      } else if (g.Autocomplete) {
        // Legacy fallback
        const fakeInput = document.createElement('input');
        fakeInput.placeholder = '123 Main St, La Habra CA 90631';
        fakeInput.style.cssText = 'width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;background:var(--surface);color:var(--text);outline:none;box-sizing:border-box;';
        container.appendChild(fakeInput);
        const ac = new g.Autocomplete(fakeInput, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place?.formatted_address) {
            setForm(f => ({ ...f, property_address: place.formatted_address }));
          }
        });
        fakeInput.addEventListener('input', (e:any) => {
          setForm(f => ({...f, property_address: e.target.value}));
        });
      }
    });
  }, [modal]);

  const load = async () => {
    setLoading(true);
    try {
      if (tab==="pipeline") {
        const r = await http.get(`/financing/pipeline?days=${days}${sfil!=="all"?`&status=${sfil}`:""}`, { headers:{"X-Admin-Key":CMS_KEY} });
        setData(r.data);
      } else if (tab==="products") {
        const r = await http.get("/financing/products", { headers:{"X-Admin-Key":CMS_KEY} });
        setProds(r.data?.products||[]);
      } else {
        const r = await http.get("/financing/revenue", { headers:{"X-Admin-Key":CMS_KEY} });
        setRev(r.data);
      }
    } catch(e){ console.warn(e); }
    setLoading(false);
  };
  useEffect(()=>{ load(); }, [tab, days, sfil]);

  const runPQ = async () => {
    setPqLoad(true); setRes(null);
    try {
      const r = await http.post("/financing/pre-qualify", {
        lead_id:parseFloat(lid), requested_amount:parseFloat(form.requested_amount)||0,
        project_budget:parseFloat(form.project_budget)||undefined,
        annual_income:parseFloat(form.annual_income)||undefined,
        stated_mortgage_balance:parseFloat(form.stated_mortgage_balance)||undefined,
        stated_monthly_debts:parseFloat(form.stated_monthly_debts)||undefined,
        property_address:form.property_address||undefined,
        years_at_address:parseInt(form.years_at_address)||undefined,
        employment_status:form.employment_status,
        ownership_tenure:form.ownership_tenure,
      }, { headers:{"X-Admin-Key":CMS_KEY} });
      setRes(r.data);
    } catch(e:any){ setRes({error:e?.response?.data?.detail||"Error"}); }
    setPqLoad(false);
  };

  const kpis = data?.kpis||{};

  return (
    <div style={{padding:24,maxWidth:1300,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:900,color:"var(--text)",marginBottom:4}}>💰 Financing Pipeline</h1>
          <div style={{fontSize:13,color:"var(--muted)"}}>Pre-qualification · Lender routing · Ping tree failover</div>
        </div>
        <button onClick={()=>{ setModal(true); setRes(null); }}
          style={{padding:"10px 20px",background:"var(--blue)",color:"#fff",border:"none",borderRadius:8,fontWeight:800,cursor:"pointer",fontSize:14}}>
          + Run Pre-Qual
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:24}}>
        {[
          {l:"Applications",  v:kpis.total??0,          c:"var(--text)"},
          {l:"Pre-Qualified",  v:kpis.pre_qualified??0,  c:"var(--blue)"},
          {l:"Funded",         v:kpis.funded??0,          c:"var(--green)"},
          {l:"Volume Funded",  v:fmt(kpis.total_funded),  c:"var(--green)"},
          {l:"Referral Fees",  v:fmt(kpis.fees_earned),   c:"var(--gold)"},
          {l:"Avg Score",      v:kpis.avg_score?`${kpis.avg_score}/100`:"—", c:"var(--text)"},
        ].map((k,i)=>(
          <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginBottom:6}}>{k.l}</div>
            <div style={{fontSize:22,fontWeight:900,color:k.c}}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,borderBottom:"1px solid var(--border)",marginBottom:16}}>
        {(["pipeline","products","revenue"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"8px 16px",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",
              background:"transparent",fontFamily:"inherit",
              borderBottom:tab===t?"2px solid var(--blue)":"2px solid transparent",
              color:tab===t?"var(--blue)":"var(--muted)"}}>
            {t==="pipeline"?"📋 Pipeline":t==="products"?"🏦 Loan Products":"📈 Revenue"}
          </button>
        ))}
      </div>

      {/* Pipeline */}
      {tab==="pipeline"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {["all","pre_qualified","submitted_to_lender","approved","funded","declined_by_lender"].map(s=>(
              <button key={s} onClick={()=>setSfil(s)}
                style={{padding:"4px 10px",fontSize:11,fontWeight:700,borderRadius:6,cursor:"pointer",
                  border:sfil===s?"1.5px solid var(--blue)":"1px solid var(--border)",
                  background:sfil===s?"rgba(29,111,222,.08)":"transparent",
                  color:sfil===s?"var(--blue)":"var(--muted)"}}>
                {s==="all"?"All":STS_LBL[s]||s}
              </button>
            ))}
            <select value={days} onChange={e=>setDays(Number(e.target.value))}
              style={{padding:"4px 8px",fontSize:11,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--muted)"}}>
              <option value={7}>7d</option><option value={30}>30d</option><option value={90}>90d</option>
            </select>
            <button onClick={load} style={{fontSize:11,padding:"4px 10px",background:"var(--surface)",
              border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",color:"var(--muted)"}}>
              {loading?"Loading...":"↻"}
            </button>
          </div>

          <div style={{display:"grid",gridTemplateColumns:sel?"1fr 420px":"1fr",gap:16}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,overflow:"auto"}}>
              {data?.applications?.length>0?(
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"rgba(0,0,0,.08)"}}>
                    {["Ref","Homeowner","Vertical","Requested","Score","Tier","Status","AVM","CLTV","Proj. Fee"].map(h=>(
                      <th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:600,color:"var(--muted)",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(data.applications||[]).map((a:any)=>(
                      <tr key={a.app_id} onClick={()=>setSel(sel?.app_id===a.app_id?null:a)}
                        style={{borderTop:"1px solid var(--border)",cursor:"pointer",
                          background:sel?.app_id===a.app_id?"rgba(29,111,222,.06)":"transparent"}}>
                        <td style={{padding:"7px 12px",fontWeight:700,color:"var(--blue)",whiteSpace:"nowrap"}}>{a.app_reference}</td>
                        <td style={{padding:"7px 12px",fontWeight:600}}>{a.homeowner}</td>
                        <td style={{padding:"7px 12px",color:"var(--muted)",fontSize:11}}>{a.vertical}</td>
                        <td style={{padding:"7px 12px",fontWeight:700}}>{fmt(a.requested_loan_amount)}</td>
                        <td style={{padding:"7px 12px",textAlign:"center"}}>
                          <span style={{fontWeight:900,fontSize:14,color:(a.pre_qual_score||0)>=80?"var(--green)":(a.pre_qual_score||0)>=65?"#0891b2":"var(--amber)"}}>
                            {a.pre_qual_score??'—'}
                          </span>
                        </td>
                        <td style={{padding:"7px 12px",textAlign:"center"}}>
                          <span style={{fontWeight:900,color:TIER_CLR[a.pre_qual_tier]||"var(--muted)"}}>{a.pre_qual_tier||"—"}</span>
                        </td>
                        <td style={{padding:"7px 12px"}}>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,
                            background:"rgba(0,0,0,.06)",color:STS_CLR[a.status]||"var(--muted)"}}>
                            {STS_LBL[a.status]||a.status}
                          </span>
                        </td>
                        <td style={{padding:"7px 12px",color:"var(--muted)"}}>{fmt(a.avm_value)}</td>
                        <td style={{padding:"7px 12px",color:"var(--muted)"}}>{pct(a.ltv_percent)}</td>
                        <td style={{padding:"7px 12px",fontWeight:700,color:"var(--green)"}}>{fmt(a.projected_fee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ):(
                <div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:13}}>
                  No applications yet.<br/><span style={{fontSize:11,opacity:.7}}>Click "+ Run Pre-Qual" to score a lead.</span>
                </div>
              )}
            </div>

            {sel&&(
              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,overflow:"auto",maxHeight:700}}>
                <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:900,fontSize:14}}>{sel.app_reference}</span>
                  <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16}}>✕</button>
                </div>
                <div style={{padding:16,fontSize:13}}>
                  {/* Score bar */}
                  {sel.pre_qual_score!=null&&(
                    <div style={{marginBottom:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontWeight:700}}>Pre-Qual Score</span>
                        <span style={{fontWeight:900,fontSize:20,color:TIER_CLR[sel.pre_qual_tier]||"var(--muted)"}}>
                          {sel.pre_qual_score}<span style={{fontSize:11,fontWeight:500}}>/100 · Tier {sel.pre_qual_tier}</span>
                        </span>
                      </div>
                      <div style={{height:10,background:"var(--border)",borderRadius:5,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:5,
                          width:`${sel.pre_qual_score}%`,
                          background:TIER_CLR[sel.pre_qual_tier]||"var(--muted)"}} />
                      </div>
                    </div>
                  )}
                  {[
                    ["Status",         STS_LBL[sel.status]||sel.status],
                    ["Homeowner",      sel.homeowner],
                    ["Vertical",       sel.vertical],
                    ["ZIP",            sel.postal_code],
                    ["Loan Requested", fmt(sel.requested_loan_amount)],
                    ["Loan Product",   sel.loan_product||"—"],
                    ["Lender",         sel.lender_name||"—"],
                    ["Project Budget", fmt(sel.project_budget)],
                    ["AVM Value",      fmt(sel.avm_value)],
                    ["Est. Equity",    fmt(sel.estimated_equity)],
                    ["LTV",            pct(sel.ltv_percent)],
                    ["Approved Amount",fmt(sel.approved_amount)],
                    ["Rate APR",       sel.approved_rate_apr?`${sel.approved_rate_apr}%`:"—"],
                    ["Monthly Payment",sel.monthly_payment_est?fmt(sel.monthly_payment_est,"")+"\/mo":"—"],
                    ["Referral Fee",   fmt(sel.projected_fee)],
                    ["Fee Status",     sel.referral_fee_status||"—"],
                    ["Submitted",      sel.submitted_at?new Date(sel.submitted_at).toLocaleDateString():"—"],
                    ["Funded",         sel.funded_at?new Date(sel.funded_at).toLocaleDateString():"—"],
                  ].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",
                      padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:12}}>
                      <span style={{color:"var(--muted)",fontWeight:600}}>{l}</span>
                      <span style={{fontWeight:700,color:"var(--text)"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products */}
      {tab==="products"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
          {prods.map((p:any)=>(
            <div key={p.id} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:800,fontSize:14,marginBottom:3}}>{p.product_name}</div>
                  <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",fontWeight:700}}>{p.product_category}</div>
                </div>
                <span style={{fontSize:10,padding:"3px 8px",borderRadius:4,fontWeight:700,
                  background:p.routing_priority<=2?"rgba(34,197,94,.1)":"rgba(0,0,0,.05)",
                  color:p.routing_priority<=2?"var(--green)":"var(--muted)"}}>P{p.routing_priority}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12,marginBottom:10}}>
                {[
                  ["Range",     `${fmt(p.min_loan_amount)}–${fmt(p.max_loan_amount)}`],
                  ["APR",       p.rate_low_apr?`${p.rate_low_apr}–${p.rate_high_apr}%`:"Market"],
                  ["Term",      p.typical_term_months?`${p.typical_term_months/12}yr`:"Varies"],
                  ["Min FICO",  p.min_fico_score||"—"],
                  ["Max CLTV",  p.max_cltv_percent?`${p.max_cltv_percent}%`:"N/A"],
                  ["Max DTI",   p.max_dti_percent?`${p.max_dti_percent}%`:"—"],
                ].map(([l,v])=>(
                  <div key={l}><div style={{color:"var(--muted)",fontSize:10,fontWeight:700}}>{l}</div>
                    <div style={{fontWeight:700}}>{v}</div></div>
                ))}
              </div>
              <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6,marginBottom:6}}>{p.description}</div>
              <div style={{fontSize:10,color:"var(--muted)"}}>Verticals: {(p.verticals||[]).join(", ")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue */}
      {tab==="revenue"&&rev&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
            {[
              {l:"Total Applications", v:rev.lifetime?.total_applications??0},
              {l:"Total Funded",        v:rev.lifetime?.total_funded??0},
              {l:"Lifetime Volume",     v:fmt(rev.lifetime?.lifetime_volume)},
              {l:"Lifetime Fees",       v:fmt(rev.lifetime?.lifetime_fees), c:"var(--green)"},
            ].map((k,i)=>(
              <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",color:"var(--muted)",marginBottom:6}}>{k.l}</div>
                <div style={{fontSize:22,fontWeight:900,color:k.c||"var(--text)"}}>{k.v}</div>
              </div>
            ))}
          </div>
          {rev.monthly?.length>0?(
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"rgba(0,0,0,.08)"}}>
                  {["Month","Funded","Volume","Fees","Avg Loan","Avg Days"].map(h=>(
                    <th key={h} style={{padding:"8px 14px",textAlign:"left",fontWeight:600,color:"var(--muted)",fontSize:11}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rev.monthly.map((r:any,i:number)=>(
                    <tr key={i} style={{borderTop:"1px solid var(--border)"}}>
                      <td style={{padding:"8px 14px",fontWeight:700}}>{new Date(r.month).toLocaleDateString("en-US",{month:"short",year:"numeric"})}</td>
                      <td style={{padding:"8px 14px"}}>{r.funded_loans}</td>
                      <td style={{padding:"8px 14px",fontWeight:700}}>{fmt(r.total_funded)}</td>
                      <td style={{padding:"8px 14px",fontWeight:700,color:"var(--green)"}}>{fmt(r.referral_fees_earned)}</td>
                      <td style={{padding:"8px 14px"}}>{fmt(r.avg_loan_size)}</td>
                      <td style={{padding:"8px 14px"}}>{r.avg_days_to_fund?`${r.avg_days_to_fund}d`:"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ):(
            <div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:13}}>
              Revenue will appear here once loans are funded.
            </div>
          )}
        </div>
      )}

      {/* Pre-Qual Modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"var(--bg)",borderRadius:14,padding:28,width:"100%",
            maxWidth:580,maxHeight:"92vh",overflow:"auto",
            border:"1px solid var(--border)",boxShadow:"0 20px 60px rgba(0,0,0,.4)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontWeight:900,fontSize:16}}>🔍 Run Pre-Qualification Engine</div>
              <button onClick={()=>{setModal(false);setRes(null);}}
                style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"var(--muted)"}}>✕</button>
            </div>

            {!res?(
              <div>
                <div style={{marginBottom:12}}>
                  <label style={sl}>Lead ID *</label>
                  <input value={lid} onChange={e=>setLid(e.target.value)} placeholder="e.g. 66" style={inp} />
                </div>
                {[
                  ["requested_amount","Loan Amount Requested ($) *","35000"],
                  ["project_budget","Project Budget ($)","40000"],
                  ["annual_income","Annual Income ($)","95000"],
                  ["stated_mortgage_balance","Mortgage Balance ($)","280000"],
                  ["stated_monthly_debts","Monthly Debts excl. mortgage ($)","850"],
                  ["years_at_address","Years at Address","4"],
                ].map(([f,l,p])=>(
                  <div key={f} style={{marginBottom:12}}>
                    <label style={sl}>{l}</label>
                    <input value={form[f]||""} onChange={e=>setForm(o=>({...o,[f]:e.target.value}))}
                      placeholder={p} style={inp} />
                  </div>
                ))}
                {/* Property Address with Google Places autocomplete */}
                <div style={{marginBottom:12}}>
                  <label style={sl}>Property Address</label>
                  <div id="pq-address-container" style={{position:"relative"}}>
                    {/* Fallback plain input shown until Google Maps loads */}
                    <input
                      value={form["property_address"]||""}
                      onChange={e=>setForm(o=>({...o,property_address:e.target.value}))}
                      placeholder="Start typing an address..."
                      style={inp}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:4}}>
                    Powered by Google — type to search verified addresses
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                  {[
                    ["employment_status","Employment",["employed","self_employed","retired","part_time","other"]],
                    ["ownership_tenure","Ownership",["own","own_with_mortgage","rent"]],
                  ].map(([f,l,opts])=>(
                    <div key={f as string}>
                      <label style={sl}>{l as string}</label>
                      <select value={form[f as string]} onChange={e=>setForm(o=>({...o,[f as string]:e.target.value}))}
                        style={{...inp,padding:"10px 12px"}}>
                        {(opts as string[]).map(o=><option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <button onClick={runPQ} disabled={pqLoad||!lid||!form.requested_amount}
                  style={{width:"100%",padding:14,background:"var(--blue)",color:"#fff",
                    border:"none",borderRadius:10,fontSize:15,fontWeight:800,cursor:"pointer",
                    fontFamily:"inherit",opacity:pqLoad?.7:1}}>
                  {pqLoad?"Running Engine...":"Run Pre-Qualification →"}
                </button>
              </div>
            ):res.error?(
              <div style={{textAlign:"center",padding:24}}>
                <div style={{fontSize:32,marginBottom:12,color:"var(--red)"}}>✗</div>
                <div style={{fontWeight:700,color:"var(--red)"}}>{res.error}</div>
                <button onClick={()=>setRes(null)} style={{marginTop:16,padding:"8px 20px",
                  background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
                  cursor:"pointer",color:"var(--text)",fontFamily:"inherit"}}>Try Again</button>
              </div>
            ):(
              <div>
                {/* Score result */}
                <div style={{textAlign:"center",marginBottom:20,padding:20,borderRadius:12,
                  background:res.pre_qual_tier==="A"?"rgba(34,197,94,.08)":res.pre_qual_tier==="B"?"rgba(8,145,178,.08)":res.pre_qual_tier==="C"?"rgba(245,158,11,.08)":"rgba(239,68,68,.08)",
                  border:`1.5px solid ${TIER_CLR[res.pre_qual_tier]||"var(--border)"}`}}>
                  <div style={{fontSize:42,fontWeight:900,color:TIER_CLR[res.pre_qual_tier]||"var(--muted)"}}>
                    {res.pre_qual_score}<span style={{fontSize:18,fontWeight:500}}>/100</span>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,color:TIER_CLR[res.pre_qual_tier]||"var(--muted)",marginTop:4}}>
                    Tier {res.pre_qual_tier} — {res.pre_qualified?"✅ Pre-Qualified":"❌ Not Qualified"}
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)",marginTop:8,lineHeight:1.6}}>
                    {res.pre_qual_reasons?.map((r:string)=>r.replace(/_/g," ")).join(" · ")}
                  </div>
                </div>

                {/* AVM + Financials grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                  {[
                    ["Est. Home Value",   fmt(res.avm?.estimated_value)],
                    ["Est. Equity",       fmt(res.avm?.estimated_equity)],
                    ["LTV / CLTV",        `${res.avm?.ltv_percent}% / ${res.avm?.cltv_percent}%`],
                    ["Max Eligible",      fmt(res.avm?.max_loan_eligible)],
                    ["Monthly Income",    fmt(res.monthly_income,"")],
                    ["DTI Estimate",      pct(res.dti_estimate)],
                    ["Est. Payment",      fmt(res.est_monthly_payment,"")+"\/mo"],
                    ["LendAPI Eligible",  res.lendapi_eligible?"✅ Yes":"Not yet"],
                  ].map(([l,v])=>(
                    <div key={l} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,marginBottom:3}}>{l}</div>
                      <div style={{fontWeight:800,color:"var(--text)",fontSize:13}}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Matched products */}
                <div style={{fontWeight:800,fontSize:13,marginBottom:10}}>
                  Matched Loan Products ({res.product_count})
                </div>
                {res.matched_products?.map((p:any,i:number)=>(
                  <div key={i} style={{padding:"10px 14px",marginBottom:8,
                    background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8}}>
                    <div style={{fontWeight:800,fontSize:13,marginBottom:3}}>✓ {p.product_name}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>
                      {fmt(p.min_loan_amount)}–{fmt(p.max_loan_amount)} &nbsp;·&nbsp;
                      {p.rate_low_apr}–{p.rate_high_apr}% APR &nbsp;·&nbsp;
                      ~{fmt(p.monthly_payment_estimate_low,"")}/mo
                    </div>
                  </div>
                ))}

                {res.pre_qualified&&(
                  <div style={{marginTop:12,padding:"10px 14px",background:"rgba(29,111,222,.06)",
                    border:"1px solid rgba(29,111,222,.2)",borderRadius:8,fontSize:12,
                    color:"var(--blue)",textAlign:"center",fontWeight:700}}>
                    Next: {res.next_step?.replace(/_/g," ")}
                  </div>
                )}

                <button onClick={()=>{setRes(null);setModal(false);load();}}
                  style={{width:"100%",marginTop:16,padding:12,background:"var(--surface)",
                    border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",
                    color:"var(--text)",fontWeight:700,fontFamily:"inherit"}}>
                  Close & Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
