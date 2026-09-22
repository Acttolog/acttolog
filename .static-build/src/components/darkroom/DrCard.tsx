'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { VerifyBadge } from '@/components/ui/Badges';
import { useI18n } from '@/lib/i18n';
import { useSaved } from '@/lib/saved';
import { track } from '@/lib/analytics';
import type { DarkroomResource } from '@/lib/content/types';

/** Darkroom resource card (prototype drCard/drCard2). Popularity numbers stay hidden (spec §33/§35). */
export function DrCard({ r, score }: { r: DarkroomResource; score?: number }) {
  const { L, t, locale } = useI18n();
  const { isSaved, toggleSave } = useSaved();
  const profile = r.presentation === 'profile';
  const saved = isSaved('dr', r.id);

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="w-11 h-11 rounded-xl grid place-items-center font-display font-bold text-[15px] flex-none"
          style={{ background: 'color-mix(in srgb,var(--gold) 13%,transparent)', border: '1px solid color-mix(in srgb,var(--gold) 30%,transparent)', color: 'var(--gold)' }}>
          {r.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {r.official && <span className="badge b-info">{t('official')}</span>}
          <VerifyBadge verification={r.verification} />
        </div>
      </div>
      <h3 className="font-display font-semibold text-[15.8px] mb-1.5">{r.name}</h3>
      <div className="mono text-[9.6px] tracking-[.15em] dim mb-2.5">
        {r.category.toUpperCase()} · {r.subcategory || ''} · {r.pricing} · {r.region || 'Global'}
      </div>
      <p className="mut text-[12.9px] leading-relaxed mb-4">{L(r.short)}</p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(r.tags || []).slice(0, 2).map((x) => <span key={x} className="tag">{x}</span>)}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12.3px] font-semibold" style={{ color: 'var(--cy)' }}>
          {profile
            ? (locale === 'ne' ? 'प्रोफाइल' : 'Profile')
            : (locale === 'ne' ? 'नयाँ ट्याबमा खोल्नुहोस्' : 'Open in New Tab')}
          <Icon name="arrow" size={13} />
        </span>
      </div>
    </>
  );

  const open = () => track('resource_open', { resource: r.slug, external: !profile });

  return (
    <div className="card p-5 group relative">
      {profile ? (
        <Link href={`/darkroom/${r.slug}`} className="block" onClick={open} style={{ color: 'inherit' }}>
          {inner}
        </Link>
      ) : (
        <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={open} style={{ color: 'inherit' }}>
          {inner}
        </a>
      )}
      <button
        className="ico !w-8 !h-8 absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-10"
        aria-label={saved ? t('saved') : t('save')} aria-pressed={saved}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave('dr', r.id, r.name, profile ? `/darkroom/${r.slug}` : r.url); }}
        style={saved ? { color: 'var(--mg)', opacity: 1, borderColor: 'color-mix(in srgb,var(--mg) 45%,transparent)' } : undefined}>
        <Icon name="heart" size={14} />
      </button>
      {score !== undefined && (
        <span className="sr-only">relevance {score}</span>
      )}
    </div>
  );
}
