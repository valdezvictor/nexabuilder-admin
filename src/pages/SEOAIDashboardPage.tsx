import React, { useEffect, useState } from "react";
import { http } from "../lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandSummary {
  status?: string;
  message?: string;
  brand?: string;
  overall_sentiment?: "positive" | "neutral" | "negative";
  sentiment_score?: number;        // 0–100
  mention_count?: number;
  top_themes?: string[];
  top_competitors?: { name: string; score: number }[];
  last_updated?: string;
}

interface HistoryEntry {
  date?: string;
  sentiment_score?: number;
  mention_count?: number;
}

interface CitationSource {
  source?: string;
  count?: number;
  last_seen?: string;
}

interface CitationSummary {
  by_source?: CitationSource[];
  daily_trend?: { date?: string; count?: number }[];
  total_citations?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sentimentColor = (s?: string) => {
  if (s === "positive") return "var(--green, #16a34a)";
  if (s === "negative") return "var(--red, #dc2626)";
  return "var(--muted, #64748b)";
};

const sentimentLabel = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const fmt = (n?: number) => (n == null ? "—" : n.toLocaleString());

const relDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 2)  return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

// ─── Mini bar chart (pure CSS, no deps) ───────────────────────────────────────

function MiniBarChart({
  data,
  valueKey,
  labelKey,
  color = "#3b82f6",
  height = 80,
}: {
  data: Record<string, any>[];
  valueKey: string;
  labelKey: string;
  color?: string;
  height?: number;
}) {
  if (!data.length) return <EmptyChart height={height} />;
  const max = Math.max(...data.map((d) => d[valueKey] ?? 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height, width: "100%" }}>
      {data.slice(-14).map((d, i) => {
        const pct = ((d[valueKey] ?? 0) / max) * 100;
        return (
          <div
            key={i}
            title={`${d[labelKey]}: ${d[valueKey] ?? 0}`}
            style={{
              flex: 1,
              height: `${Math.max(pct, 2)}%`,
              background: color,
              borderRadius: "2px 2px 0 0",
              opacity: 0.85,
              cursor: "default",
              transition: "opacity .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
          />
        );
      })}
    </div>
  );
}

function EmptyChart({ height = 80 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)",
        fontSize: 12,
        borderBottom: "1px dashed var(--border)",
      }}
    >
      No data yet
    </div>
  );
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 10,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? "var(--fg, #0f172a)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border, #e2e8f0)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {title}
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── No-data banner ───────────────────────────────────────────────────────────

