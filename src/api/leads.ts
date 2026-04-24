import { http } from "../lib/http";

export const listIngestionLogs = (params?: any) =>
  http.get("/admin/logs/ingestion", { params }).then(r => r.data);

export const listOptInEvents = (params?: any) =>
  http.get("/admin/logs/optin", { params }).then(r => r.data);
