'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  detectTier, readQualitySetting, resolveTier, writeQualitySetting,
  type QualitySetting, type QualityTier,
} from './tier';

/**
 * QualityProvider — one source of truth for the visual quality level.
 *
 * Before this, Globe.tsx called detectTier() itself and ExploreClient kept a
 * separate `quality` state, so the homepage and /explore could render the same
 * Earth at different tiers and disagree in their own HUDs. Preference now
 * survives navigation and is shared by every WebGL/media surface on the page.
 */

interface QualityCtx {
  /** What the user chose: 'auto' | 'high' | 'medium' | 'low' | 'mobile'. */
  setting: QualitySetting;
  /** The tier actually being rendered right now. */
  tier: QualityTier;
  setSetting: (s: QualitySetting) => void;
}

const Ctx = createContext<QualityCtx | null>(null);

export function QualityProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<QualitySetting>('auto');
  const [tier, setTier] = useState<QualityTier>('medium');

  useEffect(() => {
    const s = readQualitySetting();
    setSettingState(s);
    setTier(resolveTier(s));
  }, []);

  const setSetting = useCallback((s: QualitySetting) => {
    setSettingState(s);
    setTier(resolveTier(s));
    writeQualitySetting(s);
  }, []);

  // Re-resolve AUTO when the viewport or device class changes (rotate, resize,
  // desktop window shrunk below the mobile breakpoint).
  useEffect(() => {
    if (setting !== 'auto') return;
    const on = () => setTier(detectTier());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, [setting]);

  const value = useMemo(() => ({ setting, tier, setSetting }), [setting, tier, setSetting]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuality(): QualityCtx {
  const c = useContext(Ctx);
  // The fallback must be a constant. Calling detectTier() here reads
  // navigator/viewport during render, so the server would emit MEDIUM while
  // the first client render emitted HIGH — React #418 hydration failure, which
  // took down the first-visit overlay on the static Pages build.
  if (!c) return { setting: 'auto', tier: 'medium', setSetting: () => {} };
  return c;
}
