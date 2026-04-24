import React from "react";
import { RankedContractor } from "../../api/routingTypes";

const RankedContractorsPanel: React.FC<{ ranked: RankedContractor[] }> = ({
  ranked,
}) => {
  return (
    <div className="border rounded p-3 bg-white shadow-sm h-full overflow-auto">
      <h2 className="font-semibold mb-3">Ranked Contractors</h2>

      {ranked.length === 0 ? (
        <div className="text-sm text-gray-500">No eligible contractors.</div>
      ) : (
        <ul className="space-y-2 text-sm">
          {ranked.map((c) => (
            <li key={c.contractor_id} className="border-b pb-2">
              <div className="font-medium">
                Contractor #{c.contractor_id} — Score {c.score.toFixed(4)}
              </div>
              <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
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

