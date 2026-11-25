import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { readMediaFiles, scanShots, shotFor } from '@/lib/nepal-media';
import { NepalShot } from '@/components/nepal/NepalShot';
import { nepalGuide } from '@/lib/content/nepal';
import type { HomeSection } from '@/lib/content/types';

/**
 * NepalPromo — the homepage gateway into the Nepal travel guide.
 *
 * Deliberately WebGL-free: the hero already runs a full R3F Earth, so adding a
 * second canvas here would double the heaviest cost on the page for a band the
 * user scrolls past. Motion is transform/opacity only, pauses under
 * prefers-reduced-motion, and the whole section is CMS-hidden when its
 * `homeSections.nepal` entry is set to visible:false.
 */

export function NepalPromo({ section, locale = 'en' }: { section: HomeSection; locale?: 'en' | 'ne' }) {
  if (section.visible === false) return null;
  const g = nepalGuide();
  const shot = shotFor(g.hero.image, scanShots(readMediaFiles()));
  const highlights = g.places.filter((p) => p.unesco).slice(0, 3);
  const pick = (v: { en: string; ne?: string }) => (locale === 'ne' && v.ne ? v.ne : v.en);
  // Gateway-only figures: the deck's guide card owns places/regions totals,
  // so this band reports heritage, trekking and permit breadth instead.
  const facts = [
    { n: g.places.filter((p) => p.unesco).length, label: { en: 'UNESCO sites', ne: 'युनेस्को क्षेत्र' } },
    { n: g.treks.length, label: { en: 'Trek routes', ne: 'ट्रेक मार्ग' } },
    { n: g.permits.length, label: { en: 'Permit types', ne: 'अनुमति प्रकार' } },
  ];

  return (
    <section className="sec npromo" id="nepal-promo" aria-label={locale === 'ne' ? 'नेपाल पर्यटन मार्गदर्शन' : 'Nepal tourism guide'}>
      <div className="npromo-bg" data-photo={shot ? '1' : '0'} data-plane="-1.2">
        {shot && shot.has.length ? (
          <NepalShot
            shot={shot}
            alt={locale === 'ne' ? 'नेपालमा हिउँले ढकिएको हिमालय' : 'Himalayan peaks at sunrise in Nepal'}
            art="himalaya"
            variant="wide"
            className="npromo-img"
          />
        ) : (
          /* No photograph on disk: ship the editorial AI art instead of the
             procedural panel, responsive WebP first, JPEG as the fallback. */
          <picture>
            <source
              type="image/webp"
              srcSet="/media/ai/derived/editorial-nepal-480.webp 480w, /media/ai/derived/editorial-nepal-960.webp 960w"
              sizes="100vw"
            />
            <img
              className="npromo-img"
              src="/media/ai/editorial-nepal.jpg"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
          </picture>
        )}
        <div className="npromo-veil" />
        {/* ridge silhouette, drawn not photographed so it scales to any width */}
        <svg className="npromo-ridge" viewBox="0 0 1440 130" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 130 L0 96 L118 58 L205 84 L318 30 L410 68 L520 22 L640 62 L742 34 L866 78 L960 44 L1082 86 L1180 52 L1300 92 L1440 60 L1440 130 Z" />
          <path
            className="npromo-ridge-2"
            d="M0 130 L0 112 L150 82 L268 104 L392 66 L512 98 L640 72 L770 100 L900 78 L1030 106 L1160 84 L1290 110 L1440 92 L1440 130 Z"
          />
        </svg>
      </div>

      <div className="wrap npromo-inner" data-plane="0.55">
        <Reveal>
          <div className="eyebrow npromo-kicker">
            {locale === 'ne' ? 'विशेष गन्तव्य · नेपाल' : 'FEATURED DESTINATION · NEPAL'}
          </div>
          <h2 className="npromo-h">{pick(section.title)}</h2>
          <p className="npromo-lead">{pick(section.body)}</p>

          <div className="npromo-facts">
            {facts.map((f) => (
              <div key={f.label.en} className="npromo-fact">
                <span className="mono npromo-fact-n" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {f.n}
                </span>
                <span className="npromo-fact-l">{pick(f.label)}</span>
              </div>
            ))}
          </div>

          <div className="npromo-cta">
            <Link className="btn btn-lg btn-p" href="/nepal">
              <Icon name="compass" size={17} />
              {locale === 'ne' ? 'नेपाल अन्वेषण गर्नुहोस्' : 'EXPLORE NEPAL'}
            </Link>
            <Link className="btn btn-lg btn-g" href="/nepal#treks">
              <Icon name="rocket" size={16} />
              {locale === 'ne' ? 'ट्रेक मार्ग र अनुमति' : 'TREK ROUTES & PERMITS'}
            </Link>
          </div>

          <div className="npromo-unesco">
            <a
              className="mono npromo-unesco-label"
              href="https://whc.unesco.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              {locale === 'ne' ? 'नेपालका युनेस्को विश्व सम्पदा क्षेत्रहरू' : 'UNESCO WORLD HERITAGE IN NEPAL'}
            </a>
            {highlights.map((p) => (
              <Link key={p.id} className="npromo-chip" href={`/nepal#place-${p.id}`}>
                {p.name.en}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>

      <style>{`
        .npromo { position: relative; overflow: hidden; display: flex; align-items: center; padding: 0;
          min-height: clamp(380px, 50vh, 500px); }
        .npromo-bg { position: absolute; inset: 0; z-index: 0; }
        .npromo-bg picture { position: absolute; inset: 0; }
        .npromo-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
          animation: npromoDrift 46s ease-in-out infinite alternate; }
        .npromo-veil { position: absolute; inset: 0;
          background: linear-gradient(100deg, var(--bg) 4%, color-mix(in srgb, var(--bg) 86%, transparent) 42%,
            color-mix(in srgb, var(--bg) 30%, transparent) 78%, transparent 100%); }
        .npromo-ridge { position: absolute; bottom: -1px; left: 0; width: 100%; height: 130px; }
        .npromo-ridge path { fill: color-mix(in srgb, var(--bg) 92%, transparent); }
        .npromo-ridge-2 { opacity: .55; }
        .npromo-inner { position: relative; z-index: 2; padding: clamp(32px,4.4vw,56px) 0; max-width: 780px; }
        .npromo-kicker { color: var(--gold); }
        .npromo-h { font-family: var(--font-display); font-weight: 600; margin: 16px 0 0;
          font-size: clamp(1.75rem, 4.4vw, 3.1rem); line-height: 1.04; letter-spacing: -.032em; color: var(--txt);
          max-width: 21ch; text-wrap: balance; }
        .npromo-lead { margin-top: 16px; color: var(--mut); font-size: clamp(.98rem, 1.25vw, 1.1rem); line-height: 1.75; max-width: 60ch; }
        .npromo-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 10px; margin-top: 20px; }
        .npromo-fact { border: 1px solid var(--line); border-radius: 13px; padding: 12px 14px;
          background: color-mix(in srgb, var(--panel) 62%, transparent); backdrop-filter: blur(8px);
          display: flex; flex-direction: column; gap: 4px; }
        .npromo-fact-n { font-size: 1.06rem; font-weight: 600; color: var(--cy); letter-spacing: -.02em; }
        .npromo-fact-l { font-size: 10.6px; line-height: 1.35; color: var(--dim); letter-spacing: .04em; }
        .npromo-cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
        .npromo-unesco { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 18px;
          padding-top: 14px; border-top: 1px solid var(--line); }
        .npromo-unesco-label { font-size: 10.5px; letter-spacing: .2em; color: var(--gold); margin-right: 4px; }
        .npromo-chip { font: 500 11px/1 var(--font-mono); letter-spacing: .06em; color: var(--mut);
          border: 1px solid var(--line); border-radius: 999px; padding: 6px 11px; text-decoration: none; transition: .3s; }
        .npromo-chip:hover { color: var(--txt); border-color: color-mix(in srgb, var(--cy) 55%, transparent); }
        @keyframes npromoDrift { from { transform: scale(1.05) translate3d(0,0,0) } to { transform: scale(1.17) translate3d(-2.5%,-1.5%,0) } }
        @media (max-width: 760px) {
          .npromo { min-height: 470px; }
          .npromo-img { object-position: 64% 50%; }
          .npromo-veil { background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 92%, transparent) 8%,
            color-mix(in srgb, var(--bg) 66%, transparent) 52%, var(--bg) 96%); }
        }
        @media (prefers-reduced-motion: reduce) { .npromo-img { animation: none; } }
      `}</style>
    </section>
  );
}
