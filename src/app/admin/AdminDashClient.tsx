'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import type { Health, IntegrationRow } from '@/lib/system';
import { getDB, pub } from '@/lib/content';

const db = getDB();

const HEALTH_META: Record<Health, [string, string]> = {
  healthy: ['b-ok', 'Healthy'],
  warning: ['b-warn', 'Warning'],
  error: ['b-err', 'Error'],
  not_configured: ['b-mut', 'Not configured'],
};

export function HealthBadge({ status }: { status: Health }) {
  const [cls, label] = HEALTH_META[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

/** Admin overview — measured counts only; sample data is never presented as traffic. */
export function AdminDashClient({ integ }: { integ: IntegrationRow[] }) {
  const counts = [
    ['Blog posts', pub(db.posts).length, '/admin/blog', 'doc'],
    ['Darkroom resources', pub(db.dr).length, '/admin/darkroom', 'search'],
    ['Entertainment items', pub(db.entertainment).length, '/admin/entertainment', 'play'],
    ['Academy courses', pub(db.academy.courses).length, '/admin/academy', 'book'],
    ['Games', pub(db.games).length, '/admin/games', 'game'],
    ['Offers', pub(db.offers).length, '/admin/offers', 'star'],
    ['Research services', pub(db.services).length, '/admin/research', 'sigma'],
    ['Divisions', db.divisions.filter((d) => d.visible !== false).length, '/admin/settings', 'compass'],
  ] as const;

  const notConfigured = integ.filter((i) => i.status === 'not_configured').length;
  const healthy = integ.filter((i) => i.status === 'healthy').length;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.42rem,3vw,2rem)] font-bold tracking-[-.025em]">
            Dashboard
          </h1>
          <p className="mut mt-2 max-w-[86ch] text-[13.5px] leading-relaxed">
            Acttolog control centre. All numbers below are content counts from the live CMS source — traffic
            analytics appear under Analytics only when measured.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/intelligence" className="btn btn-g btn-sm">
            <Icon name="brain" size={14} />
            Intelligence
          </Link>
          <Link href="/admin/system" className="btn btn-p btn-sm">
            <Icon name="refresh" size={14} />
            System health
          </Link>
        </div>
      </div>

      <Reveal>
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {counts.map(([label, n, href, icon]) => (
            <Link
              key={label}
              href={href}
              className="panel block p-5 transition-transform hover:-translate-y-1"
            >
              <div className="mb-3 flex items-center justify-between">
                <span style={{ color: 'var(--cy)' }}>
                  <Icon name={icon} size={17} />
                </span>
                <span className="font-display text-[26px] font-bold tracking-[-.03em]">{n}</span>
              </div>
              <div className="mono dim text-[9.6px] tracking-[.18em]">{label.toUpperCase()}</div>
            </Link>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Reveal delay={60}>
          <div className="panel p-6">
            <div className="mono dim mb-4 text-[9.7px] tracking-[.2em]">INTEGRATIONS</div>
            <div className="space-y-2.5">
              {integ.map((i) => (
                <div
                  key={i.key}
                  className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.2px] font-medium">{i.label}</div>
                    <div className="dim truncate text-[11.4px]">{i.key}</div>
                  </div>
                  <HealthBadge status={i.status} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/admin/integrations" className="btn btn-g btn-sm">
                Manage integrations
              </Link>
              <span className="dim mono self-center text-[10.4px] tracking-[.14em]">
                {healthy}/{integ.length} HEALTHY · {notConfigured} PENDING
              </span>
            </div>
          </div>
        </Reveal>

        <div className="space-y-5">
          <Reveal delay={120}>
            <div className="panel p-6">
              <div className="mono dim mb-4 text-[9.7px] tracking-[.2em]">QUICK ACTIONS</div>
              <div className="space-y-2">
                {[
                  ['/admin/messages', 'Contact inbox', 'mail'],
                  ['/admin/darkroom', 'Darkroom review queue', 'shield'],
                  ['/admin/blog', 'Write / edit posts', 'doc'],
                  ['/admin/media', 'Media library', 'image'],
                  ['/admin/backup', 'Backup & recovery', 'db'],
                  ['/admin/seo', 'SEO settings', 'search'],
                ].map(([href, label, icon]) => (
                  <Link
                    key={href}
                    href={href}
                    className="mut flex items-center gap-3 rounded-xl border px-4 py-3 text-[13.2px] transition-colors hover:text-[var(--txt)]"
                    style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                  >
                    <span style={{ color: 'var(--cy)' }}>
                      <Icon name={icon} size={15} />
                    </span>
                    {label}
                    <span className="ml-auto">
                      <Icon name="arrow" size={13} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="panel p-6">
              <div className="mono dim mb-3 text-[9.7px] tracking-[.2em]">CONTENT SOURCE</div>
              <p className="mut text-[12.8px] leading-relaxed">
                {process.env.NEXT_PUBLIC_SITE_URL ? '' : ''}
                The CMS currently reads the <b style={{ color: 'var(--txt)' }}>bundled seed content</b>
                {integ.find((i) => i.key === 'database')?.status === 'healthy'
                  ? ' — and a database is connected for persistence.'
                  : '. Connect PostgreSQL (Admin → Integrations) to enable editing, publishing workflows, submissions and analytics storage.'}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
