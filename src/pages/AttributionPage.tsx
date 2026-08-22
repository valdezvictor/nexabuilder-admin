import { useState, useEffect } from "react";
import {http} from "../lib/http";

const ADM_KEY = "GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const ADM = {headers:{"X-Admin-Key":ADM_KEY}};

interface AttrRow {
  group_key:string; leads:number; qualified:number;
  avg_ai_score:number; avg_minutes:number;
  from_meta:number; from_google:number; attributed:number;
}

export default function AttributionPage() {
  const [rows, setRows]     = useState<AttrRow[]>([]);
  const [stats, setStats]   = useState<any>(null);
  const [days,  setDays]    = useState(30);
  const [group, setGroup]   = useState("source");
  const [loading,setLoading]= useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sumR, convR] = await Promise.all([
        http.get(`/attribution/summary?days=${days}&group_by=${group}`, ADM),
        http.get(`/attribution/conversions?days=${days}&limit=5`, ADM),
      ]);
      setRows(sumR.data.rows || []);
      setStats(convR.data.stats || {});
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [days, group]);

  const card:React.CSSProperties = {
    background:"var(--card)", border:"1.5px solid var(--border)",
    borderRadius:"var(--radius)", padding:"20px 24px",
  };
  const pill = (active:boolean):React.CSSProperties => ({
    padding:"5px 14px", borderRadius:20, border:"1.5px solid",
    fontSize:12, fontWeight:700, cursor:"pointer",
    fontFamily:"inherit",
    borderColor:active?"var(--blue)":"var(--border)",
    background:active?"var(--blue)":"var(--card)",
    color:active?"#fff":"var(--muted)",
  });

  const total      = stats?.total_leads  || 0;
  const attributed = stats?.attributed   || 0;
  const fromMeta   = stats?.from_meta    || 0;
  const fromGoogle = stats?.from_google  || 0;
  const attrPct    = total ? Math.round((attributed/total)*100) : 0;

  return (
    <div style={{padding:24, maxWidth:1100}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:"var(--text)",margin:0}}>Attribution</h1>
          <p style={{fontSize:13,color:"var(--muted)",margin:"4px 0 0"}}>
            First-party UTM tracking · Meta CAPI · Google Enhanced Conversions
          </p>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[7,14,30,90].map(d=>(
            <button key={d} onClick={()=>setDays(d)} style={pill(days===d)}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          ["Total Leads",    total,      "var(--text)"],
          ["Attributed",     `${attributed} (${attrPct}%)`, "var(--green)"],
          ["From Meta",      fromMeta,   "#1877F2"],
          ["From Google",    fromGoogle, "#4285F4"],
        ].map(([label,val,color])=>(
          <div key={label as string} style={card}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",
              letterSpacing:"0.06em",color:"var(--muted)",marginBottom:6}}>
              {label}
            </div>
            <div style={{fontSize:24,fontWeight:800,color:color as string}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Group by filter */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {["source","medium","campaign","vertical","day"].map(g=>(
          <button key={g} onClick={()=>setGroup(g)} style={pill(group===g)}>
            {g.charAt(0).toUpperCase()+g.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={card}>
        <div style={{overflowX:"auto"}}>
          {loading ? (
            <p style={{color:"var(--muted)",textAlign:"center",padding:40}}>Loading…</p>
          ) : rows.length === 0 ? (
            <p style={{color:"var(--muted)",textAlign:"center",padding:40}}>
              No attribution data yet. Data appears once leads submit and UTM sessions are tracked.
            </p>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{borderBottom:"2px solid var(--border)"}}>
                  {[group.charAt(0).toUpperCase()+group.slice(1),
                    "Leads","Qualified","Avg Score","Avg Min","Meta","Google","Attributed"
                  ].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"left",
                      fontSize:11,fontWeight:700,textTransform:"uppercase",
                      letterSpacing:"0.05em",color:"var(--muted)"}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                    <td style={{padding:"10px 12px",fontWeight:700,color:"var(--text)"}}>
                      {r.group_key||"(direct)"}
                    </td>
                    <td style={{padding:"10px 12px",color:"var(--text)",fontWeight:600}}>
                      {r.leads}
                    </td>
                    <td style={{padding:"10px 12px",color:"var(--green)"}}>
                      {r.qualified}
                    </td>
                    <td style={{padding:"10px 12px",
                      color:r.avg_ai_score>=6?"var(--green)":r.avg_ai_score>=4?"var(--amber)":"var(--red)"}}>
                      {r.avg_ai_score||"—"}
                    </td>
                    <td style={{padding:"10px 12px",color:"var(--muted)"}}>
                      {r.avg_minutes ? `${r.avg_minutes}m` : "—"}
                    </td>
                    <td style={{padding:"10px 12px",color:"#1877F2",fontWeight:600}}>
                      {r.from_meta||0}
                    </td>
                    <td style={{padding:"10px 12px",color:"#4285F4",fontWeight:600}}>
                      {r.from_google||0}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{height:6,borderRadius:3,background:"var(--border)",flex:1,maxWidth:60}}>
                          <div style={{height:"100%",borderRadius:3,background:"var(--green)",
                            width:`${r.leads?Math.round((r.attributed/r.leads)*100):0}%`}}/>
                        </div>
                        <span style={{fontSize:11,color:"var(--muted)"}}>
                          {r.leads?Math.round((r.attributed/r.leads)*100):0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CAPI status note */}
      <div style={{...card, marginTop:16, padding:"12px 16px",
        background:"#fefce8", border:"1px solid #fde68a"}}>
        <div style={{fontSize:12,color:"#854d0e",fontWeight:600,marginBottom:4}}>
          ⚠️ CAPI Configuration Required
        </div>
        <div style={{fontSize:12,color:"#92400e"}}>
          Set <code style={{background:"rgba(0,0,0,.06)",padding:"1px 4px",borderRadius:3}}>META_PIXEL_ID</code> and{" "}
          <code style={{background:"rgba(0,0,0,.06)",padding:"1px 4px",borderRadius:3}}>META_ACCESS_TOKEN</code> in the
          server .env file to activate Meta CAPI. Google Enhanced Conversions requires{" "}
          <code style={{background:"rgba(0,0,0,.06)",padding:"1px 4px",borderRadius:3}}>GOOGLE_ADS_CONVERSION_ID</code>.
          Contact your ad platform accounts to generate these credentials.
        </div>
      </div>
    </div>
  );
}
