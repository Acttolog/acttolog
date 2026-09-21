'use client';

import { Icon } from '@/components/ui/Icon';
import { useSaved } from '@/lib/saved';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';

/** Open Here / Open in New Tab + save (spec §36). */
export function ResourceActions({ resource }: {
  resource: { slug: string; name: string; url: string; presentation: string };
}) {
  const { t } = useI18n();
  const { isSaved, toggleSave } = useSaved();
  const saved = isSaved('dr', resource.slug);

  return (
    <div className="flex flex-wrap gap-3">
      <a className="btn btn-p" href={resource.url} target="_blank" rel="noopener noreferrer"
        onClick={() => track('resource_open', { resource: resource.slug, how: 'new_tab' })}>
        <Icon name="arrow" size={15} />{t('dark.tab')}
      </a>
      <button className={`btn ${saved ? 'btn-p' : 'btn-g'}`}
        aria-pressed={saved}
        onClick={() => toggleSave('dr', resource.slug, resource.name, `/darkroom/${resource.slug}`)}>
        <Icon name="heart" size={15} />{saved ? t('saved') : t('save')}
      </button>
      <a className="btn btn-g" href={resource.url} target="_blank" rel="noopener noreferrer"
        onClick={() => track('resource_open', { resource: resource.slug, how: 'direct' })}>
        {t('dark.here')}
      </a>
    </div>
  );
}
