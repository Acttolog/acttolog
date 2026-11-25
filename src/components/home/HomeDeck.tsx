'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { usePrefs } from '@/lib/prefs';
import type { Bi } from '@/lib/content/types';
import { Ecosystem } from '@/components/home/deck/Ecosystem';
import { ToolBench } from '@/components/home/deck/ToolBench';
import { Appearance } from '@/components/home/deck/Appearance';
import { Launchpad } from '@/components/home/deck/Launchpad';
import { Pulse } from '@/components/home/deck/Pulse';
import { SourceLedger, type LedgerSource, type LedgerMeta } from '@/components/home/deck/SourceLedger';
import { LiveWire, type WireEvent } from '@/components/home/deck/LiveWire';
import { DeckRail } from '@/components/home/deck/DeckRail';
import { PointerStudio } from '@/components/home/deck/PointerStudio';
import { NoticeBoard } from '@/components/notices/NoticeBoard';
import type { Notice, NoticeCategory, NoticeMeta } from '@/lib/content/notice-utils';
import type { PortalReach } from '@/lib/content/source-utils';

export interface DeckData {
  locale: 'en' | 'ne';
  divisions: { name: Bi; route: string; color: string; icon: string }[];
  counts: {
    research: number;
    entertainment: number;
    academy: number;
    games: number;
    darkroom: number;
    posts: number;
  };
  cadence: { label: string; count: number }[];
  wire: WireEvent[];
  sources: { items: LedgerSource[]; meta: LedgerMeta };
  quick: { title: Bi; thumb: string; url: string; tag: string }[];
  offer: { title: Bi; short: Bi; npr: number; usd: number; slug: string } | null;
  loksewa: { papers: number; subjects: number; points: number; questions: number };
  guide: { places: number; regions: number };
  notices: { items: Notice[]; categories: NoticeCategory[]; meta: NoticeMeta; reach: Record<string, PortalReach> };
}

const L = {
  en: {
    kicker: 'MISSION CONTROL',
    title: 'The whole network, at a glance.',
    sub: 'Every figure below is computed at compile time from the site’s own content ledger — nothing invented.',
    clock: 'KATHMANDU · UTC+5:45',
    clockSub: 'NETWORK TIME',
    sources: 'SOURCE LEDGER',
    index: 'CONTENT INDEX',
    cadence: 'PUBLISHING · LAST 6 MONTHS',
    posts: 'Essays',
    games: 'Games',
    resources: 'Resources',
    academy: 'Courses',
    entertainment: 'Screenings',
    research: 'Services',
    play: 'QUICK PLAY',
    playSub: 'Direct launch · no install',
    wire: 'LIVE WIRE',
    lk: 'LOKSEWA GHAR',
    lkSub: 'The study house',
    papers: 'Papers',
    subjects: 'Subjects',
    points: 'Syllabus points',
    questions: 'Practice questions',
    lkCta: 'Enter the study house',
    offer: 'FEATURED OFFER',
    offerCta: 'View offer',
    theme: 'THEME STUDIO',
    themeSub: 'Saved on this device',
    guide: 'NEPAL GUIDE',
    places: 'Places',
    regions: 'Regions',
    guideCta: 'Open the guide',
    eco: 'Ecosystem map',
    tools: 'Tool bench',
    launch: 'Launchpad',
    pulse: 'Device pulse',
    notices: 'Notice board',
    noticesSub: 'Curated directory · countdowns live',
    pointer: 'POINTER STUDIO',
    pointerSub: 'Magnetic cursor · tuned live',
  },
  ne: {
    kicker: 'मिसन कन्ट्रोल',
    title: 'सिङ्गो नेटवर्क, एक नजरमा।',
    sub: 'तलका सबै अङ्कहरू साइटकै सामग्री खाताबाट कम्पाइल समयमा गणना गरिएका हुन् — केही पनि काल्पनिक छैन।',
    clock: 'काठमाडौं · UTC+5:45',
    clockSub: 'नेटवर्क समय',
    sources: 'स्रोत खाता',
    index: 'सामग्री सूची',
    cadence: 'प्रकाशन · पछिल्लो ६ महिना',
    posts: 'लेखहरू',
    games: 'खेलहरू',
    resources: 'स्रोतहरू',
    academy: 'पाठ्यक्रम',
    entertainment: 'प्रदर्शनी',
    research: 'सेवाहरू',
    play: 'तुरुन्त खेल्नुहोस्',
    playSub: 'सिधै सुरु · इन्स्टल छैन',
    wire: 'प्रत्यक्ष तार',
    lk: 'लोकसेवा घर',
    lkSub: 'अध्ययन घर',
    papers: 'पत्रहरू',
    subjects: 'विषयहरू',
    points: 'पाठ्यबुँदा',
    questions: 'अभ्यास प्रश्न',
    lkCta: 'अध्ययन घरमा जानुहोस्',
    offer: 'विशेष प्रस्ताव',
    offerCta: 'प्रस्ताव हेर्नुहोस्',
    theme: 'थिम स्टुडियो',
    themeSub: 'यही यन्त्रमा सुरक्षित',
    guide: 'नेपाल गाइड',
    places: 'स्थानहरू',
    regions: 'क्षेत्रहरू',
    guideCta: 'गाइड खोल्नुहोस्',
    eco: 'इकोसिस्टम नक्सा',
    tools: 'औजार बेन्च',
    launch: 'लन्चप्याड',
    pulse: 'यन्त्र पल्स',
    notices: 'सूचना पाटी',
    noticesSub: 'क्युरेटेड निर्देशिका · काउन्टडाउन प्रत्यक्ष',
    pointer: 'पोइन्टर स्टुडियो',
    pointerSub: 'चुम्बकीय कर्सर · प्रत्यक्ष मिलाउनुहोस्',
  },
} as const;

