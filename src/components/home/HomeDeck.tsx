'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { THEMES, usePrefs } from '@/lib/prefs';
import type { Bi } from '@/lib/content/types';
import type { LatestItem } from '@/components/home/HomeSections';

export interface DeckData {
  locale: 'en' | 'ne';
  divisions: { name: Bi; route: string; color: string }[];
  counts: {
    research: number;
    entertainment: number;
    academy: number;
    games: number;
    darkroom: number;
    posts: number;
  };
  cadence: { label: string; count: number }[];
  latest: LatestItem[];
  quick: { title: Bi; thumb: string; url: string; tag: string }[];
  offer: { title: Bi; short: Bi; npr: number; usd: number; slug: string } | null;
  loksewa: { papers: number; subjects: number; points: number; questions: number };
  guide: { places: number; regions: number };
}

const L = {
  en: {
    kicker: 'MISSION CONTROL',
    title: 'The whole network, at a glance.',
    sub: 'Every figure below is read live from the site’s own content ledger — nothing invented.',
    clock: 'KATHMANDU · UTC+5:45',
    clockSub: 'NETWORK TIME',
    net: 'DIVISIONS ONLINE',
    online: 'ONLINE',
    index: 'CONTENT INDEX',
    cadence: 'PUBLISHING · LAST 6 MONTHS',
    posts: 'Essays',
    games: 'Games',
    resources: 'Resources',
    academy: 'Courses',
    entertainment: 'Screenings',
    research: 'Services',
    play: 'QUICK PLAY',
    playSub: 'Direct launch · no account',
    feed: 'LATEST DISPATCH',
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
  },
  ne: {
    kicker: 'मिसन कन्ट्रोल',
    title: 'सिङ्गो नेटवर्क, एक नजरमा।',
    sub: 'तलका सबै अङ्कहरू साइटकै सामग्री खाताबाट प्रत्यक्ष पढिएका हुन् — केही पनि काल्पनिक छैन।',
    clock: 'काठमाडौं · UTC+5:45',
    clockSub: 'नेटवर्क समय',
    net: 'अनलाइन महाशाखाहरू',
    online: 'अनलाइन',
    index: 'सामग्री सूची',
    cadence: 'प्रकाशन · पछिल्लो ६ महिना',
    posts: 'लेखहरू',
    games: 'खेलहरू',
    resources: 'स्रोतहरू',
    academy: 'पाठ्यक्रम',
    entertainment: 'प्रदर्शनी',
    research: 'सेवाहरू',
    play: 'तुरुन्त खेल्नुहोस्',
    playSub: 'सिधै सुरु · खाता चाहिँदैन',
    feed: 'पछिल्लो अपडेट',
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
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setSeen(true)),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

function CountUp({ value, run }: { value: number; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduced()) {
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
  }, [run, value]);
  return <b className="dk-num">{n.toLocaleString('en-US')}</b>;
}

function Card({
  i,
  ac,
  span,
  children,
  label,
}: {
  i: number;
  ac: string;
  span: string;
  children: ReactNode;
  label: string;
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
      {children}
    </div>
  );
}

const bi = (t: Bi, locale: 'en' | 'ne') => (locale === 'ne' ? t.ne || t.en : t.en);

export function HomeDeck({ data }: { data: DeckData }) {
  const t = L[data.locale];
  const { theme, setTheme, currency } = usePrefs();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
    <section className="deck" id="deck" aria-label={t.kicker}>
      <div className="wrap">
        <div className="deck-head">
          <div>
            <p className="kicker mono">{t.kicker}</p>
            <h2 className="deck-title">{t.title}</h2>
          </div>
          <p className="deck-sub">{t.sub}</p>
        </div>

        <div className="deck-grid">
          <Card i={0} ac="var(--cy)" span="dk-a" label={t.clock}>
            <p className="dk-kicker mono">{t.clock}</p>
            <div className="dk-clock mono" suppressHydrationWarning>
              {now ? fmt.time.format(now) : '--:--:--'}
            </div>
            <p className="dk-date mono" suppressHydrationWarning>
              {now ? fmt.date.format(now) : '—'}
            </p>
            <p className="dk-foot mono">{t.clockSub}</p>
          </Card>

          <Card i={1} ac="var(--ok)" span="dk-b" label={t.net}>
            <p className="dk-kicker mono">
              {t.net} · {data.divisions.length}/{data.divisions.length}
            </p>
            <ul className="dk-net">
              {data.divisions.map((d) => (
                <li key={d.route}>
                  <Link href={d.route}>
                    <span className="dk-dot" style={{ background: d.color }} aria-hidden="true" />
                    <span className="dk-net-name">{bi(d.name, data.locale)}</span>
                    <span className="dk-status mono">{t.online}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card i={2} ac="var(--vi)" span="dk-c" label={t.index}>
            <div ref={idx.ref}>
              <p className="dk-kicker mono">{t.index}</p>
              <div className="dk-stats">
                {stats.map((s) => (
                  <div className="dk-stat" key={s.k} style={{ '--ac': s.ac } as CSSProperties}>
                    <CountUp value={s.v} run={idx.seen} />
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

          <Card i={3} ac="var(--ok)" span="dk-d" label={t.play}>
            <p className="dk-kicker mono">
              {t.play} <span className="dk-dim">· {t.playSub}</span>
            </p>
            <div className="dk-quick">
              {data.quick.map((g) => (
                <Link className="dk-tile" href={g.url} key={g.url}>
                  <img src={g.thumb} alt="" loading="lazy" width={600} height={338} />
                  <span className="dk-tile-body">
                    <b>{bi(g.title, data.locale)}</b>
                    <span className="mono">{g.tag.toUpperCase()}</span>
                  </span>
                  <span className="dk-tile-play" aria-hidden="true">
                    ▶
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card i={4} ac="var(--mg)" span="dk-e" label={t.feed}>
            <p className="dk-kicker mono">{t.feed}</p>
            <ul className="dk-feed">
              {data.latest.map((f) => (
                <li key={f.route + f.kind}>
                  <Link href={f.route} target={f.ext ? '_blank' : undefined}>
                    <span className="dk-kind mono" style={{ color: f.color, borderColor: f.color }}>
                      {f.kind}
                    </span>
                    <span className="dk-feed-title">{bi(f.title, data.locale)}</span>
                    <span className="dk-feed-date mono">{String(f.date || '').slice(0, 10)}</span>
                  </Link>
                </li>
              ))}
            </ul>
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
            <p className="dk-kicker mono">{t.theme}</p>
            <div className="dk-themes" role="group" aria-label={t.theme}>
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  className={`dk-swatch${theme === th.id ? ' on' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${th.sw[0]} 48%, ${th.sw[1]})` }}
                  title={th.label}
                  aria-label={th.label}
                  aria-pressed={theme === th.id}
                  onClick={() => setTheme(th.id)}
                />
              ))}
            </div>
            <p className="dk-theme-now">{THEMES.find((x) => x.id === theme)?.label}</p>
            <p className="dk-foot mono">{t.themeSub}</p>
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
        </div>
      </div>
    </section>
  );
}