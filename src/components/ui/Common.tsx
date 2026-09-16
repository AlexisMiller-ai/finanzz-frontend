import type { CSSProperties, ReactNode } from "react";
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
