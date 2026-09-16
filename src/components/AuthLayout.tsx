import { useState } from "react";
import type { ReactNode } from "react";
import { IconCard, IconCheck, IconEye, IconEyeOff, IconRepeat, IconTarget } from "./ui/Icons";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">F</span>
          <span className="brand-name">Finanzz</span>
        </div>
        <div>
          <h2>Seu dinheiro organizado, mês a mês.</h2>
          <p>Registre gastos e receitas, acompanhe a fatura do cartão e saiba quanto ainda pode gastar.</p>
          <div className="auth-features">
            <div><IconCard size={18} /> Compras parceladas e fatura do cartão</div>
            <div><IconRepeat size={18} /> Lançamentos fixos todo mês</div>
            <div><IconTarget size={18} /> Orçamentos por categoria e meta de economia</div>
            <div><IconCheck size={18} /> Funciona no computador e no celular</div>
          </div>
        </div>
        <span style={{ color: "#6f6e7c", fontSize: 12 }}>Gestão financeira pessoal</span>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="brand hide-desktop" style={{ padding: 0, marginBottom: 28 }}>
            <span className="brand-mark">F</span>
            <span className="brand-name" style={{ color: "var(--text)" }}>Finanzz</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group">
      <input
        id={id}
        className="input"
        style={{ paddingLeft: 12, paddingRight: 44 }}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
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
