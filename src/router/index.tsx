import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminConsoleLayout } from "../layouts/AdminConsoleLayout";

// Pages
import RoutingCockpitPage from "../pages/routing/RoutingCockpitPage";

const AppRouter = () => {
  return (
    <Routes>
      {/* Wrap all admin pages in the main layout */}
      <Route element={<AdminConsoleLayout />}>
        <Route path="/" element={<Navigate to="/routing-cockpit" replace />} />

        {/* Routing Cockpit */}
        <Route path="/routing-cockpit" element={<RoutingCockpitPage />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;

