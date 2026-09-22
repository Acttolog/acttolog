'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastKind = 'ok' | 'err' | 'info';
interface ToastItem { id: number; msg: string; kind: ToastKind }

const Ctx = createContext<((msg: string, kind?: ToastKind, ms?: number) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((msg: string, kind: ToastKind = 'info', ms = 3800) => {
    const id = ++idRef.current;
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), ms);
  }, []);

  const icons: Record<ToastKind, ReactNode> = {
    ok: <path d="M20 6L9 17l-5-5" />,
    err: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></>,
  };
  const color: Record<ToastKind, string> = { ok: 'var(--ok)', err: 'var(--err)', info: 'var(--cy)' };

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div id="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" style={{ flex: 'none', marginTop: 1, color: color[t.kind] }}>
              {icons[t.kind]}
            </svg>
            <div>{t.msg}</div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used within ToastProvider');
  return c;
}
