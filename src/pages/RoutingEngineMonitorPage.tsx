import { useEffect, useState } from "react";
import { listRoutingLogs } from "../api/routing";
import { LogTable } from "../components/LogTable";

export function RoutingEngineMonitorPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    listRoutingLogs().then(setLogs);
  }, []);

  return (
    <div>
      <h1>Routing Engine Logs</h1>
      <LogTable logs={logs} />
    </div>
  );
}
