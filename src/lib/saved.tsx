'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/analytics';

export interface SavedEntry { kind: string; id: string; title: string; at: string }

/** Saved items (spec §48) — private per user; guests get browser-local storage. */
export function useSaved() {
  const { user } = useSession();
  const toast = useToast();
  const key = `act_saved_${user?.uid || 'guest'}`;
  const [items, setItems] = useState<SavedEntry[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch { setItems([]); }
    if (user) {
      // best-effort server sync when persistence is configured
      fetch('/api/saved').then((r) => (r.ok ? r.json() : null)).then((d) => {
        if (d?.items?.length) setItems(d.items);
      }).catch(() => { /* offline mode is fine */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.uid]);

  const isSaved = useCallback((kind: string, id: string) => items.some((x) => x.kind === kind && x.id === id), [items]);

  const toggleSave = useCallback((kind: string, id: string, title: string, route?: string) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.kind === kind && x.id === id);
      const next = i >= 0 ? prev.filter((_, j) => j !== i) : [{ kind, id, title, at: new Date().toISOString() }, ...prev];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      if (i < 0) {
        track('resource_save', { kind, id });
        toast('Saved to My Acttolog.', 'ok');
      } else {
        toast('Removed from saved items.', 'info');
      }
      if (user) {
        fetch('/api/saved', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, id, title, route: route || null, remove: i >= 0 }),
        }).catch(() => { /* best effort */ });
      }
      return next;
    });
  }, [key, toast, user]);

  return { items, isSaved, toggleSave };
}
