import { useEffect, useState } from "react";
import { listPartners } from "../api/partners";
import { PartnerTable } from "../components/PartnerTable";

export function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);

  useEffect(() => {
    listPartners().then(setPartners);
  }, []);

  return (
    <div>
      <h1>Partners</h1>
      <PartnerTable partners={partners} />
    </div>
  );
}
