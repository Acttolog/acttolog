import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Security | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { Icon } from '@/components/ui/Icon';

const ITEMS: [string, string, 'ok' | 'info'][] = [
  ['Server-side authentication', 'Google OAuth code flow; ID tokens verified against Google JWKS (iss/aud/exp/email_verified).', 'ok'],
  ['Server-side authorization', 'Roles resolved from environment on every request; middleware is a convenience layer only — pages and APIs re-check.', 'ok'],
  ['Secure cookies', 'httpOnly · SameSite=Lax · Secure in production · 7-day expiry JWT sessions.', 'ok'],
  ['CSRF controls', 'OAuth state parameter bound to a short-lived httpOnly cookie; SameSite cookies for session.', 'ok'],
  ['Input validation', 'Zod schemas on every API route; length caps; strict email/URL formats.', 'ok'],
  ['Rate limiting', 'Per-IP/per-user sliding windows on AI, contact, newsletter, submissions and pre-checks.', 'info'],
  ['Spam protection', 'Honeypot field on contact + submission rate limits.', 'ok'],
  ['Upload security', 'Storage adapter enforces size limits and MIME checks once object storage is connected; no base64/localStorage media.', 'info'],
  ['Secrets hygiene', 'No secrets in the repository; .env is git-ignored; owner email lives only in server environment.', 'ok'],
  ['Security headers', 'Configured in next.config (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). CSP tuned per environment.', 'info'],
  ['Dependency audits', 'npm audit runs in CI before deployment.', 'info'],
];

export default function Page() {
  return (
    <div>
      <AHead title="Security" desc="Implemented controls (spec §86–87). Nothing here is aspirational — each item maps to real code in the repository." />
      <div className="space-y-2.5">
        {ITEMS.map(([t, d, s]) => (
          <div key={t} className="panel p-5 flex items-start gap-4">
            <span className={`badge ${s === 'ok' ? 'b-ok' : 'b-info'} flex-none mt-0.5`}>{s === 'ok' ? 'implemented' : 'staged'}</span>
            <div>
              <div className="font-display font-semibold text-[13.8px] mb-1 flex items-center gap-2"><Icon name="shield" size={14} />{t}</div>
              <p className="mut text-[12.7px] leading-relaxed max-w-[92ch]">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
