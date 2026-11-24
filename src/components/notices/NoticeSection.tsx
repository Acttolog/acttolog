import { Reveal } from '@/components/ui/Reveal';
import { NoticeBoard } from './NoticeBoard';
import { noticesFor, noticeCategoriesFor, noticeMeta, noticeTagline } from '@/lib/content/notices';
import { reachByHost } from '@/lib/content/sources';
import type { NoticeScope } from '@/lib/content/notice-utils';

/**
 * Server wrapper: pulls a scope's notices from the ledger and renders the
 * client NoticeBoard inside the site's standard section rhythm. Used by the
 * Loksewa hub and every division page so each section gets its own board.
 */
export function NoticeSection({
  scope,
  locale = 'en',
  variant = 'section',
  accent = 'var(--cy)',
  title,
  subtitle,
  id,
}: {
  scope: NoticeScope;
  locale?: 'en' | 'ne';
  variant?: 'full' | 'section';
  accent?: string;
  title?: { en: string; ne?: string };
  subtitle?: { en: string; ne?: string };
  id?: string;
}) {
  const notices = noticesFor(scope);
  if (notices.length === 0) return null;
  return (
    <section className="sec nb-sec" id={id}>
      <div className="wrap">
        <Reveal>
          <NoticeBoard
            notices={notices}
            categories={noticeCategoriesFor(scope)}
            meta={noticeMeta()}
            locale={locale}
            variant={variant}
            accent={accent}
            title={title}
            subtitle={subtitle ?? noticeTagline(scope)}
            reach={reachByHost()}
          />
        </Reveal>
      </div>
    </section>
  );
}