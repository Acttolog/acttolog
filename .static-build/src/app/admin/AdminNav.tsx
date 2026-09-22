'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/Logo';

const NAV: { group: string; items: [string, string, string][] }[] = [
  {
    group: 'Dashboard',
    items: [['/admin/dashboard', 'Overview', 'grid']],
  },
  {
    group: 'Acttolog',
    items: [
      ['/admin/home', 'Home', 'home'],
      ['/admin/settings', 'Settings', 'gear'],
      ['/admin/navigation', 'Navigation', 'compass'],
      ['/admin/seo', 'SEO', 'search'],
    ],
  },
  {
    group: 'Divisions',
    items: [
      ['/admin/research', 'Thesyn Research', 'sigma'],
      ['/admin/entertainment', 'Entertainment', 'play'],
      ['/admin/academy', 'Academy', 'book'],
      ['/admin/games', 'Games', 'game'],
      ['/admin/darkroom', 'Darkroom', 'search'],
    ],
  },
  {
    group: 'Content',
    items: [
      ['/admin/blog', 'Blog', 'doc'],
      ['/admin/offers', 'Offers', 'star'],
    ],
  },
  {
    group: 'Communication',
    items: [['/admin/messages', 'Contact Messages', 'mail']],
  },
  {
    group: 'Users',
    items: [
      ['/admin/users', 'Users', 'users'],
      ['/admin/roles', 'Roles', 'shield'],
    ],
  },
  {
    group: 'Analytics',
    items: [
      ['/admin/analytics', 'Analytics', 'chart'],
      ['/admin/intelligence', 'Acttolog Intelligence', 'brain'],
    ],
  },
  {
    group: 'AI',
    items: [['/admin/ai', 'AI Configuration / Usage', 'spark']],
  },
  {
    group: 'Media',
    items: [['/admin/media', 'Media Library', 'image']],
  },
  {
    group: 'System',
    items: [
      ['/admin/backup', 'Backup & Recovery', 'db'],
      ['/admin/integrations', 'Integrations', 'link'],
      ['/admin/security', 'Security', 'lock'],
      ['/admin/system', 'System Health', 'refresh'],
    ],
  },
];

export function AdminNav({ user }: { user: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-g btn-sm md:hidden mb-4" onClick={() => setOpen((v) => !v)}
        aria-expanded={open} style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 950 }}>
        <Icon name="menu" size={15} />Admin menu
      </button>
      <aside className={`aside ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 px-2.5 pt-1 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <Logo variant="icon" width={26} />
          <div>
            <div className="font-display font-bold text-[13.6px] tracking-[.12em]">ACTTOLOG</div>
            <div className="mono text-[8.8px] tracking-[.24em] dim">ADMIN CONSOLE</div>
          </div>
        </Link>

        <div className="px-2.5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="font-display font-semibold text-[12.8px] truncate">{user.name}</div>
          <div className="dim mono text-[9.6px] truncate mt-0.5">{user.email}</div>
          <span className="badge b-info mt-2">{user.role}</span>
        </div>

        <nav className="anav" aria-label="Admin">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="agrp">{g.group}</div>
              {g.items.map(([href, label, icon]) => (
                <Link key={href} href={href} className={pathname === href ? 'on' : ''}>
                  <Icon name={icon} size={15} />{label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="anav mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <Link href="/"><Icon name="globe" size={15} />View site</Link>
        </div>
      </aside>
    </>
  );
}