const finePointer = () =>
  typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setSeen(true)),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

function CountUp({ value, run, reduced }: { value: number; run: boolean; reduced: boolean }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    if (reduced || !run) {
      setN(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, value, reduced]);
  return <b className="dk-num">{n.toLocaleString('en-US')}</b>;
}

function Card({
  i,
  ac,
  span,
  children,
  label,
  art,
}: {
  i: number;
  ac: string;
  span: string;
  children: ReactNode;
  label: string;
  art?: { jpg: string; webp480: string; webp960: string };
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !finePointer() || reduced()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${(x * 2.4).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-y * 2.4).toFixed(2)}deg`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };
  return (
    <div
      ref={ref}
      className={`deck-card ${span}`}
      style={{ '--ac': ac, '--d': `${i * 60}ms` } as CSSProperties}
      onPointerMove={move}
      onPointerLeave={leave}
      aria-label={label}
    >
      {art && (
        <picture className="deck-card-art" aria-hidden="true">
          <source
            type="image/webp"
            srcSet={`${art.webp480} 480w, ${art.webp960} 960w`}
            sizes="(max-width: 900px) 100vw, 480px"
          />
          <img src={art.jpg} alt="" loading="lazy" decoding="async" />
        </picture>
      )}
      <div className="deck-card-body">{children}</div>
    </div>
  );
}

const bi = (t: Bi, locale: 'en' | 'ne') => (locale === 'ne' ? t.ne || t.en : t.en);

/** Rail labels in DOM order; CSS reorders the cards per breakpoint. */
const RAIL: { id: string; en: string; ne: string }[] = [
  { id: 'dk-a', en: 'Network time', ne: 'नेटवर्क समय' },
  { id: 'dk-b', en: 'Source ledger', ne: 'स्रोत खाता' },
  { id: 'dk-j', en: 'Ecosystem map', ne: 'इकोसिस्टम नक्सा' },
  { id: 'dk-c', en: 'Content index', ne: 'सामग्री सूची' },
  { id: 'dk-k', en: 'Tool bench', ne: 'औजार बेन्च' },
  { id: 'dk-d', en: 'Quick play', ne: 'तुरुन्त खेल' },
  { id: 'dk-e', en: 'Live wire', ne: 'प्रत्यक्ष तार' },
  { id: 'dk-f', en: 'Loksewa Ghar', ne: 'लोकसेवा घर' },
  { id: 'dk-g', en: 'Featured offer', ne: 'विशेष प्रस्ताव' },
  { id: 'dk-h', en: 'Theme studio', ne: 'थिम स्टुडियो' },
  { id: 'dk-i', en: 'Nepal guide', ne: 'नेपाल गाइड' },
  { id: 'dk-l', en: 'Launchpad', ne: 'लन्चप्याड' },
  { id: 'dk-m', en: 'Device pulse', ne: 'यन्त्र पल्स' },
  { id: 'dk-n', en: 'Live notices', ne: 'प्रत्यक्ष सूचना' },
  { id: 'dk-o', en: 'Pointer studio', ne: 'पोइन्टर स्टुडियो' },
];

export function HomeDeck({ data }: { data: DeckData }) {
  const t = L[data.locale];
  const { currency, density, motion, glass, glow } = usePrefs();
  const [now, setNow] = useState<Date | null>(null);
  const [osReduced, setOsReduced] = useState(false);
  useEffect(() => {
    setNow(new Date());
    setOsReduced(matchMedia('(prefers-reduced-motion: reduce)').matches);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const effMotion = motion === 'reduced' || osReduced ? 'reduced' : 'full';

  const fmt = useMemo(() => {
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const date = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return { time, date };
  }, []);

  const idx = useInView<HTMLDivElement>();
  const gridRef = useRef<HTMLDivElement | null>(null);
  // Stable identity: the deck re-renders on every clock tick, and a fresh array
  // here would make DeckRail rebuild its 15 observers once a second.
  const railItems = useMemo(
    () => RAIL.map((r) => ({ id: r.id, label: data.locale === 'ne' ? r.ne : r.en })),
    [data.locale],
  );
  const maxCad = Math.max(1, ...data.cadence.map((c) => c.count));
  const stats: { k: string; v: number; ac: string }[] = [
    { k: t.posts, v: data.counts.posts, ac: 'var(--vi)' },
    { k: t.games, v: data.counts.games, ac: 'var(--ok)' },
    { k: t.resources, v: data.counts.darkroom, ac: 'var(--gold)' },
    { k: t.academy, v: data.counts.academy, ac: 'var(--cy)' },
    { k: t.entertainment, v: data.counts.entertainment, ac: 'var(--mg)' },
    { k: t.research, v: data.counts.research, ac: 'var(--vi)' },
  ];

  return (
    <section
      className="deck"
      id="deck"
      aria-label={t.kicker}
      data-density={density}
      data-motion={effMotion}
      style={{ '--deck-blur': `${((glass / 100) * 18).toFixed(1)}px`, '--deck-glow': (glow / 100).toFixed(2) } as CSSProperties}
    >
      <div className="wrap">
        <div className="deck-head">
          <div>
            <p className="kicker mono">{t.kicker}</p>
            <h2 className="deck-title">{t.title}</h2>
          </div>
          <p className="deck-sub">{t.sub}</p>
        </div>

        <div className="deck-grid" ref={gridRef}>
          <Card i={0} ac="var(--cy)" span="dk-a" label={t.clock}>
            <p className="dk-kicker mono">{t.clock}</p>
            <div className="dk-clock mono" suppressHydrationWarning>
              {now ? fmt.time.format(now) : 'SYNCING'}
            </div>
            <p className="dk-date mono" suppressHydrationWarning>
              {now ? fmt.date.format(now) : 'SYNCING'}
            </p>
            <p className="dk-foot mono">{t.clockSub}</p>
          </Card>

          <Card
            i={1}
            ac="var(--ok)"
            span="dk-b"
            label={t.sources}
            art={{
              jpg: '/media/ai/source-grid.jpg',
              webp480: '/media/ai/derived/source-grid-480.webp',
              webp960: '/media/ai/derived/source-grid-960.webp',
            }}
          >
            <SourceLedger locale={data.locale} sources={data.sources.items} meta={data.sources.meta} />
          </Card>

          <Card i={9} ac="var(--cy)" span="dk-j" label={t.eco}>
            <Ecosystem nodes={data.divisions} locale={data.locale} />
          </Card>

          <Card i={2} ac="var(--vi)" span="dk-c" label={t.index}>
            <div ref={idx.ref}>
              <p className="dk-kicker mono">{t.index}</p>
              <div className="dk-stats">
                {stats.map((s) => (
                  <div className="dk-stat" key={s.k} style={{ '--ac': s.ac } as CSSProperties}>
                    <CountUp value={s.v} run={idx.seen} reduced={effMotion === 'reduced'} />
                    <span>{s.k}</span>
                  </div>
                ))}
              </div>
              <p className="dk-kicker mono dk-cad-title">{t.cadence}</p>
              <div className="dk-cad" role="img" aria-label={t.cadence}>
                {data.cadence.map((c) => (
                  <div className="dk-cad-col" key={c.label}>
                    <span className="dk-cad-n mono">{c.count}</span>
                    <span
                      className="dk-cad-bar"
                      style={{ height: `${Math.max(6, (c.count / maxCad) * 100)}%` }}
                    />
                    <span className="dk-cad-l mono">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card i={10} ac="var(--ok)" span="dk-k" label={t.tools}>
            <ToolBench locale={data.locale} />
          </Card>

          <Card i={3} ac="var(--ok)" span="dk-d" label={t.play}>
            <p className="dk-kicker mono">
              {t.play} <span className="dk-dim">· {t.playSub}</span>
            </p>
            <div className="dk-quick">
              {data.quick.map((g) => (
                // The arcade is a standalone static app, not an App Router route:
                // a plain anchor keeps the router from prefetching a page tree.
                <a className="dk-tile" href={g.url} key={g.url}>
                  <img src={g.thumb} alt="" loading="lazy" width={600} height={338} />
                  <span className="dk-tile-body">
                    <b>{bi(g.title, data.locale)}</b>
                    <span className="mono">{g.tag.toUpperCase()}</span>
                  </span>
                  <span className="dk-tile-play" aria-hidden="true">
                    ▶
                  </span>
                </a>
              ))}
            </div>
          </Card>

          <Card
            i={4}
            ac="var(--mg)"
            span="dk-e"
            label={t.wire}
            art={{
              jpg: '/media/ai/wire-aurora.jpg',
              webp480: '/media/ai/derived/wire-aurora-480.webp',
              webp960: '/media/ai/derived/wire-aurora-960.webp',
            }}
          >
            <LiveWire locale={data.locale} events={data.wire} compiledAt={data.sources.meta.compiledAt} />
          </Card>

          <Card i={5} ac="var(--gold)" span="dk-f" label={t.lk}>
            <p className="dk-kicker mono">{t.lk}</p>
            <div className="dk-lk">
              <div>
                <b className="dk-num">{data.loksewa.papers}</b>
                <span>{t.papers}</span>
              </div>
              <div>
                <b className="dk-num">{data.loksewa.subjects}</b>
                <span>{t.subjects}</span>
              </div>
              <div>
                <b className="dk-num">{data.loksewa.points.toLocaleString('en-US')}</b>
                <span>{t.points}</span>
              </div>
              <div>
                <b className="dk-num">{data.loksewa.questions}</b>
                <span>{t.questions}</span>
              </div>
            </div>
            <Link className="btn btn-p dk-cta" href="/loksewa">
              {t.lkCta}
            </Link>
          </Card>

          <Card i={6} ac="var(--mg)" span="dk-g" label={t.offer}>
            <p className="dk-kicker mono">{t.offer}</p>
            {data.offer ? (
              <>
                <h3 className="dk-offer-title">{bi(data.offer.title, data.locale)}</h3>
                <p className="dk-offer-short">{bi(data.offer.short, data.locale)}</p>
                <p className="dk-price mono">
                  {currency === 'NPR'
                    ? `Rs ${data.offer.npr.toLocaleString('en-US')}`
                    : `$${data.offer.usd.toLocaleString('en-US')}`}
                </p>
                <Link className="btn btn-g dk-cta" href={`/offers/${data.offer.slug}`}>
                  {t.offerCta}
                </Link>
              </>
            ) : (
              <p className="dk-dim">—</p>
            )}
          </Card>

          <Card i={7} ac="var(--cy)" span="dk-h" label={t.theme}>
            <Appearance locale={data.locale} />
          </Card>

          <Card i={8} ac="var(--gold)" span="dk-i" label={t.guide}>
            <p className="dk-kicker mono">{t.guide}</p>
            <div className="dk-lk two">
              <div>
                <b className="dk-num">{data.guide.places}</b>
                <span>{t.places}</span>
              </div>
              <div>
                <b className="dk-num">{data.guide.regions}</b>
                <span>{t.regions}</span>
              </div>
            </div>
            <Link className="btn btn-g dk-cta" href="/nepal">
              {t.guideCta}
            </Link>
          </Card>

          <Card i={11} ac="var(--cy)" span="dk-l" label={t.launch}>
            <Launchpad locale={data.locale} />
          </Card>

          <Card i={12} ac="var(--mg)" span="dk-m" label={t.pulse}>
            <Pulse locale={data.locale} />
          </Card>

          <Card i={13} ac="var(--gold)" span="dk-n" label={t.notices}>
            <NoticeBoard
              variant="compact"
              locale={data.locale}
              notices={data.notices.items}
              categories={data.notices.categories}
              meta={data.notices.meta}
              reach={data.notices.reach}
              accent="var(--gold)"
              title={{ en: L.en.notices, ne: L.ne.notices }}
              href="/loksewa#lk-notices"
            />
          </Card>

          <Card i={14} ac="var(--vi)" span="dk-o" label={t.pointer}>
            <PointerStudio locale={data.locale} />
          </Card>
        </div>
        <DeckRail
          gridRef={gridRef}
          items={railItems}
          locale={data.locale}
        />
      </div>
    </section>
  );
}