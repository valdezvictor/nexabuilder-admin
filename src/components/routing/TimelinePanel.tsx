import React from "react";
import { TimelineEvent } from "../../api/routingTypes";

const TimelinePanel: React.FC<{ events: TimelineEvent[] }> = ({
  events,
}) => {
  return (
    <div className="border rounded p-3 bg-white shadow-sm h-full overflow-auto">
      <h2 className="font-semibold mb-3">Routing Timeline</h2>
      <ul className="space-y-2 text-sm">
        {events.map((e) => (
          <li key={e.id} className="border-b pb-2">
            <div className="font-medium">{e.event_type}</div>
            <div className="text-xs text-gray-500">
              {new Date(e.created_at).toLocaleString()}
            </div>
            <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TimelinePanel;

