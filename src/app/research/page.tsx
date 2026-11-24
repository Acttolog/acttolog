import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { ResearchBody } from './ResearchBody';
import { ResearchConnect } from '@/components/research/ResearchConnect';
import { ResearchLibrary } from '@/components/content/Extensions';
import { getDB, pub, seoFor } from '@/lib/content';
import { WorldPortal } from '@/components/world/WorldPortal';
import { NoticeSection } from '@/components/notices/NoticeSection';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/research').title,
  description: seoFor('/research').desc,
  alternates: { canonical: '/research' },
};

export default function ResearchPage() {
  const r = db.research;
  const services = pub(db.services)
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const programs = pub(db.programs);
  const packages = pub(db.packages);

  return (
    <>
      <PageHead
        kicker={r.kicker.en}
        title={r.headline.en}
        body={r.intro.en}
        art="research"
        extra={
          <Reveal delay={150}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="btn btn-p" href="#packages">
                {r.line1.en} <Icon name="arrow" size={15} />
              </a>
              <Link className="btn btn-g" href="/contact">
                Contact Thesyn Research
              </Link>
              <a
                className="btn btn-fb"
                href={db.settings.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="facebook" size={15} /> Follow on Facebook
              </a>
            </div>
          </Reveal>
        }
      />

      <WorldPortal
        world="lab"
        title="Thesyn Research World"
        titleNe="थेसिन रिसर्च वर्ल्ड"
        subtitle="Step through the portal into the Research Lab — a 360° ACTTOLOG environment of methodology pathways and knowledge nodes, with hotspots into the Digital Library and back to the world hub."
        accent="var(--cy)"
        earthLink="/explore?mode=earth&lat=27.71700&lng=85.32400"
      />

      {/* Position lines */}
      <section className="sec pt-2">
        <div className="wrap">
          <Reveal>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="panel p-7">
                <div className="eyebrow mb-3">POSITION 01</div>
                <p className="font-display gtext text-[clamp(1.2rem,2.4vw,1.7rem)] font-bold tracking-[-.02em]">
                  {r.line1.en}
                </p>
                <p className="mut mt-3 text-[13.4px] leading-relaxed">{r.line1.ne}</p>
              </div>
              <div className="panel p-7">
                <div className="eyebrow mb-3">POSITION 02</div>
                <p className="font-display gtext text-[clamp(1.2rem,2.4vw,1.7rem)] font-bold tracking-[-.02em]">
                  {r.line2.en}
                </p>
                <p className="mut mt-3 text-[13.4px] leading-relaxed">{r.line2.ne}</p>
              </div>
            </div>
          </Reveal>

          {/* Journey */}
          <Reveal>
            <div className="mt-14">
              <div className="secnum mb-5">THE RESEARCH JOURNEY</div>
              <div className="panel overflow-x-auto p-6 sm:p-8">
                <div className="flex min-w-max items-center gap-3">
                  {r.journey.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="rounded-xl border px-4 py-3 text-center"
                        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                      >
                        <div className="mono dim mb-1.5 text-[10.5px] tracking-[.2em]">
                          STEP {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="font-display text-[13.6px] font-semibold whitespace-nowrap">
                          {step.en}
                        </div>
                        <div className="mut mt-0.5 text-[11.4px] whitespace-nowrap">{step.ne}</div>
                      </div>
                      {i < r.journey.length - 1 && (
                        <span style={{ color: 'var(--cy)', flex: 'none' }}>
                          <Icon name="arrow" size={16} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Services */}
          <div className="mt-14">
            <Reveal>
              <div className="sechead">
                <div>
                  <div className="secnum mb-3">SERVICES</div>
                  <h2 className="h2 max-w-[26ch]">What Thesyn Research supports</h2>
                </div>
                <span className="chip">{services.length} services</span>
              </div>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <Reveal key={s.id} delay={i * 40}>
                  <div className="card h-full p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl"
                        style={{
                          background: 'color-mix(in srgb,var(--cy) 12%,transparent)',
                          color: 'var(--cy)',
                          border: '1px solid color-mix(in srgb,var(--cy) 28%,transparent)',
                        }}
                      >
                        <Icon name={s.icon} size={18} />
                      </span>
                      <AccessBadge access={s.access} />
                    </div>
                    <h3 className="h3 mb-2 !text-[15.6px]">{s.title.en}</h3>
                    <p className="mut mb-2 text-[12.9px] leading-relaxed">{s.summary.en}</p>
                    {s.summary.ne && <p className="dim text-[12px] leading-relaxed">{s.summary.ne}</p>}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Programs + tools */}
          <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <Reveal>
              <div className="panel h-full p-7">
                <div className="eyebrow mb-4">PROGRAMMES SUPPORTED</div>
                <div className="space-y-3">
                  {programs.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-start gap-3.5 pb-3"
                      style={{ borderBottom: '1px solid var(--line)' }}
                    >
                      <span
                        className="mono flex-none rounded-lg px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          background: 'color-mix(in srgb,var(--vi) 14%,transparent)',
                          color: 'var(--vi)',
                        }}
                      >
                        {p.code}
                      </span>
                      <div>
                        <div className="font-display text-[13.8px] font-semibold">{p.name.en}</div>
                        <div className="mut mt-0.5 text-[12.2px]">{p.note.en}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="dim mt-4 text-[11.8px] leading-relaxed">{r.noAff.en}</p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="panel h-full p-7">
                <div className="eyebrow mb-4">ANALYSIS TOOLS</div>
                <div className="mb-5 grid grid-cols-2 gap-3">
                  {['SPSS', 'STATA', 'EViews', 'Excel'].map((tool) => (
                    <div
                      key={tool}
                      className="rounded-xl border p-4 text-center"
                      style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                    >
                      <div className="font-display text-[16px] font-bold" style={{ color: 'var(--cy)' }}>
                        {tool}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mut text-[13px] leading-relaxed">{r.tools.en}</p>
                <p className="dim mt-3 text-[12.2px] leading-relaxed">{r.tools.ne}</p>
              </div>
            </Reveal>
          </div>

          {/* Integrity */}
          <Reveal>
            <div
              className="panel mt-14 p-7 sm:p-9"
              style={{ borderColor: 'color-mix(in srgb,var(--gold) 30%,transparent)' }}
            >
              <div className="flex items-start gap-4">
                <span
                  className="grid h-11 w-11 flex-none place-items-center rounded-xl"
                  style={{
                    background: 'color-mix(in srgb,var(--gold) 13%,transparent)',
                    color: 'var(--gold)',
                    border: '1px solid color-mix(in srgb,var(--gold) 32%,transparent)',
                  }}
                >
                  <Icon name="shield" size={20} />
                </span>
                <div>
                  <div className="eyebrow mb-3" style={{ color: 'var(--gold)' }}>
                    ACADEMIC INTEGRITY
                  </div>
                  <p className="mut text-[13.6px] leading-relaxed">{r.integrity.en}</p>
                  <p className="dim mt-3 text-[12.6px] leading-relaxed">{r.integrity.ne}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Notice board — research grants, calls and service windows */}
      <NoticeSection scope="research" variant="section" accent="var(--cy)" id="rs-notices" />

      {/* Public Facebook page + direct contact channels */}
      <ResearchConnect />

      {/* Research Library — Nepal + international evidence, guides, video labs */}
      <ResearchLibrary />

      {/* Packages + FAQ (client islands: currency, accordion) */}
      <ResearchBody packages={packages} faq={r.faq} />
    </>
  );
}
