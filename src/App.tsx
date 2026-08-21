import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminConsoleLayout } from "./layouts/AdminConsoleLayout";
import { LoginPage }          from "./pages/Login";
import { VerifyPage }         from "./pages/Verify";
import { DashboardHomePage }  from "./pages/DashboardHomePage";
import { Leads }              from "./pages/Leads";
import { LeadDetail }         from "./pages/LeadDetail";
import { ContractorsPage }    from "./pages/ContractorsPage";
import { ContractorDetailPage } from "./pages/ContractorDetailPage";
import { OutreachPage }       from "./pages/OutreachPage";
import { BidsPage }           from "./pages/BidsPage";
import FinancingPage           from "./pages/FinancingPage";
import { EscrowPage }         from "./pages/EscrowPage";
import { RevenuePage } from "./pages/RevenuePageNew";
import { MetricsPage }        from "./pages/MetricsPage";
import { RoutingEnginePage }  from "./pages/RoutingEnginePage";
import RoutingCockpitPage     from "./pages/routing/RoutingCockpitPage";
import { PartnersPage }       from "./pages/PartnersPage";
import { PartnerDetailPage }  from "./pages/PartnerDetailPage";
import { SystemHealthPage }   from "./pages/SystemHealthPage";
import { FeatureFlagsPage }   from "./pages/FeatureFlagsPage";
import { OptInAuditLogPage }  from "./pages/OptInAuditLogPage";
import { UsersPage }           from "./pages/UsersPage";
import { BlogCmsPage }         from "./pages/BlogCmsPage";
import { EditorialPage }       from "./pages/EditorialPage";
import { MaterialsCmsPage }    from "./pages/MaterialsCmsPage";
import { MaterialsBulkPage }   from "./pages/MaterialsBulkPage";
import CRMPage from "./pages/CRMPage";
import GuidesAdminPage from "./pages/GuidesAdminPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  return localStorage.getItem("access_token")
    ? <>{children}</>
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route element={<RequireAuth><AdminConsoleLayout /></RequireAuth>}>
        <Route index                   element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"       element={<DashboardHomePage />} />
        <Route path="/users" element={<UsersPage />} />
          <Route path="/leads"           element={<Leads />} />
        <Route path="/leads/:id"       element={<LeadDetail />} />
        <Route path="/contractors"     element={<ContractorsPage />} />
        <Route path="/contractors/:id"   element={<ContractorDetailPage />} />
        <Route path="/outreach"        element={<OutreachPage />} />
        <Route path="/bids"            element={<BidsPage />} />
        <Route path="/financing"       element={<FinancingPage />} />
              <Route path="/escrow"          element={<EscrowPage />} />
        <Route path="/revenue"           element={<RevenuePage />} />
        <Route path="/metrics"         element={<MetricsPage />} />
        <Route path="/routing"         element={<RoutingEnginePage />} />
  <Route path="/crm"             element={<CRMPage />} />
        <Route path="/routing-cockpit" element={<RoutingCockpitPage />} />
        <Route path="/partners"        element={<PartnersPage />} />
        <Route path="/partners/:id"    element={<PartnerDetailPage />} />
        <Route path="/system"          element={<SystemHealthPage />} />
        <Route path="/flags"           element={<FeatureFlagsPage />} />
        <Route path="/optin"           element={<OptInAuditLogPage />} />
        <Route path="/blog"            element={<BlogCmsPage />} />
        <Route path="/editorial"       element={<EditorialPage />} />
        <Route path="/materials"       element={<MaterialsCmsPage />} />
        <Route path="/materials/bulk"  element={<MaterialsBulkPage />} />
        <Route path="/blog/:id"        element={<BlogCmsPage />} />
          <Route path="/guides-admin"      element={<GuidesAdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
