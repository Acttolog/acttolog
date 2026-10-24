import { resolveImage } from '@/lib/utils';

/**
 * NepalShot — responsive <picture> for the tourism guide.
 *
 * Media ships as slug-{480,1024,1600}.{avif,jpg}. AVIF first, JPG for the
 * browsers that lack it, and the widths are advertised through srcset so a
 * phone never pulls a 1600px file. If nothing matches on disk we fall back to
 * procedural brand art (the same mechanism the homepage divisions use) so a
 * missing photograph degrades to an intentional panel instead of a broken icon.
 */

export type ShotVariant = 'card' | 'wide' | 'food';

const WIDTHS = [480, 1024, 1600] as const;

const SIZES: Record<ShotVariant, string> = {
  // cards sit in an auto-fill grid of ~300-360px columns, 1up on phones
  card: '(max-width: 620px) 92vw, (max-width: 1000px) 46vw, 33vw',
  wide: '100vw',
  food: '(max-width: 620px) 92vw, (max-width: 1000px) 46vw, 25vw',
};

export interface ShotSource {
  /** base slug without width or extension, e.g. "everest-pano" */
  base: string;
  /** widths actually present on disk */
  has: number[];
  hasAvif: boolean;
}

export function NepalShot({ shot, alt, variant = 'card', art = 'himalaya', eager = false, className }: {
  shot: ShotSource | null;
  /** Meaningful description for screen readers. Pass '' for decorative art. */
  alt: string;
  variant?: ShotVariant;
  /** PALETTES key used when there is no photograph. */
  art?: string;
  eager?: boolean;
  className?: string;
}) {
  const fallback = resolveImage('', art);
  if (!shot || !shot.has.length) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={className} src={fallback} alt="" aria-hidden="true"
        loading={eager ? 'eager' : 'lazy'} decoding="async" />
    );
  }
  const { base, has, hasAvif } = shot;
  const srcset = (ext: string) =>
    has.map((w) => `/media/nepal/${base}-${w}.${ext} ${w}w`).join(', ');
  const largest = has[has.length - 1];

  return (
    <picture>
      {hasAvif && <source type="image/avif" srcSet={srcset('avif')} sizes={SIZES[variant]} />}
      <source type="image/jpeg" srcSet={srcset('jpg')} sizes={SIZES[variant]} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={className}
        src={`/media/nepal/${base}-${largest}.jpg`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={largest}
        height={Math.round(largest * 0.625)}
      />
    </picture>
  );
}

export const SHOT_WIDTHS = WIDTHS;
