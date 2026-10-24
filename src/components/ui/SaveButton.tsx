'use client';

import { useI18n } from '@/lib/i18n';
import { useSaved } from '@/lib/saved';
import { Icon } from '@/components/ui/Icon';

/**
 * SaveButton — the one control that writes into My ACTTOLOG.
 *
 * The dashboard's "Saved Items" tab already groups whatever kinds exist, so a
 * new bucket only needs a distinct `kind`; no dashboard change is required.
 * Guests store locally (localStorage) and signed-in users sync through
 * /api/saved, which is why this works on the static GitHub Pages export as
 * well as on a server-rendered host.
 */
export function SaveButton({ kind, id, title, route, size = 14 }: {
  kind: string;
  id: string;
  title: string;
  route?: string;
  size?: number;
}) {
  const { isSaved, toggleSave } = useSaved();
  const { locale } = useI18n();
  const ne = locale === 'ne';
  const on = isSaved(kind, id);

  return (
    <button
      className={`btn btn-sm ${on ? 'btn-p' : 'btn-g'}`}
      onClick={() => toggleSave(kind, id, title, route)}
      aria-pressed={on}
      title={on
        ? (ne ? 'My ACTTOLOG मा सुरक्षित' : 'Saved to My ACTTOLOG')
        : (ne ? 'My ACTTOLOG मा सुरक्षित गर्नुहोस्' : 'Save to My ACTTOLOG')}
    >
      <Icon name={on ? 'check' : 'heart'} size={size} />
      {on ? (ne ? 'सुरक्षित' : 'SAVED') : (ne ? 'सुरक्षित गर्नु' : 'SAVE')}
    </button>
  );
}
