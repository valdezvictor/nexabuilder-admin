import { useEffect, useState } from "react";
import { listOptInEvents } from "../api/leads";
import { OptInHistoryCard } from "../components/OptInHistoryCard";

export function OptInAuditLogPage() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    listOptInEvents().then(setEvents);
  }, []);

  return (
    <div>
      <h1>Opt‑In Audit Log</h1>
      <OptInHistoryCard events={events} />
    </div>
  );
}
