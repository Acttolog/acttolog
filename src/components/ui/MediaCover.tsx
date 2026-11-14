import { resolveImage } from '@/lib/utils';

/**
 * Card cover: photos ship derived WebP widths so a phone never pulls the
 * 1600px original, while missing shots fall back to procedural brand art.
 *
 * SIZES is measured from public/media/*.jpg, not guessed — it reserves the box
 * before the bytes arrive, so a card no longer jumps when its image lands
 * (the site's own CLS budget). Regenerate with:
 *   node -e "const s=require('sharp'),fs=require('fs');Promise.all(fs.readdirSync('public/media').filter(f=>f.endsWith('.jpg')).map(f=>s('public/media/'+f).metadata().then(m=>[f.replace('.jpg',''),[m.width,m.height]]))).then(e=>console.log(JSON.stringify(Object.fromEntries(e))))"
 */
const SIZES: Record<string, readonly [number, number]> = {
  academy: [1800, 1800],
  blog: [1600, 1600],
  cube26: [1200, 675],
  darkroom: [1800, 1800],
  entertainment: [1600, 1600],
  'founder-avatar': [512, 512],
  'founder-casual': [1000, 1000],
  'founder-pro': [1200, 1033],
  games: [1600, 1600],
  offers: [1600, 1600],
  research: [1800, 1800],
  world: [1600, 1600],
};

/** The measured library is 10 of 12 square, so square is the honest default. */
const FALLBACK: readonly [number, number] = [1600, 1600];

export function MediaCover({
  id,
  art,
  shots,
  alt = '',
  className,
}: {
  id: string;
  art: string;
  shots: string[];
  alt?: string;
  className?: string;
}) {
  const [width, height] = SIZES[id] ?? FALLBACK;

  if (!shots.includes(id)) {
    return (
      <img
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
        src={resolveImage(`art:${art}`)}
        alt={alt}
        className={`mcv ${className ?? ''}`.trim()}
      />
    );
  }

  return (
    <img
      loading="lazy"
      decoding="async"
      width={width}
      height={height}
      src={`/media/${id}.jpg`}
      srcSet={`/media/derived/${id}-480.webp 480w, /media/derived/${id}-960.webp 960w, /media/${id}.jpg 1600w`}
      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 50vw, 33vw"
      alt={alt}
      className={`mcv ${className ?? ''}`.trim()}
    />
  );
}
