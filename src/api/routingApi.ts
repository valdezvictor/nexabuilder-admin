import {
  LeadTimelineResponse,
  RankedContractor,
} from "./routingTypes";

const BASE_URL = "/api";

export async function fetchLeadTimeline(
  leadId: number,
): Promise<LeadTimelineResponse> {
  const res = await fetch(`${BASE_URL}/leads/${leadId}/timeline`);
  if (!res.ok) throw new Error("Failed to fetch lead timeline");
  return res.json();
}

export async function fetchRoutingScore(
  leadId: number,
): Promise<RankedContractor[]> {
  const res = await fetch(
    `${BASE_URL}/routing/score?lead_id=${leadId}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to fetch routing score");
  const data = await res.json();
  return data.ranked_contractors;
}

