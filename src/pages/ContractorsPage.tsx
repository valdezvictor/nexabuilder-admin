import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

type Contractor = {
  id: number; license_no: string; business_name: string;
  city: string; county: string; zip_code: string;
  phone: string; email: string; classifications: string;
  primary_status: string; portal_status?: string;
  portal_email?: string; bids_accepted?: number; bids_total?: number;
};

const STATUS_COLOR: Record<string,string> = {
  CLEAR: "badge-green", SUSPENDED: "badge-red",
  EXPIRED: "badge-gray", PROBATION: "badge-amber",
};

const PORTAL_BADGE: Record<string,string> = {
  active: "badge-green", registered: "badge-purple",
  email_captured: "badge-blue", sms_sent: "badge-amber",
  not_contacted: "badge-gray",
};

export const ContractorsPage: React.FC = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [search, setSearch]           = useState("");
  const [classification, setClass]    = useState("C-53");
  const [county, setCounty]           = useState("");
  const [page, setPage]               = useState(0);
  const PAGE = 25;

  const load = (pg=0, q=search, cls=classification, cty=county) => {
    setLoading(true);
    const params: Record<string,any> = { limit:PAGE, offset:pg*PAGE };
    if (q)   params.search = q;
    if (cls) params.classification = cls;
    if (cty) params.county = cty;
    // Use outreach search which returns portal_status overlay
    http.get("/outreach/contractors/search", { params })
      .then((r:any) => {
        setContractors(r.data.contractors || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => setContractors([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const CLASSES = ["C-53","C-39","C-10","C-36","C-20","C-5","C-27","C-46","B"];

  return (
    <div>
      {/* Stats bar */}
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)", marginBottom:20 }}>
        {[
          { label:"Total in DB",      value:"243k+",              color:"var(--navy)"   },
          { label:"CLEAR Status",     value:"232k+",              color:"var(--green)"  },
          { label:"Portal Accounts",  value:total.toLocaleString(), color:"var(--blue)" },
          { label:"Emails Captured",  value:"Growing",            color:"var(--purple)" },
        ].map((k,i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color:k.color, fontSize:"1.4rem" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="search-bar" style={{ marginBottom:16 }}>
        <input className="search-input" placeholder="Search name, license, city..."
          value={search} onChange={e=>setSearch(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){ setPage(0); load(0,search,classification,county); }}}/>
        <select className="search-input" style={{ flex:"0 0 140px" }}
          value={classification} onChange={e=>{ const v=(e.target as HTMLSelectElement).value; setClass(v); setPage(0); load(0,search,v,county); }}>
          <option value="">All Classifications</option>
          {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <input className="search-input" style={{ flex:"0 0 160px" }} placeholder="County (e.g. Orange)"
          value={county} onChange={e=>setCounty(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){ setPage(0); load(0,search,classification,county); }}}/>
        <button className="btn btn-primary btn-sm"
          onClick={()=>{ setPage(0); load(0,search,classification,county); }}>
          Search
        </button>
        <span style={{ marginLeft:"auto", fontSize:13, color:"var(--muted)" }}>
          {total.toLocaleString()} results
        </span>
      </div>

      <div className="card">
        <div className="card-body-0">
          {loading ? (
            <div className="loading-wrap"><div className="spinner"></div></div>
          ) : contractors.length === 0 ? (
            <div className="empty-state">No contractors found</div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>License</th><th>Business Name</th>
                <th>Location</th><th>Classifications</th>
                <th>CSLB Status</th><th>Portal Status</th>
                <th>Contact</th>
              </tr></thead>
              <tbody>
                {contractors.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontFamily:"monospace", fontSize:12 }}>#{c.license_no}</td>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.business_name}</div>
                    </td>
                    <td style={{ fontSize:12, color:"var(--muted)" }}>
                      {c.city}{c.county ? `, ${c.county}` : ""}
                    </td>
                    <td>
                      <div style={{ fontSize:11 }}>
                        {(c.classifications||"").split("|").slice(0,3).map(cls=>(
                          <span key={cls} className="tag">{cls.trim()}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLOR[c.primary_status]||"badge-gray"}`}>
                        {c.primary_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${PORTAL_BADGE[(c as any).portal_status||"not_contacted"]||"badge-gray"}`}>
                        {((c as any).portal_status||"not_contacted").replace(/_/g," ")}
                      </span>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {c.phone && <div>{c.phone}</div>}
                      {(c as any).portal_email && (
                        <div style={{ color:"var(--blue)", fontSize:11 }}>{(c as any).portal_email}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {total > PAGE && (
          <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <button className="btn btn-outline btn-sm"
              disabled={page===0} onClick={()=>{ const p=page-1; setPage(p); load(p); }}>
              ← Previous
            </button>
            <span style={{ fontSize:13, color:"var(--muted)" }}>
              {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total.toLocaleString()}
            </span>
            <button className="btn btn-outline btn-sm"
              disabled={(page+1)*PAGE>=total} onClick={()=>{ const p=page+1; setPage(p); load(p); }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
