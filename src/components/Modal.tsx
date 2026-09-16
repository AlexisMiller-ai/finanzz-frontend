import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { IconX } from "./ui/Icons";

interface ModalProps {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
  footerStacked?: boolean;
  /** Quando o conteúdo é um <form>, o rodapé fica dentro dele. */
  onSubmit?: (e: React.FormEvent) => void;
}

export function Modal({ title, description, onClose, children, footer, size = "md", footerStacked, onSubmit }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Respeita o autoFocus do conteúdo; senão foca o primeiro campo.
    if (!dialogRef.current?.contains(document.activeElement)) {
      const firstField =
        dialogRef.current?.querySelector<HTMLElement>("input, select, textarea") ??
        dialogRef.current?.querySelector<HTMLElement>("button:not([data-close])");
      firstField?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const content = (
    <>
      <div className="modal-header">
        <div>
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          {description && <p className="modal-description">{description}</p>}
        </div>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Fechar" data-close>
          <IconX />
        </button>
      </div>
      {children && <div className="modal-body">{children}</div>}
      {footer && <div className={`modal-footer ${footerStacked ? "stacked" : ""}`}>{footer}</div>}
    </>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={`modal ${size === "sm" ? "modal-sm" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {onSubmit ? (
          <form onSubmit={onSubmit} style={{ display: "contents" }} noValidate>
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

export interface ChoiceOption {
  label: string;
  variant?: "primary" | "danger" | "secondary" | "ghost";
  onSelect: () => void | Promise<void>;
}

/** Diálogo de confirmação com uma ou mais opções (ex.: excluir só esta / todas). */
export function ChoiceDialog({
  title,
  description,
  options,
  onClose,
  busy,
}: {
  title: string;
  description?: ReactNode;
  options: ChoiceOption[];
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      size="sm"
      footerStacked={options.length > 1}
      footer={
        <>
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`btn btn-${option.variant ?? "secondary"}`}
              onClick={option.onSelect}
              disabled={busy}
            >
              {option.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </>
      }
    />
  );
}
