import { useId } from "react";
import type { ReactNode } from "react";
import { IconAlert } from "./Icons";

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/**
 * Campo de dinheiro com máscara de centavos: digitar "123456" mostra "1.234,56".
 * Evita o bug antigo em que "1.234,56" era lido como 1,23.
 */
export function MoneyInput({
  id,
  cents,
  onChange,
  large,
  autoFocus,
  allowNegative,
  placeholder = "0,00",
}: {
  id?: string;
  cents: number;
  onChange: (cents: number) => void;
  large?: boolean;
  autoFocus?: boolean;
  allowNegative?: boolean;
  placeholder?: string;
}) {
  const negative = cents < 0;
  const display =
    cents === 0
      ? ""
      : `${negative ? "-" : ""}${(Math.abs(cents) / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
    const value = Number(digits || 0);
    onChange(allowNegative && raw.includes("-") ? -value : value);
  }

  return (
    <div className="input-group">
      <input
        id={id}
        className={`input tabular ${large ? "input-lg" : ""}`}
        inputMode={allowNegative ? "text" : "numeric"}
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        autoFocus={autoFocus}
        style={large ? { paddingLeft: 48 } : undefined}
      />
      <span className={`input-prefix ${large ? "lg" : ""}`}>R$</span>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          data-kind={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SwitchRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label className="switch-row" htmlFor={id}>
      <div>
        <div className="switch-row-title">{title}</div>
        {description && <div className="field-hint">{description}</div>}
      </div>
      <span className="switch">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert-error" role="alert">
      <IconAlert size={16} />
      <span>{message}</span>
    </div>
  );
}
