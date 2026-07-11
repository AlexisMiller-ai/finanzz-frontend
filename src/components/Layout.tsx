import { NavLink, Outlet, useLocation } from "react-router-dom";

function IconDashboard() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconTransactions() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconCategories() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h9l9 9a1 1 0 0 1 0 1.41Z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconGoals() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const menuItems = [
  { label: "Dashboard", path: "/", Icon: IconDashboard },
  { label: "Transações", path: "/transacoes", Icon: IconTransactions },
  { label: "Categorias", path: "/categorias", Icon: IconCategories },
  { label: "Metas", path: "/metas", Icon: IconGoals },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transacoes": "Transações",
  "/categorias": "Categorias",
  "/metas": "Metas",
};

export function Layout() {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || "";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F7F8FA",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <aside
        style={{
          width: 240,
          background: "#0D0E14",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 40,
              paddingLeft: 8,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              $
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                Finanzz
              </div>
              <div style={{ fontSize: 10, color: "#6B6C76", letterSpacing: 1 }}>
                GESTÃO PESSOAL
              </div>
            </div>
          </div>

          <div
            style={{
              color: "#5C5D66",
              fontSize: 11,
              letterSpacing: 1,
              marginBottom: 10,
              paddingLeft: 10,
            }}
          >
            GERAL
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {menuItems.map(({ label, path, Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: isActive ? "#fff" : "#8B8C96",
                  background: isActive ? "#1B1D29" : "transparent",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                })}
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "#8B8C96",
            fontSize: 14,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <IconLogout /> Sair
        </button>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 32px",
            background: "#fff",
            borderBottom: "1px solid #EEE",
          }}
        >
          <div style={{ fontSize: 14, color: "#888" }}>
            <span style={{ color: "#1A1A1A", fontWeight: 600 }}>Finanzz</span>
            {" / "}
            <span>{currentTitle}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ color: "#999", cursor: "pointer", display: "flex" }}>
              <IconBell />
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#7C3AED",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                AL
              </div>
              <div>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}
                >
                  Alexis
                </div>
                <div style={{ fontSize: 11, color: "#999" }}>Administrador</div>
              </div>
            </div>
          </div>
        </header>

        <main style={{ padding: 32, flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
