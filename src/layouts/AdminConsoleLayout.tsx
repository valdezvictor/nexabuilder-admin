import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { http, setAccessToken } from "../lib/http";

type User = { email: string; role: string; };

const NAV = [
  { section: "Overview" },
  { to: "/dashboard",       icon: "📊", label: "Dashboard"          },
  { to: "/leads",           icon: "📋", label: "Leads"              },
  { to: "/contractors",     icon: "👷", label: "Contractors"        },
  { to: "/outreach",        icon: "📡", label: "Outreach Queue"     },
  { section: "Operations" },
  { to: "/routing-cockpit", icon: "🎯", label: "Routing Cockpit"    },
  { to: "/routing",         icon: "⚙️",  label: "Routing Engine"    },
    { to: "/crm",             icon: "💬",  label: "CRM & Reviews"     },
  { to: "/metrics",         icon: "📈", label: "Metrics"            },
  { to: "/bids",            icon: "📥", label: "Bid Management"     },
  { to: "/financing",       icon: "💰", label: "Financing"           },
  { to: "/escrow",          icon: "🏦", label: "Escrow & Payments"  },
  { section: "Content" },
  { to: "/blog",           icon: "✍️", label: "Blog CMS"           },
  { to: "/editorial",      icon: "📖", label: "Editorial Hub"       },
  { to: "/materials",      icon: "🪨",  label: "Materials Catalog"   },
  { to: "/materials/bulk", icon: "📁",  label: "Bulk Image Upload"   },
  { section: "System" },
  { to: "/partners",        icon: "🤝", label: "Partners"           },
  { to: "/system",          icon: "💚", label: "System Health"      },
  { to: "/flags",           icon: "🚩", label: "Feature Flags"      },
  { to: "/optin",           icon: "📝", label: "Opt-In Audit"       },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard", "/leads": "All Leads",
  "/contractors": "Contractors", "/outreach": "Outreach Queue",
  "/routing-cockpit": "Routing Cockpit", "/routing": "Routing Engine",
  "/crm": "CRM & Reviews",
  "/metrics": "Metrics & Analytics", "/bids": "Bid Management",
  "/escrow": "Escrow & Payments", "/partners": "Partners",
  "/system": "System Health", "/flags": "Feature Flags", "/optin": "Opt-In Audit",
};

