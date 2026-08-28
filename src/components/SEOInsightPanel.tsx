import React, { useState } from "react";

interface KeywordRow {
  query: string;
  page?: string;
  impressions: number;
  clicks: number;
  avg_position: number | string;
  vertical?: string;
}

interface Insight {
  loading: boolean;
  text: string | null;
  error: string | null;
}

interface Props {
  row: KeywordRow | null;
  onClose: () => void;
}

const posColor = (pos: number) =>
  pos <= 10 ? "#22c55e" : pos <= 20 ? "#D4A435" : pos <= 50 ? "#f97316" : "#ef4444";

const posLabel = (pos: number) =>
  pos <= 3 ? "Top 3 🏆" : pos <= 10 ? "Page 1" : pos <= 20 ? "Page 2" : pos <= 50 ? "Pages 3-5" : "Page 6+";

function pageSlug(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export const SEOInsightPanel: React.FC<Props> = ({ row, onClose }) => {
  const [insight, setInsight] = useState<Insight>({ loading: false, text: null, error: null });

  const pos = Number(row?.avg_position || 0);
  const slug = pageSlug(row?.page);

  const runAnalysis = async () => {
    if (!row) return;
    setInsight({ loading: true, text: null, error: null });

    try {
      // Route through backend to avoid CORS — backend holds the Anthropic API key
      const CMS_KEY = import.meta.env.VITE_CMS_ADMIN_KEY || "";
      const response = await fetch("https://api.nexabuilder.com/api/ai/seo-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": CMS_KEY,
        },
        body: JSON.stringify({
          query:       row.query,
          page:        row.page || "",
          impressions: row.impressions,
          clicks:      row.clicks,
          position:    Number(row.avg_position || 0),
          vertical:    row.vertical || "general",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `Server error ${response.status}`);
      const text = data.insight || "";
      setInsight({ loading: false, text, error: null });
    } catch (err: any) {
      setInsight({ loading: false, text: null, error: "Analysis failed. Try again." });
    }
  };

  if (!row) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
          zIndex: 1000, backdropFilter: "blur(2px)"
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(560px, 100vw)",
        background: "#141b26",
        borderLeft: "1px solid #1e2d42",
        zIndex: 1001, overflowY: "auto",
        boxShadow: "-8px 0 40px rgba(0,0,0,.4)",
        display: "flex", flexDirection: "column"
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid #1e2d42",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          background: "rgba(0,0,0,.2)", position: "sticky", top: 0, zIndex: 2
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: ".08em", color: "#4285f4", marginBottom: 4 }}>
              SEO Intelligence
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff",
              lineHeight: 1.3, wordBreak: "break-word" }}>
              "{row.query}"
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#8b9ab0",
            fontSize: 20, cursor: "pointer", padding: "0 0 0 12px", lineHeight: 1,
            flexShrink: 0
          }}>✕</button>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          borderBottom: "1px solid #1e2d42"
        }}>
          {[
            { label: "Impressions", value: row.impressions, color: "#fff" },
            { label: "Clicks", value: row.clicks, color: row.clicks > 0 ? "#22c55e" : "#8b9ab0" },
            { label: "Position", value: pos.toFixed(1), color: posColor(pos), sub: posLabel(pos) },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "12px 16px", textAlign: "center",
              borderRight: i < 2 ? "1px solid #1e2d42" : "none"
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              {s.sub && <div style={{ fontSize: 10, color: s.color, marginTop: 1 }}>{s.sub}</div>}
              <div style={{ fontSize: 10, color: "#8b9ab0", textTransform: "uppercase",
                letterSpacing: ".05em", marginTop: 3 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Page link */}
        <div style={{
          padding: "10px 20px", borderBottom: "1px solid #1e2d42",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"
        }}>
          <div style={{ fontSize: 11, color: "#8b9ab0", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: ".05em" }}>
            Page:
          </div>
          <a href={row.page} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#4285f4", fontFamily: "monospace",
              textDecoration: "none", wordBreak: "break-all" }}>
            {slug || row.page}
          </a>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
            {row.page ? (
              <a href={`https://www.nexabuilder.com${row.page.startsWith('/') ? '' : '/'}${row.page}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  fontSize: 11, padding: "4px 10px", background: "rgba(66,133,244,.1)",
                  border: "1px solid rgba(66,133,244,.3)", borderRadius: 6,
                  color: "#4285f4", textDecoration: "none", fontWeight: 600
                }}>
                View Page ↗
              </a>
            ) : (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11, padding: "4px 10px", background: "rgba(100,100,100,.1)",
                  border: "1px solid rgba(100,100,100,.2)", borderRadius: 6,
                  color: "#8b9ab0", fontWeight: 600
                }}>No page yet</span>
                <a href={`/blog?tab=topics&seed=${encodeURIComponent(row.query || '')}&type=article`}
                  title="Add to article topic queue"
                  style={{
                    fontSize: 11, padding: "4px 10px", background: "rgba(22,163,74,.1)",
                    border: "1px solid rgba(22,163,74,.3)", borderRadius: 6,
                    color: "#16a34a", textDecoration: "none", fontWeight: 600
                  }}>+ Article</a>
                <a href={`/blog?tab=topics&seed=${encodeURIComponent(row.query || '')}&type=page`}
                  title="Add to service/location page queue"
                  style={{
                    fontSize: 11, padding: "4px 10px", background: "rgba(124,58,237,.1)",
                    border: "1px solid rgba(124,58,237,.3)", borderRadius: 6,
                    color: "#7c3aed", textDecoration: "none", fontWeight: 600
                  }}>+ Page</a>
              </div>
            )}
            {row.page ? (
              <a href={`/blog?search=${encodeURIComponent(row.query || '')}`}
                style={{
                  fontSize: 11, padding: "4px 10px", background: "rgba(212,164,53,.1)",
                  border: "1px solid rgba(212,164,53,.3)", borderRadius: 6,
                  color: "#D4A435", textDecoration: "none", fontWeight: 600
                }}>
                Edit in CMS ✏️
              </a>
            ) : (
              <a href={`/blog?tab=topics&seed=${encodeURIComponent(row.query || '')}`}
                style={{
                  fontSize: 11, padding: "4px 10px", background: "rgba(22,163,74,.1)",
                  border: "1px solid rgba(22,163,74,.3)", borderRadius: 6,
                  color: "#16a34a", textDecoration: "none", fontWeight: 600
                }}>
                + Create Article
              </a>
            )}
          </div>
        </div>

        {/* AI Analysis section */}
        <div style={{ padding: "16px 20px", flex: 1 }}>

          {!insight.text && !insight.loading && !insight.error && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 700,
                marginBottom: 8 }}>
                AI SEO Analysis
              </div>
              <div style={{ fontSize: 13, color: "#8b9ab0", marginBottom: 20,
                lineHeight: 1.6 }}>
                Get specific recommendations to improve this query's ranking — why it's at position
                {" "}{pos.toFixed(1)}, what to fix first, and exactly what to update in the CMS.
              </div>
              <button onClick={runAnalysis} style={{
                padding: "10px 24px", background: "#4285f4", color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14,
                cursor: "pointer"
              }}>
                Analyze with AI
              </button>
            </div>
          )}

          {insight.loading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 12, animation: "spin 1s linear infinite" }}>⚙️</div>
              <div style={{ fontSize: 13, color: "#8b9ab0" }}>
                Analyzing ranking factors for "{row.query}"...
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {insight.error && (
            <div style={{ padding: "16px", background: "rgba(239,68,68,.1)",
              border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#ef4444" }}>{insight.error}</div>
              <button onClick={runAnalysis} style={{
                marginTop: 10, padding: "6px 14px", background: "none",
                border: "1px solid #ef4444", borderRadius: 6, color: "#ef4444",
                fontSize: 12, cursor: "pointer"
              }}>
                Try Again
              </button>
            </div>
          )}

          {insight.text && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: ".06em", color: "#4285f4" }}>
                  AI Recommendations
                </div>
                <button onClick={runAnalysis} style={{
                  fontSize: 11, padding: "3px 9px", background: "none",
                  border: "1px solid #1e2d42", borderRadius: 6,
                  color: "#8b9ab0", cursor: "pointer"
                }}>
                  ↻ Re-analyze
                </button>
              </div>
              <InsightRenderer text={insight.text} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Renders the markdown-like AI output into styled sections
const InsightRenderer: React.FC<{ text: string }> = ({ text }) => {
  const sectionColors: Record<string, string> = {
    "Why This Position":          "#8b9ab0",
    "Quick Wins":                  "#22c55e",
    "Content Gaps":                "#f97316",
    "Internal Linking Opportunity":"#a78bfa",
    "CMS Action":                  "#D4A435",
  };

  const sections = text.split(/^## /m).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {sections.map((section, i) => {
        const lines = section.trim().split("\n");
        const title = lines[0].trim();
        const body = lines.slice(1).join("\n").trim();
        const color = Object.entries(sectionColors).find(([k]) => title.includes(k))?.[1] || "#8b9ab0";

        return (
          <div key={i} style={{
            background: "rgba(0,0,0,.2)",
            border: `1px solid ${color}30`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 8, padding: "12px 14px"
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase",
              letterSpacing: ".07em", color, marginBottom: 8 }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: "#fcfcfc", lineHeight: 1.65 }}>
              {body.split("\n").map((line, j) => {
                if (line.startsWith("- ") || line.match(/^\d+\./)) {
                  return (
                    <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <span style={{ color, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>→</span>
                      <span>{line.replace(/^[-*]\s|^\d+\.\s/, "").trim()}</span>
                    </div>
                  );
                }
                return line.trim() ? (
                  <p key={j} style={{ margin: "0 0 4px 0" }}>{line}</p>
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
