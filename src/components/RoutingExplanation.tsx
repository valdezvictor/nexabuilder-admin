export function RoutingExplanation({ items }: { items: any[] }) {
  if (!items?.length) return <div>No routing explanation available.</div>;

  return (
    <div>
      <h3>Routing Explanation</h3>
      {items.map((item, idx) => (
        <div key={idx} style={{ marginBottom: "1rem" }}>
          <h4>{item.business_name}</h4>
          <ul>
            {item.reasons?.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div>Routing score: {item.routing_score}</div>
          <div>AI score: {item.ai_score}</div>
        </div>
      ))}
    </div>
  );
}
