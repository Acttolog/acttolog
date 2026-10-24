import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { seoFor } from '@/lib/content';
import { readMediaFiles, scanShots, shotFor, type ShotSource } from '@/lib/nepal-media';
import { NepalShot } from '@/components/nepal/NepalShot';
import { NepalGallery } from '@/components/nepal/NepalGallery';
import { nepalGuide, placesByRegion } from '@/lib/content/nepal';
import { NepalMap } from '@/components/nepal/NepalMap';
import { PlaceExplorer } from '@/components/nepal/PlaceExplorer';
import { GuidelinesTabs } from '@/components/nepal/GuidelinesTabs';
import { VideoReel } from '@/components/nepal/VideoReel';

const seo = seoFor('/nepal');

export const metadata: Metadata = {
  title: seo.title,
  description: seo.desc,
  alternates: { canonical: '/nepal' },
  openGraph: { title: seo.title, description: seo.desc, url: '/nepal', type: 'website' },
};

export default function NepalPage() {
  const g = nepalGuide();
  const byRegion = placesByRegion();

  // Scan disk once; every card and poster resolves through the same map.
  const scanned = scanShots(readMediaFiles());
  const shots: Record<string, ShotSource> = {};
  for (const p of g.places) {
    const s = shotFor(p.image, scanned);
    if (s) shots[p.id] = s;
  }
  const heroShot = shotFor(g.hero.image, scanned);
  const videoPosters: Record<string, ShotSource> = {};
  for (const v of g.videos) {
    const s = shotFor(v.poster, scanned);
    if (s) videoPosters[v.id] = s;
  }

  const t = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="np-hero" id="top">
        <NepalShot
          shot={heroShot}
          alt={heroShot ? 'The Himalaya range at dawn in Nepal' : ''}
          art="himalaya"
          variant="wide"
          eager
          className="np-hero-img"
        />
        <div className="np-hero-veil" />
        <div className="np-hero-grain" />
        <div className="wrap np-hero-inner">
          <Reveal>
            <div className="eyebrow">{g.hero.kicker.en}</div>
            <h1 className="np-h1">{g.hero.title.en}</h1>
            <p className="np-hero-line">{g.hero.line.en}</p>
            <div className="np-hero-cta">
              <a className="btn btn-p" href="#regions"><Icon name="globe" size={15} />EXPLORE THE MAP</a>
              <a className="btn btn-g" href="#treks"><Icon name="compass" size={15} />PLAN A TREK</a>
              <a className="btn btn-g" href="#guidelines"><Icon name="shield" size={15} />TRAVEL GUIDELINES</a>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="np-stats">
              {g.stats.map((s, i) => (
                <div key={i} className="np-stat">
                  <div className="np-stat-n mono">{s.n}</div>
                  <div className="np-stat-label">{s.label.en}</div>
                  {s.sub && <div className="np-stat-sub mono">{s.sub}</div>}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 01 · REGIONS + MAP ───────────────────────────────────── */}
      <section className="sec" id="regions">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(1)} · GEOGRAPHY</div>
                <h2 className="h2">Twelve regions, one country of contrasts</h2>
                <p className="lead mt-4">
                  Nepal runs from 59 m above sea level in the Terai to 8,848.86 m at Sagarmatha inside a hundred
                  kilometres. Pick a region to see what belongs to it.
                </p>
              </div>
              <div className="mono np-head-meta">{g.regions.length} REGIONS · {g.places.length} PLACES</div>
            </div>
          </Reveal>
          <NepalMap regions={g.regions} placesByRegion={byRegion} />
        </div>
      </section>

      {/* ── 02 · PLACES ──────────────────────────────────────────── */}
      <section className="sec np-alt" id="places">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(2)} · PLACES TO VISIT</div>
                <h2 className="h2">Where to actually go</h2>
                <p className="lead mt-4">
                  Heritage cities, high valleys, Terai grassland and lake country — searchable, filterable, and
                  saveable to your My ACTTOLOG list.
                </p>
              </div>
            </div>
          </Reveal>
          <PlaceExplorer places={g.places} regions={g.regions} shots={shots} />
        </div>
      </section>

      {/* ── 03 · GALLERY ─────────────────────────────────────────── */}
      <section className="sec" id="gallery">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(3)} · IN PICTURES</div>
                <h2 className="h2">The country, photographed by the people who live there</h2>
                <p className="lead mt-4">
                  Every image is openly licensed and credited to its photographer. Nothing here is stock
                  photography bought and stripped of its context.
                </p>
              </div>
            </div>
          </Reveal>
          <NepalGallery />
        </div>
      </section>

      {/* ── 04 · FESTIVALS ───────────────────────────────────────── */}
      <section className="sec np-alt" id="festivals">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(4)} · CULTURE</div>
                <h2 className="h2">The festival calendar</h2>
                <p className="lead mt-4">
                  Nepal&apos;s working week is Sunday to Friday and its year is held together by festivals. Timing a
                  visit around one changes the whole trip.
                </p>
              </div>
            </div>
          </Reveal>
          <div className="np-fest">
            {g.festivals.map((f, i) => (
              <Reveal key={f.id} delay={i * 45}>
                <article className="np-fest-card panel" style={{ ['--a']: f.accent } as React.CSSProperties}>
                  {shotFor(f.image, scanned) && (
                    <div className="np-fest-media">
                      <NepalShot
                        shot={shotFor(f.image, scanned)}
                        alt={`${f.name.en} celebrated in Nepal`}
                        art="mithila"
                        variant="card"
                        className="np-fest-img"
                      />
                    </div>
                  )}
                  <div className="np-fest-top">
                    <span className="mono np-fest-n">{t(i + 1)}</span>
                    <div>
                      <h3 className="np-fest-name">{f.name.en}</h3>
                      <div className="mono np-fest-when">{f.when.en}</div>
                    </div>
                  </div>
                  <p className="np-fest-desc">{f.desc.en}</p>
                  <div className="np-fest-where tag">{f.where}</div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 · PEOPLES ─────────────────────────────────────────── */}
      <section className="sec np-alt" id="peoples">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(5)} · PEOPLES</div>
                <h2 className="h2">Over a hundred languages, one valley of makers</h2>
                <p className="lead mt-4">The groups that made Nepal what a visitor actually meets.</p>
              </div>
            </div>
          </Reveal>
          <div className="np-cult">
            {g.culture.map((c, i) => (
              <Reveal key={c.id} delay={i * 40}>
                <article className="np-cult-card">
                  <div className="np-cult-icon"><Icon name={c.icon === 'temple' ? 'screen' : c.icon} size={18} /></div>
                  <h3 className="np-cult-name">{c.name.en}</h3>
                  <div className="mono np-cult-where">{c.where}</div>
                  <p className="np-cult-desc">{c.desc.en}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 05 · CUISINE ─────────────────────────────────────────── */}
      <section className="sec" id="food">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(6)} · KITCHEN</div>
                <h2 className="h2">What you will actually eat</h2>
                <p className="lead mt-4">Hill fermentation, Terai river fish, Newar festival platters, and dal bhat that refills itself.</p>
              </div>
            </div>
          </Reveal>
          <div className="np-food">
            {g.cuisine.map((d, i) => {
              const shot = shotFor(d.image, scanned);
              return (
                <Reveal key={d.id} delay={i * 35}>
                  <article className="np-food-card card">
                    <div className="np-food-media">
                      <NepalShot
                        shot={shot}
                        alt={shot ? d.name.en : ''}
                        art={i % 2 ? 'mithila' : 'terai'}
                        variant="food"
                        className="np-food-img"
                      />
                      {!shot && <span className="mono np-card-art">ILLUSTRATED</span>}
                    </div>
                    <div className="np-food-body">
                      <h3 className="np-food-name">{d.name.en}<span className="np-food-ne">{d.name.ne}</span></h3>
                      <p className="np-food-desc">{d.desc.en}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 06 · WILDLIFE ────────────────────────────────────────── */}
      <section className="sec np-alt" id="wildlife">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(7)} · WILDLIFE</div>
                <h2 className="h2">The Terai is the surprise</h2>
                <p className="lead mt-4">
                  Most visitors come for mountains and leave having never seen a rhino. The southern grass belt
                  holds some of the subcontinent&apos;s better conservation stories.
                </p>
              </div>
            </div>
          </Reveal>
          <div className="np-wild">
            {g.wildlife.map((w, i) => (
              <Reveal key={w.id} delay={i * 40}>
                <article className="np-wild-card panel">
                  <h3 className="np-wild-name">{w.name.en}</h3>
                  <div className="np-wild-meta mono">
                    <span>{w.status.en}</span><span className="np-wild-sep" />
                  </div>
                  <p className="np-wild-desc">{w.desc.en}</p>
                  <div className="np-wild-where tag">{w.where}</div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 07 · TREKKING ────────────────────────────────────────── */}
      <section className="sec" id="treks">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(8)} · TREKKING</div>
                <h2 className="h2">Routes, seasons and what each one requires</h2>
                <p className="lead mt-4">
                  Grading is honest: distance and altitude, not enthusiasm. Permit lists reflect the rules in
                  force as at {g.meta.updated}.
                </p>
              </div>
            </div>
          </Reveal>
          <div className="np-treks">
            {g.treks.map((tr, i) => (
              <Reveal key={tr.id} delay={i * 40}>
                <article className="np-trek panel">
                  <div className="np-trek-head">
                    <div>
                      <h3 className="np-trek-name">{tr.name.en}</h3>
                      <div className="mono np-trek-region">{tr.name.ne}</div>
                    </div>
                    <div className="np-trek-grade tag">{tr.grade.en}</div>
                  </div>
                  <p className="np-trek-desc">{tr.desc.en}</p>
                  <dl className="np-trek-facts">
                    <div><dt className="mono">DAYS</dt><dd>{tr.days}</dd></div>
                    <div><dt className="mono">HIGH POINT</dt><dd>{tr.high}</dd></div>
                    <div><dt className="mono">SEASON</dt><dd>{tr.season.join(' · ')}</dd></div>
                  </dl>
                  <div className="np-trek-permits">
                    <div className="mono np-trek-permits-label">REQUIRES</div>
                    {tr.permit.map((p) => <span key={p} className="tag np-permit-tag">{p}</span>)}
                  </div>
                  <div className="np-trek-foot">
                    <Link className="btn btn-g btn-sm" href="/nepal#guidelines"><Icon name="shield" size={13} />Permit rules</Link>
                    <a className="btn btn-g btn-sm" href="/explore?mode=earth"><Icon name="globe" size={13} />View region</a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 08 · SEASONS ─────────────────────────────────────────── */}
      <section className="sec np-alt" id="seasons">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(9)} · WHEN</div>
                <h2 className="h2">Four ways to visit</h2>
              </div>
            </div>
          </Reveal>
          <div className="np-seasons">
            {g.seasons.map((s, i) => (
              <Reveal key={s.id} delay={i * 50}>
                <article className="np-season panel" style={{ ['--a']: s.accent } as React.CSSProperties}>
                  <div className="np-season-verdict mono">{s.verdict.en}</div>
                  <h3 className="np-season-name">{s.name.en}</h3>
                  <div className="np-season-temp">{s.temp.en}</div>
                  <p className="np-season-desc">{s.desc.en}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 09 · GUIDELINES ──────────────────────────────────────── */}
      <section className="sec" id="guidelines">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(10)} · GUIDELINES</div>
                <h2 className="h2">Permits, courtesy, safety and the practical</h2>
                <p className="lead mt-4">{g.meta.disclaimer.en}</p>
              </div>
            </div>
          </Reveal>
          <GuidelinesTabs g={g} />
        </div>
      </section>

      {/* ── 10 · VIDEO REEL ──────────────────────────────────────── */}
      <section className="sec np-alt" id="reel">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum">{t(11)} · IN MOTION</div>
                <h2 className="h2">The reel</h2>
                <p className="lead mt-4">Clips load only as the reel comes into view, and never auto-play on the LOW tier.</p>
              </div>
            </div>
          </Reveal>
          <VideoReel videos={g.videos} posters={videoPosters} />
        </div>
      </section>

      {/* ── 11 · PORTAL OUT ──────────────────────────────────────── */}
      <section className="sec" id="continue">
        <div className="wrap">
          <Reveal>
            <div className="panel np-out">
              <div className="eyebrow">CARRY IT INTO THE WORLD LAYER</div>
              <h2 className="h2 np-out-h">Nepal, on the globe</h2>
              <p className="lead">
                The same country, seen from orbit. Open the ACTTOLOG Command Center and fly to the Himalaya, or
                search any place on this page by name.
              </p>
              <div className="np-out-cta">
                <a className="btn btn-p" href="/explore?mode=earth&lat=28.35&lng=84.35"><Icon name="globe" size={15} />OPEN COMMAND CENTER</a>
                <Link className="btn btn-g" href="/search"><Icon name="search" size={15} />SEARCH THE WORLD</Link>
                <Link className="btn btn-g" href="/my"><Icon name="heart" size={15} />MY SAVED PLACES</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <style>{`
        /* ── hero ── */
        .np-hero { position: relative; min-height: clamp(560px, 92vh, 940px); display: flex; align-items: flex-end;
          overflow: hidden; padding-top: var(--nav); }
        .np-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
          animation: npHeroDrift 40s ease-in-out infinite alternate; }
        @keyframes npHeroDrift { from { transform: scale(1.04) translate3d(0,0,0) } to { transform: scale(1.16) translate3d(-2%,-1.5%,0) } }
        .np-hero-veil { position: absolute; inset: 0;
          background: radial-gradient(120% 90% at 50% 0%, transparent 22%, color-mix(in srgb, var(--bg) 72%, transparent) 68%, var(--bg) 100%),
            linear-gradient(180deg, color-mix(in srgb, var(--bg) 52%, transparent), transparent 28%, color-mix(in srgb, var(--bg) 92%, transparent) 88%, var(--bg)); }
        .np-hero-grain { position: absolute; inset: 0; opacity: .16; pointer-events: none; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E"); }
        .np-hero-inner { position: relative; z-index: 2; padding-bottom: clamp(34px, 6vw, 72px); }
        .np-h1 { font-family: var(--font-display); font-weight: 700; margin: 18px 0 0;
          font-size: clamp(2.35rem, 7.4vw, 5.4rem); line-height: .96; letter-spacing: -.035em; color: var(--txt);
          max-width: 19ch; text-wrap: balance; }
        .np-hero-line { margin-top: 20px; max-width: 62ch; color: var(--mut);
          font-size: clamp(1rem, 1.35vw, 1.16rem); line-height: 1.75; }
        .np-hero-cta { display: flex; flex-wrap: wrap; gap: 11px; margin-top: 30px; }
        .np-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 1px;
          margin-top: clamp(34px, 5vw, 56px); background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
        .np-stat { background: color-mix(in srgb, var(--bg) 74%, transparent); backdrop-filter: blur(10px); padding: 15px 16px; }
        .np-stat-n { font-size: clamp(1.02rem, 2.1vw, 1.5rem); font-weight: 600; color: var(--cy); letter-spacing: -.02em; }
        .np-stat-label { font-size: 11.4px; color: var(--mut); margin-top: 5px; line-height: 1.4; }
        .np-stat-sub { font-size: 9px; letter-spacing: .14em; color: var(--dim); margin-top: 3px; }

        /* ── section shells ── */
        .np-alt { background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--panel) 46%, transparent) 12%,
          color-mix(in srgb, var(--panel) 46%, transparent) 88%, transparent); }
        .np-head-meta { font-size: 10px; letter-spacing: .16em; color: var(--dim); white-space: nowrap; }
        .mt-4 { margin-top: 16px; }

        /* ── festivals ── */
        .np-fest { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
        .np-fest-card { padding: 20px; display: flex; flex-direction: column; gap: 12px; border-left: 2px solid var(--a); }
        .np-fest-media { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 11px; margin: -4px -4px 2px; }
        .np-fest-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .np-fest-top { display: flex; gap: 13px; align-items: flex-start; }
        .np-fest-n { font-size: 10px; color: var(--a); letter-spacing: .14em; padding-top: 3px; }
        .np-fest-name { font: 600 1.16rem/1.25 var(--font-display); color: var(--txt); margin: 0; }
        .np-fest-when { font-size: 9.4px; letter-spacing: .14em; color: var(--dim); margin-top: 5px; text-transform: uppercase; }
        .np-fest-desc { font-size: 13.2px; line-height: 1.66; color: var(--mut); margin: 0; }
        .np-fest-where { align-self: flex-start; font-size: 9.4px; }

        /* ── peoples ── */
        .np-cult { display: grid; gap: 2px; grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
          background: var(--line); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
        .np-cult-card { background: var(--bg); padding: 22px; display: flex; flex-direction: column; gap: 9px;
          transition: background .4s; }
        .np-cult-card:hover { background: var(--panel); }
        .np-cult-icon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
          border: 1px solid var(--line2); color: var(--vi); }
        .np-cult-name { font: 600 1.1rem/1.2 var(--font-display); color: var(--txt); margin: 0; }
        .np-cult-where { font-size: 9.2px; letter-spacing: .14em; color: var(--cy); text-transform: uppercase; }
        .np-cult-desc { font-size: 12.9px; line-height: 1.62; color: var(--mut); margin: 0; }

        /* ── food ── */
        .np-food { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(258px, 1fr)); }
        .np-food-media { position: relative; aspect-ratio: 4 / 3; overflow: hidden; }
        .np-food-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .np-food-body { padding: 15px; }
        .np-food-name { font: 600 1.04rem/1.25 var(--font-display); color: var(--txt); margin: 0;
          display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
        .np-food-ne { font-size: .78em; color: var(--dim); font-weight: 400; }
        .np-food-desc { font-size: 12.7px; line-height: 1.6; color: var(--mut); margin: 8px 0 0; }

        /* ── wildlife ── */
        .np-wild { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        .np-wild-card { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .np-wild-name { font: 600 1.1rem/1.25 var(--font-display); color: var(--txt); margin: 0; }
        .np-wild-meta { display: flex; gap: 10px; align-items: center; font-size: 9.4px; letter-spacing: .14em;
          color: var(--ok); text-transform: uppercase; }
        .np-wild-sep { flex: 1; height: 1px; background: var(--line); }
        .np-wild-desc { font-size: 13px; line-height: 1.63; color: var(--mut); margin: 0; }
        .np-wild-where { align-self: flex-start; font-size: 9.2px; }

        /* ── treks ── */
        .np-treks { display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(348px, 1fr)); }
        .np-trek { padding: 22px; display: flex; flex-direction: column; gap: 13px; }
        .np-trek-head { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
        .np-trek-name { font: 600 1.22rem/1.2 var(--font-display); color: var(--txt); margin: 0; letter-spacing: -.015em; }
        .np-trek-region { font-size: 11.5px; color: var(--dim); margin-top: 4px; }
        .np-trek-grade { font-size: 9.2px; white-space: nowrap; }
        .np-trek-desc { font-size: 13.2px; line-height: 1.64; color: var(--mut); margin: 0; }
        .np-trek-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 2px 0 0;
          border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 13px 0; }
        .np-trek-facts dt { font-size: 8.8px; letter-spacing: .16em; color: var(--dim); margin-bottom: 5px; }
        .np-trek-facts dd { margin: 0; font-size: 12.6px; color: var(--txt); font-weight: 500; }
        .np-trek-permits { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .np-trek-permits-label { font-size: 8.8px; letter-spacing: .16em; color: var(--gold); margin-right: 4px; }
        .np-permit-tag { font-size: 9.2px; border-color: color-mix(in srgb, var(--gold) 32%, var(--line)); }
        .np-trek-foot { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 6px; }

        /* ── seasons ── */
        .np-seasons { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(258px, 1fr)); }
        .np-season { padding: 22px; display: flex; flex-direction: column; gap: 10px; border-top: 2px solid var(--a); }
        .np-season-verdict { font-size: 9.4px; letter-spacing: .2em; color: var(--a); }
        .np-season-name { font: 600 1.14rem/1.25 var(--font-display); color: var(--txt); margin: 0; }
        .np-season-temp { font-size: 11.4px; color: var(--dim); }
        .np-season-desc { font-size: 13px; line-height: 1.64; color: var(--mut); margin: 0; }

        /* ── portal out ── */
        .np-out { padding: clamp(26px, 4vw, 44px); display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
        .np-out-h { margin: 0; }
        .np-out-cta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }

        @media (max-width: 700px) {
          .np-hero { min-height: 82vh; }
          .np-stats { grid-template-columns: repeat(2, 1fr); }
          .np-trek-facts { grid-template-columns: 1fr 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .np-hero-img { animation: none; }
        }
      `}</style>
    </>
  );
}
