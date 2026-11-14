'use client';

import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { getDB } from '@/lib/content';

interface ExtBag {
  researchLibrary?: { nepal?: Item[]; international?: Item[]; guides?: Item[]; videos?: Item[] };
  entertainmentChannels?: { social?: (Item & { kind: string })[]; legalStreams?: Item[] };
  academyExtra?: { universities?: Item[]; scholarships?: Item[] };
  gamesExtra?: (Item & { kind: string })[];
  liveCams?: Item[];
}
const db = getDB() as unknown as ExtBag;

interface Item {
  name: string;
  url: string;
  desc?: { en: string; ne?: string };
  detail?: { en: string; ne?: string };
  tags?: string[];
  kind?: string;
}

function ExtCard({ it, accent }: { it: Item; accent: string }) {
  const { L, locale } = useI18n();
  const body = it.desc || it.detail;
  const external = it.url.startsWith('http');
  const inner = (
    <div className="card group h-full p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span
          className="grid h-9 w-9 flex-none place-items-center rounded-lg"
          style={{
            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
          }}
        >
          <Icon name={external ? 'link' : 'doc'} size={16} />
        </span>
        {external && <span className="dim mono mt-1 text-[9px] tracking-[.16em]">OFFICIAL ↗</span>}
      </div>
      <h3 className="font-display mb-1.5 text-[14.6px] font-semibold transition-colors group-hover:text-[var(--cy)]">
        {it.name}
      </h3>
      {body && (
        <p className="mut mb-3 text-[12.6px] leading-relaxed">{L(body as { en: string; ne?: string })}</p>
      )}
      {(it.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(it.tags || []).slice(0, 3).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
  return external ? (
    <a href={it.url} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  ) : (
    <Link href={it.url} className="block h-full">
      {inner}
    </Link>
  );
}

function Group({
  num,
  kicker,
  title,
  items,
  accent,
  cols = 3,
}: {
  num: string;
  kicker: string;
  title: string;
  items: Item[];
  accent: string;
  cols?: number;
}) {
  return (
    <div className="mt-12">
      <Reveal>
        <div className="sechead">
          <div>
            <div className="secnum mb-3">
              {num} · {kicker}
            </div>
            <h2 className="h2 max-w-[26ch]">{title}</h2>
          </div>
          <span className="chip">{items.length} sources</span>
        </div>
      </Reveal>
      <div className={`grid sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
        {items.map((it, i) => (
          <Reveal key={it.name + i} delay={(i % 3) * 50}>
            <ExtCard it={it} accent={accent} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/** Thesyn Research Library — Nepal + international evidence, guides, videos. */
export function ResearchLibrary() {
  const lib = db.researchLibrary;
  if (!lib) return null;
  return (
    <section className="sec" id="library">
      <div className="wrap">
        <Group
          num="L1"
          kicker="NEPAL EVIDENCE BASE"
          title="Nepal research — journals, theses, data"
          items={lib.nepal || []}
          accent="#35e0ff"
        />
        <Group
          num="L2"
          kicker="INTERNATIONAL EVIDENCE"
          title="Recent international papers & working papers"
          items={lib.international || []}
          accent="#7c5cff"
        />
        <Group
          num="L3"
          kicker="WRITING GUIDES"
          title="Thesis & research writing guidelines"
          items={lib.guides || []}
          accent="#f5c26b"
        />
        <Group
          num="L4"
          kicker="VIDEO LABS"
          title="Research videos & analysis labs"
          items={lib.videos || []}
          accent="#3ddc97"
        />
      </div>
    </section>
  );
}

/** Entertainment — official Gmax Story channels + legal free streams. */
export function EntertainmentChannels() {
  const ch = db.entertainmentChannels;
  const { locale } = useI18n();
  if (!ch) return null;
  const icons: Record<string, string> = { tiktok: 'play', facebook: 'users', youtube: 'play' };
  return (
    <section className="sec pt-2" id="channels">
      <div className="wrap">
        <Reveal>
          <div className="panel mb-10 p-6 sm:p-8">
            <div className="eyebrow mb-4">OFFICIAL GMAX STORY CHANNELS</div>
            <div className="grid gap-4 sm:grid-cols-3">
              {(ch.social || []).map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl border p-5 transition-all hover:-translate-y-1"
                  style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                >
                  <span
                    className="grid h-11 w-11 flex-none place-items-center rounded-xl"
                    style={{
                      background: 'color-mix(in srgb,var(--mg) 13%,transparent)',
                      color: 'var(--mg)',
                      border: '1px solid color-mix(in srgb,var(--mg) 30%,transparent)',
                    }}
                  >
                    <Icon name={icons[s.kind] || 'play'} size={19} />
                  </span>
                  <div>
                    <div className="font-display text-[14.2px] font-semibold">{s.name}</div>
                    <div className="dim mono mt-1 text-[9.6px] tracking-[.16em]">
                      {s.kind.toUpperCase()} · FOLLOW ↗
                    </div>
                  </div>
                </a>
              ))}
            </div>
            <p className="dim mt-5 text-[11.8px] leading-relaxed">
              {locale === 'ne'
                ? 'नोट: Acttolog ले पाइरेसी साइटहरू लिङ्क गर्दैन। तलका सबै स्ट्रिमहरू आधिकारिक र कानुनी छन्।'
                : 'Note: Acttolog never links piracy mirrors. Every stream below is official and legal — licensed anime distributors, public-domain archives and platform storefronts.'}
            </p>
          </div>
        </Reveal>
        <Group
          num="E1"
          kicker="WATCH LEGALLY"
          title="Free legal streams — anime, movies, Nepali"
          items={(ch.legalStreams || []) as Item[]}
          accent="#ff4ecd"
        />
      </div>
    </section>
  );
}

/** Academy — Nepal university portals + scholarship applications. */
export function AcademyExtraSections() {
  const ex = db.academyExtra;
  if (!ex) return null;
  return (
    <section className="sec pt-2" id="academy-extra">
      <div className="wrap">
        <Group
          num="A1"
          kicker="NEPAL UNIVERSITY PORTALS"
          title="Universities — portals, curricula, notices"
          items={(ex.universities || []) as Item[]}
          accent="#7c5cff"
          cols={2}
        />
        <Group
          num="A2"
          kicker="SCHOLARSHIPS"
          title="National & international scholarship application sites"
          items={(ex.scholarships || []) as Item[]}
          accent="#3ddc97"
          cols={2}
        />
      </div>
    </section>
  );
}

/** Games — free web / educational / desktop / mobile official sources. */
export function GamesExtraGrid() {
  const list = (db.gamesExtra || []) as (Item & { kind: string })[];
  const { locale } = useI18n();
  if (!list.length) return null;
  const groups: [string, string, string][] = [
    ['web', 'G1 · INSTANT WEB GAMES', 'var(--ok)'],
    ['edu', 'G2 · EDUCATIONAL & RESEARCH GAMES', 'var(--cy)'],
    ['desktop', 'G3 · DESKTOP — OFFICIAL FREE DOWNLOADS', 'var(--vi)'],
    ['mobile', 'G4 · MOBILE — OFFICIAL STORES', 'var(--mg)'],
  ];
  return (
    <section className="sec pt-2" id="games-extra">
      <div className="wrap">
        {groups.map(([kind, kicker, accent]) => (
          <div key={kind} className="mt-10">
            <Reveal>
              <div className="secnum mb-4">{kicker}</div>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {list
                .filter((g) => g.kind === kind)
                .map((g, i) => (
                  <Reveal key={g.name} delay={(i % 4) * 40}>
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card group block h-full p-5"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className="grid h-9 w-9 place-items-center rounded-lg"
                          style={{
                            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                            color: accent,
                            border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                          }}
                        >
                          <Icon name="game" size={16} />
                        </span>
                        <span className="dim mono text-[9px] tracking-[.16em]">FREE ↗</span>
                      </div>
                      <div className="font-display mb-1.5 text-[14px] font-semibold transition-colors group-hover:text-[var(--cy)]">
                        {g.name}
                      </div>
                      <p className="mut text-[12.2px] leading-relaxed">
                        {locale === 'ne' && g.desc?.ne ? g.desc.ne : g.desc?.en}
                      </p>
                    </a>
                  </Reveal>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Live cam directory (official publishers only). */
export function LiveCamsPanel({ onOpen }: { onOpen?: () => void }) {
  const cams = (db.liveCams || []) as Item[];
  if (!cams.length) return null;
  return (
    <div className="panel p-6">
      <div className="eyebrow mb-4">LIVE CAM NETWORKS</div>
      <div className="space-y-2.5">
        {cams.map((c: Item) => (
          <a
            key={c.url}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border p-3.5 transition-all hover:-translate-y-0.5"
            style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
          >
            <span className="dot mt-1.5" />
            <div>
              <div className="font-display text-[13.4px] font-semibold">{c.name}</div>
              <div className="mut mt-0.5 text-[11.8px]">{c.desc?.en}</div>
            </div>
          </a>
        ))}
      </div>
      <p className="dim mt-4 text-[11px] leading-relaxed">
        Streams belong to their official publishers. Acttolog links, never re-hosts, and never touches
        unsecured cameras.
      </p>
      {onOpen && (
        <button className="btn btn-g btn-sm mt-3" onClick={onOpen}>
          Open cam directory
        </button>
      )}
    </div>
  );
}
