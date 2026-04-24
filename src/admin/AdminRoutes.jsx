import { Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout";

import DashboardPage from "./dashboard/DashboardPage";
import LeadsPage from "./leads/LeadsPage";
import ContractorsPage from "./contractors/ContractorsPage";

export default function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/contractors" element={<ContractorsPage />} />
      </Routes>
    </AdminLayout>
  );
}
