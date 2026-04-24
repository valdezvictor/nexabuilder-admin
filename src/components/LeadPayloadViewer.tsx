export function LeadPayloadViewer({ payload }: { payload: any }) {
  if (!payload) return <div>No payload available.</div>;

  return (
    <div>
      <h3>Raw Payload</h3>
      <pre style={{ background: "#f5f5f5", padding: "1rem" }}>
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
