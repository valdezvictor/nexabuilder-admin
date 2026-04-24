import { http } from "../lib/http";

export const listRoutingLogs = (params?: any) =>
  http.get("/admin/logs/routing", { params }).then(r => r.data);
