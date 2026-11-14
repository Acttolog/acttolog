import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { getDB } from '@/lib/content';
import { AuroraGL } from '@/components/fx/AuroraGL';
import { FxScene } from '@/components/fx/Motion';
import {
  loksewaCounts,
  loksewaLaws,
  loksewaMethod,
  loksewaMeta,
  loksewaPapers,
  loksewaPractice,
  loksewaSources,
  loksewaStages,
  loksewaTotals,
} from '@/lib/content/loksewa';
import { MediumProvider, MediumSwitch, Lk, ProgressTracker, PracticeTest } from '@/components/loksewa/Interactive';
import { Stage3D } from '@/components/loksewa/Stage3D';

const meta = loksewaMeta();
const totals = loksewaTotals();
const counts = loksewaCounts();

export const metadata: Metadata = {
  title: 'लोकसेवा घर — Loksewa Ghar: Nepal Civil Service Preparation',
  description:
    'शाखा अधिकृत तहको सम्पूर्ण तयारी एकै ठाउँमा: हरेक पेपर, विषय, पाठ्यक्रम फोल्डर, सरकारका कानून दस्तावेज, निःशुल्क स्रोत, अभ्यास परीक्षण र रैंक ल्याउने योजना।',
  alternates: { canonical: '/loksewa' },
  openGraph: {
    title: 'लोकसेवा घर — Nepal Loksewa preparation, all papers in one house',
    description:
      'Officer level (शाखा अधिकृत): every paper, subject, syllabus folder, the laws you must read, free practice tests with negative marking, and a rank-first plan.',
    url: '/loksewa',
    type: 'website',
    images: [{ url: '/media/og-home.jpg', width: 1200, height: 630 }],
  },
};

