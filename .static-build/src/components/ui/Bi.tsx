'use client';

import { useI18n } from '@/lib/i18n';
import { md2html } from '@/lib/utils';
import type { Bi } from '@/lib/content/types';

/** Locale-aware bilingual text renderer with fallback flagging (prototype `L()` + `mflag()`). */
export function BiText({ value, flag, className, as: Tag = 'span' }: {
  value: Bi | string | undefined;
  flag?: boolean;
  className?: string;
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'li' | 'td';
}) {
  const { L, missingNe } = useI18n();
  const text = L(value);
  return (
    <Tag className={className}>
      {text}
      {flag && missingNe(value) && (
        <span className="badge b-warn ml-2 align-middle" title="Nepali translation missing — falls back to English">
          नेपाली बाँकी
        </span>
      )}
    </Tag>
  );
}

/** Markdown body renderer (prototype `md2html`, escape-first — safe). */
export function Md({ src, className = 'prose' }: { src: string | undefined; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: md2html(src) }} />;
}
