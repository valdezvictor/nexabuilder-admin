import { useState, useEffect } from "react";
import {http} from "../lib/http";

const ADM_KEY = "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const ADM = {headers:{"X-Admin-Key":ADM_KEY}};

interface Variant {
  variant:string; impressions:number; conversions:number;
  conversion_rate:number; avg_value:number|null;
  p_value?:number; significant?:boolean; winner?:boolean;
}
interface ExperimentResult {
  experiment_id:string; variants:Variant[];
}

const EXPERIMENTS = ["hero_cta_v1"];

export default function CROPage() {
  const [results, setResults] = useState<Record<string,ExperimentResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(EXPERIMENTS.map(eid =>
      http.get(`/experiments/results/${eid}`, ADM)
        .then(r => ({eid, data: r.data}))
        .catch(() => ({eid, data: null}))
    )).then(all => {
      const m:Record<string,ExperimentResult> = {};
      all.forEach(({eid,data}) => { if(data) m[eid]=data; });
      setResults(m); setLoading(false);
    });
  }, []);

  const card:React.CSSProperties = {
    background:"var(--card)", border:"1.5px solid var(--border)",
    borderRadius:"var(--radius)", padding:"20px 24px",
  };

  return (
    <div style={{padding:24, maxWidth:1000}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:"var(--text)",margin:0}}>CRO Experiments</h1>
        <p style={{fontSize:13,color:"var(--muted)",margin:"4px 0 0"}}>
          A/B test results · p&lt;0.05 declares a winner · hero_cta_v1 running now
        </p>
      </div>

      {loading ? <p style={{color:"var(--muted)"}}>Loading…</p> : (
        EXPERIMENTS.map(eid => {
          const exp = results[eid];
          if (!exp) return (
            <div key={eid} style={{...card, marginBottom:16}}>
              <div style={{fontWeight:700,color:"var(--text)",marginBottom:8}}>{eid}</div>
              <p style={{color:"var(--muted)",fontSize:13}}>No data yet — impressions will appear once visitors hit the page.</p>
            </div>
          );

          const total = exp.variants.reduce((s,v)=>s+(v.impressions||0),0);
          const winner = exp.variants.find(v=>v.winner);

          return (
            <div key={eid} style={{...card, marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:"var(--text)"}}>{eid}</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
                    {total.toLocaleString()} total impressions
                  </div>
                </div>
                {winner && (
                  <div style={{padding:"6px 14px",background:"rgba(22,163,74,.1)",
                    border:"1px solid #86efac",borderRadius:20,
                    fontSize:12,fontWeight:700,color:"#166534"}}>
                    ✓ Variant {winner.variant} wins
                  </div>
                )}
                {!winner && exp.variants[0]?.p_value !== undefined && (
                  <div style={{padding:"6px 14px",background:"#fefce8",
                    border:"1px solid #fde68a",borderRadius:20,
                    fontSize:12,fontWeight:700,color:"#854d0e"}}>
                    p={exp.variants[0].p_value} — not significant yet
                  </div>
                )}
              </div>

              {/* Variant cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:16}}>
                {exp.variants.map(v => (
                  <div key={v.variant} style={{
                    padding:"14px 16px",borderRadius:10,
                    background:v.winner?"rgba(22,163,74,.06)":"var(--bg)",
                    border:v.winner?"1.5px solid #86efac":"1.5px solid var(--border)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontWeight:800,fontSize:16,color:"var(--text)"}}>Variant {v.variant}</span>
                      {v.winner && <span style={{fontSize:10,color:"#166534",fontWeight:700}}>WINNER</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--muted)",marginBottom:2}}>
                      {v.variant==="A"
                        ? '"Get My Free Estimate →"'
                        : '"Match Me With a Contractor →"'}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                      {[
                        ["Impressions", v.impressions?.toLocaleString()],
                        ["Conversions", v.conversions?.toLocaleString()],
                        ["Conv. Rate",  `${v.conversion_rate||0}%`],
                        ["Avg Value",   v.avg_value ? `$${Number(v.avg_value).toFixed(0)}` : "—"],
                      ].map(([label,val])=>(
                        <div key={label as string}>
                          <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
                          <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Visual conversion rate bar */}
              {exp.variants.length >= 2 && (
                <div style={{marginTop:8}}>
                  {exp.variants.map(v=>{
                    const pct = v.conversion_rate||0;
                    const maxPct = Math.max(...exp.variants.map(x=>x.conversion_rate||0));
                    return (
                      <div key={v.variant} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <div style={{width:20,fontSize:11,fontWeight:700,color:"var(--muted)"}}>
                          {v.variant}
                        </div>
                        <div style={{flex:1,height:8,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:4,
                            width:`${maxPct>0?(pct/maxPct)*100:0}%`,
                            background:v.winner?"var(--green)":"var(--blue)",
                            transition:"width 0.6s ease"}}/>
                        </div>
                        <div style={{width:40,fontSize:12,fontWeight:700,color:"var(--text)",textAlign:"right"}}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Info box */}
      <div style={{...card, background:"#eff6ff", border:"1px solid #bfdbfe", marginTop:8}}>
        <div style={{fontSize:12,fontWeight:700,color:"#1e40af",marginBottom:4}}>
          Active experiment: hero_cta_v1
        </div>
        <div style={{fontSize:12,color:"#1e3a8a", lineHeight:1.6}}>
          <strong>Control (A):</strong> "Get My Free Estimate →" &nbsp;·&nbsp;
          <strong>Variant (B):</strong> "Match Me With a Contractor →"<br/>
          Bucket assignment via CloudFront Function cookie (50/50 split, 30-day persistence).<br/>
          Winner declared when p-value &lt; 0.05. Minimum ~200 conversions per variant recommended.
        </div>
      </div>
    </div>
  );
}