export default function LoksewaPage() {
  const db = getDB();
  const stages = loksewaStages();
  const papers = loksewaPapers();
  const laws = loksewaLaws();
  const sources = loksewaSources();
  const method = loksewaMethod();
  const allUnits = papers.flatMap((p) => p.subjects.flatMap((s) => s.units.map((u) => ({
    key: `${p.slug}/${s.slug}/${u.slug}`,
    label: u.title,
    href: `/loksewa/${p.slug}/${s.slug}`,
  }))));

  return (
    <MediumProvider>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="lk-hero" id="lk-top">
        <AuroraGL />
        <div className="lk-hero-veil" aria-hidden="true" />
        <div className="wrap lk-hero-in">
          <div className="lk-hero-copy">
            <div className="eyebrow lk-hero-kicker">
              {meta.focusLevel.en} · {meta.updatedSeason.ne}
            </div>
            <h1 className="lk-h1">
              {meta.name.ne}
              <span className="lk-h1-en">{meta.name.en}</span>
            </h1>
            <p className="lk-lead">{meta.tagline.ne}</p>
            <p className="lk-lead lk-lead-en">{meta.tagline.en}</p>
            <div className="lk-hero-cta">
              <a className="btn btn-p btn-lg" href="#lk-papers">
                <Icon name="layers" size={16} /> विषयहरू चयन गर्नुहोस्
              </a>
              <Link className="btn btn-g btn-lg" href="/loksewa/downloads">
                <Icon name="down" size={16} /> डाउनलोड केन्द्र
              </Link>
              <a className="btn btn-g btn-lg" href="#lk-test">
                निःशुल्क अभ्यास परीक्षण <Icon name="arrow" size={16} />
              </a>
            </div>
            <div className="lk-hero-stats">
              <span>
                <b>{counts.papers}</b> पेपर
              </span>
              <span>
                <b>{counts.subjects}</b> विषय
              </span>
              <span>
                <b>{counts.folders}</b> फोल्डर
              </span>
              <span>
                <b>{laws.length}</b> कानून
              </span>
            </div>
          </div>

          {/* Mentor: the person who prepared this, using the site's own founder photos */}
          <aside className="lk-mentor" aria-label="तयारी गर्ने — prepared by">
            <div className="lk-mentor-photo">
              <img
                src="/media/founder-pro.jpg"
                alt={`${db.settings.brand} — founder of Loksewa Ghar`}
                width={640}
                height={800}
                loading="eager"
                decoding="async"
              />
              <span className="lk-mentor-ring" aria-hidden="true" />
            </div>
            <h2>{db.settings.org}</h2>
            <p className="lk-mentor-role">लोकसेवा घर — निर्माता र प्रशिक्षक</p>
            <p className="lk-mentor-bio">{db.settings.purpose.ne}</p>
            <div className="lk-mentor-links">
              <Link href="/about">
                <Icon name="doc" size={13} /> परिचय
              </Link>
              <Link href="/contact">
                <Icon name="mail" size={13} /> सम्पर्क
              </Link>
              <a href={`tel:${db.settings.phone}`}>
                <Icon name="chat" size={13} /> {db.settings.phone}
              </a>
            </div>
          </aside>
        </div>
        <MediumSwitch />
      </section>

      {/* ── WHAT THE EXAM ACTUALLY IS ────────────────────────────── */}
      <section className="sec lksec" id="lk-stages">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">परीक्षा वास्तवमा के हो — र अङ्क कहाँबाट आउँछ</h2>
            <p className="lead mt-4">
              सात चरण, {totals.all} अङ्क। पहिलो वस्तुगत चरणमा {totals.objective} अङ्क र २०% नकारात्मक घटाइ; लिखितमा{' '}
              {totals.written}; छनौट चरणमा {totals.selection}।
            </p>
          </Reveal>
          <Reveal delay={60}>
            <Stage3D stages={stages} />
          </Reveal>
          <div className="lk-stage-table" role="table" aria-label="चरण र अङ्क">
            {stages.map((s) => (
              <div key={s.id} className="lk-stage-row" role="row">
                <span className="mono" role="cell">{String(s.order).padStart(2, '0')}</span>
                <span role="cell"><Lk v={s.title} /></span>
                <span className="mono" role="cell">{s.kind.ne}</span>
                <span className="lk-stage-marks" role="cell">{s.marks}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAPERS BENTO ─────────────────────────────────────────── */}
      <section className="sec lksec" id="lk-papers">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">चार पेपर, एकै घरभित्र</h2>
            <p className="lead mt-4">
              हरेक पेपर फोल्डरमा विभाजित छ — विषय, त्यसभित्र एकाइ, र हरेक एकाइमा पढ्नुपर्ने बुँदा।
            </p>
          </Reveal>
          <FxScene>
            <div className="lk-papers">
              {papers.map((p, i) => (
                <Reveal key={p.slug} delay={i * 40} fx={i === 0 ? 'flip' : undefined}>
                  <Link className="lk-paper" style={{ '--c': p.color } as React.CSSProperties} href={`/loksewa/${p.slug}`}>
                    <span className="lk-paper-num mono">०{i + 1}</span>
                    <span className="lk-paper-title">
                      {p.title.ne}
                      <em>{p.title.en}</em>
                    </span>
                    <span className="lk-paper-short">{p.short.ne}</span>
                    <span className="lk-paper-intro">{p.intro.ne}</span>
                    <span className="lk-paper-foot">
                      {p.subjects.length} विषय · {p.subjects.reduce((a, s) => a + s.units.length, 0)} फोल्डर
                      <Icon name="arrow" size={15} />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </FxScene>
        </div>
      </section>

      {/* ── DOWNLOADS + EXPLORER ─────────────────────────────────── */}
      <section className="sec lksec" id="lk-paper">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">कागजमा ल्याउनुहोस् — फोल्डरसहित</h2>
            <p className="lead mt-4">
              हरेक पेपरको पाठ्यक्रम नक्सा, बाह्र हप्ताको योजना, कानून सूची र नमुना प्रश्नपत्र — PDF मा निःशुल्क।
              पढाइ स्लाइडसहितको पेपर प्याक रु. ३००, चारै पेपरको पूर्ण प्याक रु. ६००।
            </p>
          </Reveal>
          <FxScene>
            <div className="lk-two">
              <Reveal fx="tilt scan">
                <Link className="lk-promo fx-holo" href="/loksewa/downloads">
                  <span className="lk-promo-k mono">डाउनलोड केन्द्र</span>
                  <b>PDF · स्लाइड · भिडियो</b>
                  <p>
                    {counts.folders} फोल्डरको नक्सा छाप्न तयार कागजमा। खाता चाहिँदैन, निःशुल्क सुरु हुन्छ।
                  </p>
                  <span className="lk-promo-go">
                    खोल्नुहोस् <Icon name="arrow" size={15} />
                  </span>
                </Link>
              </Reveal>
              <Reveal fx="flip" delay={50}>
                <Link className="lk-promo" href="/loksewa/explorer">
                  <span className="lk-promo-k mono">३डी एक्सप्लोरर</span>
                  <b>पेपर → विषय → फोल्डर</b>
                  <p>
                    पूरा घर घुमाएर हेर्नुहोस्: {counts.papers} पेपर, {counts.subjects} विषय, {counts.folders} फोल्डर।
                  </p>
                  <span className="lk-promo-go">
                    घुमाउनुहोस् <Icon name="globe" size={15} />
                  </span>
                </Link>
              </Reveal>
            </div>
          </FxScene>
        </div>
      </section>

      {/* ── LAWS ─────────────────────────────────────────────────── */}
      <section className="sec lksec" id="lk-laws">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">नेपाल सरकारका कानून दस्तावेज — सधैँ स्रोतबाट पढ्नुहोस्</h2>
            <p className="lead mt-4">
              अधिकारी बन्ने मान्छेले कानूनको साँचो पाठ पढ्नुपर्छ। तलका सबै लिङ्क सरकारी आधिकारिक स्रोत हुन्, निःशुल्क।
            </p>
          </Reveal>
          <div className="lk-law-src">
            {sources.map((s) => (
              <a key={s.url} className="lk-law-card" href={s.url} target="_blank" rel="noopener noreferrer">
                <b>{s.name.ne}</b>
                <span>{s.use.ne}</span>
                <em className="mono">{s.url.replace(/^https?:\/\//, '')}</em>
              </a>
            ))}
          </div>
          <Reveal delay={40}>
            <ul className="lk-laws">
              {laws.map((l) => (
                <li key={l.name.en}>
                  <span className="lk-law-year mono">{l.year}</span>
                  <span className="lk-law-name">
                    {l.name.ne} <em>{l.name.en}</em>
                  </span>
                  <span className="lk-law-why">{l.why.ne}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── METHOD ───────────────────────────────────────────────── */}
      <section className="sec lksec" id="lk-method">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">रैंक ल्याउने तयारी — पहिलो क्रममा के, पछि के</h2>
          </Reveal>
          <ol className="lk-method">
            {method.map((m, i) => (
              <Reveal key={m.step} delay={i * 35}>
                <li>
                  <span className="lk-method-step mono">{m.step}</span>
                  <div>
                    <h3>{m.title.ne}</h3>
                    <p>{m.body.ne}</p>
                    <p className="lk-method-en">{m.body.en}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── PROGRESS + TEST ──────────────────────────────────────── */}
      <section className="sec lksec" id="lk-test">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">अभ्यास, र कहाँ बाँकी छ देख्नुहोस्</h2>
            <p className="lead mt-4">
              तलको परीक्षण तुरुन्त चल्छ। नतिजा र चेकलिस्ट तपाईंको ब्राउजरमा मात्र बस्छ — कतै पठाइँदैन, खाता पनि चाहिँदैन।
            </p>
          </Reveal>
          <div className="lk-two">
            <Reveal>
              <PracticeTest questions={loksewaPractice()} paperLabel={meta.focusLevel} />
            </Reveal>
            <Reveal delay={60}>
              <ProgressTracker units={allUnits} />
            </Reveal>
          </div>
          <p className="lk-disclaimer">{meta.disclaimer.ne}</p>
          <p className="lk-disclaimer lk-disclaimer-en">{meta.disclaimer.en}</p>
        </div>
      </section>
    </MediumProvider>
  );
}
