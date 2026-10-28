import React from "react";
import { TimelineEvent } from "../../api/routingTypes";

const TimelinePanel: React.FC<{ events: TimelineEvent[] }> = ({
  events,
}) => {
  return (
    <div className="card" style={{ height:"100%", overflow:"auto" }}>
      <h2 className="card-title" style={{ marginBottom:12 }}>Routing Timeline</h2>
      <ul style={{ listStyle:"none", margin:0, padding:0 }}>
        {events.map((e) => (
          <li key={e.id} style={{ borderBottom:"1px solid var(--border)", paddingBottom:8, marginBottom:8 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{e.event_type}</div>
            <div style={{ fontSize:11, color:"var(--muted)" }}>
              {new Date(e.created_at).toLocaleString()}
            </div>
            <pre style={{ marginTop:6, background:"var(--bg)", padding:8, borderRadius:6, fontSize:11, overflowX:"auto" }}>
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TimelinePanel;

