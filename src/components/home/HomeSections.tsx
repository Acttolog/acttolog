'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/Heads';
import { MediaCover } from '@/components/ui/MediaCover';
import { AccessBadge } from '@/components/ui/Badges';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { useFxScene } from '@/components/fx/Motion';
import { WelcomeBack } from '@/components/home/WelcomeBack';
import { useRef } from 'react';
import { track } from '@/lib/analytics';
import { resolveImage, money, fdate, nf, rt } from '@/lib/utils';

import type {
  AcademyCourse,
  Bi,
  BlogPost,
  DarkroomCategory,
  DarkroomResource,
  Division,
  EntertainmentItem,
  HomeSection,
  Offer,
  SiteSettings,
} from '@/lib/content/types';

export interface LatestItem {
  title: Bi;
  kind: string;
  date: string;
  route: string;
  ext?: boolean;
  color: string;
  icon: string;
  mem: boolean;
}

export interface HomeData {
  shots: string[];
  sections: Record<string, HomeSection>;
  settings: SiteSettings;
  divisions: Division[];
  counts: {
    research: number;
    entertainment: number;
    academy: number;
    games: number;
    darkroom: number;
    posts: number;
    resources: number;
  };
  featured: { post?: BlogPost; offer?: Offer; ent?: EntertainmentItem; dr?: DarkroomResource };
  latest: LatestItem[];
  courses: AcademyCourse[];
  drCats: DarkroomCategory[];
  drFeatured: DarkroomResource[];
  offers: Offer[];
}

/* ── 01 · signal — one featured story, one live stream ─────────── */

