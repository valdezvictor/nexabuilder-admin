export interface TimelineEvent {
  id: number;
  event_type: string;
  payload: any;
  created_at: string;
  contractor_id: number | null;
}

export interface AssignedContractor {
  id: number;
  name: string;
  performance_score?: number | null;
}

export interface LeadTimelineResponse {
  id: number;
  vertical?: string | null;
  city?: string | null;
  state?: string | null;
  ai_score?: number | null;
  contractor?: AssignedContractor | null;
  events: TimelineEvent[];
  performance_deltas: number[];
}

export interface RankedContractor {
  contractor_id: number;
  score: number;
  explanations: string[];
}

