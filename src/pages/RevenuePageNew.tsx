import React, { useEffect, useState, useCallback } from "react";
import { http } from "../lib/http";

type KPIs = {
  total_revenue: number; total_leads: number; avg_bid: number;
  leads_sold: number; conversion_rate: number; top_network: string;
};
type NetworkRow = { network_slug: string; leads: number; revenue: number; avg_bid: number; };
type VerticalRow = { vertical: string; leads: number; revenue: number; avg_bid: number; };
type DayRow = { day: string; leads: number; revenue: number; };

const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
const fmtN = (n: number) => n.toLocaleString();
const COLOR: Record<string,string> = {
  quinstreet:"#378ADD", modernize:"#1D9E75", homeadvisor:"#BA7517",
  internal:"#534AB7", fitzhauer:"#D85A30", tiptop:"#E24B4A",
};
const getColor = (slug: string) => COLOR[slug?.toLowerCase()] || "#888780";

export const RevenuePage: React.FC = () => {
  const [range, setRange]         = useState<"7"|"30"|"90"|"all">("30");
  const [kpis, setKpis]           = useState<KPIs|null>(null);
  const [networks, setNetworks]   = useState<NetworkRow[]>([]);
  const [verticals, setVerticals] = useState<VerticalRow[]>([]);
  const [daily, setDaily]         = useState<DayRow[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback((r: string) => {
    setLoading(true);
    Promise.all([
      http.get(`/revenue/kpis?range=${r}`),
      http.get(`/revenue/by-network?range=${r}`),
      http.get(`/revenue/by-vertical?range=${r}`),
      http.get(`/revenue/daily?range=${r}`),
    ]).then(([k, n, v, d]: any[]) => {
      setKpis(k.data);
      setNetworks(n.data || []);
      setVerticals(v.data || []);
      setDaily(d.data || []);
    }).catch(() => {
      // No revenue data yet — show empty state
      setKpis({ total_revenue:0, total_leads:0, avg_bid:0, leads_sold:0, conversion_rate:0, top_network:"—" });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(range); }, [range]);

  const maxRev = Math.max(...daily.map(d => d.revenue), 1);

  return (
    <div>
      {/* Range selector */}
      <div style={{ display:"flex", gap:8, marginBottom:24, alignItems:"center" }}>
        <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>Show last</span>
        {(["7","30","90","all"] as const).map(r => (
          <button key={r}
            onClick={() => { setRange(r); load(r); }}
            style={{
              padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:500,
              fontFamily:"inherit", cursor:"pointer",
              background: range===r ? "var(--color-text-primary)" : "var(--color-background-primary)",
              color: range===r ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}>
            {r==="all" ? "All time" : `${r} days`}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:24 }}>
        {[
          { label:"Total revenue",     value: kpis ? fmt(kpis.total_revenue) : "—",          color:"#1D9E75" },
          { label:"Leads sold",        value: kpis ? fmtN(kpis.leads_sold) : "—",            color:"#378ADD" },
          { label:"Total leads",       value: kpis ? fmtN(kpis.total_leads) : "—",           color:"var(--color-text-secondary)" },
          { label:"Avg bid",           value: kpis ? fmt(kpis.avg_bid) : "—",                color:"#BA7517" },
          { label:"Conversion rate",   value: kpis ? `${kpis.conversion_rate.toFixed(1)}%` : "—", color:"#534AB7" },
          { label:"Top network",       value: kpis?.top_network || "—",                      color:"var(--color-text-primary)" },
        ].map((k,i) => (
          <div key={i} style={{ background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:500, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sparkline chart */}
      {daily.length > 0 && (
        <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"20px 24px", marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:16 }}>Daily revenue</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:80 }}>
            {daily.map((d,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div title={`${d.day}: ${fmt(d.revenue)}`}
                  style={{
                    width:"100%", minWidth:4,
                    height: `${Math.max(4, (d.revenue / maxRev) * 72)}px`,
                    background: d.revenue > 0 ? "#1D9E75" : "var(--color-border-tertiary)",
                    borderRadius:"2px 2px 0 0",
                  }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:10, color:"var(--color-text-tertiary)" }}>
            <span>{daily[0]?.day}</span>
            <span>{daily[daily.length-1]?.day}</span>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* By network */}
        <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"20px 24px" }}>
          <div style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:16 }}>By network</div>
          {loading ? <div style={{ color:"var(--color-text-secondary)", fontSize:13 }}>Loading...</div> :
            networks.length === 0 ? (
              <div style={{ color:"var(--color-text-secondary)", fontSize:13, textAlign:"center", padding:"20px 0" }}>
                No revenue events yet.<br/>
                <span style={{ fontSize:11, marginTop:4, display:"block" }}>Activate QuinStreet/Modernize keys to start earning.</span>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {networks.map((n,i) => {
                  const maxN = Math.max(...networks.map(x=>x.revenue), 1);
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:getColor(n.network_slug), flexShrink:0 }}/>
                          <span style={{ fontWeight:500, color:"var(--color-text-primary)", textTransform:"capitalize" }}>{n.network_slug || "Internal"}</span>
                        </div>
                        <div style={{ display:"flex", gap:12, color:"var(--color-text-secondary)" }}>
                          <span>{fmtN(n.leads)} leads</span>
                          <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{fmt(n.revenue)}</span>
                        </div>
                      </div>
                      <div style={{ height:4, background:"var(--color-border-tertiary)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(n.revenue/maxN)*100}%`, background:getColor(n.network_slug), borderRadius:2 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* By vertical */}
        <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"20px 24px" }}>
          <div style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:16 }}>By vertical</div>
          {loading ? <div style={{ color:"var(--color-text-secondary)", fontSize:13 }}>Loading...</div> :
            verticals.length === 0 ? (
              <div style={{ color:"var(--color-text-secondary)", fontSize:13, textAlign:"center", padding:"20px 0" }}>
                No vertical data yet.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {verticals.map((v,i) => {
                  const maxV = Math.max(...verticals.map(x=>x.revenue), 1);
                  const VCOLS: Record<string,string> = { pool:"#378ADD", roofing:"#D85A30", remodel:"#534AB7", electrical:"#BA7517", plumbing:"#1D9E75", landscaping:"#3B6D11" };
                  const vc = VCOLS[v.vertical?.toLowerCase()] || "#888780";
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:vc, flexShrink:0 }}/>
                          <span style={{ fontWeight:500, color:"var(--color-text-primary)", textTransform:"capitalize" }}>{v.vertical || "General"}</span>
                        </div>
                        <div style={{ display:"flex", gap:12, color:"var(--color-text-secondary)" }}>
                          <span>{fmtN(v.leads)} leads</span>
                          <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{fmt(v.revenue)}</span>
                        </div>
                      </div>
                      <div style={{ height:4, background:"var(--color-border-tertiary)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(v.revenue/maxV)*100}%`, background:vc, borderRadius:2 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Recent events table */}
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"20px 24px", marginTop:16 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:16 }}>Recent revenue events</div>
        <RecentEvents range={range} />
      </div>
    </div>
  );
};

const RecentEvents: React.FC<{range: string}> = ({ range }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get(`/revenue/events?range=${range}&limit=20`)
      .then((r: any) => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) return <div style={{ color:"var(--color-text-secondary)", fontSize:13 }}>Loading...</div>;
  if (events.length === 0) return (
    <div style={{ color:"var(--color-text-secondary)", fontSize:13, textAlign:"center", padding:"20px 0" }}>
      No revenue events yet. Once QuinStreet/Modernize keys are active and leads start routing, events appear here.
    </div>
  );

  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
      <thead>
        <tr style={{ color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", fontSize:10 }}>
          <th style={{ textAlign:"left", padding:"0 8px 8px 0", fontWeight:500 }}>Date</th>
          <th style={{ textAlign:"left", padding:"0 8px 8px 0", fontWeight:500 }}>Network</th>
          <th style={{ textAlign:"left", padding:"0 8px 8px 0", fontWeight:500 }}>Vertical</th>
          <th style={{ textAlign:"left", padding:"0 8px 8px 0", fontWeight:500 }}>Score</th>
          <th style={{ textAlign:"right", padding:"0 0 8px 0", fontWeight:500 }}>Revenue</th>
        </tr>
      </thead>
      <tbody>
        {events.map((e,i) => (
          <tr key={i} style={{ borderTop:"0.5px solid var(--color-border-tertiary)" }}>
            <td style={{ padding:"8px 8px 8px 0", color:"var(--color-text-secondary)" }}>
              {new Date(e.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
            </td>
            <td style={{ padding:"8px 8px 8px 0" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:getColor(e.network_slug), flexShrink:0, display:"inline-block" }}/>
                <span style={{ textTransform:"capitalize", color:"var(--color-text-primary)" }}>{e.network_slug || "Internal"}</span>
              </span>
            </td>
            <td style={{ padding:"8px 8px 8px 0", color:"var(--color-text-secondary)", textTransform:"capitalize" }}>{e.vertical || "—"}</td>
            <td style={{ padding:"8px 8px 8px 0", color:"var(--color-text-secondary)" }}>{e.lead_score || "—"}</td>
            <td style={{ padding:"8px 0 8px 0", textAlign:"right", fontWeight:500, color:"#1D9E75" }}>${(e.revenue_usd||0).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
