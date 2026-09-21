'use client';

import { useEffect } from 'react';
import { Md } from '@/components/ui/Bi';
import { MembersGate } from '@/components/ui/Interactive';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import type { BlogPost } from '@/lib/content/types';

/** Article body — public posts render fully; members-only posts preview + gate (spec §40). */
export function PostBody({ post }: { post: BlogPost }) {
  const { L, locale } = useI18n();
  const members = post.access === 'members';

  useEffect(() => {
    track('article_view', { post: post.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.slug]);

  const content = L(post.content);
  // members-only: show the first ~40% as preview, gate the rest
  const previewCut = members ? Math.max(200, Math.floor(content.length * 0.4)) : content.length;
  const preview = content.slice(0, previewCut);
  const rest = members ? content.slice(previewCut) : '';
  const cutAtSentence = members ? preview.lastIndexOf('. ') + 2 : previewCut;

  return (
    <div>
      <Md src={members ? preview.slice(0, cutAtSentence > 200 ? cutAtSentence : preview.length) : content} />
      {members && (
        <div className="relative mt-2">
          <div className="lockblur" aria-hidden="true">
            <Md src={rest || content.slice(previewCut - 200)} />
          </div>
          <div className="absolute inset-0 grid place-items-end">
            <div className="w-full" style={{ background: 'linear-gradient(180deg,transparent,color-mix(in srgb,var(--bg) 96%,transparent) 55%)', height: '60%' }} />
          </div>
          <div className="relative">
            <MembersGate returnTo={`/blog/${post.slug}`}
              reason={locale === 'ne' ? 'सदस्य-विशेष लेख' : 'Members-only article'} />
          </div>
        </div>
      )}
    </div>
  );
}
