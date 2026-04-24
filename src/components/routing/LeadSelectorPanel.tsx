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
    <div className="border rounded p-3 bg-white shadow-sm">
      <h2 className="font-semibold mb-2">Lead Selector</h2>
      <label className="text-sm">
        Lead ID:
        <input
          type="number"
          className="ml-2 border rounded px-2 py-1 text-sm"
          value={selectedLeadId}
          onChange={(e) => onSelectLead(Number(e.target.value))}
        />
      </label>
    </div>
  );
};

export default LeadSelectorPanel;

