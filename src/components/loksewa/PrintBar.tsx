'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { dlMb } from '@/lib/dl-types';
import type { DlFile } from '@/lib/dl-types';

/**
 * Screen-only document bar: print, or take the pre-built PDF when the file
 * has actually been generated. It disappears from the printed sheet itself.
 */
export function PrintBar({ doc, title, pdf }: { doc: string; title: string; pdf: DlFile | null }) {
  return (
    <div className="lkdoc-bar" data-doc={doc}>
      <div className="wrap lkdoc-bar-in">
        <Link className="lkdoc-back" href="/loksewa">
          <Icon name="arrow" size={14} /> लोकसेवा घर
        </Link>
        <span className="lkdoc-bar-title">{title}</span>
        <div className="lkdoc-bar-act">
          {pdf ? (
            <a className="btn btn-p btn-sm" href={pdf.path} download={pdf.name}>
              <Icon name="doc" size={14} /> PDF ({dlMb(pdf.bytes)})
            </a>
          ) : null}
          <button className="btn btn-g btn-sm" type="button" onClick={() => window.print()}>
            <Icon name="screen" size={14} /> छाप्नुहोस्
          </button>
          <Link className="btn btn-sm" href="/loksewa/downloads">
            <Icon name="down" size={14} /> डाउनलोड केन्द्र
          </Link>
        </div>
      </div>
    </div>
  );
}
