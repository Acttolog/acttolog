'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionUser } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';

interface SessionCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Redirect into the Google OAuth flow, remembering where to return. */
  signIn: (returnTo?: string) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

/**
 * Static mirrors (GitHub Pages) ship without /api routes, so the OAuth
 * redirect and session endpoint do not exist there. Detect the build flag
 * instead of firing requests that can only 404.
 */
const STATIC_HOST = process.env.NEXT_PUBLIC_STATIC === '1';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(!STATIC_HOST);
  const [notice, setNotice] = useState(false);

  const refresh = useCallback(async () => {
    if (STATIC_HOST) { setLoading(false); return; }
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = useCallback((returnTo?: string) => {
    if (STATIC_HOST) { setNotice(true); return; }
    const rt = returnTo || window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(rt)}`;
  }, []);

  const signOut = useCallback(async () => {
    if (!STATIC_HOST) await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, refresh, signIn, signOut }}>
      {children}
      {notice && <StaticAuthNotice onClose={() => setNotice(false)} />}
    </Ctx.Provider>
  );
}

function StaticAuthNotice({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="mbd" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mcard" role="dialog" aria-modal="true" aria-label={t('auth.staticTitle')}>
        <div className="p-7">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="h3">{t('auth.staticTitle')}</h3>
            <button className="btn btn-g btn-sm" onClick={onClose}>{t('close')}</button>
          </div>
          <p className="prose !text-[14px]">{t('auth.staticBody')}</p>
          <div className="mt-6 flex justify-end">
            <button className="btn btn-p btn-sm" onClick={onClose}>{t('auth.staticDismiss')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useSession(): SessionCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession must be used within SessionProvider');
  return c;
}
