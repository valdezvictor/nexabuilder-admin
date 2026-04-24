import { http } from "../lib/http";

export interface DashboardStats {
  total_leads: number;
  routing_success: string;
  active_partners: number;
  system_status: string;
}

export async function fetchDashboardStats() {
  // This hits https://admin.nexabuilder.com/api/dashboard/stats
  const res = await http.get<DashboardStats>("/dashboard/stats");
  return res.data;
}
