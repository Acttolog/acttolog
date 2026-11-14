import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { loksewaPaper, loksewaPapers, loksewaSources, loksewaSubject } from '@/lib/content/loksewa';
import { MediumProvider, Lk, ProgressTracker } from '@/components/loksewa/Interactive';

export const dynamicParams = false;

export function generateStaticParams() {
  const out: { paper: string; subject: string }[] = [];
  for (const p of loksewaPapers()) for (const s of p.subjects) out.push({ paper: p.slug, subject: s.slug });
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ paper: string; subject: string }>;
}): Promise<Metadata> {
  const { paper, subject } = await params;
  const s = loksewaSubject(paper, subject);
  const p = loksewaPaper(paper);
  if (!s || !p) return {};
  const first = s.units[0];
  return {
    title: `${s.title.ne} — ${p.title.ne} — लोकसेवा घर`,
    description: `${s.title.ne}: ${s.units.length} फोल्डर, ${s.units.reduce((a, u) => a + u.points.length, 0)} बुँदा।${
      first ? ` पहिलो फोल्डर: ${first.title.ne}.` : ''
    }`.slice(0, 155),
    alternates: { canonical: `/loksewa/${paper}/${subject}` },
  };
}

export default async function LoksewaSubjectPage({
  params,
}: {
  params: Promise<{ paper: string; subject: string }>;
}) {
  const { paper, subject } = await params;
  const p = loksewaPaper(paper);
  const s = loksewaSubject(paper, subject);
  if (!p || !s) notFound();

  const units = s.units.map((u) => ({ key: `${p.slug}/${s.slug}/${u.slug}`, label: u.title, href: `#${u.slug}` }));

  return (
    <MediumProvider>
      <div className="lk-crumb wrap">
        <Link href="/loksewa">लोकसेवा घर</Link>
        <Icon name="arrow" size={12} />
        <Link href={`/loksewa/${p.slug}`}>{p.title.ne}</Link>
        <Icon name="arrow" size={12} />
        <span>{s.title.ne}</span>
      </div>

      <section className="lk-shead" style={{ '--c': p.color } as React.CSSProperties}>
        <div className="wrap">
          <div className="eyebrow">{p.short.ne}</div>
          <h1 className="lk-phero-h">
            <Lk v={s.title} />
          </h1>
          <p className="lead mt-4">
            {s.units.length} फोल्डर · {s.units.reduce((a, u) => a + u.points.length, 0)} पढाइ बुँदा ·{p.strategy.ne.length > 0 ? ' ' : ''}
            तलको प्रत्येक फोल्डरमा कानून, निकाय र उदाहरण तीनवटै रेखा बनाउनुहोस्।
          </p>
        </div>
      </section>

      <section className="sec lksec">
        <div className="wrap lk-folders">
          {s.units.map((u, i) => (
            <Reveal key={u.slug} delay={i * 30} fx={i % 3 === 0 ? 'flip scan' : undefined}>
              <article className="lk-folder fx-holo" id={u.slug} style={{ '--c': p.color } as React.CSSProperties}>
                <header className="lk-folder-head">
                  <span className="lk-folder-ic" aria-hidden="true">
                    <Icon name="grid" size={16} />
                  </span>
                  <h2 className="lk-folder-title">
                    <Lk v={u.title} />
                  </h2>
                  <span className="lk-folder-no mono">{String(i + 1).padStart(2, '0')}</span>
                </header>
                <ul className="lk-points">
                  {u.points.map((pt) => (
                    <li key={pt}>
                      <span className="lk-point-dot" aria-hidden="true" />
                      {pt}
                    </li>
                  ))}
                </ul>
                <p className="lk-folder-task">
                  <Icon name="doc" size={13} /> यो फोल्डरको उत्तर लेख्दा: कुन कानूनले बनाउँछ, कुन निकायले चलाउँछ, एक
                  वास्तविक उदाहरण — तीन लाइन।
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec lksec">
        <div className="wrap lk-two">
          <Reveal>
            <ProgressTracker units={units} />
          </Reveal>
          <Reveal delay={60}>
            <div className="lk-src-panel">
              <h3 className="h3">कानून र दस्तावेज कहाँबाट पढ्ने</h3>
              <div className="lk-law-src col">
                {loksewaSources().map((src) => (
                  <a key={src.url} className="lk-law-card" href={src.url} target="_blank" rel="noopener noreferrer">
                    <b>{src.name.ne}</b>
                    <span>{src.use.ne}</span>
                    <em className="mono">{src.url.replace(/^https?:\/\//, '')}</em>
                  </a>
                ))}
              </div>
              <p className="lk-src-note">
                यो पृष्ठको विषयसूची सार्वजनिक सूचनाबाट संकलित छ। हालको वर्षको आधिकारिक विषयसूची र सूचना कर्मचारी चयन
                आयोगकै साइटमा जाँच्नुहोस्।
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec lksec">
        <div className="wrap">
          <h3 className="h3">यसै पेपरका अरू विषय</h3>
          <div className="lk-sibs">
            {p.subjects
              .filter((x) => x.slug !== s.slug)
              .map((x) => (
                <Link key={x.slug} className="lk-sib" href={`/loksewa/${p.slug}/${x.slug}`} style={{ '--c': p.color } as React.CSSProperties}>
                  <Lk v={x.title} />
                  <Icon name="arrow" size={13} />
                </Link>
              ))}
          </div>
        </div>
      </section>
    </MediumProvider>
  );
}
