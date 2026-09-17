'use client';

/**
 * Minimal toast system for mutation feedback — successes and surfaced API
 * errors (e.g. 409 conflicts) that should never be silent.
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: useCallback((m: string) => push('success', m), [push]),
    error: useCallback((m: string) => push('error', m), [push]),
    info: useCallback((m: string) => push('info', m), [push]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-panel backdrop-blur ${
              toast.kind === 'success'
                ? 'border-neon-500/40 bg-ink-800/95 text-neon-200'
                : toast.kind === 'error'
                  ? 'border-red-500/40 bg-ink-800/95 text-red-200'
                  : 'border-ink-400 bg-ink-800/95 text-fog'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {toast.kind === 'success' ? (
                <CheckCircle2 size={16} className="text-neon-400" />
              ) : toast.kind === 'error' ? (
                <AlertTriangle size={16} className="text-red-400" />
              ) : (
                <Info size={16} className="text-fog-dim" />
              )}
            </span>
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-fog-faint transition hover:text-fog"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}

/** Extract a user-facing message from any thrown value (usually ApiError). */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
