import React from "react";
import { LeadTimelineResponse } from "../../api/routingTypes";

const LeadDetailsCard: React.FC<{ timeline: LeadTimelineResponse }> = ({
  timeline,
}) => {
  const { id, vertical, city, state, ai_score, contractor } = timeline;

  return (
    <div className="border rounded p-3 bg-white shadow-sm">
      <h2 className="font-semibold mb-2">Lead #{id}</h2>
      <div className="text-sm space-y-1">
        <div><strong>Vertical:</strong> {vertical}</div>
        <div><strong>Location:</strong> {city}, {state}</div>
        <div><strong>AI Score:</strong> {ai_score}</div>

        {contractor && (
          <>
            <div className="mt-2 font-semibold">Assigned Contractor</div>
            <div>{contractor.name} (#{contractor.id})</div>
            <div>Performance: {contractor.performance_score?.toFixed(2)}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadDetailsCard;

