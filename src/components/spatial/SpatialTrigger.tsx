'use client';

import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { SPATIAL_EVENT } from './types';

/**
 * Opens the global spatial deck at a given item. When `href` is supplied it
 * renders a real link, so a no-JS visitor still reaches the division.
 */
export function SpatialTrigger({
  id,
  className,
  style,
  children,
  label,
  href,
}: {
  id?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  label?: string;
  href?: string;
}) {
  const open = (event: MouseEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent(SPATIAL_EVENT, { detail: { id } }));
  };
  const body = children ?? <span className="sr-only">{label}</span>;

  if (href) {
    return (
      <a href={href} className={className} style={style} aria-label={label} onClick={open}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className={className} style={style} aria-label={label} onClick={open}>
      {body}
    </button>
  );
}
