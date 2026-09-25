'use client';

import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { usePrefs, THEMES } from '@/lib/prefs';
import { resolveImage } from '@/lib/utils';

/**
 * Layer 00 · THE LIVING WORLD — one section that presents the interactive
 * Earth (pointer readout, zoom, layers, fly-to), the division imagery and
 * the full theme gallery. Images fall back to procedural brand art when
 * a shot is not present in /media.
 */
export function WorldShowcase({ shots }: { shots: string[] }) {
  const { locale } = useI18n();
  const { theme, setTheme } = usePrefs();
  const img = (id: string, art: string) => (shots.includes(id) ? `/media/${id}.jpg` : resolveImage(`art:${art}`));

  const feats: [string, string, string][] = [
    [locale === 'ne' ? 'ड्र्याग → दुई अक्षमा घुमाउनुहोस्' : 'Drag — spin on two axes', 'Horizontal spin with a slow vertical breathing wobble; inertia on release.', 'refresh'],
    [locale === 'ne' ? 'स्क्रोल → सडक स्तरसम्म जुम' : 'Scroll — zoom to street level', 'From orbit imagery down to roads and houses via open OSM/Esri tiles.', 'search'],
    [locale === 'ne' ? 'घर खोज्नुहोस् → उडान' : 'Find your home — fly-to', 'Geocoded flight lands exactly on your place, pin pulsing.', 'home'],
    [locale === 'ne' ? 'पोइन्टर रिङ → जीवित निर्देशाङ्क' : 'Pointer ring — live coordinates', 'A targeting ring follows your mouse with real-time lat/lon readout.', 'compass'],
    [locale === 'ne' ? 'तहहरू: EARTH · MAP · SAT' : 'Layers: EARTH · MAP · SAT', 'Blue-marble Earth, street map, or satellite imagery — one click.', 'layers'],
    [locale === 'ne' ? '३D विभाग संरचनाहरू' : '3D division structures', 'Thesyn thesis-stack, Darkroom vault, Academy spire, Entertainment reel, Games crystals — all in living motion.', 'spark'],
  ];

  const gallery: [string, string, string][] = [
    ['world', 'nebula', locale === 'ne' ? 'एक जोडिएको संसार' : 'One connected world'],
    ['research', 'research', 'Thesyn Research'],
    ['darkroom', 'editorial', 'Darkroom'],
    ['academy', 'academy', 'Academy'],
    ['entertainment', 'stage', 'Entertainment'],
    ['games', 'games', 'Games'],
  ];

  return (
    <section className="sec" id="world">
      <div className="wrap">
        <Reveal>
          <div className="sechead">
            <div>
              <div className="secnum mb-3">00 · THE LIVING WORLD</div>
              <h2 className="h2 max-w-[26ch]">
                {locale === 'ne' ? 'एउटा जीवित ग्रह — तपाईंको कर्सरसँग' : 'One living planet — with your cursor on it'}
              </h2>
              <p className="lead mt-4">
                {locale === 'ne'
                  ? 'माथिको हिरोमा पृथ्वी छुनुहोस्: पोइन्टर रिङ, तहहरू, जुम र उडान — सबै यही अनुभवका भाग हुन्।'
                  : 'Touch the Earth in the hero above: pointer ring, layers, street zoom and fly-to are all part of this one experience.'}
              </p>
            </div>
            <span className="chip">10 THEMES · 3 LAYERS · 6 STRUCTURES</span>
          </div>
        </Reveal>

        {/* imagery wall */}
        <div className="grid lg:grid-cols-[1.5fr_1fr_1fr] gap-4 mb-10">
          {gallery.map(([id, art, label], i) => (
            <Reveal key={id} delay={i * 60} className={i === 0 ? 'lg:row-span-2' : ''}>
              <div className="card group relative overflow-hidden h-full" style={{ minHeight: i === 0 ? 420 : 200 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(id, art)} alt={label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.8s] group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 45%,color-mix(in srgb,var(--bg) 88%,transparent))' }} />
                <div className="absolute bottom-0 p-5 w-full">
                  <div className="mono text-[9.6px] tracking-[.22em] mb-1" style={{ color: 'var(--cy)' }}>{String(i + 1).padStart(2, '0')}</div>
                  <div className="font-display font-semibold text-[15.4px]">{label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* interaction matrix */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {feats.map(([t, b, icon], i) => (
            <Reveal key={t} delay={(i % 3) * 50}>
              <div className="panel p-5 h-full">
                <span className="w-9 h-9 rounded-lg grid place-items-center mb-3"
                  style={{ background: 'color-mix(in srgb,var(--cy) 12%,transparent)', color: 'var(--cy)', border: '1px solid color-mix(in srgb,var(--cy) 28%,transparent)' }}>
                  <Icon name={icon} size={16} />
                </span>
                <div className="font-display font-semibold text-[14px] mb-1.5">{t}</div>
                <p className="mut text-[12.4px] leading-relaxed">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* theme gallery */}
        <Reveal>
          <div className="panel p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <div className="eyebrow mb-2">THEME GALLERY</div>
                <h3 className="h3">
                  {locale === 'ne' ? 'दस वातावरणहरू — तुरुन्तै लागू हुन्छ' : 'Ten atmospheres — applied instantly'}
                </h3>
              </div>
              <span className="dim mono text-[10px] tracking-[.16em]">{locale === 'ne' ? 'क्लिक गर्नुहोस् → पूरा संसार बदलिन्छ' : 'CLICK → THE WHOLE WORLD RE-SKINS'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {THEMES.map((th) => (
                <button key={th.id} onClick={() => setTheme(th.id)}
                  className="rounded-xl border p-4 text-left transition-all hover:-translate-y-1"
                  style={{
                    borderColor: theme === th.id ? 'color-mix(in srgb,var(--cy) 55%,transparent)' : 'var(--line)',
                    background: th.sw[0],
                  }}
                  aria-pressed={theme === th.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-full border" style={{ background: `linear-gradient(135deg, ${th.sw[1]}, ${th.sw[0]})`, borderColor: 'rgba(255,255,255,.25)' }} />
                    {theme === th.id && <span style={{ color: th.sw[1] }}><Icon name="check" size={14} /></span>}
                  </div>
                  <div className="font-display font-semibold text-[12.6px]" style={{ color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>{th.label}</div>
                  <div className="mono text-[9px] tracking-[.18em] mt-1" style={{ color: 'rgba(255,255,255,.65)' }}>{th.id.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
