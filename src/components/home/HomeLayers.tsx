'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/Heads';
import { AccessBadge } from '@/components/ui/Badges';
import { DrCard } from '@/components/darkroom/DrCard';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { useSession } from '@/lib/session';
import { track } from '@/lib/analytics';
import { resolveImage, money, fdate, nf, rt } from '@/lib/utils';
import type {
  AcademyCourse, Bi, BlogPost, DarkroomCategory, DarkroomResource,
  Division, EntertainmentItem, HomeSection, Offer, SiteSettings,
} from '@/lib/content/types';

export interface LatestItem {
  title: Bi; kind: string; date: string; route: string; ext?: boolean;
  color: string; icon: string; mem: boolean;
}

export interface HomeData {
  sections: Record<string, HomeSection>;
  settings: SiteSettings;
  divisions: Division[];
  counts: { research: number; entertainment: number; academy: number; games: number; darkroom: number; posts: number; resources: number };
  featured: { post?: BlogPost; offer?: Offer; ent?: EntertainmentItem; dr?: DarkroomResource };
  latest: LatestItem[];
  courses: AcademyCourse[];
  drCats: DarkroomCategory[];
  drFeatured: DarkroomResource[];
  offers: Offer[];
}

const ORBIT_NODES: [number, number][] = [[132, 96], [668, 96], [96, 372], [704, 372], [400, 436]];

export function HomeLayers({ data }: { data: HomeData }) {
  const { sections: sec, settings: s, divisions: dvs } = data;
  return (
    <>
      <LayerIntro sec={sec.intro} s={s} counts={data.counts} />
      <LayerEcosystem sec={sec.eco} dvs={dvs} />
      <LayerDivisions sec={sec.divisions} dvs={dvs} counts={data.counts} />
      <LayerFeatured sec={sec.featured} f={data.featured} />
      <LayerLatest sec={sec.latest} items={data.latest} />
      <LayerAcademy sec={sec.academy} courses={data.courses} />
      <LayerDarkroom sec={sec.darkroom} cats={data.drCats} featured={data.drFeatured} />
      <LayerOffers sec={sec.offers} offers={data.offers} />
      <LayerAbout sec={sec.about} s={s} />
      <LayerCta sec={sec.cta} />
    </>
  );
}

/* ── 01 · intro ─────────────────────────────────────────────────── */

