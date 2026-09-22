'use client';

/** Performance tiers (spec §24) — High / Medium / Low with honest detection. */

export type QualityTier = 'high' | 'medium' | 'low';

export function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const params = new URLSearchParams(window.location.search);
  const forced = params.get('quality');
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(nav.userAgent) || Math.min(window.innerWidth, window.innerHeight) < 700;
  const small = window.innerWidth < 900;

  if (mobile || (cores <= 4 && mem <= 4) || small) return cores <= 4 && mem <= 4 ? 'low' : 'medium';
  if (cores >= 8 && mem >= 8) return 'high';
  return 'medium';
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export interface TierConfig {
  dpr: [number, number];
  sphereSegments: number;
  stars: number;
  particles: number;
  bloom: boolean;
  pulses: boolean;
  labels: boolean;
  rings: number;
  autoRotate: number;
}

export const TIER_CONFIG: Record<QualityTier, TierConfig> = {
  high: { dpr: [1, 2], sphereSegments: 96, stars: 5000, particles: 700, bloom: true, pulses: true, labels: true, rings: 3, autoRotate: 0.05 },
  medium: { dpr: [1, 1.5], sphereSegments: 64, stars: 2500, particles: 300, bloom: false, pulses: false, labels: true, rings: 2, autoRotate: 0.05 },
  low: { dpr: [1, 1], sphereSegments: 40, stars: 900, particles: 0, bloom: false, pulses: false, labels: false, rings: 2, autoRotate: 0.03 },
};
