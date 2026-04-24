import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../state/auth";

export function AdminConsoleLayout() {
  const { logout } = useAuth();

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2>NexABuilder Admin</h2>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/partners">Partners</Link>
          <Link to="/ingestion">Lead Ingestion</Link>
          <Link to="/routing">Routing Engine</Link>
          <Link to="/routing-cockpit">Routing Cockpit</Link>
          <Link to="/optin">Opt‑In Audit</Link>
          <Link to="/system">System Health</Link>
          <Link to="/flags">Feature Flags</Link>
        </nav>

        {/* This now triggers the full cleanup and redirect */}
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