function LayerIntro({ sec, s, counts }: { sec: HomeSection; s: SiteSettings; counts: HomeData['counts'] }) {
  const { L, locale, t } = useI18n();
  if (sec.visible === false) return null;
  const pillars: [string, Bi, string][] = [
    ['purpose', s.purpose, 'var(--cy)'], ['vision', s.vision, 'var(--vi)'], ['mission', s.mission, 'var(--mg)'],
  ];
  return (
    <section className="sec" id="intro">
      <div className="wrap">
        <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-14 items-center">
          <div>
            <SectionHead num="01" kicker="THE ACTTOLOG WORLD" title={L(sec.title)} body={L(sec.body)} />
            <Reveal>
              <div className="grid sm:grid-cols-3 gap-3 mt-8">
                {pillars.map(([k, v, c]) => (
                  <div key={k} className="card p-5">
                    <div className="mono text-[9.7px] tracking-[.2em] mb-2" style={{ color: c }}>{k.toUpperCase()}</div>
                    <p className="mut text-[12.6px] leading-relaxed">{L(v)}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="flex flex-wrap gap-2 mt-6">
                {(s.values || []).map((v, i) => (
                  <span key={v} className="chip">{locale === 'ne' ? (s.valuesNe || [])[i] || v : v}</span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link className="btn btn-g" href="/about">{t('nav.about')} <Icon name="arrow" size={15} /></Link>
                <Link className="btn btn-g" href="/contact">{t('nav.contact')}</Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div className="relative">
              <div className="panel p-3 -rotate-1 hover:rotate-0 transition-transform duration-700">
                <div className="rounded-[13px] overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveImage('art:nebula')} alt="" className="w-full h-[420px] object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 55%,color-mix(in srgb,var(--bg) 80%,transparent))' }} />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="mono text-[10px] tracking-[.24em] mb-1" style={{ color: 'var(--cy)' }}>ACTTOLOG WORLD MAP</div>
                    <div className="font-display font-semibold text-[16px]">
                      {locale === 'ne' ? 'पाँच विभाग · एउटै संसार' : 'Five divisions · One world'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="panel absolute -bottom-7 -left-3 sm:-left-7 px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: 'var(--grad)', color: '#04060e' }}>
                  <Icon name="spark" size={20} />
                </div>
                <div>
                  <div className="font-display font-semibold text-[14px]">
                    {nf(counts.posts)} {locale === 'ne' ? 'लेख' : 'articles'} · {nf(counts.resources)} {locale === 'ne' ? 'स्रोत' : 'resources'}
                  </div>
                  <div className="dim mono text-[10.1px] tracking-[.16em]">PUBLISHED IN THE WORLD</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── 02 · orbital ecosystem ─────────────────────────────────────── */

function LayerEcosystem({ sec, dvs }: { sec: HomeSection; dvs: Division[] }) {
  const { L } = useI18n();
  if (sec.visible === false) return null;
  return (
    <section className="sec" id="ecosystem"
      style={{ background: 'linear-gradient(180deg,transparent,color-mix(in srgb,var(--panel) 45%,transparent),transparent)' }}>
      <div className="wrap">
        <SectionHead num="02" kicker="ORBITAL ECOSYSTEM" title={L(sec.title)} body={L(sec.body)} />
        <Reveal>
          <div className="panel p-4 sm:p-8">
            <svg viewBox="0 0 800 480" className="w-full hidden md:block" style={{ maxHeight: 470 }}
              role="img" aria-label="Acttolog orbital ecosystem">
              <defs>
                <radialGradient id="cg">
                  <stop offset="0" stopColor="#35e0ff" stopOpacity=".5" />
                  <stop offset="1" stopColor="#0a0e1a" stopOpacity=".92" />
                </radialGradient>
              </defs>
              {dvs.slice(0, 5).map((d, i) => {
                const n = ORBIT_NODES[i];
                if (!n) return null;
                return (
                  <a key={d.id} className="orb-arm" href={d.route} aria-label={L(d.name)}
                    onClick={() => track('division_view', { division: d.id })}>
                    <line className="oline" x1="400" y1="232" x2={n[0]} y2={n[1]} />
                    <circle className="oring" cx={n[0]} cy={n[1]} r="46" />
                    <circle cx={n[0]} cy={n[1]} r="46" fill="none" stroke={d.color} strokeOpacity=".22" strokeWidth="10" />
                    <text className="olbl" x={n[0]} y={n[1] + 2}>{L(d.name).split(' ')[0]}</text>
                    <text className="olbl" x={n[0]} y={n[1] + 18} fontSize="11" opacity=".7">{L(d.name).split(' ').slice(1).join(' ')}</text>
                    <text className="osub" x={n[0]} y={n[1] + 70}>{L(d.sub).toUpperCase()}</text>
                  </a>
                );
              })}
              <g>
                <circle cx="400" cy="232" r="74" fill="url(#cg)" />
                <circle cx="400" cy="232" r="74" fill="none" stroke="#35e0ff" strokeOpacity=".5" strokeWidth="1.4" />
                <circle cx="400" cy="232" r="96" fill="none" stroke="#7c5cff" strokeOpacity=".28" strokeWidth="1" strokeDasharray="4 8" />
                <text x="400" y="226" textAnchor="middle" fill="var(--txt)" fontFamily="Space Grotesk" fontSize="21" fontWeight="700" letterSpacing="2">ACTTOLOG</text>
                <text x="400" y="248" textAnchor="middle" fill="var(--dim)" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="3">ONE WORLD</text>
              </g>
            </svg>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 md:mt-6">
              {dvs.map((d) => (
                <Link key={d.id} href={d.route} className="card p-5"
                  onClick={() => track('division_view', { division: d.id })}>
                  <div className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                    style={{ background: `${d.color}1f`, color: d.color, border: `1px solid ${d.color}44` }}>
                    <Icon name={d.icon} size={18} />
                  </div>
                  <div className="font-display font-semibold text-[14.6px] mb-1.5">{L(d.name)}</div>
                  <div className="mono text-[9px] tracking-[.18em] dim mb-2.5">{L(d.sub).toUpperCase()}</div>
                  <p className="mut text-[12.2px] leading-relaxed">{L(d.desc)}</p>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── 03 · divisions ─────────────────────────────────────────────── */

function LayerDivisions({ sec, dvs, counts }: { sec: HomeSection; dvs: Division[]; counts: HomeData['counts'] }) {
  const { L, locale } = useI18n();
  if (sec.visible === false) return null;
  const cnt: Record<string, string> = {
    research: `${counts.research}${locale === 'ne' ? ' सेवा' : ' services'}`,
    entertainment: `${counts.entertainment}${locale === 'ne' ? ' सामग्री' : ' items'}`,
    academy: `${counts.academy}${locale === 'ne' ? ' पाठ्यक्रम' : ' courses'}`,
    games: `${counts.games}${locale === 'ne' ? ' खेल' : ' games'}`,
    darkroom: `${counts.darkroom}${locale === 'ne' ? ' स्रोत' : ' resources'}`,
  };
  return (
    <section className="sec" id="divisions">
      <div className="wrap">
        <SectionHead num="03" kicker="DIVISIONS" title={L(sec.title)} body={L(sec.body)} />
        <div className="grid lg:grid-cols-2 gap-5">
          {dvs.map((d, i) => (
            <Reveal key={d.id} delay={i * 60}>
              <Link href={d.route} className="card group block h-full"
                onClick={() => track('division_view', { division: d.id })}>
                <div className="grid sm:grid-cols-[.85fr_1.15fr] h-full">
                  <div className="h-[188px] sm:h-full min-h-[188px] overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImage(`art:${d.art || 'nebula'}`)} alt=""
                      className="w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(90deg,transparent 40%,color-mix(in srgb,var(--panel2) 88%,transparent))` }} />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-9 h-9 rounded-lg grid place-items-center"
                        style={{ background: `${d.color}1f`, color: d.color, border: `1px solid ${d.color}44` }}>
                        <Icon name={d.icon} size={18} />
                      </span>
                      <span className="mono text-[9.4px] tracking-[.2em] dim">{L(d.sub).toUpperCase()}</span>
                    </div>
                    <h3 className="h3 mb-2.5">{L(d.name)}</h3>
                    <p className="mut text-[13.4px] leading-relaxed mb-5">{L(d.desc)}</p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="chip">{cnt[d.id] || ''}</span>
                      <span className="inline-flex items-center gap-2 text-[13.1px] font-semibold" style={{ color: d.color }}>
                        {locale === 'ne' ? 'प्रवेश गर्नुहोस्' : 'Enter'} <Icon name="arrow" size={15} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 04 · featured ──────────────────────────────────────────────── */

function LayerFeatured({ sec, f }: { sec: HomeSection; f: HomeData['featured'] }) {
  const { L, t, locale } = useI18n();
  if (sec.visible === false || !f.post) return null;
  const post = f.post;
  return (
    <section className="sec" id="featured">
      <div className="wrap">
        <SectionHead num="04" kicker="FEATURED" title={L(sec.title)} body={L(sec.body)} />
        <div className="grid lg:grid-cols-[1.45fr_1fr] gap-5">
          <Reveal>
            <Link href={`/blog/${post.slug}`} className="card group block h-full">
              <div className="relative h-[320px] sm:h-[400px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImage(post.cover, 'editorial')} alt=""
                  className="w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 30%,color-mix(in srgb,var(--bg) 94%,transparent))' }} />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="badge b-info">{t('featured')}</span>
                  <AccessBadge access={post.access} membersLabel={t('members')} publicLabel={t('public')} />
                </div>
                <div className="absolute bottom-0 p-6 sm:p-8">
                  <div className="mono text-[10.3px] tracking-[.2em] mb-3" style={{ color: 'var(--cy)' }}>
                    {post.category.toUpperCase()} · {fdate(post.publishedAt)} · {rt(L(post.content))} MIN
                  </div>
                  <h3 className="font-display font-semibold text-[clamp(1.28rem,2.6vw,2rem)] leading-tight tracking-[-.02em] mb-3">{L(post.title)}</h3>
                  <p className="mut text-[14.2px] leading-relaxed max-w-[62ch]">{L(post.excerpt)}</p>
                </div>
              </div>
            </Link>
          </Reveal>
          <div className="grid gap-5 content-start">
            {f.offer && (
              <Reveal delay={70}>
                <Link href={`/offers/${f.offer.slug}`} className="card p-6 block">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="mono text-[9.7px] tracking-[.2em] dim mb-1">{t('nav.offers').toUpperCase()}</div>
                      <div className="font-display font-bold text-[17px]" style={{ color: f.offer.accent || 'var(--txt)' }}>{L(f.offer.title)}</div>
                    </div>
                    <span className="badge b-info">{t('featured')}</span>
                  </div>
                  <p className="mut text-[12.8px] leading-relaxed mb-4">{L(f.offer.short)}</p>
                  <FeaturedPrice offer={f.offer} />
                </Link>
              </Reveal>
            )}
            {f.ent && (
              <Reveal delay={130}>
                <Link href={`/entertainment/${f.ent.slug}`} className="card group block">
                  <div className="relative h-[178px] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImage(f.ent.thumb, 'stage')} alt=""
                      className="w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 35%,color-mix(in srgb,var(--bg) 92%,transparent))' }} />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="badge b-vi">Entertainment</span>
                      <AccessBadge access={f.ent.access} membersLabel={t('members')} publicLabel={t('public')} />
                    </div>
                    <div className="absolute bottom-0 p-4">
                      <div className="font-display font-semibold text-[14.6px]">{L(f.ent.title)}</div>
                      <div className="dim mono text-[9.8px] tracking-[.16em] mt-1">{f.ent.category.toUpperCase()}</div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )}
            {f.dr && (
              <Reveal delay={190}>
                <DrCard r={f.dr} />
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedPrice({ offer }: { offer: Offer }) {
  const { currency, usdToNpr } = usePrefs();
  const { locale } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-display font-bold text-[19px]">{money({ npr: offer.npr, usd: offer.usd }, currency, usdToNpr, locale)}</span>
      <span className="inline-flex items-center gap-1.5 text-[12.6px] font-semibold" style={{ color: 'var(--cy)' }}>
        Details <Icon name="arrow" size={14} />
      </span>
    </div>
  );
}

/* ── 05 · latest ────────────────────────────────────────────────── */

function LayerLatest({ sec, items }: { sec: HomeSection; items: LatestItem[] }) {
  const { L, t } = useI18n();
  if (sec.visible === false) return null;
  return (
    <section className="sec" id="latest">
      <div className="wrap">
        <SectionHead num="05" kicker="LATEST" title={L(sec.title)} body={L(sec.body)}
          extra={<Link className="btn btn-g btn-sm" href="/blog">{t('viewall')} <Icon name="arrow" size={15} /></Link>} />
        <Reveal>
          <div className="panel" style={{ borderRadius: 16, overflow: 'hidden' }}>
            {items.slice(0, 8).map((x, i) => x.ext ? (
              <a key={i} className="rowlink" href={x.route} target="_blank" rel="noopener noreferrer"
                onClick={() => track('resource_open', { from: 'home_latest' })}>
                <RowIcon color={x.color} icon={x.icon} />
                <RowBody title={L(x.title)} kind={x.kind} date={x.date} mem={x.mem} />
                <Icon name="arrow" size={16} />
              </a>
            ) : (
              <Link key={i} className="rowlink" href={x.route}
                onClick={() => x.kind === 'Blog' && track('article_view', { from: 'home_latest' })}>
                <RowIcon color={x.color} icon={x.icon} />
                <RowBody title={L(x.title)} kind={x.kind} date={x.date} mem={x.mem} />
                <Icon name="arrow" size={16} />
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function RowIcon({ color, icon }: { color: string; icon: string }) {
  return (
    <span className="w-[50px] h-[50px] rounded-xl grid place-items-center"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>
      <Icon name={icon} size={19} />
    </span>
  );
}

function RowBody({ title, kind, date, mem }: { title: string; kind: string; date: string; mem: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[14.4px] font-medium truncate flex items-center gap-2">
        {title}
        {mem && <span className="badge b-vi flex-none"><Icon name="lock" size={10} />Members</span>}
      </div>
      <div className="dim mono text-[10px] tracking-[.16em] mt-1">{kind.toUpperCase()} · {fdate(date)}</div>
    </div>
  );
}

/* ── 06 · academy ───────────────────────────────────────────────── */

function LayerAcademy({ sec, courses }: { sec: HomeSection; courses: AcademyCourse[] }) {
  const { L, t, locale } = useI18n();
  const { user } = useSession();
  if (sec.visible === false) return null;
  const list = courses.filter((c) => c.featured).slice(0, 3);
  const show = list.length ? list : courses.slice(0, 3);
  return (
    <section className="sec" id="acaPrev">
      <div className="wrap">
        <SectionHead num="06" kicker="LEARNING" title={L(sec.title)} body={L(sec.body)}
          extra={<Link className="btn btn-g btn-sm" href="/academy">{t('viewall')} <Icon name="arrow" size={15} /></Link>} />
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {show.map((c, i) => {
              const lessonCount = (c.modules || []).reduce((a, m) => a + (m.lessons || []).length, 0);
              return (
                <Reveal key={c.id} delay={i * 60}>
                  <Link href={`/academy/${c.slug}`} className="card group block h-full"
                    onClick={() => track('academy_entry', { course: c.slug })}>
                    <div className="h-[148px] overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolveImage(c.image, 'academy')} alt=""
                        className="w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <AccessBadge access={c.access} membersLabel={t('members')} publicLabel={t('public')} />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="h3 !text-[16.8px] mb-2">{L(c.title)}</h3>
                      <p className="mut text-[13px] leading-relaxed mb-4">{L(c.summary)}</p>
                      <div className="flex flex-wrap gap-1.5 mono text-[10.1px] dim">
                        <span className="chip !py-1">{c.level}</span>
                        <span className="chip !py-1">{(c.modules || []).length} {t('modules')}</span>
                        <span className="chip !py-1">{lessonCount} {t('lessons')}</span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={120}>
            <aside className="panel p-6">
              <div className="eyebrow mb-4">{t('members')}</div>
              <h3 className="h3 !text-[19px] mb-3">{locale === 'ne' ? 'एकेडेमी परिचय' : 'Academy introduction'}</h3>
              <p className="mut text-[13.3px] leading-relaxed mb-5">
                {locale === 'ne'
                  ? 'पूर्ण एकेडेमी — पाठ्यक्रम, मोड्युल, पाठ र स्रोतहरू — Google साइन-इन पछि खुल्छ। कुनै दर्ता फारम छैन, कुनै पासवर्ड छैन।'
                  : 'The full Academy — courses, modules, lessons and resources — opens after you continue with Google. No registration form, no password, no profile questions.'}
              </p>
              <ul className="space-y-2.5 mb-6">
                {courses.map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5 text-[13.3px] mut">
                    <span style={{ color: 'var(--vi)' }}><Icon name="book" size={15} /></span>{L(c.title)}
                  </li>
                ))}
              </ul>
              {user ? (
                <Link href="/academy" className="btn btn-p w-full">
                  {locale === 'ne' ? 'एकेडेमी खोल्नुहोस्' : 'Open the Academy'} <Icon name="arrow" size={15} />
                </Link>
              ) : (
                <GoogleButton returnTo="/academy" className="w-full justify-center" />
              )}
              <p className="dim text-[11.3px] mt-4 leading-relaxed">
                {locale === 'ne' ? 'पाठ्यक्रम प्रगति निजी हुन्छ — कुनै सार्वजनिक लिडरबोर्ड छैन।' : 'Course progress is private — no public leaderboards.'}
              </p>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── 07 · darkroom ──────────────────────────────────────────────── */

function LayerDarkroom({ sec, cats, featured }: { sec: HomeSection; cats: DarkroomCategory[]; featured: DarkroomResource[] }) {
  const { L, t, locale } = useI18n();
  if (sec.visible === false) return null;
  return (
    <section className="sec" id="darkPrev">
      <div className="wrap">
        <SectionHead num="07" kicker="DISCOVERY" title={L(sec.title)} body={L(sec.body)}
          extra={<Link className="btn btn-g btn-sm" href="/darkroom">{t('viewall')} <Icon name="arrow" size={15} /></Link>} />
        <Reveal>
          <div className="panel p-6 sm:p-8 mb-6">
            <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
              <div>
                <div className="font-display font-bold text-[clamp(1.35rem,3vw,2.05rem)] tracking-[-.025em] mb-3">{t('dark.tag')}</div>
                <p className="mut text-[13.8px] leading-relaxed mb-5">
                  {locale === 'ne'
                    ? 'डार्करूम पूर्णतया सार्वजनिक छ — लगइन बिना ब्राउज, खोज र फिल्टर। खोज नतिजा व्यक्तिगत पारिँदैन; क्रमवद्धता पारदर्शी नियमबाट हुन्छ।'
                    : 'Darkroom is fully public — browse, search and filter with no login. Results are never personalised; ranking follows transparent, owner-configured rules.'}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link className="btn btn-p" href="/darkroom"><Icon name="search" size={16} />{t('dark.search')}</Link>
                  <span className="mono text-[10.3px] tracking-[.16em] dim">DISCOVER → VERIFY → ORGANIZE → ACCESS</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {cats.slice(0, 8).map((c) => (
                  <Link key={c.id} href={`/darkroom?c=${c.slug}`}
                    className="rounded-xl border p-3.5 transition-all hover:-translate-y-1"
                    style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                    <div className="font-display font-semibold text-[13.4px] mb-1">{L(c.name)}</div>
                    <div className="dim mono text-[9.3px] tracking-[.13em]">{(c.subs || []).length} AREAS</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((r, i) => (
            <Reveal key={r.id} delay={i * 50}><DrCard r={r} /></Reveal>
          ))}
        </div>
        <p className="dim text-[12.1px] mt-6 leading-relaxed max-w-[86ch]">{t('dark.nopop')}</p>
      </div>
    </section>
  );
}

/* ── 08 · offers ────────────────────────────────────────────────── */

function LayerOffers({ sec, offers }: { sec: HomeSection; offers: Offer[] }) {
  const { L, t, locale } = useI18n();
  const { currency, setCurrency, usdToNpr } = usePrefs();
  if (sec.visible === false) return null;
  return (
    <section className="sec" id="offPrev">
      <div className="wrap">
        <SectionHead num="08" kicker="OFFERS" title={L(sec.title)} body={L(sec.body)}
          extra={<Link className="btn btn-g btn-sm" href="/offers">{t('viewall')} <Icon name="arrow" size={15} /></Link>} />
        <div className="grid md:grid-cols-3 gap-5">
          {offers.map((o, i) => (
            <Reveal key={o.id} delay={i * 60}>
              <Link href={`/offers/${o.slug}`} className="card p-6 block h-full"
                onClick={() => track('offer_interaction', { offer: o.slug })}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="badge" style={{ color: 'var(--cy)', borderColor: 'color-mix(in srgb,var(--cy) 40%,transparent)', background: 'color-mix(in srgb,var(--cy) 10%,transparent)' }}>
                    {o.mode === 'inquiry' ? t('inq') : o.mode === 'purchase' ? t('buy') : t('both')}
                  </span>
                  {o.featured && <span className="badge b-info">{t('featured')}</span>}
                </div>
                <h3 className="font-display font-bold text-[21px] tracking-[-.02em] mb-1" style={{ color: o.accent || 'var(--txt)' }}>{L(o.title)}</h3>
                <p className="mut text-[13.1px] leading-relaxed mb-5">{L(o.short)}</p>
                <div className="font-display font-bold text-[26px] tracking-[-.03em] mb-5">
                  {money({ npr: o.npr, usd: o.usd }, currency, usdToNpr, locale)}
                </div>
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--cy)' }}>
                  {t('details')} <Icon name="arrow" size={15} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="flex flex-wrap items-center gap-3 justify-center mt-8">
            <span className="mono text-[10.3px] tracking-[.18em] dim">{t('cur')}:</span>
            <button className={`chip${currency === 'NPR' ? ' on' : ''}`} onClick={() => setCurrency('NPR')}>NPR रु</button>
            <button className={`chip${currency === 'USD' ? ' on' : ''}`} onClick={() => setCurrency('USD')}>USD $</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── 09 · about ─────────────────────────────────────────────────── */

function LayerAbout({ sec, s }: { sec: HomeSection; s: SiteSettings }) {
  const { L, locale, t } = useI18n();
  if (sec.visible === false) return null;
  const cards: [string, Bi, string][] = [
    ['vision', s.vision, 'var(--vi)'], ['purpose', s.purpose, 'var(--cy)'], ['resp', s.responsible, 'var(--mg)'],
  ];
  return (
    <section className="sec" id="aboutPrev">
      <div className="wrap">
        <Reveal>
          <div className="panel p-7 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 -z-10 opacity-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImage('art:academy')} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center">
              <div>
                <div className="eyebrow mb-5">ABOUT ACTTOLOG</div>
                <h2 className="h2 max-w-[24ch]">{L(sec.title)}</h2>
                <p className="lead mt-5">{L(s.purpose)}</p>
                <p className="lead mt-4">{L(sec.body)}</p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link className="btn btn-g" href="/about">
                    {locale === 'ne' ? 'पूरा कथा पढ्नुहोस्' : 'Read the full story'} <Icon name="arrow" size={15} />
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {cards.map(([k, v, c]) => (
                  <div key={k} className="rounded-xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                    <div className="mono text-[9.6px] tracking-[.22em] mb-2" style={{ color: c }}>{k.toUpperCase()}</div>
                    <p className="mut text-[12.9px] leading-relaxed">{L(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      <span className="hidden">{t('nav.about')}</span>
    </section>
  );
}

/* ── 10 · CTA + marquee ─────────────────────────────────────────── */

function LayerCta({ sec }: { sec: HomeSection }) {
  const { L, t, locale } = useI18n();
  if (sec.visible === false) return null;
  const words = ['DISCOVER', 'LEARN', 'CREATE', 'CONNECT', 'RESEARCH', 'PLAY', 'FIND'];
  return (
    <section className="sec" id="cta">
      <div className="wrap">
        <Reveal>
          <div className="panel relative overflow-hidden p-9 sm:p-16 text-center">
            <div className="absolute inset-0 -z-10 opacity-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImage('art:nebula')} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="eyebrow justify-center mb-5">ACTTOLOG WORLD</div>
            <h2 className="h2 max-w-[26ch] mx-auto">{L(sec.title)}</h2>
            <p className="lead mx-auto mt-5">{L(sec.body)}</p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <Link className="btn btn-p btn-lg" href="/darkroom"
                onClick={() => track('cta_interaction', { cta: 'enter_world' })}>
                {t('cta.enter')} <Icon name="globe" size={17} />
              </Link>
              <Link className="btn btn-g btn-lg" href="/research">Thesyn Research</Link>
              <Link className="btn btn-g btn-lg" href="/ai">{t('nav.ai')}</Link>
            </div>
            <div className="marq mt-12" aria-hidden="true">
              <div className="marqt">
                {[0, 1].map((dup) => (
                  <span key={dup} className="flex gap-[42px]">
                    {words.map((w) => (
                      <span key={w + dup} className="font-display font-semibold text-[clamp(1.3rem,3.6vw,2.4rem)] tracking-[-.02em]"
                        style={{ color: 'color-mix(in srgb,var(--txt) 26%,transparent)' }}>{w}</span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      <span className="hidden">{locale}</span>
    </section>
  );
}
