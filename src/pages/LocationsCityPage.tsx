import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────────────────────
interface City {
  id: number;
  slug: string;
  county_slug: string;
  name: string;
  h1_title: string;
  meta_description: string;
  contractor_count: number;
  updated_at: string;
}

interface SeoAudit {
  id: number;
  page_url: string;
  audit_date: string;
  core_web_vitals: { ttfb?: number; lcp?: number; inp?: number; cls?: number } | null;
  canonical_ok: boolean;
  robots_ok: boolean;
  schema_valid: boolean;
  schema_types: string[];
  index_status: string;
  issues: Record<string, string> | null;
}

interface CdmStatus {
  status: "stub" | "draft" | "scored" | "published";
  score: number | null;
  last_generated: string | null;
}

// ── API ────────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? "https://api.nexabuilder.com";

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("access_token") ?? "";
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  indexed: "#22c55e",
  crawled_not_indexed: "#f59e0b",
  not_crawled: "#ef4444",
};

const INDEX_LABEL: Record<string, string> = {
  indexed: "Indexed",
  crawled_not_indexed: "Not indexed",
  not_crawled: "Not crawled",
};

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
      background: ok ? "#dcfce7" : "#fee2e2",
      color: ok ? "#15803d" : "#dc2626",
    }}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function SchemaTag({ type }: { type: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 7px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8",
      marginRight: 4, marginBottom: 4,
    }}>{type}</span>
  );
}

