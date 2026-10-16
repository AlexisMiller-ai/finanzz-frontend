import { Suspense, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { getInitials } from "../utils/format";
import { OfflineBar } from "./PwaManager";
import { TransactionFormModal } from "./TransactionForm";
import {
  IconWallet,
  IconDashboard,
  IconList,
  IconLogout,
  IconMoon,
  IconPlus,
  IconSun,
  IconPercent,
  IconTag,
  IconTarget,
} from "./ui/Icons";

const menuItems = [
  { label: "Dashboard", short: "Início", path: "/", Icon: IconDashboard },
  { label: "Lançamentos", short: "Lançamentos", path: "/transacoes", Icon: IconList },
  { label: "Contas e cartões", short: "Contas", path: "/contas", Icon: IconWallet },
  { label: "Plano do mês", short: "Plano", path: "/metas", Icon: IconTarget },
  { label: "Relatórios", short: "Relatórios", path: "/relatorios", Icon: IconPercent },
  { label: "Categorias", short: "Categorias", path: "/categorias", Icon: IconTag },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transacoes": "Lançamentos",
  "/contas": "Contas e cartões",
  "/metas": "Plano do mês",
  "/relatorios": "Relatórios",
  "/categorias": "Categorias",
  "/importar": "Importar",
  "/perfil": "Perfil",
};

function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">F</span>
      <span>
        <span className="brand-name" style={{ display: "block" }}>
          Finanzz
        </span>
        <span className="brand-tag hide-mobile">GESTÃO PESSOAL</span>
      </span>
    </Link>
  );
}

export function Layout() {
  const { logout, user } = useAuth();
  const { theme, setTheme, quickAddOpen, setQuickAddOpen } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userName = user?.name || "Usuário";
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    document.title = `${pageTitles[location.pathname] ?? "Finanzz"} · Finanzz`;
  }, [location.pathname]);

  // Atalho "Novo lançamento" do ícone instalado na tela inicial.
  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setQuickAddOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, setQuickAddOpen]);

  // Atalho: tecla "N" abre um novo lançamento.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [setQuickAddOpen]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <button className="btn btn-primary sidebar-cta" onClick={() => setQuickAddOpen(true)}>
          <IconPlus size={16} /> Novo lançamento
        </button>

        <div className="nav-section">MENU</div>
        <nav className="nav">
          {menuItems.map(({ label, path, Icon }) => (
            <NavLink key={path} to={path} end={path === "/"} className="nav-link">
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost" onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <IconSun /> : <IconMoon />}
            {isDark ? "Tema claro" : "Tema escuro"}
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            <IconLogout /> Sair
          </button>
          <NavLink to="/perfil" className="sidebar-user" style={{ marginTop: 6 }}>
            <span className="avatar">{getInitials(userName)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="sidebar-user-name" style={{ display: "block" }}>
                {userName}
              </span>
              <span className="sidebar-user-email" style={{ display: "block" }}>
                {user?.email}
              </span>
            </span>
          </NavLink>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <Brand />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              className="btn btn-icon"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
            <Link to="/perfil" aria-label="Perfil">
              <span className="avatar">{getInitials(userName)}</span>
            </Link>
          </div>
        </header>

        <main className="main">
          <OfflineBar />
          <Suspense fallback={<div className="full-center" style={{ minHeight: 300 }}><span className="spinner" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {menuItems.slice(0, 2).map(({ short, path, Icon }) => (
          <NavLink key={path} to={path} end={path === "/"} className="bottom-link">
            <Icon size={20} />
            {short}
          </NavLink>
        ))}
        <button className="bottom-fab" onClick={() => setQuickAddOpen(true)} aria-label="Novo lançamento">
          <IconPlus size={24} strokeWidth={2.4} />
        </button>
        {menuItems.slice(2, 4).map(({ short, path, Icon }) => (
          <NavLink key={path} to={path} className="bottom-link">
            <Icon size={20} />
            {short}
          </NavLink>
        ))}
      </nav>

      {quickAddOpen && <TransactionFormModal onClose={() => setQuickAddOpen(false)} />}
    </div>
  );
}
