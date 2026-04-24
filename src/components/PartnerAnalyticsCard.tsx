export function PartnerAnalyticsCard({ data }: { data: any }) {
  return (
    <div>
      <h3>Partner Analytics</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

