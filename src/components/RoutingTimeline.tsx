export function RoutingTimeline({ events }: { events: any[] }) {
  if (!events?.length) return <div>No routing events recorded.</div>;

  return (
    <div>
      <h3>Routing Timeline</h3>
      <ul>
        {events.map((e, idx) => (
          <li key={idx}>
            <strong>{e.type}</strong> — {e.timestamp} — {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