function NoDataBanner() {
  return (
    <div
      style={{
        background: "#fffbeb",
        border: "1px solid #fcd34d",
        borderRadius: 10,
        padding: "16px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 24,
      }}
    >
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Perplexity API key not configured</div>
        <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
          Run:{" "}
          <code style={{ background: "#fef3c7", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>
            aws ssm put-parameter --name "/nexabuilder/api/PERPLEXITY_KEY" --value "pplx-..." --type SecureString --region us-west-1
          </code>
          , then update the Lambda env vars for{" "}
          <strong>nexabuilder-brand-perception</strong> and{" "}
          <strong>nexabuilder-citation-probe</strong>.
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SEOAIDashboardPage() {
  const [brand, setBrand]       = useState<BrandSummary | null>(null);
  const [history, setHistory]   = useState<HistoryEntry[]>([]);
  const [citations, setCitations] = useState<CitationSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [bRes, hRes, cRes] = await Promise.allSettled([
        http.get("/admin/brand-perception/summary"),
        http.get("/admin/brand-perception/history"),
        http.get("/admin/ai-citations/summary"),
      ]);
      if (bRes.status === "fulfilled") setBrand(bRes.value.data);
      if (hRes.status === "fulfilled") setHistory(hRes.value.data ?? []);
      if (cRes.status === "fulfilled") setCitations(cRes.value.data);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const noData = brand?.status === "no_data";
  const totalCitations =
    citations?.total_citations ??
    (citations?.by_source ?? []).reduce((s, r) => s + (r.count ?? 0), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "var(--muted)" }}>
        <div className="spinner" />
        Loading AI visibility data…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>SEO &amp; AI Visibility</h1>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Brand perception · AI citation tracking · Trend history
          </div>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => load(true)}
          disabled={refreshing}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          {refreshing ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Refreshing…</> : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "var(--red)", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {noData && <NoDataBanner />}

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <KpiTile
          label="Sentiment Score"
          value={brand?.sentiment_score != null ? `${brand.sentiment_score}` : "—"}
          sub={brand?.sentiment_score != null ? "out of 100" : "No data"}
          color={sentimentColor(brand?.overall_sentiment)}
        />
        <KpiTile
          label="Overall Sentiment"
          value={sentimentLabel(brand?.overall_sentiment)}
          sub={brand?.last_updated ? `Updated ${relDate(brand.last_updated)}` : "Not yet run"}
          color={sentimentColor(brand?.overall_sentiment)}
        />
        <KpiTile
          label="Brand Mentions"
          value={fmt(brand?.mention_count)}
          sub="in AI responses"
        />
        <KpiTile
          label="AI Citations"
          value={fmt(totalCitations || undefined)}
          sub={`across ${(citations?.by_source ?? []).length} sources`}
        />
      </div>

      {/* Brand perception + history */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card title="Brand Perception">
          {noData ? (
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
              {brand?.message ?? "No data available."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Sentiment gauge */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                  <span>Sentiment</span>
                  <span style={{ color: sentimentColor(brand?.overall_sentiment), fontWeight: 600 }}>
                    {sentimentLabel(brand?.overall_sentiment)}
                  </span>
                </div>
                <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${brand?.sentiment_score ?? 0}%`,
                      background: sentimentColor(brand?.overall_sentiment),
                      borderRadius: 99,
                      transition: "width .4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Top themes */}
              {(brand?.top_themes ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Top themes</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {brand!.top_themes!.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: 12,
                          padding: "3px 10px",
                          background: "var(--bg, #f8fafc)",
                          border: "1px solid var(--border)",
                          borderRadius: 99,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitors */}
              {(brand?.top_competitors ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>vs Competitors</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {brand!.top_competitors!.map((c) => (
                      <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, width: 120, flexShrink: 0 }}>{c.name}</span>
                        <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${c.score}%`, background: "#3b82f6", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--muted)", width: 32, textAlign: "right" }}>{c.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="Sentiment Trend (14d)">
          <MiniBarChart
            data={history}
            valueKey="sentiment_score"
            labelKey="date"
            color="#3b82f6"
            height={120}
          />
          {history.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
              <span>{history[0]?.date?.slice(5) ?? ""}</span>
              <span>{history[history.length - 1]?.date?.slice(5) ?? ""}</span>
            </div>
          )}
        </Card>
      </div>

      {/* AI Citations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Citations by Source">
          {(citations?.by_source ?? []).length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>No citation data yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Source", "Citations", "Last Seen"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontSize: 11, color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(citations?.by_source ?? []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 8px", fontWeight: 500 }}>{r.source ?? "—"}</td>
                    <td style={{ padding: "8px 8px" }}>{fmt(r.count)}</td>
                    <td style={{ padding: "8px 8px", color: "var(--muted)" }}>{relDate(r.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Citation Trend (14d)">
          <MiniBarChart
            data={citations?.daily_trend ?? []}
            valueKey="count"
            labelKey="date"
            color="#8b5cf6"
            height={120}
          />
          {(citations?.daily_trend ?? []).length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
              <span>{citations!.daily_trend![0]?.date?.slice(5) ?? ""}</span>
              <span>{citations!.daily_trend![citations!.daily_trend!.length - 1]?.date?.slice(5) ?? ""}</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
