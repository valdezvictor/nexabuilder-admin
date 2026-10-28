import React, { useState } from "react";

const PRESETS = [
  { label: "Pinterest — Talavera Gallery",  source: "pinterest",  medium: "social",   campaign: "talavera-tile",     url: "https://www.nexabuilder.com/materials/tile/talavera-tile/" },
  { label: "Pinterest — Pool Decking",       source: "pinterest",  medium: "social",   campaign: "travertine-pool",   url: "https://www.nexabuilder.com/materials/outdoor/travertine-pool-decking/" },
  { label: "Pinterest — Quartzite Counters", source: "pinterest",  medium: "social",   campaign: "quartzite-counters",url: "https://www.nexabuilder.com/materials/kitchen/quartzite-countertops/" },
  { label: "Pinterest — Saltillo Pavers",    source: "pinterest",  medium: "social",   campaign: "saltillo-pavers",   url: "https://www.nexabuilder.com/materials/outdoor/saltillo-pavers/" },
  { label: "Pinterest — Stone Soaking Tub",  source: "pinterest",  medium: "social",   campaign: "stone-soaking-tub", url: "https://www.nexabuilder.com/materials/bathroom/custom-stone-soaking-tub/" },
  { label: "Pinterest — Carved Wood Doors",  source: "pinterest",  medium: "social",   campaign: "carved-wood-doors", url: "https://www.nexabuilder.com/materials/doors/carved-wood-doors/" },
  { label: "Pool LP — Google Organic",       source: "google",     medium: "organic",  campaign: "pool-socal",        url: "https://www.nexabuilder.com/services/pool-installation/" },
  { label: "Kitchen LP — Email Blast",       source: "email",      medium: "email",    campaign: "july-kitchen",      url: "https://www.nexabuilder.com/services/home-remodeling/" },
  { label: "NexaBuilder Home — Direct",      source: "direct",     medium: "referral", campaign: "brand",             url: "https://www.nexabuilder.com/" },
];

const SOURCES = ["pinterest","google","instagram","email","facebook","bing","direct","tiktok","referral"];
const MEDIUMS = ["social","organic","cpc","email","referral","display","sms"];

