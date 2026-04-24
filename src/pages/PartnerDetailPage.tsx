import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { listPartners, getPartnerAnalytics } from "../api/partners";
import { PartnerDetailCard } from "../components/PartnerDetailCard";
import { PartnerAnalyticsCard } from "../components/PartnerAnalyticsCard";

export function PartnerDetailPage() {
  const { id } = useParams();
  const [partner, setPartner] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);

  useEffect(() => {
    listPartners().then(list => {
      const p = list.find((x: any) => String(x.id) === String(id));
      setPartner(p);
      if (p) getPartnerAnalytics(p.name).then(setAnalytics);
    });
  }, [id]);

  if (!partner) return <div>Loading…</div>;

  return (
    <div>
      <h1>{partner.name}</h1>
      <PartnerDetailCard partner={partner} />
      {analytics && <PartnerAnalyticsCard data={analytics} />}
    </div>
  );
}
