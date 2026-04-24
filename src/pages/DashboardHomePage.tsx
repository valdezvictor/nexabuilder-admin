import React, { useEffect, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { fetchDashboardStats, DashboardStats } from "../api/dashboard";

import {
  fetchTotalLeadsToday,
  fetchRoutingSuccessRate,
  fetchActivePartners,
  fetchSystemHealth
} from "../api/adminMetrics";

export function DashboardHomePage() {
  const [leadsToday, setLeadsToday] = useState<number | null>(null);
  const [routingRate, setRoutingRate] = useState<number | null>(null);
  const [activePartners, setActivePartners] = useState<number | null>(null);
  const [systemHealth, setSystemHealth] = useState<string>("Loading...");

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLeadsToday(await fetchTotalLeadsToday());
        setRoutingRate(await fetchRoutingSuccessRate());
        setActivePartners(await fetchActivePartners());
        setSystemHealth(await fetchSystemHealth());
      } catch (err) {
        console.error("Dashboard metrics failed:", err);
        setSystemHealth("Error");
      }
    }
    loadMetrics();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <div>
        <h3>Total Leads Today</h3>
        <p>{leadsToday ?? "Loading..."}</p>
      </div>

      <div>
        <h3>Routing Success Rate</h3>
        <p>{routingRate !== null ? `${routingRate}%` : "Loading..."}</p>
      </div>

      <div>
        <h3>Active Partners</h3>
        <p>{activePartners ?? "Loading..."}</p>
      </div>

      <div>
        <h3>System Health</h3>
        <p>{systemHealth}</p>
      </div>
    </div>
  );
}
