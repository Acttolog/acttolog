'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';

/** Mobile command center (spec §63): EXPLORE · SEARCH · EARTH · SAVED · PROFILE */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  if (pathname.startsWith('/explore') || pathname.startsWith('/admin')) return null;

  const openSearch = () => window.dispatchEvent(new CustomEvent('acttolog:search-open'));
  // router.push, not location.href: a full document reload tears down the
  // WebGL Earth and re-fetches every chunk, which on a phone is seconds.
  const items: { label: string; icon: string; act: () => void; on?: boolean }[] = [
    { label: locale === 'ne' ? 'अन्वेषण' : 'Explore', icon: 'compass', act: () => router.push('/explore'), on: pathname.startsWith('/explore') },
    { label: locale === 'ne' ? 'खोज' : 'Search', icon: 'search', act: openSearch, on: false },
    { label: 'Earth', icon: 'globe', act: () => router.push('/explore?mode=earth'), on: false },
    { label: locale === 'ne' ? 'सुरक्षित' : 'Saved', icon: 'heart', act: () => router.push('/my/saved'), on: pathname.startsWith('/my/saved') },
    { label: locale === 'ne' ? 'प्रोफाइल' : 'Profile', icon: 'users', act: () => router.push('/my'), on: pathname.startsWith('/my') && !pathname.startsWith('/my/saved') },
  ];

  return (
    <nav className="mobile-cmd" aria-label="Mobile command">
      {items.map((it) => (
        <button key={it.label} onClick={it.act} className={it.on ? 'on' : ''}>
          <Icon name={it.icon} size={18} />
          <span className="mono text-[8.6px] tracking-[.14em]">{it.label.toUpperCase()}</span>
        </button>
      ))}
    </nav>
  );
}
