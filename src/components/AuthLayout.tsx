import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { IconCheck, IconEye, IconEyeOff, IconLock, IconMoon, IconShield, IconSun } from "./ui/Icons";

export function AuthLayout({
  mode,
  title,
  subtitle,
  children,
}: {
  mode: "entrar" | "cadastro";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { theme, setTheme } = useApp();
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div>
          <div className="auth-wordmark">FINANZZ</div>
          <span className="auth-tag">Finanzz · gestão pessoal</span>
        </div>

        <div>
          <span className="auth-eyebrow">Suas finanças em um olhar</span>
          <h2>Saiba quanto ainda pode gastar este mês.</h2>
          <p>
            Contas, cartões, faturas e a sua meta de guardar dinheiro no mesmo lugar — no computador ou no
            celular.
          </p>
          <ul className="auth-features">
            <li>
              <span className="auth-check"><IconCheck size={13} /></span>
              Plano do mês com o quanto ainda dá para gastar
            </li>
            <li>
              <span className="auth-check"><IconCheck size={13} /></span>
              Faturas, parcelas e contas fixas já previstas
            </li>
            <li>
              <span className="auth-check"><IconCheck size={13} /></span>
              Importação do extrato com conciliação automática
            </li>
          </ul>
        </div>

        <span className="auth-foot">
          <IconLock size={14} /> Seus dados ficam só na sua conta
        </span>
      </aside>

      <main className="auth-main">
        <button
          type="button"
          className="btn btn-icon auth-theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
        >
          {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>

        <div className="auth-card">
          <div className="auth-mobile-brand hide-desktop">
            <span className="brand-mark">F</span>
            <span>Finanzz</span>
          </div>

          <span className="eyebrow">Área segura</span>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>

          <nav className="auth-tabs" aria-label="Entrar ou criar conta">
            <Link to="/login" className={mode === "entrar" ? "active" : ""} aria-current={mode === "entrar" ? "page" : undefined}>
              Entrar
            </Link>
            <Link to="/cadastro" className={mode === "cadastro" ? "active" : ""} aria-current={mode === "cadastro" ? "page" : undefined}>
              Criar conta
            </Link>
          </nav>

          {children}

          <div className="auth-security">
            <IconShield size={18} />
            <div>
              <strong>Privacidade e segurança</strong>
              <p>
                Sua senha é guardada com criptografia, a sessão expira sozinha depois de 30 dias e cada conta só
                enxerga os próprios lançamentos.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Campo com ícone à esquerda. */
export function IconInput({ icon, ...props }: { icon: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="input-group">
      <span className="input-prefix auth-input-icon">{icon}</span>
      <input className="input auth-input" {...props} />
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group">
      <span className="input-prefix auth-input-icon"><IconLock size={16} /></span>
      <input
        id={id}
        className="input auth-input"
        style={{ paddingRight: 44 }}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        required
      />
      <span className="input-suffix">
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </button>
      </span>
    </div>
  );
}
