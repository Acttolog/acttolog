import { resolveImage } from '@/lib/utils';

/**
 * Card cover: photos ship derived WebP widths so a phone never pulls the
 * 1600px original, while missing shots fall back to procedural brand art.
 */
export function MediaCover({ id, art, shots, alt = '', className }: {
  id: string;
  art: string;
  shots: string[];
  alt?: string;
  className?: string;
}) {
  if (!shots.includes(id)) {
    return <img loading="lazy" decoding="async" src={resolveImage(`art:${art}`)} alt={alt} className={className} />;
  }
  return (
    <img
      loading="lazy"
      decoding="async"
      src={`/media/${id}.jpg`}
      srcSet={`/media/derived/${id}-480.webp 480w, /media/derived/${id}-960.webp 960w, /media/${id}.jpg 1600w`}
      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 50vw, 33vw"
      alt={alt}
      className={className}
    />
  );
}
