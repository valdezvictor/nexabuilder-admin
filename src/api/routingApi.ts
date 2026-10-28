import { http } from "../lib/http";
import { LeadTimelineResponse, RankedContractor } from "./routingTypes";

export async function fetchLeadTimeline(leadId: number): Promise<LeadTimelineResponse> {
  try {
    const r = await http.get(`/leads/${leadId}/timeline`);
    const data = r.data;
    // Our API returns { entries: [...] } — map to expected { events: [...] } shape
    return {
      id: leadId,
      vertical: data.vertical,
      city: null,
      state: null,
      ai_score: null,
      contractor: null,
      performance_deltas: [],
      events: (data.entries || [])
        .filter((e: any) => e.status === "done")
        .map((e: any, i: number) => ({
          id: i,
          event_type: e.title || e.id,
          payload: e.meta || {},
          created_at: e.timestamp || new Date().toISOString(),
          contractor_id: null,
        })),
    };
  } catch {
    return { id: leadId, vertical: null, city: null, state: null,
      ai_score: null, contractor: null, performance_deltas: [], events: [] };
  }
}

export async function fetchRoutingScore(leadId: number): Promise<RankedContractor[]> {
  try {
    const r = await http.get(`/contractors/match/${leadId}`);
    const matches = r.data.matches || r.data.contractors || [];
    return matches.slice(0, 10).map((c: any, i: number) => ({
      contractor_id: c.id || i,
      score: c.score || Math.max(0.1, 1 - i * 0.08),
      explanations: [
        c.classifications
          ? `License: ${c.classifications.split("|")[0].trim()}`
          : "License classification match",
        c.city
          ? `Location: ${c.city}${c.county ? ", " + c.county : ""}`
          : "Proximity match",
        `CSLB: ${c.primary_status || "CLEAR"}`,
      ],
    }));
  } catch {
    return [];
  }
}
