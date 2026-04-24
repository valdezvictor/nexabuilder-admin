export function SystemStatusCard({ health }: { health: any }) {
  return (
    <div>
      <h3>System Status</h3>
      <ul>
        <li>API Latency: {health.api_latency}ms</li>
        <li>Queue Depth: {health.queue_depth}</li>
        <li>Worker Status: {health.worker_status}</li>
        <li>Error Rate: {health.error_rate}%</li>
      </ul>
    </div>
  );
}