// ── City List View ─────────────────────────────────────────────────────────
function CityListView() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("all");

  useEffect(() => {
    apiFetch("/admin/cities")
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  const counties = ["all", ...Array.from(new Set(cities.map((c) => c.county_slug))).sort()];
  const filtered = cities.filter((c) => {
    const matchCounty = county === "all" || c.county_slug === county;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search);
    return matchCounty && matchSearch;
  });

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Locations — City Pages</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            {cities.length} cities across {counties.length - 1} counties
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search city name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
        />
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
        >
          {counties.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All Counties" : c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading cities…</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["City", "County", "Slug", "Contractors", "Updated"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/locations/cities/${c.county_slug}/${c.slug}`)}
                  style={{
                    cursor: "pointer",
                    borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 14 }}>{c.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
                    {c.county_slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: "#4b5563" }}>{c.slug}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{c.contractor_count}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af" }}>
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>No cities match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── City Detail Tabs ───────────────────────────────────────────────────────
type Tab = "content" | "schema" | "seo-audit" | "ai-visibility";

function SeoAuditTab({ audit, onRunAudit, auditing }: {
  audit: SeoAudit | null;
  onRunAudit: () => void;
  auditing: boolean;
}) {
  if (!audit) return (
    <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
      <p style={{ fontSize: 16, marginBottom: 16 }}>No audit data yet for this page.</p>
      <button
        onClick={onRunAudit}
        disabled={auditing}
        style={{
          padding: "10px 20px", background: "#2563eb", color: "#fff",
          border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600,
        }}
      >
        {auditing ? "Running Audit…" : "Run Audit Now"}
      </button>
    </div>
  );

  const vitals = audit.core_web_vitals ?? {};
  const issueList = Object.entries(audit.issues ?? {});

  return (
    <div style={{ padding: 24 }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Last audit: </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{audit.audit_date}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: STATUS_COLOR[audit.index_status] + "20",
            color: STATUS_COLOR[audit.index_status],
            fontSize: 12, fontWeight: 700,
          }}>
            ● {INDEX_LABEL[audit.index_status] ?? audit.index_status}
          </span>
          <button
            onClick={onRunAudit}
            disabled={auditing}
            style={{
              padding: "6px 14px", background: "#f3f4f6", color: "#374151",
              border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13,
            }}
          >
            {auditing ? "Running…" : "Re-run Audit"}
          </button>
        </div>
      </div>

      {/* Signal grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Canonical", ok: audit.canonical_ok },
          { label: "Robots", ok: audit.robots_ok },
          { label: "Schema Valid", ok: audit.schema_valid },
          { label: "No Issues", ok: issueList.length === 0 },
        ].map(({ label, ok }) => (
          <div key={label} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{label}</div>
            <Badge ok={ok} label={ok ? "Pass" : "Fail"} />
          </div>
        ))}
        {vitals.ttfb !== undefined && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>TTFB</div>
            <span style={{
              fontSize: 20, fontWeight: 700,
              color: (vitals.ttfb ?? 0) < 600 ? "#22c55e" : (vitals.ttfb ?? 0) < 1500 ? "#f59e0b" : "#ef4444",
            }}>
              {vitals.ttfb}ms
            </span>
          </div>
        )}
      </div>

      {/* Schema types */}
      {audit.schema_types.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#374151" }}>Schema Markup Detected</div>
          {audit.schema_types.map((t) => <SchemaTag key={t} type={t} />)}
        </div>
      )}

      {/* Issues */}
      {issueList.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#92400e" }}>
            ⚠ {issueList.length} Issue{issueList.length > 1 ? "s" : ""} Found
          </div>
          {issueList.map(([key, msg]) => (
            <div key={key} style={{
              display: "flex", gap: 10, padding: "8px 0",
              borderBottom: "1px solid #fef3c7", fontSize: 13,
            }}>
              <span style={{ fontWeight: 600, color: "#b45309", minWidth: 120 }}>{key}</span>
              <span style={{ color: "#374151" }}>{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiVisibilityTab({ slug, countySlug }: { slug: string; countySlug: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/admin/cities/${countySlug}/${slug}/ai-citations`)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [slug, countySlug]);

  const bySource = events.reduce((acc: Record<string, number>, e) => {
    acc[e.source] = (acc[e.source] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {["chatgpt", "perplexity", "gemini"].map((src) => (
          <div key={src} style={{
            flex: 1, background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 8, padding: "16px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: bySource[src] ? "#2563eb" : "#d1d5db" }}>
              {bySource[src] ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, textTransform: "capitalize" }}>{src} Citations</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{
          background: "#f9fafb", border: "1px dashed #d1d5db",
          borderRadius: 8, padding: 32, textAlign: "center", color: "#6b7280",
        }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No AI citation events recorded yet.</p>
          <p style={{ fontSize: 13 }}>The daily AI probe runner will populate this once it runs.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Source", "Query", "Snippet", "Rank", "Date"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < events.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: e.source === "chatgpt" ? "#f0fdf4" : e.source === "perplexity" ? "#faf5ff" : "#eff6ff",
                      color: e.source === "chatgpt" ? "#15803d" : e.source === "perplexity" ? "#7c3aed" : "#1d4ed8",
                    }}>{e.source}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, maxWidth: 200 }}>{e.query}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280", maxWidth: 280 }}>
                    {e.snippet ? e.snippet.slice(0, 120) + (e.snippet.length > 120 ? "…" : "") : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>#{e.rank_in_response ?? "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af" }}>
                    {new Date(e.detected_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── City Detail View ───────────────────────────────────────────────────────
function CityDetailView({ countySlug, slug }: { countySlug: string; slug: string }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [city, setCity] = useState<City | null>(null);
  const [audit, setAudit] = useState<SeoAudit | null>(null);
  const [cdm, setCdm] = useState<CdmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cityData, auditData, cdmData] = await Promise.allSettled([
        apiFetch(`/admin/cities/${countySlug}/${slug}`),
        apiFetch(`/admin/cities/${countySlug}/${slug}/seo-audit`),
        apiFetch(`/admin/cities/${countySlug}/${slug}/cdm-status`),
      ]);
      if (cityData.status === "fulfilled") setCity(cityData.value);
      if (auditData.status === "fulfilled") setAudit(auditData.value);
      if (cdmData.status === "fulfilled") setCdm(cdmData.value);
    } finally {
      setLoading(false);
    }
  }, [countySlug, slug]);

  useEffect(() => { loadData(); }, [loadData]);

  const runAudit = async () => {
    setAuditing(true);
    try {
      const result = await apiFetch(`/admin/cities/${countySlug}/${slug}/run-seo-audit`, { method: "POST" });
      setAudit(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditing(false);
    }
  };

  const regenerateCdm = async () => {
    setGenerating(true);
    setSaveMsg("");
    try {
      const result = await apiFetch(`/admin/cities/${countySlug}/${slug}/cdm-generate`, { method: "POST" });
      setCdm(result);
      setSaveMsg(result.score >= 75 ? `Published — score ${result.score}` : `Score ${result.score} — below threshold, not published`);
    } catch (e) {
      setSaveMsg("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "content", label: "Content" },
    { id: "schema", label: "Schema" },
    { id: "seo-audit", label: "SEO Audit" },
    { id: "ai-visibility", label: "AI Visibility" },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      {/* Back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate("/locations/cities")}
          style={{ padding: "6px 12px", background: "none", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{city?.name ?? slug}</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>
            {countySlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} · /locations/{countySlug}/{slug}/
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {cdm && (
            <span style={{
              padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: cdm.status === "published" ? "#dcfce7" : "#fef9c3",
              color: cdm.status === "published" ? "#15803d" : "#713f12",
            }}>
              CDM: {cdm.status}{cdm.score ? ` (${cdm.score})` : ""}
            </span>
          )}
          <button
            onClick={regenerateCdm}
            disabled={generating}
            style={{
              padding: "7px 14px", background: generating ? "#93c5fd" : "#2563eb",
              color: "#fff", border: "none", borderRadius: 6,
              cursor: generating ? "default" : "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            {generating ? "Generating…" : "Regenerate Content"}
          </button>
          {saveMsg && <span style={{ fontSize: 12, color: "#374151" }}>{saveMsg}</span>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 14,
              fontWeight: activeTab === t.id ? 700 : 400,
              color: activeTab === t.id ? "#2563eb" : "#374151",
              background: "none",
              borderBottom: activeTab === t.id ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: -2,
              transition: "color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
        {activeTab === "content" && city && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>H1 Title</label>
                <div style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14 }}>
                  {city.h1_title || "—"}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Meta Description</label>
                <div style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14 }}>
                  {city.meta_description || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>County</label>
                  <div style={{ padding: "8px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}>
                    {countySlug}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Contractors</label>
                  <div style={{ padding: "8px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}>
                    {city.contractor_count}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Live URL</label>
                  <a
                    href={`https://nexabuilder.com/locations/${countySlug}/${slug}/`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "block", padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 13, color: "#2563eb" }}
                  >
                    View page →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "schema" && (
          <div style={{ padding: 24 }}>
            {audit ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Badge ok={audit.schema_valid} label={audit.schema_valid ? "Schema Valid" : "Schema Invalid"} />
                  {" "}<span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>
                    {audit.schema_types.length} type{audit.schema_types.length !== 1 ? "s" : ""} detected
                  </span>
                </div>
                {audit.schema_types.length > 0 ? (
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
                    {audit.schema_types.map((t) => <SchemaTag key={t} type={t} />)}
                  </div>
                ) : (
                  <div style={{ padding: 24, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, color: "#c2410c" }}>
                    No JSON-LD schema markup found. Run "Regenerate Content" to add LocalBusiness + Service schema.
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                Run an SEO audit first to see schema details.
              </div>
            )}
          </div>
        )}

        {activeTab === "seo-audit" && (
          <SeoAuditTab audit={audit} onRunAudit={runAudit} auditing={auditing} />
        )}

        {activeTab === "ai-visibility" && (
          <AiVisibilityTab slug={slug} countySlug={countySlug} />
        )}
      </div>
    </div>
  );
}

// ── Router entry point ─────────────────────────────────────────────────────
export function LocationsCityPage() {
  const { county, slug } = useParams<{ county: string; slug: string }>();
  if (county && slug) {
    return <CityDetailView countySlug={county} slug={slug} />;
  }
  return <CityListView />;
}
