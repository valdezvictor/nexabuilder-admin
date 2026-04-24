import { useEffect, useState } from "react";
import { getSystemHealth } from "../api/system";
import { SystemStatusCard } from "../components/SystemStatusCard";

export function SystemHealthPage() {
  const [health, setHealth] = useState<any | null>(null);

  useEffect(() => {
    getSystemHealth().then(setHealth);
  }, []);

  return (
    <div>
      <h1>System Health</h1>
      {health && <SystemStatusCard health={health} />}
    </div>
  );
}