export function AdminConsoleLayout() {
  const [user, setUser]         = useState<User | null>(null);
  const [search, setSearch]     = useState("");
  const [menuOpen, setMenuOpen]     = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifications, setNotifications] = useState([
    { title:"New lead submitted", body:"Pool installation · Agoura Hills · Score 8/10" },
    { title:"Contractor onboarded", body:"NEXA BUILDER signed the agreement" },
    { title:"Bid accepted", body:"Lead #57 matched with contractor" },
  ]);
  const navigate                = useNavigate();
  const location                = useLocation();
  const overlayRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    http.get("/auth/me")
      .then((r: any) => setUser(r.data))
      .catch(() => navigate("/login", { replace: true }));
  }, []);

  // Close sidebar + notif panel on route change (mobile)
  useEffect(() => { setMenuOpen(false); setNotifOpen(false); }, [location.pathname]);

  const signOut = () => { setAccessToken(null); navigate("/login", { replace: true }); };
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Intercept 401 responses — show banner instead of silent failure
    const interceptor = http.interceptors.response.use(
      res => res,
      err => {
        if (err?.response?.status === 401) setSessionExpired(true);
        return Promise.reject(err);
      }
    );
    // Poll token validity every 60s
    const timer = setInterval(() => {
      http.get("/auth/me").catch(err => {
        if (err?.response?.status === 401) setSessionExpired(true);
      });
    }, 60000);
    return () => { http.interceptors.response.eject(interceptor); clearInterval(timer); };
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname] ||
    Object.entries(PAGE_TITLES).find(([k]) => location.pathname.startsWith(k))?.[1] || "Admin";

  const initials = (user?.email || "A")[0].toUpperCase() +
    ((user?.email || "A").split("@")[0][1] || "").toUpperCase();

  const navLink = (to: string, icon: string, label: string) => (
    <NavLink key={to} to={to}
      className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
      <span className="icon">{icon}</span>{label}
    </NavLink>
  );

  const sidebarContent = (
    <>
      <a href="/dashboard" className="sidebar-logo">
        Nexa<span>Builder</span>
        <span className="sidebar-logo-badge">ADMIN</span>
      </a>
      <nav className="sidebar-nav">
        {NAV.map((item, i) =>
          "section" in item
            ? <div key={i} className="sidebar-section">{item.section}</div>
            : navLink(item.to!, item.icon!, item.label!)
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.email?.split("@")[0] || "Admin"}</div>
            <div className="sidebar-user-role">{user?.role || "admin"}</div>
          </div>
        </div>
        <button className="sidebar-signout" onClick={signOut}
          style={{ width:"100%", textAlign:"left", paddingLeft:10 }}>
          Sign out →
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      <div ref={overlayRef}
        className={`sidebar-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)} />

      {/* Sidebar — desktop fixed, mobile slide-over */}
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Top bar */}
        <div className="admin-topbar">
          {/* Hamburger — mobile only, always rendered but hidden via CSS */}
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ display: "flex" }}>
            <span style={{
              display: "block", width: 20, height: 2.5,
              background: "#fff", borderRadius: 3, flexShrink: 0,
              transition: "transform .25s",
              transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none"
            }}></span>
            <span style={{
              display: "block", width: 20, height: 2.5,
              background: "#fff", borderRadius: 3, flexShrink: 0,
              transition: "opacity .2s",
              opacity: menuOpen ? 0 : 1
            }}></span>
            <span style={{
              display: "block", width: 20, height: 2.5,
              background: "#fff", borderRadius: 3, flexShrink: 0,
              transition: "transform .25s",
              transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none"
            }}></span>
          </button>

          <div className="topbar-title">{pageTitle}</div>

          <div className="topbar-right">
            <div className="topbar-search">
              <span>🔍</span>
              <input
                placeholder="Search leads, contractors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && search.trim()) {
                    // Route to contractors if input looks like a license# or contains keywords
                    const v = search.trim();
                    const looksLikeLicense = /^\d{6,7}$/.test(v) || /^[A-Z]-?\d{2}/.test(v.toUpperCase());
                    if (looksLikeLicense) {
                      navigate(`/contractors?q=${encodeURIComponent(v)}`);
                    } else {
                      navigate(`/contractors?q=${encodeURIComponent(v)}`);
                    }
                  }
                }}
              />
            </div>

            {/* Notifications */}
            <div style={{ position:"relative" }}>
              <button className="notif-btn"
                onClick={() => setNotifOpen(o => !o)}>
                🔔
                {notifications.length > 0 &&
                  <span className="notif-badge">{notifications.length}</span>}
              </button>
              {notifOpen && (
                <div style={{
                  position:"absolute", top:"calc(100% + 8px)", right:0,
                  width:320, background:"var(--card)",
                  border:"1px solid var(--border)", borderRadius:12,
                  boxShadow:"0 8px 32px rgba(10,22,40,.15)", zIndex:300,
                  overflow:"hidden"
                }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)",
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>Notifications</span>
                    <button onClick={() => setNotifications([])}
                      style={{ fontSize:11, color:"var(--blue)", background:"none",
                        border:"none", cursor:"pointer", fontWeight:700 }}>
                      Clear all
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding:24, textAlign:"center", color:"var(--muted)", fontSize:13 }}>
                      No notifications
                    </div>
                  ) : notifications.map((n:any, i:number) => (
                    <div key={i} style={{ padding:"12px 16px",
                      borderBottom: i < notifications.length-1 ? "1px solid var(--border)" : "none",
                      fontSize:13 }}>
                      <div style={{ fontWeight:700, color:"var(--navy)" }}>{n.title}</div>
                      <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>{n.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <span style={{ fontSize:12, color:"var(--muted)" }}>
              {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="admin-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
