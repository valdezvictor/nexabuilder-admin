import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { http } from "../lib/http";

type Lead = {
  id: number;
  first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null;
  vertical: string | null; project_type: string | null;
  postal_code: string | null; city: string | null; state: string | null;
  ai_score: number | null; lead_status: string | null;
  created_at: string | null; demo_flags: any;
};

const STATUS_BADGE: Record<string,string> = {
  submitted: "badge-blue", review: "badge-amber",
  matched: "badge-green", site_visit: "badge-green",
  quote: "badge-blue", approved: "badge-green",
  complete: "badge-gray", cancelled: "badge-red",
};

const VERT_ICON: Record<string,string> = {
  pool:"🏊", roofing:"🏠", electrical:"⚡", plumbing:"🔧",
  hvac:"❄", landscaping:"🌿", remodel:"🏡", solar:"☀",
  addition:"🏗", general:"🔨", home_remodeling:"🔨",
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";

const Leads: React.FC = () => {
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [filter, setFilter]   = useState("");
  const [status, setStatus]   = useState("");
  const navigate              = useNavigate();
  const [params]              = useSearchParams();
  const PAGE_SIZE = 25;

  const load = (pg = 0, q = filter, st = status) => {
    setLoading(true);
    const p: Record<string,any> = { limit: PAGE_SIZE, offset: pg * PAGE_SIZE };
    if (q)  p.search = q;
    if (st) p.status = st;
    http.get("/leads", { params: p })
      .then((r:any) => {
        setLeads(r.data.results || r.data.leads || r.data || []);
        setTotal(r.data.total || r.data.count || 0);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const q = params.get("q") || "";
    if (q) setFilter(q);
    load(0, q, status);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setPage(0); load(0, filter, status); }
  };

  const handleStatus = (s: string) => {
    setStatus(s); setPage(0); load(0, filter, s);
  };

  return (
    <div>
      {/* Search + filter bar */}
      <div className="search-bar">
        <input className="search-input"
          placeholder="Search by name, email, city, ZIP..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={handleSearch} />
        <button className="btn btn-primary btn-sm" onClick={() => { setPage(0); load(0,filter,status); }}>
          Search
        </button>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["","submitted","review","matched","complete"].map(s => (
            <button key={s}
              className={`btn btn-sm ${status===s ? "btn-primary" : "btn-outline"}`}
              onClick={() => handleStatus(s)}>
              {s || "All"}
            </button>
          ))}
        </div>
        <span style={{ marginLeft:"auto", fontSize:13, color:"var(--muted)" }}>
          {total.toLocaleString()} leads
        </span>
      </div>

      <div className="card">
        <div className="card-body-0">
          {loading ? (
            <div className="loading-wrap"><div className="spinner"></div></div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
              No leads found
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Homeowner</th>
                  <th>Project</th>
                  <th>Location</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Flags</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const icon = VERT_ICON[(lead.vertical||"").toLowerCase()] || "🔨";
                  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
                  const isDemo = lead.demo_flags?.vip || lead.demo_flags?.show_all_contractors;
                  return (
                    <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td style={{ color:"var(--muted)", fontSize:12 }}>#{lead.id}</td>
                      <td>
                        <div style={{ fontWeight:700, fontSize:13 }}>{name}</div>
                        <div style={{ fontSize:11, color:"var(--muted)" }}>{lead.email}</div>
                      </td>
                      <td>
                        <span style={{ marginRight:6 }}>{icon}</span>
                        {lead.project_type || lead.vertical || "—"}
                      </td>
                      <td style={{ fontSize:13 }}>
                        {[lead.city, lead.postal_code].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td>
                        {lead.ai_score != null ? (
                          <span style={{
                            fontWeight:800, fontSize:13,
                            color: lead.ai_score >= 7 ? "var(--green)" :
                                   lead.ai_score >= 4 ? "var(--amber)" : "var(--red)"
                          }}>
                            {lead.ai_score}/10
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[lead.lead_status||""] || "badge-gray"}`}>
                          {(lead.lead_status || "submitted").replace("_"," ")}
                        </span>
                      </td>
                      <td>
                        {isDemo && <span className="badge badge-purple">VIP</span>}
                      </td>
                      <td style={{ fontSize:12, color:"var(--muted)" }}>
                        {fmtDate(lead.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)",
            display:"flex", alignItems:"center", gap:12, justifyContent:"space-between" }}>
            <button className="btn btn-outline btn-sm"
              disabled={page === 0}
              onClick={() => { const p = page-1; setPage(p); load(p); }}>
              ← Previous
            </button>
            <span style={{ fontSize:13, color:"var(--muted)" }}>
              {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <button className="btn btn-outline btn-sm"
              disabled={(page+1)*PAGE_SIZE >= total}
              onClick={() => { const p = page+1; setPage(p); load(p); }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export { Leads };
