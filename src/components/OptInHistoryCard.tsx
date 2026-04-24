export function OptInHistoryCard({ events }: { events: any[] }) {
  if (!events?.length) return <div>No opt‑in events found.</div>;

  return (
    <div>
      <h3>Opt‑In History</h3>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Source</th>
            <th>Timestamp</th>
            <th>IP</th>
            <th>User Agent</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, idx) => (
            <tr key={idx}>
              <td>{e.event_type}</td>
              <td>{e.source}</td>
              <td>{new Date(e.created_at).toLocaleString()}</td>
              <td>{e.evidence?.ip || "—"}</td>
              <td>{e.evidence?.user_agent || "—"}</td>
              <td>
                {e.evidence?.screenshot_url ? (
                  <a
                    href={e.evidence.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Screenshot
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
