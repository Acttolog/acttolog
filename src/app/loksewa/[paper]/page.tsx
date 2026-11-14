import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { loksewaPaper, loksewaPapers, loksewaPractice, loksewaSources } from '@/lib/content/loksewa';
import { MediumProvider, Lk, PracticeTest, ProgressTracker } from '@/components/loksewa/Interactive';

export const dynamicParams = false;

export function generateStaticParams() {
  return loksewaPapers().map((p) => ({ paper: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ paper: string }> }): Promise<Metadata> {
  const { paper } = await params;
  const p = loksewaPaper(paper);
  if (!p) return {};
  return {
    title: `${p.title.ne} — लोकसेवा घर`,
    description: p.intro.ne.slice(0, 155),
    alternates: { canonical: `/loksewa/${p.slug}` },
  };
}

export default async function LoksewaPaperPage({ params }: { params: Promise<{ paper: string }> }) {
  const { paper } = await params;
  const p = loksewaPaper(paper);
  if (!p) notFound();

  const questions = loksewaPractice(p.slug);
  const units = p.subjects.flatMap((s) =>
    s.units.map((u) => ({ key: `${p.slug}/${s.slug}/${u.slug}`, label: u.title, href: `/loksewa/${p.slug}/${s.slug}` })),
  );

  return (
    <MediumProvider>
      <div className="lk-crumb wrap">
        <Link href="/loksewa">लोकसेवा घर</Link>
        <Icon name="arrow" size={12} />
        <span>{p.title.ne}</span>
      </div>

      <section className="lk-phero" style={{ '--c': p.color } as React.CSSProperties}>
        <div className="wrap">
          <div className="eyebrow">{p.short.ne}</div>
          <h1 className="lk-phero-h">{p.title.ne}</h1>
          <p className="lk-phero-en">{p.title.en}</p>
          <p className="lead mt-5 lk-pintro">{p.intro.ne}</p>
          <p className="lk-pintro-en">{p.intro.en}</p>
          <div className="lk-strategy">
            <Icon name="compass" size={15} />
            <p>{p.strategy.ne}</p>
          </div>
        </div>
      </section>

      <section className="sec lksec">
        <div className="wrap">
          <h2 className="h2">विषयहरू — फोल्डर खोल्नुहोस्</h2>
          <div className="lk-subjects">
            {p.subjects.map((s, i) => (
              <Reveal key={s.slug} delay={i * 35} fx={i === 0 ? 'flip scan' : undefined}>
                <Link
                  className="lk-subject fx-holo"
                  data-fx="tilt"
                  href={`/loksewa/${p.slug}/${s.slug}`}
                  style={{ '--c': p.color } as React.CSSProperties}
                >
                  <span className="lk-subject-num mono">{String(i + 1).padStart(2, '0')}</span>
                  <Lk v={s.title} as="span" className="lk-subject-title" />
                  <span className="lk-subject-units">
                    {s.units.length} फोल्डर · {s.units.reduce((a, u) => a + u.points.length, 0)} बुँदा
                  </span>
                  <span className="lk-subject-arrow">
                    <Icon name="arrow" size={15} />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="sec lksec">
        <div className="wrap lk-two">
          <Reveal>
            {questions.length > 0 ? (
              <PracticeTest questions={questions} paperLabel={p.title} />
            ) : (
              <div className="lk-empty">
                <Icon name="doc" size={16} /> यो पेपरका लागि अभ्यास प्रश्न थप्दैछौँ। आधिकारिक नमुना प्रश्नपत्र आयोगको
                साइटमा हेर्नुहोस्।
              </div>
            )}
          </Reveal>
          <Reveal delay={60}>
            <ProgressTracker units={units} />
          </Reveal>
        </div>
      </section>

      <section className="sec lksec">
        <div className="wrap">
          <h3 className="h3">आधिकारिक स्रोत</h3>
          <div className="lk-law-src">
            {loksewaSources().map((s) => (
              <a key={s.url} className="lk-law-card" href={s.url} target="_blank" rel="noopener noreferrer">
                <b>{s.name.ne}</b>
                <span>{s.use.ne}</span>
                <em className="mono">{s.url.replace(/^https?:\/\//, '')}</em>
              </a>
            ))}
          </div>
        </div>
      </section>
    </MediumProvider>
  );
}
