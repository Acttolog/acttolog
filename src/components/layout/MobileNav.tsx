'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';

/** Mobile command center (spec §63): EXPLORE · SEARCH · EARTH · SAVED · PROFILE */
export function MobileNav() {
  const pathname = usePathname();
  const { locale } = useI18n();
  if (pathname.startsWith('/explore') || pathname.startsWith('/admin')) return null;

  const openSearch = () => window.dispatchEvent(new CustomEvent('acttolog:search-open'));
  const items: { label: string; icon: string; act: () => void; on?: boolean }[] = [
    { label: locale === 'ne' ? 'अन्वेषण' : 'Explore', icon: 'compass', act: () => { window.location.href = '/explore'; }, on: false },
    { label: locale === 'ne' ? 'खोज' : 'Search', icon: 'search', act: openSearch, on: false },
    { label: 'Earth', icon: 'globe', act: () => { window.location.href = '/explore?mode=earth'; }, on: false },
    { label: locale === 'ne' ? 'सुरक्षित' : 'Saved', icon: 'heart', act: () => { window.location.href = '/my/saved'; }, on: pathname.startsWith('/my/saved') },
    { label: locale === 'ne' ? 'प्रोफाइल' : 'Profile', icon: 'users', act: () => { window.location.href = '/my'; }, on: pathname.startsWith('/my') && !pathname.startsWith('/my/saved') },
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