export const UTMLinkBuilder: React.FC = () => {
  const [url,      setUrl]      = useState("https://www.nexabuilder.com/");
  const [source,   setSource]   = useState("pinterest");
  const [medium,   setMedium]   = useState("social");
  const [campaign, setCampaign] = useState("");
  const [content,  setContent]  = useState("");
  const [copied,   setCopied]   = useState(false);

  const loadPreset = (p: typeof PRESETS[0]) => {
    setUrl(p.url);
    setSource(p.source);
    setMedium(p.medium);
    setCampaign(p.campaign);
    setContent("");
    setCopied(false);
  };

  const buildURL = () => {
    if (!url || !source) return "";
    const base = url.includes("?") ? url + "&" : url + "?";
    const params = new URLSearchParams();
    if (source)   params.set("utm_source",   source);
    if (medium)   params.set("utm_medium",   medium);
    if (campaign) params.set("utm_campaign", campaign);
    if (content)  params.set("utm_content",  content);
    return base + params.toString();
  };

  const finalURL = buildURL();

  const copy = async () => {
    if (!finalURL) return;
    await navigator.clipboard.writeText(finalURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    background: "rgba(255,255,255,.05)",
    border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text)",
    fontSize: 13, fontFamily: "inherit",
    outline: "none", transition: "border-color .15s",
  };

  const sel: React.CSSProperties = {
    ...inp,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238b9ab0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
    paddingRight: 32, appearance: "none" as any, cursor: "pointer",
  };

  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: ".06em", color: "var(--muted)", marginBottom: 5, display: "block"
  };

  const sourceColor: Record<string, string> = {
    pinterest: "#e60023", google: "#4285f4", instagram: "#c13584",
    email: "#D4A435", facebook: "#1877f2", bing: "#008373",
    direct: "#6b7280", tiktok: "#010101", referral: "#8b5cf6"
  };

  return (
    <div style={{ padding: "16px 0" }}>
      {/* Presets */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ ...lbl, marginBottom: 8 }}>Quick Presets</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => loadPreset(p)} style={{
              padding: "5px 11px", fontSize: 11, fontWeight: 600,
              background: source === p.source && campaign === p.campaign
                ? `${sourceColor[p.source] || "#6b7280"}22`
                : "rgba(255,255,255,.04)",
              border: `1px solid ${source === p.source && campaign === p.campaign
                ? sourceColor[p.source] || "#6b7280"
                : "var(--border)"}`,
              borderRadius: 20, color: source === p.source && campaign === p.campaign
                ? sourceColor[p.source] || "var(--text)"
                : "var(--muted)",
              cursor: "pointer", transition: "all .12s",
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={lbl}>Destination URL *</label>
          <input style={inp} value={url}
            onChange={e => { setUrl(e.target.value); setCopied(false); }}
            placeholder="https://www.nexabuilder.com/materials/tile/talavera-tile/" />
        </div>
        <div>
          <label style={lbl}>UTM Source *</label>
          <select style={sel} value={source}
            onChange={e => { setSource(e.target.value); setCopied(false); }}>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>UTM Medium *</label>
          <select style={sel} value={medium}
            onChange={e => { setMedium(e.target.value); setCopied(false); }}>
            {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>UTM Campaign</label>
          <input style={inp} value={campaign}
            onChange={e => { setCampaign(e.target.value.toLowerCase().replace(/\s+/g,"-")); setCopied(false); }}
            placeholder="talavera-tile" />
        </div>
        <div>
          <label style={lbl}>UTM Content <span style={{ fontWeight:400, opacity:.6 }}>(optional — ad variant)</span></label>
          <input style={inp} value={content}
            onChange={e => { setContent(e.target.value); setCopied(false); }}
            placeholder="gallery-hero-pin" />
        </div>
      </div>

      {/* Output */}
      {finalURL && (
        <div style={{
          background: "rgba(0,0,0,.25)", border: "1px solid var(--border)",
          borderRadius: 10, overflow: "hidden"
        }}>
          <div style={{
            padding: "8px 14px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: sourceColor[source] || "#6b7280"
              }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: ".05em" }}>
                {source} / {medium}{campaign ? ` / ${campaign}` : ""}
              </span>
            </div>
            <button onClick={copy} style={{
              padding: "5px 14px", fontSize: 12, fontWeight: 700,
              background: copied ? "#22c55e" : "var(--gold)",
              color: copied ? "#fff" : "var(--navy)",
              border: "none", borderRadius: 6, cursor: "pointer",
              transition: "background .15s",
            }}>
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
          <div style={{
            padding: "10px 14px", fontFamily: "monospace", fontSize: 12,
            color: "var(--text)", wordBreak: "break-all", lineHeight: 1.6
          }}>
            <span style={{ color: "var(--muted)" }}>
              {finalURL.split("?")[0]}
            </span>
            <span style={{ color: sourceColor[source] || "var(--gold)" }}>
              ?{finalURL.split("?")[1]}
            </span>
          </div>
        </div>
      )}

      {/* Quick share notes */}
      <div style={{
        marginTop: 12, padding: "10px 14px",
        background: "rgba(212,164,53,.06)", border: "1px solid rgba(212,164,53,.15)",
        borderRadius: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.6
      }}>
        💡 <strong style={{ color: "var(--text)" }}>Tip:</strong> Use this link anywhere you share NexaBuilder content.
        The Traffic Sources widget in Metrics will show visits by source as soon as someone clicks.
        Pinterest pins should use <code style={{ color: "var(--gold)" }}>utm_source=pinterest&utm_medium=social</code>.
      </div>
    </div>
  );
};
