import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IconAlert, IconCheck } from "../components/ui/Icons";

interface ToastItem {
  id: number;
  message: string;
  kind: "success" | "error";
}

type ToastFn = (message: string, kind?: ToastItem["kind"]) => void;

const ToastContext = createContext<ToastFn | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, kind = "success") => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, kind }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 5000 : 3000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === "error" ? "error" : ""}`}>
            {t.kind === "error" ? <IconAlert size={16} /> : <IconCheck size={16} />}
            <span>{t.message}</span>
            <button className="toast-action" onClick={() => dismiss(t.id)} aria-label="Fechar">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de um ToastProvider");
  return context;
}
