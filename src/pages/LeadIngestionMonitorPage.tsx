import { useEffect, useState } from "react";
import { listIngestionLogs } from "../api/leads";
import { LogTable } from "../components/LogTable";

export function LeadIngestionMonitorPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    listIngestionLogs().then(setLogs);
  }, []);

  return (
    <div>
      <h1>Lead Ingestion Logs</h1>
      <LogTable logs={logs} />
    </div>
  );
}
