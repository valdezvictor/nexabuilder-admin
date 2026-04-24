import { http } from "../lib/http";

export const getSystemHealth = () =>
  http.get("/admin/system/health").then(r => r.data);

export const listFeatureFlags = () =>
  http.get("/admin/flags").then(r => r.data);

export const updateFeatureFlag = (key: string, value: boolean) =>
  http.post(`/admin/flags/${key}`, { value }).then(r => r.data);
