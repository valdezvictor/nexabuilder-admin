export function PartnerDetailCard({ partner }: { partner: any }) {
  return (
    <div>
      <h3>Partner Info</h3>
      <ul>
        <li>ID: {partner.id}</li>
        <li>Name: {partner.name}</li>
        <li>API Key: {partner.key}</li>
        <li>Status: {partner.active ? "Active" : "Inactive"}</li>
      </ul>
    </div>
  );
}
