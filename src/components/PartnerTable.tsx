export function PartnerTable({ partners }: { partners: any[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>API Key</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {partners.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{p.key.slice(0, 6)}****</td>
            <td>{p.active ? "Active" : "Inactive"}</td>
            <td>{p.created_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
