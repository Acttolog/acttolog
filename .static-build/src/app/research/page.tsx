import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { ResearchBody } from './ResearchBody';
import { getDB, pub, seoFor } from '@/lib/content';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/research').title,
  description: seoFor('/research').desc,
  alternates: { canonical: '/research' },
};

export default function ResearchPage() {
  const r = db.research;
  const services = pub(db.services).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const programs = pub(db.programs);
  const packages = pub(db.packages);

  return (
    <>
      <PageHead kicker={r.kicker.en} title={r.headline.en} body={r.intro.en} art="research"
        extra={
          <Reveal delay={150}>
            <div className="flex flex-wrap gap-3 mt-8">
              <a className="btn btn-p" href="#packages">
                {r.line1.en} <Icon name="arrow" size={15} />
              </a>
              <Link className="btn btn-g" href="/contact">Contact Thesyn Research</Link>
            </div>
          </Reveal>
        } />

      {/* Position lines */}
      <section className="sec pt-2">
        <div className="wrap">
          <Reveal>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="panel p-7">
                <div className="eyebrow mb-3">POSITION 01</div>
                <p className="font-display font-bold text-[clamp(1.2rem,2.4vw,1.7rem)] tracking-[-.02em] gtext">{r.line1.en}</p>
                <p className="mut text-[13.4px] leading-relaxed mt-3">{r.line1.ne}</p>
              </div>
              <div className="panel p-7">
                <div className="eyebrow mb-3">POSITION 02</div>
                <p className="font-display font-bold text-[clamp(1.2rem,2.4vw,1.7rem)] tracking-[-.02em] gtext">{r.line2.en}</p>
                <p className="mut text-[13.4px] leading-relaxed mt-3">{r.line2.ne}</p>
              </div>
            </div>
          </Reveal>

          {/* Journey */}
          <Reveal>
            <div className="mt-14">
              <div className="secnum mb-5">THE RESEARCH JOURNEY</div>
              <div className="panel p-6 sm:p-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-max">
                  {r.journey.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-center px-4 py-3 rounded-xl border"
                        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                        <div className="mono text-[9.4px] tracking-[.2em] dim mb-1.5">STEP {String(i + 1).padStart(2, '0')}</div>
                        <div className="font-display font-semibold text-[13.6px] whitespace-nowrap">{step.en}</div>
                        <div className="text-[11.4px] mut mt-0.5 whitespace-nowrap">{step.ne}</div>
                      </div>
                      {i < r.journey.length - 1 && (
                        <span style={{ color: 'var(--cy)', flex: 'none' }}><Icon name="arrow" size={16} /></span>
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s, i) => (
                <Reveal key={s.id} delay={i * 40}>
                  <div className="card p-6 h-full">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <span className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: 'color-mix(in srgb,var(--cy) 12%,transparent)', color: 'var(--cy)', border: '1px solid color-mix(in srgb,var(--cy) 28%,transparent)' }}>
                        <Icon name={s.icon} size={18} />
                      </span>
                      <AccessBadge access={s.access} />
                    </div>
                    <h3 className="h3 !text-[15.6px] mb-2">{s.title.en}</h3>
                    <p className="mut text-[12.9px] leading-relaxed mb-2">{s.summary.en}</p>
                    {s.summary.ne && <p className="dim text-[12px] leading-relaxed">{s.summary.ne}</p>}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Programs + tools */}
          <div className="grid lg:grid-cols-[1fr_1fr] gap-5 mt-14">
            <Reveal>
              <div className="panel p-7 h-full">
                <div className="eyebrow mb-4">PROGRAMMES SUPPORTED</div>
                <div className="space-y-3">
                  {programs.map((p) => (
                    <div key={p.id} className="flex items-start gap-3.5 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
                      <span className="mono text-[11px] font-bold px-2.5 py-1 rounded-lg flex-none"
                        style={{ background: 'color-mix(in srgb,var(--vi) 14%,transparent)', color: 'var(--vi)' }}>{p.code}</span>
                      <div>
                        <div className="font-display font-semibold text-[13.8px]">{p.name.en}</div>
                        <div className="mut text-[12.2px] mt-0.5">{p.note.en}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="dim text-[11.8px] leading-relaxed mt-4">{r.noAff.en}</p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="panel p-7 h-full">
                <div className="eyebrow mb-4">ANALYSIS TOOLS</div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {['SPSS', 'STATA', 'EViews', 'Excel'].map((tool) => (
                    <div key={tool} className="rounded-xl border p-4 text-center"
                      style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                      <div className="font-display font-bold text-[16px]" style={{ color: 'var(--cy)' }}>{tool}</div>
                    </div>
                  ))}
                </div>
                <p className="mut text-[13px] leading-relaxed">{r.tools.en}</p>
                <p className="dim text-[12.2px] leading-relaxed mt-3">{r.tools.ne}</p>
              </div>
            </Reveal>
          </div>

          {/* Integrity */}
          <Reveal>
            <div className="panel p-7 sm:p-9 mt-14" style={{ borderColor: 'color-mix(in srgb,var(--gold) 30%,transparent)' }}>
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl grid place-items-center flex-none"
                  style={{ background: 'color-mix(in srgb,var(--gold) 13%,transparent)', color: 'var(--gold)', border: '1px solid color-mix(in srgb,var(--gold) 32%,transparent)' }}>
                  <Icon name="shield" size={20} />
                </span>
                <div>
                  <div className="eyebrow mb-3" style={{ color: 'var(--gold)' }}>ACADEMIC INTEGRITY</div>
                  <p className="mut text-[13.6px] leading-relaxed">{r.integrity.en}</p>
                  <p className="dim text-[12.6px] leading-relaxed mt-3">{r.integrity.ne}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Packages + FAQ (client islands: currency, accordion) */}
      <ResearchBody packages={packages} faq={r.faq} />
    </>
  );
}
