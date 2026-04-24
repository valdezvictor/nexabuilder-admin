import { http } from "../lib/http";

export const listPartners = () =>
  http.get("/admin/partner-keys").then(r => r.data);

export const getPartnerAnalytics = (source: string) =>
  http.get(`/admin/partner-analytics/${source}`).then(r => r.data);
