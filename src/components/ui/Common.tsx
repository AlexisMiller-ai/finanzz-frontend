import type { CSSProperties, ReactNode } from "react";
import { getInitials } from "../../utils/format";
import { useApp } from "../../contexts/AppContext";
import { formatMonthLabel, getCurrentMonth, shiftMonth } from "../../utils/date";
import { IconChevronLeft, IconChevronRight } from "./Icons";

export function MonthSwitcher() {
  const { month, setMonth } = useApp();
  const isCurrent = month === getCurrentMonth();

  return (
    <div className="page-actions">
      <div className="month-switcher">
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Mês anterior"
        >
          <IconChevronLeft />
        </button>
        <label className="month-switcher-label">
          {formatMonthLabel(month)}
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            aria-label="Escolher mês"
          />
        </label>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="Próximo mês"
        >
          <IconChevronRight />
        </button>
      </div>
      {!isCurrent && (
        <button type="button" className="today-btn" onClick={() => setMonth(getCurrentMonth())}>
          Mês atual
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-title">{title}</div>
      {description && <div>{description}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%", style }: { height?: number; width?: number | string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function ProgressBar({ percent, tone }: { percent: number; tone?: "good" | "warning" | "bad" }) {
  return (
    <div
      className={`progress ${tone ?? ""}`}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} />
    </div>
  );
}

/** Ícone quadrado com a inicial da categoria na cor dela. */
export function CategoryIcon({ name, color }: { name?: string | null; color?: string | null }) {
  const c = color || "#94A3B8";
  return (
    <span className="row-icon" style={{ color: c }} aria-hidden="true">
      <span className="row-icon-bg" style={{ background: c }} />
      <span style={{ position: "relative" }}>{(name || "?").trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}

/**
 * Linha de tendência compacta (sem eixos) para cartões de indicador.
 * Mostra só a forma da série; o valor exato fica no número acima dela.
 */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const width = 120;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - 3 - ((v - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = points.split(" ").pop()!.split(",");

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.5" />
    </svg>
  );
}

/** Foto de perfil, ou as iniciais quando não houver foto. */
export function UserAvatar({
  name,
  avatar,
  size = 32,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {avatar ? <img src={avatar} alt="" /> : getInitials(name)}
    </span>
  );
}
