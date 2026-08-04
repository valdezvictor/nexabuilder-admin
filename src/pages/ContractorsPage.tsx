import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { http } from "../lib/http";

type Contractor = {
  id: number;
  license_no: string;
  business_name: string;
  phone: string;
  email?: string;
  city: string;
  county?: string;
  zip_code: string;
  classifications: string;
  primary_status: string;
  portal_status: string;
  portal_email?: string;
  cslb_verified?: boolean;
};

const STATUS_COLOR: Record<string,string> = {
  CLEAR: "badge-green", SUSPENDED: "badge-red",
  EXPIRED: "badge-gray", PROBATION: "badge-amber",
  PENDING_REVIEW: "badge-amber",
};
const PORTAL_COLOR: Record<string,string> = {
  active: "badge-green", registered: "badge-purple",
  email_captured: "badge-blue", sms_sent: "badge-amber",
  not_contacted: "badge-gray",
};
const CLASSES = ["C-53","C-39","C-36","C-27","C-20","C-10","C-8","C-5","C-46","C-15","C-61","B","A"];

export const ContractorsPage: React.FC = () => {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading]         = useState(false);
  const [total, setTotal]             = useState(0);
  const [q, setQ]                     = useState(sp.get("q") || "");
  const [cls, setCls]                 = useState("");
  const [county, setCounty]           = useState("");
  const [page, setPage]               = useState(0);
  const PAGE = 25;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(qVal: string, clsVal: string, countyVal: string, pg: number) {
    setLoading(true);
    const params: Record<string,any> = { limit: PAGE, offset: pg * PAGE };
    if (qVal.trim()) {
      // Smart routing: zip code -> zip_code param, else smart q= search (name/license/phone/email/city)
      if (/^\d{5}$/.test(qVal.trim())) {
        params.zip_code = qVal.trim();
      } else {
        params.q = qVal.trim();
      }
    }
    if (clsVal)           params.classification = clsVal;
    if (countyVal.trim()) params.county         = countyVal.trim();

    http.get("/admin/contractors/search", { params })
      .then((r: any) => {
        setContractors(r.data.contractors || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => { setContractors([]); setTotal(0); })
      .finally(() => setLoading(false));
  }

  // Run on mount
  useEffect(() => {
    const init = sp.get("q") || "";
    if (init) search(init, "", "", 0);
  }, []);

  function onQ(val: string) {
    setQ(val);
    setPage(0);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(val, cls, county, 0), 350);
  }

  function onCls(val: string) {
    setCls(val);
    setPage(0);
    if (timer.current) clearTimeout(timer.current);
    search(q, val, county, 0);
  }

  function onCounty(val: string) {
    setCounty(val);
    setPage(0);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q, cls, val, 0), 500);
  }

  function goPage(pg: number) {
    setPage(pg);
    search(q, cls, county, pg);
  }

  return (
    <div>
      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)", marginBottom:20 }}>
        {[
          { label:"Total CSLB DB",   value:"243k+",               color:"var(--navy)"   },
          { label:"CLEAR Status",    value:"232k+",               color:"var(--green)"  },
          { label:"Search Results",  value: loading ? "..." : total.toLocaleString(), color:"var(--blue)"  },
          { label:"Portal Accounts", value:"Growing",             color:"var(--purple)" },
        ].map((k,i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color:k.color, fontSize:"1.4rem" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Smart search bar */}
      <div style={{ marginBottom:12, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:"1 1 300px" }}>
          <span style={{
            position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
            fontSize:15, color:"var(--muted)", pointerEvents:"none"
          }}>🔍</span>
          <input
            style={{
              width:"100%", padding:"10px 14px 10px 36px",
              border:"1.5px solid var(--border)", borderRadius:10,
              fontSize:14, fontFamily:"inherit", color:"var(--text)",
              background:"var(--surface)", outline:"none",
            }}
            placeholder="Search by name, license #, phone, email, or city..."
            value={q}
            onChange={e => onQ(e.target.value)}
          />
          {q && (
            <button
              onClick={() => onQ("")}
              style={{
                position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:16
              }}>×</button>
          )}
        </div>

        <select
          style={{
            padding:"10px 14px", border:"1.5px solid var(--border)", borderRadius:10,
            fontSize:13, fontFamily:"inherit", color:"var(--text)",
            background:"var(--surface)", flex:"0 0 165px", cursor:"pointer"
          }}
          value={cls}
          onChange={e => onCls((e.target as HTMLSelectElement).value)}
        >
          <option value="">All Classifications</option>
          {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          style={{
            padding:"10px 14px", border:"1.5px solid var(--border)", borderRadius:10,
            fontSize:13, fontFamily:"inherit", color:"var(--text)",
            background:"var(--surface)", flex:"0 0 160px"
          }}
          placeholder="County (e.g. Orange)"
          value={county}
          onChange={e => onCounty(e.target.value)}
        />

        <span style={{ fontSize:12, color:"var(--muted)", whiteSpace:"nowrap", minWidth:80 }}>
          {loading ? "Searching…" : total > 0 ? `${total.toLocaleString()} results` : ""}
        </span>
      </div>

      {/* Quick-filter chips — only when nothing typed */}
      {!q && !cls && !county && (
        <div style={{ marginBottom:12, display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            ["🏊 Pool — C-53","C-53"],
            ["🏠 Roofing — C-39","C-39"],
            ["⚡ Electrical — C-10","C-10"],
            ["🔧 Plumbing — C-36","C-36"],
            ["🌿 Landscaping — C-27","C-27"],
          ].map(([label, c]) => (
            <button key={c}
              onClick={() => onCls(c)}
              style={{
                padding:"5px 14px", borderRadius:20, border:"1px solid var(--border)",
                background:"var(--surface)", fontSize:12, cursor:"pointer",
                color:"var(--muted)", fontFamily:"inherit", transition:"all .15s"
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-body-0">
          {loading ? (
            <div className="loading-wrap"><div className="spinner"></div></div>
          ) : contractors.length === 0 ? (
            <div className="empty-state" style={{ padding:"48px 24px", textAlign:"center", color:"var(--muted)" }}>
              {q || cls || county
                ? `No contractors found. Try adjusting your search terms or filters.`
                : `Use the search bar above to find contractors by name, license #, phone, or city. Or pick a classification below.`
              }
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>License #</th>
                  <th>Business Name</th>
                  <th>Location</th>
                  <th>Classifications</th>
                  <th>CSLB Status</th>
                  <th>Portal</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map(c => (
                  <tr key={c.id}
                    onClick={() => navigate(`/contractors/${c.id}`)}
                    style={{ cursor:"pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2, #f8fafc)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--muted)" }}>
                      {c.license_no}
                    </td>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.business_name}</div>
                      {c.cslb_verified && (
                        <div style={{ fontSize:10, color:"var(--green)", marginTop:2 }}>✓ CSLB Verified</div>
                      )}
                    </td>
                    <td style={{ fontSize:12, color:"var(--muted)" }}>
                      <div>{c.city}{c.county ? `, ${c.county}` : ""}</div>
                      {c.zip_code && <div style={{ fontSize:11 }}>{c.zip_code}</div>}
                    </td>
                    <td>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {(c.classifications||"").split("·").map(s=>s.trim()).filter(Boolean).slice(0,3).map(s => (
                          <span key={s} className="tag" style={{ fontSize:11 }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLOR[c.primary_status]||"badge-gray"}`}>
                        {c.primary_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${PORTAL_COLOR[c.portal_status]||"badge-gray"}`}>
                        {(c.portal_status||"not_contacted").replace(/_/g," ")}
                      </span>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {c.phone && <div>{c.phone}</div>}
                      {c.portal_email
                        ? <div style={{ color:"var(--blue)", fontSize:11 }}>{c.portal_email}</div>
                        : c.email
                          ? <div style={{ color:"var(--muted)", fontSize:11 }}>{c.email}</div>
                          : null
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > PAGE && (
          <div style={{
            padding:"12px 20px", borderTop:"1px solid var(--border)",
            display:"flex", alignItems:"center", justifyContent:"space-between"
          }}>
            <button className="btn btn-outline btn-sm"
              disabled={page===0} onClick={() => goPage(page-1)}>
              ← Previous
            </button>
            <span style={{ fontSize:13, color:"var(--muted)" }}>
              {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total.toLocaleString()}
            </span>
            <button className="btn btn-outline btn-sm"
              disabled={(page+1)*PAGE>=total} onClick={() => goPage(page+1)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
