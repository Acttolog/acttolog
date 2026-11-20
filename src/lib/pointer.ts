/** Magnetic pointer — pure types, defaults, presets and validation. No React, no DOM. */

export type PointerBlend = 'normal' | 'screen' | 'difference' | 'exclusion';

export interface PointerSettings {
  enabled: boolean;
  hideNative: boolean;
  /** Magnetic pull toward the nearest interactive target, 0–100. */
  strength: number;
  /** Detection radius in px, 40–260. */
  radius: number;
  /** Ring diameter in px, 14–72. */
  ringSize: number;
  /** Dot diameter in px, 2–12. */
  dotSize: number;
  /** Follow smoothing, 1 (snappy) – 30 (floaty). */
  damping: number;
  /** Trail particle count, 0–24. */
  trail: number;
  /** Accent glow intensity, 0–100. */
  glow: number;
  /** Hue rotation applied to the cursor overlay only, 0–360 deg. */
  hue: number;
  blend: PointerBlend;
  /** How much the ring stretches toward the magnetised target, 0–100. */
  deform: number;
  clickPulse: boolean;
}

export const POINTER_DEFAULTS: PointerSettings = {
  enabled: true,
  hideNative: true,
  strength: 85,
  radius: 120,
  ringSize: 28,
  dotSize: 5,
  damping: 3,
  trail: 6,
  glow: 75,
  hue: 320,
  blend: 'screen',
  deform: 60,
  clickPulse: true,
};

/** Slider bounds — single source of truth for clamping and the studio UI. */
export const POINTER_RANGES = {
  strength: { min: 0, max: 100, step: 1 },
  radius: { min: 40, max: 260, step: 2 },
  ringSize: { min: 14, max: 72, step: 1 },
  dotSize: { min: 2, max: 12, step: 1 },
  damping: { min: 1, max: 30, step: 1 },
  trail: { min: 0, max: 24, step: 1 },
  glow: { min: 0, max: 100, step: 1 },
  hue: { min: 0, max: 360, step: 1 },
  deform: { min: 0, max: 100, step: 1 },
} as const;

export type PointerNumKey = keyof typeof POINTER_RANGES;

const BLENDS: PointerBlend[] = ['normal', 'screen', 'difference', 'exclusion'];

export const POINTER_PRESETS: { id: string; label: string; settings: PointerSettings }[] = [
  {
    id: 'precision',
    label: 'Precision',
    settings: { ...POINTER_DEFAULTS, strength: 78, radius: 110, ringSize: 24, dotSize: 4, damping: 6, trail: 0, glow: 35, hue: 0, blend: 'normal', deform: 20, clickPulse: true },
  },
  {
    id: 'comet',
    label: 'Comet',
    settings: { ...POINTER_DEFAULTS, strength: 40, radius: 170, ringSize: 30, dotSize: 8, damping: 20, trail: 20, glow: 85, hue: 210, blend: 'screen', deform: 70, clickPulse: true },
  },
  {
    id: 'halo',
    label: 'Halo',
    settings: { ...POINTER_DEFAULTS, strength: 65, radius: 200, ringSize: 62, dotSize: 3, damping: 16, trail: 4, glow: 95, hue: 300, blend: 'screen', deform: 55, clickPulse: true },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    settings: { ...POINTER_DEFAULTS, strength: 25, radius: 90, ringSize: 18, dotSize: 5, damping: 8, trail: 0, glow: 12, hue: 0, blend: 'normal', deform: 0, clickPulse: false },
  },
];

const clampNum = (raw: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(max, Math.max(min, n)));
};

const pickBool = (raw: unknown, fallback: boolean): boolean => (typeof raw === 'boolean' ? raw : fallback);

/** Validate + clamp every field. Safe against corrupted localStorage / imported JSON. */
export function clampSettings(raw: unknown): PointerSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...POINTER_DEFAULTS };
  out.enabled = pickBool(r.enabled, POINTER_DEFAULTS.enabled);
  out.hideNative = pickBool(r.hideNative, POINTER_DEFAULTS.hideNative);
  out.clickPulse = pickBool(r.clickPulse, POINTER_DEFAULTS.clickPulse);
  (Object.keys(POINTER_RANGES) as PointerNumKey[]).forEach((k) => {
    const { min, max } = POINTER_RANGES[k];
    out[k] = clampNum(r[k], min, max, POINTER_DEFAULTS[k]);
  });
  out.blend = BLENDS.includes(r.blend as PointerBlend) ? (r.blend as PointerBlend) : POINTER_DEFAULTS.blend;
  return out;
}

export function serializeSettings(s: PointerSettings): string {
  return JSON.stringify(clampSettings(s), null, 2);
}

export function parseSettings(text: string): PointerSettings {
  try {
    return clampSettings(JSON.parse(text));
  } catch {
    return { ...POINTER_DEFAULTS };
  }
}

/** Valid random settings for the studio's Randomize action (keeps the cursor usable). */
export function randomPointerSettings(): PointerSettings {
  const ri = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
  return clampSettings({
    enabled: true,
    hideNative: true,
    strength: ri(15, 95),
    radius: ri(70, 240),
    ringSize: ri(16, 68),
    dotSize: ri(2, 11),
    damping: ri(3, 26),
    trail: ri(0, 24),
    glow: ri(15, 100),
    hue: ri(0, 360),
    blend: BLENDS[ri(0, BLENDS.length - 1)],
    deform: ri(0, 90),
    clickPulse: Math.random() > 0.25,
  });
}

/** Visual identity of a preset — used to detect which preset (if any) is active. */
export function presetMatch(s: PointerSettings): string | null {
  const keys: (keyof PointerSettings)[] = ['strength', 'radius', 'ringSize', 'dotSize', 'damping', 'trail', 'glow', 'hue', 'blend', 'deform', 'clickPulse'];
  for (const p of POINTER_PRESETS) {
    if (keys.every((k) => p.settings[k] === s[k])) return p.id;
  }
  return null;
}