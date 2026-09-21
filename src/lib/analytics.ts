'use client';

/**
 * Analytics (spec §63–64, §74): events are recorded only after analytics
 * consent; GA4 loads only when consent + a measurement ID are present;
 * events are also persisted server-side for Acttolog Intelligence.
 * Identity is never attached — guests are anonymous sessions.
 */

export const GA_EVENTS = [
  'page_view', 'division_view', 'sign_in', 'search', 'resource_open', 'resource_save',
  'article_view', 'academy_entry', 'game_launch', 'entertainment_view', 'offer_interaction',
  'contact_submit', 'newsletter_subscribe', 'download', 'cta_interaction',
] as const;
export type TrackEvent = (typeof GA_EVENTS)[number];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __atlConsent?: { analytics: boolean };
    __atlSid?: string;
  }
}

function sid(): string {
  if (window.__atlSid) return window.__atlSid;
  let s = '';
  try {
    s = sessionStorage.getItem('act_sid') || '';
    if (!s) { s = 's_' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('act_sid', s); }
  } catch { s = 's_' + Math.random().toString(36).slice(2, 9); }
  window.__atlSid = s;
  return s;
}

export function track(type: TrackEvent | string, extra: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  if (!window.__atlConsent?.analytics) return; // consent gate

  // first-party event persistence (Acttolog Intelligence)
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ t: type, path: window.location.pathname, sid: sid(), ...extra }),
    keepalive: true,
  }).catch(() => { /* analytics must never break UX */ });

  // GA4 (loaded separately after consent)
  if (window.gtag) {
    try { window.gtag('event', type, extra); } catch { /* ignore */ }
  }
}

/** Load GA4 only after consent + configuration (spec §63). */
export function loadGA(measurementId: string): void {
  if (!measurementId || window.gtag) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) { window.dataLayer!.push(args); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true });
}
