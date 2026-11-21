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
  body_html?: string;
  contractor_count: number;
  updated_at: string;
  is_published?: boolean;
  published_at?: string | null;
  lat?: number | null;
  lng?: number | null;
  zip_codes?: string[];
}

interface ContentAudit {
  overall_score: number;
  scores: Record<string, number>;
  issues: string[];
  summary: string;
  word_count: number;
  audited_at: string;
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
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px`, fill: color, fontSize: size < 60 ? 13 : 18, fontWeight: 700 }}>
        {score}
      </text>
    </svg>
  );
}

const SCORE_LABELS: Record<string, string> = {
  reader_value: "Reader Value",
  factual_accuracy: "Factual Accuracy",
  search_intent: "Search Intent",
  eeat: "E-E-A-T",
  structure: "Structure",
  readability: "Readability",
  internal_links: "Internal Links",
};

const SCORE_MAX: Record<string, number> = {
  reader_value: 20,
  factual_accuracy: 20,
  search_intent: 15,
  eeat: 15,
  structure: 10,
  readability: 10,
  internal_links: 10,
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

/** Extract JSON-LD @type values from anywhere in the full HTML string */
function extractSchemaTypes(html: string): string[] {
  const matches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const types: string[] = [];
  for (const block of matches) {
    const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    try {
      const parsed = JSON.parse(inner);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        const t = item["@type"];
        if (Array.isArray(t)) types.push(...t);
        else if (t) types.push(t);
      }
    } catch { /* malformed block, skip */ }
  }
  return types;
}

/** Build LocalBusiness + Service JSON-LD for a city */
function buildSchemaBlock(city: City): string {
  const cityName = city.name;
  const pageUrl = `https://www.nexabuilder.com/locations/${city.county_slug}/${city.slug}/`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": `Licensed Contractors in ${cityName}, CA`,
      "description": city.meta_description || `Find licensed, vetted contractors in ${cityName}, California.`,
      "url": pageUrl,
      "areaServed": {
        "@type": "City",
        "name": cityName,
        "addressRegion": "CA",
        "addressCountry": "US",
      },
      "hasMap": pageUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": `Contractor Services in ${cityName}`,
      "serviceType": "General Contracting",
      "areaServed": {
        "@type": "City",
        "name": cityName,
        "addressRegion": "CA",
      },
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "NexaBuilder",
        "url": "https://www.nexabuilder.com",
      },
    },
  ];
  return `\n<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/** Inject internal links — adds contextual links after the 2nd paragraph */
function injectInternalLinks(html: string, cityName: string, countySlug: string): string {
  const hasLinks = /<a\s+href=/i.test(html);
  if (hasLinks) return html;

  const countyPath = "/locations/" + countySlug + "/";
  const linkParagraph =
    "</p>\n<p>Looking for contractors nearby? Browse " +
    "<a href=\"" + countyPath + "\">all cities in this county</a>" +
    " or <a href=\"/get-quote/\">get a free quote</a> from licensed professionals in " +
    cityName +
    ". Need help finding the right contractor? Visit our " +
    "<a href=\"/services/\">services directory</a>.</p>";

  let count = 0;
  return html.replace(/<\/p>/gi, (match) => {
    count++;
    return count === 2 ? linkParagraph : match;
  });
}

/** Format a county_slug → display name */
function countyName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) + " County";
}

// ── County List View (/locations) ─────────────────────────────────────────
function CountyListView() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/admin/cities")
      .then((data) => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by county
  const countyMap: Record<string, City[]> = {};
  for (const c of cities) {
    if (!countyMap[c.county_slug]) countyMap[c.county_slug] = [];
    countyMap[c.county_slug].push(c);
  }
  const countySlugs = Object.keys(countyMap).sort();

  const filtered = search
    ? countySlugs.filter((s) => s.includes(search.toLowerCase()) || countyName(s).toLowerCase().includes(search.toLowerCase()))
    : countySlugs;

  const totalCities = cities.length;
  const totalPublished = cities.filter((c) => c.is_published).length;
  const totalDraft = totalCities - totalPublished;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Locations — Counties</h1>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          {countySlugs.length} counties · {totalCities} cities · {totalPublished} live · {totalDraft} draft
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Cities", value: totalCities, color: "#2563eb", bg: "#eff6ff" },
          { label: "Published", value: totalPublished, color: "#15803d", bg: "#dcfce7" },
          { label: "Draft / Pending", value: totalDraft, color: "#713f12", bg: "#fef9c3" },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.bg}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        placeholder="Filter counties…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "9px 14px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 14, marginBottom: 20, boxSizing: "border-box" }}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>Loading counties…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map((slug) => {
            const citiesInCounty = countyMap[slug] ?? [];
            const published = citiesInCounty.filter((c) => c.is_published).length;
            const draft = citiesInCounty.length - published;
            const pct = citiesInCounty.length > 0 ? Math.round((published / citiesInCounty.length) * 100) : 0;
            const done = pct === 100;
            const inProgress = pct > 0 && pct < 100;

            return (
              <div
                key={slug}
                onClick={() => navigate(`/locations/cities/${slug}`)}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "18px 20px",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#93c5fd";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
                }}
              >
                {/* Status pill */}
                <div style={{ position: "absolute", top: 14, right: 14 }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: done ? "#dcfce7" : inProgress ? "#fef9c3" : "#f3f4f6",
                    color: done ? "#15803d" : inProgress ? "#713f12" : "#6b7280",
                  }}>
                    {done ? "✓ Done" : inProgress ? `${pct}%` : "Pending"}
                  </span>
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6, paddingRight: 60 }}>
                  {countyName(slug)}
                </div>

                <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                  <span>{citiesInCounty.length} cities</span>
                  {published > 0 && <span style={{ color: "#15803d" }}>● {published} live</span>}
                  {draft > 0 && <span style={{ color: "#b45309" }}>○ {draft} draft</span>}
                </div>

                {/* Progress bar */}
                <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: done ? "#22c55e" : "#3b82f6",
                    borderRadius: 3,
                    transition: "width 0.4s",
                  }} />
                </div>

                <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
                  Click to manage cities →
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "#9ca3af" }}>
              No counties match "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── County Detail View (/locations/cities/:county) ─────────────────────────
function CountyDetailView({ countySlug }: { countySlug: string }) {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/admin/cities")
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        setCities(all.filter((c: City) => c.county_slug === countySlug));
      })
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, [countySlug]);

  const filtered = cities.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.includes(q);
  });

  const published = cities.filter((c) => c.is_published).length;
  const draft = cities.length - published;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/locations")} style={{
          padding: "6px 12px", background: "none", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13,
        }}>← Counties</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{countyName(countySlug)}</h1>
          <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 14 }}>
            {cities.length} cities · {published} live · {draft} draft
          </p>
        </div>
        <button
          onClick={() => navigate("/locations/cities")}
          style={{ padding: "6px 12px", background: "none", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#6b7280" }}
        >
          All Cities ↗
        </button>
      </div>

      {/* Stats row */}
      {cities.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Cities", value: cities.length, color: "#2563eb", bg: "#eff6ff" },
            { label: "Live", value: published, color: "#15803d", bg: "#dcfce7" },
            { label: "Draft", value: draft, color: "#713f12", bg: "#fef9c3" },
            { label: "Progress", value: `${cities.length > 0 ? Math.round((published / cities.length) * 100) : 0}%`, color: "#7c3aed", bg: "#f5f3ff" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "10px 16px", minWidth: 80 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#374151" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        placeholder="Search city name or slug…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading…</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["City", "Slug", "Status", "CDM", "Contractors", "Updated"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/locations/cities/${countySlug}/${c.slug}`)}
                  style={{
                    cursor: "pointer",
                    borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 14 }}>{c.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: "#4b5563" }}>{c.slug}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: c.is_published ? "#dcfce7" : "#fef9c3",
                      color: c.is_published ? "#15803d" : "#713f12",
                    }}>
                      {c.is_published ? "● Live" : "○ Draft"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11,
                      background: "#f3f4f6", color: "#6b7280",
                    }}>
                      {c.body_html && c.body_html.length > 100 ? "✓ content" : "stub"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{c.contractor_count}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af" }}>
                    {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                    {search ? `No cities match "${search}"` : "No cities in this county."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── City List View (/locations/cities) ────────────────────────────────────
function CityListView() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("all");

  useEffect(() => {
    apiFetch("/admin/cities")
      .then((data) => setCities(Array.isArray(data) ? data : []))
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => navigate("/locations")} style={{
              padding: "4px 10px", background: "none", border: "1px solid #d1d5db", borderRadius: 5, cursor: "pointer", fontSize: 12,
            }}>← Counties</button>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>All Cities</h1>
          </div>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            {cities.length} cities across {counties.length - 1} counties
          </p>
        </div>
      </div>

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
            <option key={c} value={c}>{c === "all" ? "All Counties" : countyName(c)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading cities…</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["City", "County", "Slug", "Status", "Contractors", "Updated"].map((h) => (
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
                    {countyName(c.county_slug)}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: "#4b5563" }}>{c.slug}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: c.is_published ? "#dcfce7" : "#fef9c3",
                      color: c.is_published ? "#15803d" : "#713f12",
                    }}>
                      {c.is_published ? "● Live" : "○ Draft"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{c.contractor_count}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af" }}>
                    {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>No cities match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── SEO Audit Tab ─────────────────────────────────────────────────────────
function SeoAuditTab({ slug, countySlug, city, onCityUpdated }: {
  slug: string;
  countySlug: string;
  city: City | null;
  onCityUpdated: (updated: City) => void;
}) {
  const [audit, setAudit] = useState<ContentAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [fixingLinks, setFixingLinks] = useState(false);
  const [fixMsg, setFixMsg] = useState("");

  const techChecks = city ? (() => {
    const h1 = city.h1_title ?? "";
    const meta = city.meta_description ?? "";
    const body = city.body_html ?? "";
    const words = body.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const hasLinks = /<a\s+href=/i.test(body);
    return {
      hasH1: h1.length > 0,
      hasMetaDesc: meta.length >= 50 && meta.length <= 160,
      hasBodyContent: words >= 300,
      hasLinks,
      metaDescLength: meta.length,
      h1Length: h1.length,
      wordCount: words,
    };
  })() : null;

  const runAudit = async () => {
    setAuditing(true);
    try {
      const result = await apiFetch(`/admin/cities/${countySlug}/${slug}/run-seo-audit`, { method: "POST" });
      setAudit(result);
    } catch (e) {
      console.error("Audit failed", e);
    } finally {
      setAuditing(false);
    }
  };

  const fixInternalLinks = async () => {
    if (!city?.body_html) return;
    setFixingLinks(true);
    setFixMsg("");
    try {
      const updatedHtml = injectInternalLinks(city.body_html, city.name, countySlug);
      const result = await apiFetch(`/admin/cities/${countySlug}/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({ body_html: updatedHtml }),
      });
      onCityUpdated({ ...city, body_html: updatedHtml, updated_at: result.updated_at ?? city.updated_at });
      setFixMsg("✓ Internal links added — re-run audit to confirm score");
    } catch (e: any) {
      setFixMsg(`✗ Failed: ${e?.message ?? "unknown error"}`);
    } finally {
      setFixingLinks(false);
    }
  };

  const pageUrl = `https://www.nexabuilder.com/locations/${countySlug}/${slug}/`;

  const getFix = (issue: string): { label: string; action: () => void; loading: boolean } | null => {
    const lower = issue.toLowerCase();
    if (lower.includes("internal link")) {
      return { label: "Auto-fix: Inject Links", action: fixInternalLinks, loading: fixingLinks };
    }
    return null;
  };

  return (
    <div style={{ padding: 24 }}>
      {techChecks && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Technical Signals</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>H1 Tag</div>
              <Badge ok={techChecks.hasH1} label={techChecks.hasH1 ? `${techChecks.h1Length} chars` : "Missing"} />
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Meta Description</div>
              <Badge ok={techChecks.hasMetaDesc}
                label={techChecks.metaDescLength === 0 ? "Missing" : `${techChecks.metaDescLength} chars${techChecks.metaDescLength > 160 ? " (too long)" : techChecks.metaDescLength < 50 ? " (too short)" : ""}`} />
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Body Content</div>
              <Badge ok={techChecks.hasBodyContent} label={`${techChecks.wordCount.toLocaleString()} words`} />
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Internal Links</div>
              <Badge ok={techChecks.hasLinks} label={techChecks.hasLinks ? "Present" : "None found"} />
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Live Page</div>
              <a href={pageUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>View →</a>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Content Quality Audit</div>
        <button onClick={runAudit} disabled={auditing} style={{
          padding: "7px 16px", background: auditing ? "#93c5fd" : "#2563eb",
          color: "#fff", border: "none", borderRadius: 6,
          cursor: auditing ? "default" : "pointer", fontSize: 13, fontWeight: 600,
        }}>
          {auditing ? "Running…" : audit ? "Re-run Audit" : "⚡ Run Audit"}
        </button>
      </div>

      {!audit ? (
        <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 8, padding: 32, textAlign: "center", color: "#6b7280" }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No content audit run yet.</p>
          <p style={{ fontSize: 13 }}>Click "Run Audit" to score this page's content quality.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 20px" }}>
            <ScoreRing score={audit.overall_score} size={80} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{audit.summary}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {(audit.word_count ?? 0).toLocaleString()} words · Audited {audit.audited_at ? new Date(audit.audited_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 14 }}>Score Breakdown</div>
            {Object.entries(audit.scores).map(([key, val]) => {
              const max = SCORE_MAX[key] ?? 10;
              const pct = (val / max) * 100;
              const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "#374151" }}>{SCORE_LABELS[key] ?? key}</span>
                    <span style={{ fontWeight: 600, color }}>{val}/{max}</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {audit.issues.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 12 }}>
                ⚠ {audit.issues.length} Issue{audit.issues.length !== 1 ? "s" : ""} to Fix
              </div>
              {audit.issues.map((issue, i) => {
                const fix = getFix(issue);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: i < audit.issues.length - 1 ? "1px solid #fef3c7" : "none",
                    gap: 12,
                  }}>
                    <span style={{ fontSize: 13, color: "#78350f", flex: 1 }}>· {issue}</span>
                    {fix && (
                      <button
                        onClick={fix.action}
                        disabled={fix.loading}
                        style={{
                          padding: "5px 12px", background: fix.loading ? "#93c5fd" : "#2563eb",
                          color: "#fff", border: "none", borderRadius: 5,
                          cursor: fix.loading ? "default" : "pointer",
                          fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                        }}
                      >
                        {fix.loading ? "Fixing…" : fix.label}
                      </button>
                    )}
                  </div>
                );
              })}
              {fixMsg && (
                <div style={{ marginTop: 10, fontSize: 13, color: fixMsg.startsWith("✓") ? "#15803d" : "#dc2626", fontWeight: 600 }}>
                  {fixMsg}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Schema Tab ─────────────────────────────────────────────────────────────
function SchemaTab({ city, onCityUpdated }: {
  city: City | null;
  onCityUpdated: (updated: City) => void;
}) {
  const [injecting, setInjecting] = useState(false);
  const [msg, setMsg] = useState("");

  const bodyHtml = city?.body_html ?? "";
  const schemaTypes = extractSchemaTypes(bodyHtml);

  const injectSchema = async () => {
    if (!city) return;
    setInjecting(true);
    setMsg("");
    try {
      const schemaBlock = buildSchemaBlock(city);
      let updated: string;
      if (bodyHtml.includes("</head>")) {
        updated = bodyHtml.replace("</head>", `${schemaBlock}\n</head>`);
      } else if (bodyHtml.includes("<body")) {
        updated = bodyHtml.replace(/<body([^>]*)>/, `<body$1>\n${schemaBlock}\n`);
      } else {
        updated = schemaBlock + "\n" + bodyHtml;
      }
      const result = await apiFetch(`/admin/cities/${city.county_slug}/${city.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ body_html: updated }),
      });
      onCityUpdated({ ...city, body_html: updated, updated_at: result.updated_at ?? city.updated_at });
      setMsg("✓ Schema injected — LocalBusiness + Service JSON-LD added to page head");
    } catch (e: any) {
      setMsg(`✗ Failed: ${e?.message ?? "unknown error"}`);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <Badge ok={schemaTypes.length > 0} label={schemaTypes.length > 0 ? "Schema Found" : "No Schema"} />
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {schemaTypes.length} JSON-LD type{schemaTypes.length !== 1 ? "s" : ""} detected in page HTML
        </span>
      </div>

      {schemaTypes.length > 0 ? (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
          {schemaTypes.map((t, i) => <SchemaTag key={i} type={t} />)}
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            Schema markup is present. To replace with fresh LocalBusiness + Service schema, click Regenerate below.
          </div>
          <button onClick={injectSchema} disabled={injecting} style={{
            marginTop: 12, padding: "7px 14px", background: injecting ? "#93c5fd" : "#6b7280",
            color: "#fff", border: "none", borderRadius: 6, cursor: injecting ? "default" : "pointer", fontSize: 13,
          }}>
            {injecting ? "Replacing…" : "↻ Replace Schema"}
          </button>
          {msg && <div style={{ marginTop: 8, fontSize: 13, color: msg.startsWith("✓") ? "#15803d" : "#dc2626" }}>{msg}</div>}
        </div>
      ) : (
        <div style={{ padding: 20, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 600, color: "#c2410c" }}>No JSON-LD schema markup found in the page HTML.</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#7c2d12" }}>
            Click the button below to inject <strong>LocalBusiness + Service</strong> schema into this page's <code>&lt;head&gt;</code>.
            This tells Google the business type, service area, and page URL — required for rich results.
          </p>
          <button onClick={injectSchema} disabled={injecting} style={{
            padding: "9px 20px", background: injecting ? "#93c5fd" : "#ea580c",
            color: "#fff", border: "none", borderRadius: 6,
            cursor: injecting ? "default" : "pointer", fontSize: 14, fontWeight: 700,
          }}>
            {injecting ? "Injecting…" : "⚡ Add Schema (LocalBusiness + Service)"}
          </button>
          {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✓") ? "#15803d" : "#dc2626", fontWeight: 600 }}>{msg}</div>}
        </div>
      )}

      {schemaTypes.length === 0 && city && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Preview — schema that will be injected:</div>
          <pre style={{
            background: "#1e1e2e", color: "#cdd6f4", padding: 16, borderRadius: 8,
            fontSize: 11, overflow: "auto", maxHeight: 300, lineHeight: 1.5,
          }}>
            {buildSchemaBlock(city)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── AI Visibility Tab ──────────────────────────────────────────────────────
function AiVisibilityTab({ slug, countySlug }: { slug: string; countySlug: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/admin/cities/${countySlug}/${slug}/ai-citations`)
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((e) => {
        if (e?.message?.includes("404")) setEvents([]);
        else { setError(e?.message ?? "Failed to load"); setEvents([]); }
      })
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
          <div key={src} style={{ flex: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: bySource[src] ? "#2563eb" : "#d1d5db" }}>{bySource[src] ?? 0}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, textTransform: "capitalize" }}>{src} Citations</div>
          </div>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: 24, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
          Could not load citation data: {error}
        </div>
      ) : events.length === 0 ? (
        <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 8, padding: 32, textAlign: "center", color: "#6b7280" }}>
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
                <tr key={e.id ?? i} style={{ borderBottom: i < events.length - 1 ? "1px solid #f3f4f6" : "none" }}>
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
                    {e.detected_at ? new Date(e.detected_at).toLocaleDateString() : '—'}
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
type Tab = "content" | "schema" | "seo-audit" | "ai-visibility";

function CityDetailView({ countySlug, slug }: { countySlug: string; slug: string }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [city, setCity] = useState<City | null>(null);
  const [cdm, setCdm] = useState<CdmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [showHtml, setShowHtml] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cityData, cdmData] = await Promise.allSettled([
        apiFetch(`/admin/cities/${countySlug}/${slug}`),
        apiFetch(`/admin/cities/${countySlug}/${slug}/cdm-status`),
      ]);
      if (cityData.status === "fulfilled") setCity(cityData.value);
      if (cdmData.status === "fulfilled") setCdm(cdmData.value);
    } finally {
      setLoading(false);
    }
  }, [countySlug, slug]);

  useEffect(() => { loadData(); }, [loadData]);

  const regenerateCdm = async () => {
    setGenerating(true);
    setSaveMsg("");
    try {
      const result = await apiFetch(`/admin/cities/${countySlug}/${slug}/cdm-generate`, { method: "POST" });
      setCdm(result);
      setSaveMsg((result.score ?? 0) >= 75
        ? `Generated — score ${result.score}. Click Publish to go live.`
        : `Score ${result.score} — below threshold, review before publishing`);
      const updated = await apiFetch(`/admin/cities/${countySlug}/${slug}`);
      setCity(updated);
    } catch (e) {
      setSaveMsg("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const publishCity = async () => {
    setPublishing(true);
    setSaveMsg("Publishing…");
    try {
      const result = await apiFetch(`/admin/cities/${countySlug}/${slug}/publish`, { method: "POST" });
      const cfOk = typeof result.cloudfront_invalidation === "string" && !result.cloudfront_invalidation.startsWith("error");
      const bingStatus = result.indexnow?.bing;
      setSaveMsg(`✓ Published — CF ${cfOk ? "cache cleared" : "⚠ CF error"} · IndexNow ${bingStatus === 200 ? "✓" : "?"}`);
      await loadData();
    } catch (e: any) {
      setSaveMsg(`✗ Publish failed: ${e?.message ?? "unknown error"}`);
    } finally {
      setPublishing(false);
    }
  };

  const unpublishCity = async () => {
    if (!confirm("Remove this page from public view? It will return a 404 until re-published.")) return;
    try {
      await apiFetch(`/admin/cities/${countySlug}/${slug}/unpublish`, { method: "POST" });
      setSaveMsg("↩ Reverted to draft");
      await loadData();
    } catch (e: any) {
      setSaveMsg(`✗ Unpublish failed: ${e?.message ?? "unknown error"}`);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "content",       label: "📝 Content" },
    { id: "schema",        label: "🗂 Schema" },
    { id: "seo-audit",     label: "⚡ SEO Audit" },
    { id: "ai-visibility", label: "🤖 AI Visibility" },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading…</div>;

  const isPublished = city?.is_published ?? false;
  const bodyHtml = city?.body_html ?? "";

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Back to county detail — not the full list */}
        <button onClick={() => navigate(`/locations/cities/${countySlug}`)} style={{
          padding: "6px 12px", background: "none", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13,
        }}>← {countyName(countySlug)}</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{city?.name ?? slug}</h1>
            <span style={{
              padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: isPublished ? "#dcfce7" : "#fef9c3",
              color: isPublished ? "#15803d" : "#713f12",
              border: `1px solid ${isPublished ? "#86efac" : "#fde68a"}`,
            }}>
              {isPublished ? "● Live" : "○ Draft"}
            </span>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>
            {countyName(countySlug)} · /locations/{countySlug}/{slug}/
            {isPublished && city?.published_at && (
              <span style={{ marginLeft: 8, color: "#22c55e" }}>· Published {new Date(city.published_at).toLocaleDateString()}</span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {cdm && (
            <span style={{
              padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: cdm.status === "published" ? "#dcfce7" : "#fef9c3",
              color: cdm.status === "published" ? "#15803d" : "#713f12",
            }}>CDM: {cdm.status}{cdm.score ? ` (${cdm.score})` : ""}</span>
          )}
          <button onClick={regenerateCdm} disabled={generating} style={{
            padding: "7px 14px", background: generating ? "#93c5fd" : "#2563eb",
            color: "#fff", border: "none", borderRadius: 6, cursor: generating ? "default" : "pointer", fontSize: 13, fontWeight: 600,
          }}>{generating ? "Generating…" : "↻ Regenerate"}</button>
          <button onClick={publishCity} disabled={publishing} style={{
            padding: "7px 16px",
            background: publishing ? "#6ee7b7" : isPublished ? "#f0fdf4" : "#16a34a",
            color: isPublished ? "#15803d" : "#fff",
            border: isPublished ? "1px solid #86efac" : "none",
            borderRadius: 6, cursor: publishing ? "default" : "pointer", fontSize: 13, fontWeight: 700,
          }}>{publishing ? "Publishing…" : isPublished ? "↺ Re-Publish" : "🚀 Publish"}</button>
          {isPublished && (
            <button onClick={unpublishCity} style={{
              padding: "7px 12px", background: "none", color: "#dc2626",
              border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer", fontSize: 12,
            }}>Unpublish</button>
          )}
          {saveMsg && (
            <span style={{ fontSize: 12, color: saveMsg.startsWith("✓") ? "#15803d" : saveMsg.startsWith("✗") ? "#dc2626" : "#374151", maxWidth: 280 }}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 14,
            fontWeight: activeTab === t.id ? 700 : 400,
            color: activeTab === t.id ? "#2563eb" : "#374151",
            background: "none",
            borderBottom: activeTab === t.id ? "2px solid #2563eb" : "2px solid transparent",
            marginBottom: -2, transition: "color 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 8px 8px" }}>

        {activeTab === "content" && city && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>H1 Title</label>
                  <div style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14 }}>{city.h1_title || "—"}</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    Meta Description
                    {city.meta_description && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400,
                        color: city.meta_description.length > 160 ? "#dc2626" : city.meta_description.length < 50 ? "#f59e0b" : "#22c55e" }}>
                        {city.meta_description.length} chars
                      </span>
                    )}
                  </label>
                  <div style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14 }}>{city.meta_description || "—"}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>County</label>
                  <div style={{ padding: "8px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}>{countyName(countySlug)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Contractors</label>
                  <div style={{ padding: "8px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}>{city.contractor_count}</div>
                </div>
                {(city.zip_codes ?? []).length > 0 && (
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>ZIP Codes</label>
                    <div style={{ padding: "8px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}>{(city.zip_codes ?? []).join(", ")}</div>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Live URL</label>
                  <a href={`https://www.nexabuilder.com/locations/${countySlug}/${slug}/`} target="_blank" rel="noreferrer"
                    style={{ display: "block", padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 13, color: "#2563eb" }}>
                    View page →
                  </a>
                </div>
              </div>

              {bodyHtml ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Page Content</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[false, true].map((isHtml) => (
                        <button key={String(isHtml)} onClick={() => setShowHtml(isHtml)} style={{
                          padding: "4px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer",
                          background: showHtml === isHtml ? "#2563eb" : "#f3f4f6",
                          color: showHtml === isHtml ? "#fff" : "#374151",
                          border: "1px solid " + (showHtml === isHtml ? "#2563eb" : "#d1d5db"),
                        }}>{isHtml ? "HTML" : "Preview"}</button>
                      ))}
                    </div>
                  </div>
                  {showHtml ? (
                    <textarea readOnly value={bodyHtml} style={{
                      width: "100%", minHeight: 400, padding: 12,
                      fontFamily: "monospace", fontSize: 12, lineHeight: 1.5,
                      border: "1px solid #e5e7eb", borderRadius: 6,
                      background: "#1e1e2e", color: "#cdd6f4",
                      resize: "vertical", boxSizing: "border-box",
                    }} />
                  ) : (
                    <div style={{ padding: "16px 20px", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 500, overflowY: "auto", fontSize: 14, lineHeight: 1.7, color: "#374151" }}
                      dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                  )}
                </div>
              ) : (
                <div style={{ padding: 24, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, color: "#c2410c", textAlign: "center" }}>
                  No page content yet — click ↻ Regenerate to generate CDM content for this city.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "schema" && (
          <SchemaTab city={city} onCityUpdated={setCity} />
        )}

        {activeTab === "seo-audit" && (
          <SeoAuditTab slug={slug} countySlug={countySlug} city={city} onCityUpdated={setCity} />
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

  // /locations/cities/:county/:slug  → city detail
  if (county && slug) return <CityDetailView countySlug={county} slug={slug} />;

  // /locations/cities/:county  → county detail
  if (county) return <CountyDetailView countySlug={county} />;

  // /locations/cities  → full city list
  return <CityListView />;
}

// ── County landing page (/locations) ──────────────────────────────────────
export function LocationsCountyPage() {
  return <CountyListView />;
}
