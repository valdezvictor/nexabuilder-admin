import { Routes, Route, Navigate } from "react-router-dom";
import { AdminConsoleLayout } from "./layouts/AdminConsoleLayout";

import { DashboardHomePage } from "./pages/DashboardHomePage";
import { PartnersPage } from "./pages/PartnersPage";
import { PartnerDetailPage } from "./pages/PartnerDetailPage";
import { LeadIngestionMonitorPage } from "./pages/LeadIngestionMonitorPage";
import { RoutingEngineMonitorPage } from "./pages/RoutingEngineMonitorPage";
import { OptInAuditLogPage } from "./pages/OptInAuditLogPage";
import { SystemHealthPage } from "./pages/SystemHealthPage";
import { FeatureFlagsPage } from "./pages/FeatureFlagsPage";

import { LoginPage } from "./pages/Login";
import { RequireAuth } from "./components/RequireAuth";

// ⭐ NEW IMPORT
import RoutingCockpitPage from "./pages/routing/RoutingCockpitPage";

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected admin console */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminConsoleLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardHomePage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="partners/:id" element={<PartnerDetailPage />} />
        <Route path="ingestion" element={<LeadIngestionMonitorPage />} />
        <Route path="routing" element={<RoutingEngineMonitorPage />} />
        <Route path="optin" element={<OptInAuditLogPage />} />
        <Route path="system" element={<SystemHealthPage />} />
        <Route path="flags" element={<FeatureFlagsPage />} />

        {/* ⭐ NEW ROUTE */}
        <Route path="routing-cockpit" element={<RoutingCockpitPage />} />
      </Route>
    </Routes>
  );
}