export function HomeSignal({ data }: { data: HomeData }) {
  const { sections: sec } = data;
  const { L, t } = useI18n();
  const root = useRef<HTMLElement | null>(null);
  useFxScene(root);
  const post = data.featured.post;
  const showLead = sec.featured.visible !== false && Boolean(post);
  const showList = sec.latest.visible !== false;
  if (!showLead && !showList) return null;

  const items = data.latest
    .filter((x) => !post || x.route !== `/blog/${post.slug}`)
    .slice(0, showLead ? 6 : 8);

  const categoryId = post
    ? ['research', 'entertainment', 'academy', 'games', 'darkroom'].find((k) =>
        (post.category || '').toLowerCase().includes(k),
      )
    : undefined;
  const coverIsShot =
    Boolean(categoryId) &&
    data.shots.includes(categoryId!) &&
    (!post?.cover || String(post.cover).startsWith('art:'));
  const cover = coverIsShot ? `/media/${categoryId}.jpg` : resolveImage(post?.cover, 'editorial');
  const coverSrcSet = coverIsShot
    ? `/media/derived/${categoryId}-480.webp 480w, /media/derived/${categoryId}-960.webp 960w, /media/${categoryId}.jpg 1600w`
    : undefined;

  return (
    <section className="sec hsec" id="signal" ref={root}>
      <div className="wrap">
        <SectionHead
          num="01"
          kicker="SIGNAL"
          title={L({ en: 'The latest signal', ne: 'ताजा संकेत' })}
          srLabel={L({
            en: 'ACTTOLOG blog — research guides, Nepal student updates and new releases',
            ne: 'एक्टोलग ब्लग — अनुसन्धान मार्गदर्शन, नेपालका विद्यार्थी अपडेट र नयाँ प्रकाशन',
          })}
          body={L({
            en: 'One featured story, and what just landed across the world.',
            ne: 'एक मुख्य कथा, र संसारभर भर्खरै प्रकाशित नयाँ सामग्री।',
          })}
          extra={
            <Link className="btn btn-g btn-sm" href="/blog">
              {t('viewall')} <Icon name="arrow" size={15} />
            </Link>
          }
        />
        <div className={`hsignal${showLead && showList ? '' : 'solo'}`}>
          {showLead && post && (
            <Reveal>
              <Link href={`/blog/${post.slug}`} className="hsignal-card group fx-holo" data-fx="tilt scan">
                {}
                <img
                  loading="lazy"
                  decoding="async"
                  src={cover}
                  srcSet={coverSrcSet}
                  sizes="(max-width: 980px) 92vw, 60vw"
                  alt=""
                />
                <span className="hsignal-veil" aria-hidden="true" />
                <span className="hsignal-meta">
                  <span className="badge b-info">{t('featured')}</span>
                  <AccessBadge access={post.access} membersLabel={t('members')} publicLabel={t('public')} />
                </span>
                <span className="hsignal-body">
                  <span className="hsignal-kicker">
                    {post.category.toUpperCase()} · {fdate(post.publishedAt)} · {rt(L(post.content))} MIN
                  </span>
                  <span className="hsignal-title">{L(post.title)}</span>
                  <span className="hsignal-ex">{L(post.excerpt)}</span>
                  <span className="hsignal-go">
                    {L({ en: 'Read the story', ne: 'कथा पढ्नुहोस्' })} <Icon name="arrow" size={15} />
                  </span>
                </span>
              </Link>
            </Reveal>
          )}
          {showList && items.length > 0 && (
            <Reveal delay={80}>
              <div className="hsignal-list">
                <div className="hsignal-list-h">
                  <span>{L({ en: 'LATEST', ne: 'ताजा' })}</span>
                  <span>
                    {nf(items.length)} {L({ en: 'UPDATES', ne: 'अपडेट' })}
                  </span>
                </div>
                {items.map((x, i) => (
                  <SignalRow key={`${x.route}-${i}`} item={x} index={i} />
                ))}
                <Link className="hsignal-more" href="/blog">
                  {L({ en: 'All updates', ne: 'सबै अपडेट' })} <Icon name="arrow" size={15} />
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

function SignalRow({ item, index }: { item: LatestItem; index: number }) {
  const { L } = useI18n();
  const inner = (
    <>
      <span className="hsignal-num">{String(index + 1).padStart(2, '0')}</span>
      <span className="hsignal-rowbody">
        <span className="hsignal-rowtitle">
          {L(item.title)}
          {item.mem && (
            <span className="badge b-vi">
              <Icon name="lock" size={10} />
              {L({ en: 'Members', ne: 'सदस्य' })}
            </span>
          )}
        </span>
        <span className="hsignal-rowmeta">
          {item.kind.toUpperCase()} · {fdate(item.date)}
        </span>
      </span>
      <span className="hsignal-arrow" style={{ color: item.color }}>
        <Icon name="arrow" size={15} />
      </span>
    </>
  );
  if (item.ext) {
    return (
      <a
        className="hsignal-row"
        href={item.route}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('resource_open', { from: 'home_signal' })}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      className="hsignal-row"
      href={item.route}
      onClick={() => item.kind === 'Blog' && track('article_view', { from: 'home_signal' })}
    >
      {inner}
    </Link>
  );
}

/* ── 02 · index — five divisions as one editorial ledger ───────── */

export function HomeIndex({ data }: { data: HomeData }) {
  const { divisions: dvs, counts } = data;
  const { L, locale } = useI18n();
  const root = useRef<HTMLElement | null>(null);
  useFxScene(root);
  if (data.sections.divisions.visible === false) return null;
  const cnt: Record<string, string> = {
    research: `${nf(counts.research)} ${locale === 'ne' ? 'सेवा' : 'services'}`,
    entertainment: `${nf(counts.entertainment)} ${locale === 'ne' ? 'सामग्री' : 'items'}`,
    academy: `${nf(counts.academy)} ${locale === 'ne' ? 'पाठ्यक्रम' : 'courses'}`,
    games: `${nf(counts.games)} ${locale === 'ne' ? 'खेल' : 'games'}`,
    darkroom: `${nf(counts.darkroom)} ${locale === 'ne' ? 'स्रोत' : 'resources'}`,
  };
  return (
    <section className="sec hsec" id="index" ref={root}>
      <div className="wrap">
        <div className="hindex">
          <div className="hindex-copy">
            <Reveal>
              <div className="secnum mb-3">02 · INDEX</div>
              <h2 className="h2 max-w-[18ch]">
                {L({ en: 'Five divisions. One world.', ne: 'पाँच विभाग। एउटै संसार।' })}
                <span className="sr-only">
                  {L({
                    en: ' — research, academy, darkroom, entertainment and games in one Nepali platform',
                    ne: ' — अनुसन्धान, एकेडेमी, डार्करूम, मनोरञ्जन र खेल एकै नेपाली प्लेटफर्ममा',
                  })}
                </span>
              </h2>
              <p className="lead mt-4">
                {L({
                  en: 'Every division is a doorway. The descent is only the start.',
                  ne: 'हरेक विभाग एउटा ढोका हो। अवतरण त केवल सुरुवात हो।',
                })}
              </p>
            </Reveal>
            <Reveal delay={70}>
              <div className="hindex-chips">
                <span className="chip">
                  {dvs.length} {L({ en: 'DIVISIONS', ne: 'विभाग' })}
                </span>
                <span className="chip">
                  {nf(counts.posts)} {L({ en: 'ARTICLES', ne: 'लेख' })}
                </span>
                <span className="chip">
                  {nf(counts.resources)} {L({ en: 'RESOURCES', ne: 'स्रोत' })}
                </span>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <Link
                className="btn btn-g btn-sm hindex-earth"
                href="/explore?mode=earth"
                onClick={() => track('earth_open', { via: 'home_index' })}
              >
                <Icon name="globe" size={15} />
                {L({ en: 'Open the Earth', ne: 'पृथ्वी खोल्नुहोस्' })}
              </Link>
            </Reveal>
          </div>
          <div className="hbento">
            {dvs.map((d, i) => (
              <Link
                key={d.id}
                href={d.route}
                className={`hindex-row hbento-cell hbento-${d.id}`}
                style={{ '--c': d.color } as CSSProperties}
                data-fx={d.id === 'research' ? 'tilt' : undefined}
                onClick={() => track('division_view', { division: d.id })}
              >
                <span className="hindex-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="hindex-thumb fx-holo" data-fx="flip">
                  <MediaCover id={d.id} art={d.art || 'nebula'} shots={data.shots} alt="" />
                </span>
                <span className="hindex-name">
                  <b>{L(d.name)}</b>
                  <em>{L(d.sub)}</em>
                </span>
                <span className="hindex-count">{cnt[d.id] || ''}</span>
                <span className="hindex-arrow">
                  <Icon name="arrow" size={17} />
                </span>
              </Link>
            ))}
            <div className="hbento-stats">
              <span className="hbento-stat">
                <b>{nf(counts.resources)}</b>
                <span>{L({ en: 'verified resources', ne: 'प्रमाणित स्रोत' })}</span>
              </span>
              <span className="hbento-stat">
                <b>{nf(counts.posts)}</b>
                <span>{L({ en: 'articles', ne: 'लेख' })}</span>
              </span>
              <span className="hbento-stat">
                <b>{nf(counts.games)}</b>
                <span>{L({ en: 'games', ne: 'खेल' })}</span>
              </span>
            </div>
            <WelcomeBack resources={counts.resources} courses={counts.academy} labelEn={locale !== 'ne'} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 03 · studio — three working surfaces, one band ────────────── */

export function HomeStudio({ data }: { data: HomeData }) {
  const { sections: sec, counts } = data;
  const { L, locale } = useI18n();
  const { currency, usdToNpr } = usePrefs();
  const root = useRef<HTMLElement | null>(null);
  useFxScene(root);
  if (sec.academy.visible === false && sec.darkroom.visible === false && sec.offers.visible === false)
    return null;
  const offer = data.featured.offer;

  const cards = [
    sec.academy.visible !== false && {
      id: 'academy',
      href: '/academy',
      color: 'var(--vi)',
      icon: 'book',
      kicker: 'ACADEMY',
      title: L({ en: 'Academy', ne: 'एकेडेमी' }),
      line: L({
        en: 'Courses, modules and lessons with private progress.',
        ne: 'पाठ्यक्रम, मोड्युल र पाठ — प्रगति निजी।',
      }),
      stat: `${nf(counts.academy)} ${L({ en: 'courses', ne: 'पाठ्यक्रम' })}`,
      cta: L({ en: 'Enter Academy', ne: 'एकेडेमी खोल्नुहोस्' }),
      art: '/media/academy.jpg',
    },
    sec.darkroom.visible !== false && {
      id: 'darkroom',
      href: '/darkroom',
      color: 'var(--gold)',
      icon: 'search',
      kicker: 'DARKROOM',
      title: L({ en: 'Darkroom', ne: 'डार्करूम' }),
      line: L({
        en: 'Verified tools, databases and hard-to-find resources.',
        ne: 'प्रमाणित उपकरण, डाटाबेस र दुर्लभ स्रोत।',
      }),
      stat: `${nf(counts.darkroom)} ${L({ en: 'verified', ne: 'प्रमाणित' })}`,
      cta: L({ en: 'Search Darkroom', ne: 'डार्करूम खोज्नुहोस्' }),
      art: '/media/darkroom.jpg',
    },
    sec.offers.visible !== false && {
      id: 'offers',
      href: '/offers',
      color: 'var(--cy)',
      icon: 'star',
      kicker: 'OFFERS',
      title: L({ en: 'Offers', ne: 'अफरहरू' }),
      line: L({
        en: 'Selected opportunities, priced in NPR and USD.',
        ne: 'छानिएका अवसर — नेपाली रुपैयाँ र डलरमा।',
      }),
      stat: offer
        ? money({ npr: offer.npr, usd: offer.usd }, currency, usdToNpr, locale)
        : `${nf(data.offers.length)} ${L({ en: 'offers', ne: 'अफर' })}`,
      cta: L({ en: 'View offers', ne: 'अफर हेर्नुहोस्' }),
      art: '/media/offers.jpg',
    },
  ].filter(Boolean) as {
    id: string;
    href: string;
    color: string;
    icon: string;
    kicker: string;
    title: string;
    line: string;
    stat: string;
    cta: string;
    art: string;
  }[];

  return (
    <section className="sec hsec" id="studio" ref={root}>
      <div className="wrap">
        <SectionHead
          num="03"
          kicker="STUDIO"
          title={L({
            en: 'Learn, verify, acquire.',
            ne: 'सिक्नुहोस्, प्रमाणित गर्नुहोस्, प्राप्त गर्नुहोस्।',
          })}
          srLabel={L({
            en: 'ACTTOLOG Academy courses, verified Darkroom resources and Nepal offers',
            ne: 'एकेडेमी पाठ्यक्रम, प्रमाणित डार्करूम स्रोतहरू र नेपाल अफरहरू',
          })}
          body={L({
            en: 'Three working surfaces, each one a click from the world.',
            ne: 'तीनवटा कार्यक्षेत्र — प्रत्येक संसारबाट एक क्लिक पर।',
          })}
        />
        <div className="hstudio">
          {cards.map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <Link
                href={c.href}
                className="hstudio-card group fx-holo"
                data-fx="tilt scan"
                style={{ '--c': c.color } as CSSProperties}
                onClick={() => track('cta_interaction', { cta: `studio_${c.id}` })}
              >
                <span className="hstudio-art">
                  {}
                  <img
                    loading="lazy"
                    decoding="async"
                    src={resolveImage(c.art, c.id)}
                    srcSet={`/media/derived/${c.id}-480.webp 480w, /media/derived/${c.id}-960.webp 960w`}
                    sizes="(max-width: 900px) 92vw, 30vw"
                    alt=""
                  />
                  <span className="hstudio-glyph">
                    <Icon name={c.icon} size={17} />
                  </span>
                </span>
                <span className="hstudio-body">
                  <span className="hstudio-kicker">{c.kicker}</span>
                  <span className="hstudio-title">{c.title}</span>
                  <span className="hstudio-line">{c.line}</span>
                  <span className="hstudio-foot">
                    <span className="hstudio-stat">{c.stat}</span>
                    <span className="hstudio-go">
                      {c.cta} <Icon name="arrow" size={14} />
                    </span>
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 04 · close — one decisive invitation ─────────────────────── */

export function HomeClose({ data }: { data: HomeData }) {
  const { sections: sec } = data;
  const { L, locale } = useI18n();
  const root = useRef<HTMLElement | null>(null);
  useFxScene(root);
  if (sec.cta.visible === false) return null;
  const words = ['DISCOVER', 'LEARN', 'CREATE', 'CONNECT', 'RESEARCH', 'PLAY'];
  return (
    <section className="sec hsec hsec-last" id="cta" ref={root}>
      <div className="wrap">
        <Reveal>
          <div className="hclose fx-kb" data-fx="scan">
            {}
            <img
              className="hclose-bg"
              loading="lazy"
              decoding="async"
              src="/media/world.jpg"
              srcSet="/media/derived/world-480.webp 480w, /media/derived/world-960.webp 960w, /media/world.jpg 1600w"
              sizes="(max-width: 760px) 100vw, 70vw"
              alt=""
            />
            <span className="fx-kb-vig" aria-hidden="true" />
            <span className="hclose-veil" aria-hidden="true" />
            <div className="hclose-in">
              <div className="eyebrow justify-center">ACTTOLOG WORLD</div>
              <h2 className="h2">
                {L(sec.cta.title) ||
                  (locale === 'ne' ? 'Acttolog संसारमा प्रवेश गर्नुहोस्' : 'Enter the Acttolog World')}
                <span className="sr-only">
                  {L({
                    en: ' — ACTTOLOG, a connected digital ecosystem from Nepal',
                    ne: ' — एक्टोलग, नेपालबाट एउटै जोडिएको डिजिटल इकोसिस्टम',
                  })}
                </span>
              </h2>
              <p className="lead mx-auto mt-4">
                {L(sec.cta.body) ||
                  L({
                    en: 'Discover. Learn. Create. Connect.',
                    ne: 'खोज्नुहोस्। सिक्नुहोस्। सिर्जना गर्नुहोस्। जोडिनुहोस्।',
                  })}
              </p>
              <div className="hclose-cta">
                <Link
                  className="btn btn-p btn-lg"
                  href="/explore?mode=earth"
                  onClick={() => track('cta_interaction', { cta: 'close_earth' })}
                >
                  {L({ en: 'Explore Earth', ne: 'पृथ्वी अन्वेषण गर्नुहोस्' })} <Icon name="globe" size={17} />
                </Link>
                <Link
                  className="btn btn-g btn-lg"
                  href="/darkroom"
                  onClick={() => track('cta_interaction', { cta: 'close_darkroom' })}
                >
                  {L({ en: 'Enter the Darkroom', ne: 'डार्करूममा प्रवेश गर्नुहोस्' })}{' '}
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
            </div>
            <div className="marq hclose-marq" aria-hidden="true">
              <div className="marqt">
                {[0, 1].map((dup) => (
                  <span key={dup} className="flex gap-[34px]">
                    {words.map((w) => (
                      <span key={w + dup} className="hclose-word">
                        {w}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
