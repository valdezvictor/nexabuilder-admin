import { http } from "../lib/http";

export async function fetchTotalLeadsToday() {
  const res = await http.get("/admin/metrics/leads/today");
  return res.data.total;
}

export async function fetchRoutingSuccessRate() {
  const res = await http.get("/admin/metrics/routing/success-rate");
  return res.data.rate;
}

export async function fetchActivePartners() {
  const res = await http.get("/admin/metrics/partners/active");
  return res.data.count;
}

export async function fetchSystemHealth() {
  const res = await http.get("/admin/metrics/system-health");
  return res.data.status;
}
