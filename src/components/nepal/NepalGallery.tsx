import attribution from '@/lib/content/nepal-attribution.json';
import { readMediaFiles, scanShots, shotFor, type ShotSource } from '@/lib/nepal-media';
import { NepalShot } from './NepalShot';
import { Reveal } from '@/components/ui/Reveal';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { FxReel } from '@/components/fx/FxReel';

/**
 * NepalGallery — every photograph in the guide, with its photographer and
 * licence attached.
 *
 * 22 of the 24 images here are CC BY or CC BY-SA, which require visible
 * attribution to be used lawfully. Putting the credit next to the image (and
 * linking the source page) satisfies that condition where a footnote buried at
 * the bottom of a long page would not.
 */

export interface PhotoCredit {
  slug: string;
  title: { en: string; ne?: string };
  alt: { en: string };
  credit: string;
  license: string;
  sourceUrl: string;
  subject: string;
}

const photos = attribution as PhotoCredit[];

/** Licences that require a share-alike or attribution notice. */
export const licenceRequiresCredit = (l: string) => !/^CC0$/i.test(l.trim());

export function NepalGallery() {
  const scanned = scanShots(readMediaFiles());
  const present = photos
    .map((p) => ({ p, shot: shotFor(`nepal/${p.slug}`, scanned) as ShotSource | null }))
    .filter((x): x is { p: PhotoCredit; shot: ShotSource } => Boolean(x.shot && x.shot.has.length));

  if (!present.length) return null;

  const subjects = new Set(present.map(({ p }) => p.subject)).size;
  const credited = present.filter(({ p }) => licenceRequiresCredit(p.license)).length;

  return (
    <div className="np-gal">
      <FxReel
        items={present.slice(0, 5).map(({ p, shot }) => {
          // A reel cell renders about 340 px wide; take the smallest step that
          // still covers it at 2x rather than the largest file available.
          const w = shot.has.find((x) => x >= 700) ?? shot.has[shot.has.length - 1];
          return {
            src: `/media/nepal/${shot.base}-${w}.jpg`,
            alt: p.alt.en,
            title: p.title.en,
            credit: `${p.credit} · ${p.license}`,
          };
        })}
      />
      <div className="np-gal-grid">
        {present.map(({ p, shot }, i) => (
          <Reveal key={p.slug} delay={Math.min(i, 8) * 30} className="np-gal-cell">
            <figure className="np-gal-fig">
              <SpatialFrame className="np-gal-media" clean intensity={7}>
                <NepalShot
                  shot={shot}
                  alt={p.alt.en}
                  variant={i % 5 === 0 ? 'wide' : 'card'}
                  art="himalaya"
                  className="np-gal-img"
                />
              </SpatialFrame>
              <figcaption className="np-gal-cap">
                <span className="np-gal-title">{p.title.en}</span>
                <span className="np-gal-credit">
                  <span className="np-gal-subj">{p.subject}</span>
                  {' · © '}
                  {p.credit}
                  {' · '}
                  <a href={p.sourceUrl} target="_blank" rel="license noopener noreferrer">
                    {p.license}
                  </a>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <p className="np-gal-note">
        {present.length} photographs across {subjects} subjects, all openly licensed and sourced from
        Wikimedia Commons. Each credit links to its source page. {credited} carry attribution obligations,
        honoured on the images themselves.
      </p>

      <style>{`
        .np-gal { display: flex; flex-direction: column; gap: 18px; }
        .np-gal-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(264px, 1fr)); }
        .np-gal-fig { margin: 0; display: flex; flex-direction: column; gap: 9px; }
        .np-gal-media { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 14px;
          border: 1px solid var(--line); background: var(--panel2); }
        .np-gal-img { width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform .8s cubic-bezier(.16,1,.3,1); }
        .np-gal-fig:hover .np-gal-img { transform: scale(1.05); }
        .np-gal-cap { display: flex; flex-direction: column; gap: 3px; padding: 0 2px; }
        .np-gal-title { font: 500 12.6px/1.35 var(--font-sans); color: var(--txt); }
        .np-gal-credit { font: 400 9.6px/1.5 var(--font-mono); color: var(--dim); letter-spacing: .03em; }
        .np-gal-credit a { color: var(--cy); text-decoration: none; }
        .np-gal-credit a:hover { text-decoration: underline; }
        .np-gal-subj { color: var(--mut); text-transform: uppercase; letter-spacing: .12em; font-size: 8.6px; }
        .np-gal-note { font-size: 11.6px; line-height: 1.6; color: var(--dim); margin: 0;
          border-left: 2px solid var(--line2); padding-left: 12px; }
        @media (max-width: 620px) { .np-gal-grid { grid-template-columns: 1fr 1fr; gap: 10px; } }
        @media (prefers-reduced-motion: reduce) { .np-gal-img { transition: none; } }
      `}</style>
    </div>
  );
}
