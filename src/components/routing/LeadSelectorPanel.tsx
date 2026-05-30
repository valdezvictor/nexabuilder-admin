import React from "react";

interface Props {
  selectedLeadId: number;
  onSelectLead: (id: number) => void;
}

const LeadSelectorPanel: React.FC<Props> = ({
  selectedLeadId,
  onSelectLead,
}) => {
  return (
    <div className="card">
      <h2 className="card-title" style={{ marginBottom:10 }}>Lead Selector</h2>
      <label style={{ fontSize:13 }}>
        Lead ID:
        <input
          type="number"
          style={{ marginLeft:10, padding:"6px 10px", border:"1.5px solid var(--border)", borderRadius:7, fontSize:13, fontFamily:"inherit" }}
          value={selectedLeadId}
          onChange={(e) => onSelectLead(Number(e.target.value))}
        />
      </label>
    </div>
  );
};

export default LeadSelectorPanel;

