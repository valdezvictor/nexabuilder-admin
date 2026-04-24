export function LogTable({ logs }: { logs: any[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Type</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((l, idx) => (
          <tr key={idx}>
            <td>{l.timestamp}</td>
            <td>{l.type}</td>
            <td>{l.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
