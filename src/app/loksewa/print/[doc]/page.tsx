import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  loksewaDocTitles,
  loksewaLawDoc,
  loksewaMethod,
  loksewaMeta,
  loksewaPaper,
  loksewaPapers,
  loksewaPlan,
  loksewaPractice,
  loksewaSources,
  loksewaStages,
  loksewaTotals,
} from '@/lib/content/loksewa';
import { PrintBar } from '@/components/loksewa/PrintBar';
import { dlFind } from '@/lib/dl';

export const dynamicParams = false;

const PAPER_SLUGS = () => loksewaPapers().map((p) => p.slug);
const EXTRA = ['full', 'planner', 'laws', 'practice'] as const;

export function generateStaticParams() {
  return [...PAPER_SLUGS(), ...EXTRA].map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  const title = loksewaDocTitles()[doc];
  if (!title) return { robots: 'noindex' };
  return {
    title: `${title.ne} — लोकसेवा घर (प्रिन्ट/PDF)`,
    description: title.desc.ne,
    robots: { index: false, follow: true },
    alternates: { canonical: `/loksewa/print/${doc}` },
  };
}

export default async function LoksewaPrintPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const titles = loksewaDocTitles()[doc];
  if (!titles) notFound();
  const meta = loksewaMeta();
  const paper = loksewaPaper(doc);
  const built = dlFind(`${doc}.pdf`);

  return (
    <div className="lkdoc-page">
      <PrintBar doc={doc} title={titles.ne} pdf={built} />
      <article className="lkdoc" lang="ne">
        <header className="lkdoc-head">
          <div className="lkdoc-kicker">ACTTOLOG · लोकसेवा घर · {meta.focusLevel.ne}</div>
          <h1 className="lkdoc-title">{titles.ne}</h1>
          <p className="lkdoc-sub">{titles.en}</p>
          <p className="lkdoc-desc">{titles.desc.ne}</p>
        </header>

        {paper ? <PaperBody slug={paper.slug} /> : null}
        {doc === 'full' ? <FullBody /> : null}
        {doc === 'planner' ? <PlannerBody /> : null}
        {doc === 'laws' ? <LawsBody /> : null}
        {doc === 'practice' ? <PracticeBody /> : null}

        <footer className="lkdoc-foot">
          <p>{meta.disclaimer.ne}</p>
          <p className="lkdoc-foot-en">{meta.disclaimer.en}</p>
          <p className="lkdoc-src">
            आधिकारिक स्रोत: {loksewaSources().map((s) => s.url.replace(/^https?:\/\//, '')).join(' · ')}
          </p>
        </footer>
      </article>
    </div>
  );
}

/* ── shared blocks ─────────────────────────────────────────────── */

function PaperHead({ slug }: { slug: string }) {
  const p = loksewaPaper(slug)!;
  const stage = loksewaStages().find((s) => s.title.en.toLowerCase().includes(p.title.en.toLowerCase()));
  return (
    <section className="lkdoc-paper" style={{ '--c': p.color } as React.CSSProperties}>
      <h2 className="lkdoc-h2">
        <span className="lkdoc-dot" aria-hidden="true" /> {p.title.ne}
        <em>{p.title.en}</em>
      </h2>
      <p className="lkdoc-p">{p.intro.ne}</p>
      <p className="lkdoc-pen">{p.intro.en}</p>
      <div className="lkdoc-facts">
        <span>
          <b>{p.subjects.length}</b> विषय
        </span>
        <span>
          <b>{p.subjects.reduce((a, s) => a + s.units.length, 0)}</b> फोल्डर
        </span>
        <span>
          <b>{p.subjects.reduce((a, s) => a + s.units.reduce((b, u) => b + u.points.length, 0), 0)}</b> बुँदा
        </span>
        {stage ? (
          <span>
            <b>{stage.marks}</b> अङ्क{stage.negative > 0 ? ` · −${Math.round(stage.negative * 100)}% नकारात्मक` : ''}
          </span>
        ) : null}
      </div>
      <div className="lkdoc-strategy">
        <b>रणनीति:</b> {p.strategy.ne}
      </div>
      <ul className="lkdoc-tree">
        {p.subjects.map((s, i) => (
          <li key={s.slug}>
            <h3 className="lkdoc-h3">
              <span className="mono">{String(i + 1).padStart(2, '0')}</span> {s.title.ne}
              <em>{s.title.en}</em>
            </h3>
            <ul className="lkdoc-points">
              {s.units.map((u) => (
                <li key={u.slug} className="lkdoc-unit">
                  <div className="lkdoc-unit-t">
                    <span className="box" aria-hidden="true" /> {u.title.ne}
                    <em>{u.title.en}</em>
                  </div>
                  <ol>
                    {u.points.map((pt, k) => (
                      <li key={k}>
                        <span className="box" aria-hidden="true" /> {pt}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PaperBody({ slug }: { slug: string }) {
  return (
    <>
      <PaperHead slug={slug} />
      <SheetQuestions paper={slug} />
    </>
  );
}

function FullBody() {
  return (
    <>
      <StageTable />
      {loksewaPapers().map((p) => (
        <PaperHead key={p.slug} slug={p.slug} />
      ))}
      <MethodBlock />
      <SheetQuestions />
    </>
  );
}

function PlannerBody() {
  const plan = loksewaPlan();
  const totals = loksewaTotals();
  return (
    <>
      <section className="lkdoc-paper">
        <h2 className="lkdoc-h2">
          <span className="lkdoc-dot" aria-hidden="true" /> सप्ताहिक योजना — {plan.weeks.length} हप्ता
          <em>{plan.weeks.length}-week plan</em>
        </h2>
        <p className="lkdoc-p">{plan.note.ne}</p>
        <p className="lkdoc-pen">{plan.note.en}</p>
        <div className="lkdoc-facts">
          <span>
            <b>{totals.all}</b> जम्मा अङ्क
          </span>
          <span>
            <b>{plan.weeks.length}</b> हप्ता
          </span>
          <span>
            <b>{plan.weeks.reduce((a, w) => a + w.tasks.length, 0)}</b> काम
          </span>
        </div>
        <ol className="lkdoc-weeks">
          {plan.weeks.map((w) => (
            <li key={w.n} className="lkdoc-week">
              <div className="lkdoc-week-h">
                <span className="mono">हप्ता {String(w.n).padStart(2, '0')}</span>
                <b>{w.focus.ne}</b>
                <em>{w.focus.en}</em>
              </div>
              <ul>
                {w.tasks.map((t, i) => (
                  <li key={i}>
                    <span className="box" aria-hidden="true" /> {t.ne}
                    <em>{t.en}</em>
                  </li>
                ))}
              </ul>
              <div className="lkdoc-week-sign">
                <span>पढेको समय: _________ घण्टा</span>
                <span>आत्म-जाँच अङ्क: ______ / १०</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <ChecklistBlock />
    </>
  );
}

function LawsBody() {
  const laws = loksewaLawDoc();
  return (
    <section className="lkdoc-paper">
      <h2 className="lkdoc-h2">
        <span className="lkdoc-dot" aria-hidden="true" /> कानून पढ्ने सूची
        <em>Reading list — read from the official source</em>
      </h2>
      <p className="lkdoc-p">{laws.note.ne}</p>
      <p className="lkdoc-pen">{laws.note.en}</p>
      <table className="lkdoc-table">
        <thead>
          <tr>
            <th>क्र.</th>
            <th>कानून</th>
            <th>विक्रम सम्बत्</th>
            <th>किन पढ्ने</th>
            <th>पढ्ने ठाउँ</th>
          </tr>
        </thead>
        <tbody>
          {laws.rows.map((r, i) => (
            <tr key={r.name.en}>
              <td className="mono">{String(i + 1).padStart(2, '0')}</td>
              <td>
                <b>{r.name.ne}</b>
                <em>{r.name.en}</em>
              </td>
              <td className="mono">{r.year}</td>
              <td>{r.why.ne}</td>
              <td className="lkdoc-url">{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="lkdoc-official">
        {loksewaSources().map((s) => (
          <div key={s.url}>
            <b>{s.name.ne}</b> — {s.use.ne}
            <em>{s.url}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function PracticeBody() {
  return (
    <>
      <section className="lkdoc-paper">
        <h2 className="lkdoc-h2">
          <span className="lkdoc-dot" aria-hidden="true" /> नमुना प्रश्नपत्र
          <em>Model question set — ACTTOLOG-authored</em>
        </h2>
        <p className="lkdoc-p">
          यी प्रश्न लोकसेवा तहको वस्तुगत ढाँचा (एउटा सही उत्तर, ४ विकल्प, २०% नकारात्मक घटाइ) अनुसार ACTTOLOG
          ले लेखेको अभ्यास सेट हो। आयोगले सार्वजनिक गरेको विषसूचीकै बुँदाबाट प्रश्न सोधिएको छ।
        </p>
        <p className="lkdoc-pen">
          Model practice written by ACTTOLOG against the published objective format — one correct answer, four options,
          20% negative marking. Every item is drawn from a syllabus point listed in this house, not from a leaked or
          official paper.
        </p>
      </section>
      <SheetQuestions numbered />
    </>
  );
}

/* ── blocks ────────────────────────────────────────────────────── */

function StageTable() {
  const stages = loksewaStages();
  const totals = loksewaTotals();
  return (
    <section className="lkdoc-paper">
      <h2 className="lkdoc-h2">
        <span className="lkdoc-dot" aria-hidden="true" /> चरण र अङ्क
        <em>Stages and marks</em>
      </h2>
      <table className="lkdoc-table">
        <thead>
          <tr>
            <th>चरण</th>
            <th>के</th>
            <th>प्रकृति</th>
            <th>अङ्क</th>
            <th>नकारात्मक</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.id}>
              <td className="mono">{String(s.order).padStart(2, '0')}</td>
              <td>
                <b>{s.title.ne}</b>
                <em>{s.title.en}</em>
              </td>
              <td>{s.kind.ne}</td>
              <td className="mono">{s.marks}</td>
              <td className="mono">{s.negative > 0 ? `−${Math.round(s.negative * 100)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lkdoc-total">
        वस्तुगत {totals.objective} · लिखित {totals.written} · छनौट चरण {totals.selection} · <b>जम्मा {totals.all}</b>
      </p>
    </section>
  );
}

function MethodBlock() {
  const method = loksewaMethod();
  return (
    <section className="lkdoc-paper">
      <h2 className="lkdoc-h2">
        <span className="lkdoc-dot" aria-hidden="true" /> रैंक ल्याउने तरिका
        <em>The rank-first method</em>
      </h2>
      <ol className="lkdoc-method">
        {method.map((m) => (
          <li key={m.step}>
            <span className="mono">{m.step}</span>
            <div>
              <b>{m.title.ne}</b> <em>{m.title.en}</em>
              <p>{m.body.ne}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ChecklistBlock() {
  return (
    <section className="lkdoc-paper">
      <h2 className="lkdoc-h2">
        <span className="lkdoc-dot" aria-hidden="true" /> फोल्डर चेकलिस्ट — कहाँ बाँकी छ
        <em>Folder checklist — what remains</em>
      </h2>
      <table className="lkdoc-table lkdoc-check">
        <thead>
          <tr>
            <th>पेपर</th>
            <th>विषय</th>
            <th>फोल्डर</th>
            <th>पहिलो पटक</th>
            <th>दोहोरो</th>
            <th>छिटो दोहोरो</th>
            <th>नमुना प्रश्न</th>
          </tr>
        </thead>
        <tbody>
          {loksewaPapers().flatMap((p) =>
            p.subjects.flatMap((s) =>
              s.units.map((u) => (
                <tr key={`${p.slug}/${s.slug}/${u.slug}`}>
                  <td>{p.title.ne}</td>
                  <td>{s.title.ne}</td>
                  <td>
                    <b>{u.title.ne}</b>
                    <em>{u.title.en}</em>
                  </td>
                  <td>
                    <span className="box" aria-hidden="true" />
                  </td>
                  <td>
                    <span className="box" aria-hidden="true" />
                  </td>
                  <td>
                    <span className="box" aria-hidden="true" />
                  </td>
                  <td>
                    <span className="box" aria-hidden="true" />
                  </td>
                </tr>
              )),
            ),
          )}
        </tbody>
      </table>
    </section>
  );
}

function SheetQuestions({ paper, numbered }: { paper?: string; numbered?: boolean }) {
  const qs = loksewaPractice(paper);
  if (qs.length === 0) return null;
  let n = 0;
  return (
    <section className="lkdoc-paper">
      <h2 className="lkdoc-h2">
        <span className="lkdoc-dot" aria-hidden="true" />
        {numbered ? 'प्रश्नहरू' : 'अभ्यास प्रश्न'}
        <em>{qs.length} items · २०% नकारात्मक घटाइ</em>
      </h2>
      <ol className="lkdoc-qs">
        {qs.map((q, i) => {
          n += 1;
          return (
            <li key={i} className="lkdoc-q">
              <div className="lkdoc-qt">
                <span className="mono">{n}.</span>
                {q.q.ne}
                <em>{q.q.en}</em>
              </div>
              <ul className="lkdoc-opts">
                {q.options.map((o, k) => (
                  <li key={k}>
                    <span className="ring" aria-hidden="true" /> ({String.fromCharCode(97 + k)}) {o.ne}
                    <em>{o.en}</em>
                  </li>
                ))}
              </ul>
              <div className="lkdoc-blank">
                उत्तर: ______ &nbsp;·&nbsp; नम्बरिएको मिति: ______ &nbsp;·&nbsp; समय: ______
              </div>
            </li>
          );
        })}
      </ol>
      <div className="lkdoc-key">
        <h3>उत्तर कुञ्जी — पल्टाएर जाँच्नुहोस्</h3>
        <div className="lkdoc-key-grid">
          {qs.map((q, i) => (
            <span key={i} className="mono">
              {i + 1} — {String.fromCharCode(97 + q.answer)}
            </span>
          ))}
        </div>
        <ol className="lkdoc-exp">
          {qs.map((q, i) => (
            <li key={i}>
              <b>{i + 1}.</b> {q.explain.ne}
              <em>{q.explain.en}</em>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
