import React from "react";
import { RankedContractor } from "../../api/routingTypes";

const RankedContractorsPanel: React.FC<{ ranked: RankedContractor[] }> = ({
  ranked,
}) => {
  return (
    <div className="card" style={{ height:"100%", overflow:"auto" }}>
      <h2 className="card-title" style={{ marginBottom:12 }}>Ranked Contractors</h2>

      {ranked.length === 0 ? (
        <div style={{ fontSize:13, color:"var(--muted)" }}>No eligible contractors.</div>
      ) : (
        <ul style={{ listStyle:"none", margin:0, padding:0 }}>
          {ranked.map((c) => (
            <li key={c.contractor_id} style={{ borderBottom:"1px solid var(--border)", paddingBottom:8, marginBottom:8 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>
                Contractor #{c.contractor_id} — Score {c.score.toFixed(4)}
              </div>
              <ul style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>
                {c.explanations.map((ex, idx) => (
                  <li key={idx}>{ex}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RankedContractorsPanel;

