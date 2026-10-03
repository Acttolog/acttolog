import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead, SectionHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { getDB, seoFor, divisions as getDivisions } from '@/lib/content';
import { WorldPortal } from '@/components/world/WorldPortal';

const db = getDB();
const s = db.settings;

export const metadata: Metadata = {
  title: seoFor('/about').title,
  description: seoFor('/about').desc,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const divs = getDivisions();
  const pillars: [string, string, string][] = [
    ['Purpose', s.purpose.en, 'var(--cy)'],
    ['Vision', s.vision.en, 'var(--vi)'],
    ['Mission', s.mission.en, 'var(--mg)'],
  ];

  return (
    <>
      <PageHead kicker="ABOUT US" title="About Acttolog" body={s.purpose.en} art="nebula" />

      {/* The guide — founder photos published at the owner's request */}
      <section className="sec pt-2">
        <div className="wrap">
          <Reveal>
            <div className="panel p-7 sm:p-9 grid md:grid-cols-[auto_1fr] gap-7 items-start">
              <div className="flex md:flex-col gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/media/founder-pro.jpg" alt="The founder and guide of Acttolog World"
                  className="w-36 h-36 md:w-44 md:h-44 rounded-3xl object-cover"
                  style={{ border: '1px solid color-mix(in srgb,var(--cy) 50%,transparent)', boxShadow: '0 0 34px color-mix(in srgb,var(--cy) 22%,transparent)' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/media/founder-casual.jpg" alt="The founder on site"
                  className="w-36 h-36 md:w-44 md:h-28 rounded-3xl object-cover"
                  style={{ border: '1px solid color-mix(in srgb,var(--vi) 45%,transparent)' }} />
              </div>
              <div>
                <div className="eyebrow mb-2">THE GUIDE · संस्थापक</div>
                <h2 className="font-display font-bold text-[clamp(1.4rem,3vw,2rem)] tracking-[-.02em] gtext">The Founder & Guide of Acttolog World</h2>
                <p className="mut text-[13.6px] leading-relaxed mt-4 max-w-[70ch]">
                  Acttolog was built by one person with one idea: technology, research, education,
                  entertainment and discovery should feel like a single connected world — not scattered
                  pages. The founder still guides visitors himself: his ring floats inside every 360°
                  environment, from the University Visit to the Research Lab.
                </p>
                <p className="dim text-[12.6px] leading-relaxed mt-3 max-w-[70ch]">
                  {`"One World. Endless Possibilities." — Explore the Digital World.`}
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Link className="btn btn-p" href="/explore?mode=360&world=university">
                    <Icon name="compass" size={15} />Travel with the guide
                  </Link>
                  <Link className="btn btn-g" href="/contact"><Icon name="mail" size={15} />Contact</Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <WorldPortal world="world" title="ACTTOLOG World Hub" titleNe="एक्टोलग वर्ल्ड हब"
        subtitle="The ACTTOLOG world hub in 360° — every division connected by light: research, academy, games, darkroom and the AI core."
        accent="var(--vi)" earthLink="/explore?mode=earth" />

      <section className="sec pt-2">
        <div className="wrap">
          {/* Story */}
          <SectionHead num="01" kicker="OUR STORY" title={s.story.en.slice(0, 60) + '…'} />
          <Reveal>
            <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-8">
              <div className="prose !text-[15px]">
                <p>{s.story.en}</p>
                <p className="dim !text-[13.4px]">{s.story.ne}</p>
              </div>
              <div className="panel p-6 self-start">
                <div className="eyebrow mb-4">RESPONSIBLE TECHNOLOGY</div>
                <p className="mut text-[13px] leading-relaxed">{s.responsible.en}</p>
                <p className="dim text-[12.2px] leading-relaxed mt-3">{s.responsible.ne}</p>
              </div>
            </div>
          </Reveal>

          {/* Purpose / Vision / Mission */}
          <div className="mt-16">
            <SectionHead num="02" kicker="FOUNDATION" title="Purpose, vision and mission" />
            <div className="grid md:grid-cols-3 gap-5">
              {pillars.map(([k, v, c], i) => (
                <Reveal key={k} delay={i * 70}>
                  <div className="card p-7 h-full">
                    <div className="mono text-[9.8px] tracking-[.24em] mb-3" style={{ color: c }}>{k.toUpperCase()}</div>
                    <p className="mut text-[13.4px] leading-relaxed">{v}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="mt-16">
            <SectionHead num="03" kicker="CORE VALUES" title="What Acttolog stands for" />
            <Reveal>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {s.values.map((v, i) => (
                  <div key={v} className="panel p-5 text-center">
                    <div className="mono text-[9.4px] tracking-[.2em] dim mb-2">{String(i + 1).padStart(2, '0')}</div>
                    <div className="font-display font-semibold text-[13.8px] mb-1">{v}</div>
                    <div className="mut text-[12px]">{s.valuesNe[i] || ''}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Divisions */}
          <div className="mt-16">
            <SectionHead num="04" kicker="THE ECOSYSTEM" title="Divisions of the Acttolog World"
              body="Each division stands alone and connects to the others — research informs the Academy, the Academy feeds creativity, creativity feeds discovery." />
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {divs.map((d, i) => (
                <Reveal key={d.id} delay={i * 50}>
                  <Link href={d.route} className="card p-5 block h-full group">
                    <span className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                      style={{ background: `${d.color}1f`, color: d.color, border: `1px solid ${d.color}44` }}>
                      <Icon name={d.icon} size={18} />
                    </span>
                    <div className="font-display font-semibold text-[14.2px] mb-1 group-hover:text-[var(--cy)] transition-colors">{d.name.en}</div>
                    <div className="mono text-[9px] tracking-[.16em] dim mb-2">{d.sub.en.toUpperCase()}</div>
                    <p className="mut text-[12px] leading-relaxed">{d.desc.en}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Future */}
          <div className="mt-16">
            <SectionHead num="05" kicker="FUTURE DIRECTION" title="Where the world is going" />
            <Reveal>
              <div className="panel p-7 sm:p-9">
                <p className="mut text-[13.8px] leading-relaxed max-w-[86ch]">{s.future.en}</p>
                <p className="dim text-[12.8px] leading-relaxed mt-4 max-w-[86ch]">{s.future.ne}</p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link href="/contact" className="btn btn-p btn-sm"><Icon name="mail" size={14} />Work with Acttolog</Link>
                  <Link href="/darkroom" className="btn btn-g btn-sm">Explore Darkroom</Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
