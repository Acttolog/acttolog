import type { Metadata } from 'next';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { ContactForm } from './ContactForm';
import { getDB, seoFor } from '@/lib/content';
import { WorldPortal } from '@/components/world/WorldPortal';

const db = getDB();
const s = db.settings;

export const metadata: Metadata = {
  title: seoFor('/contact').title,
  description: seoFor('/contact').desc,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const divs = db.divisions.filter((d) => d.visible !== false);

  return (
    <>
      <PageHead
        kicker="CONTACT US"
        title="Contact Acttolog"
        body="Public contact — no login required. Messages route to the private admin inbox."
        art="nebula"
      />
      <WorldPortal
        world="contact"
        title="Global Contact World"
        titleNe="ग्लोबल कन्टाक्ट वर्ल्ड"
        subtitle="A global contact world — reach ACTTOLOG from anywhere; hotspots connect to the Offers showcase and the world hub."
        accent="var(--cy)"
        earthLink="/explore?mode=earth&lat=27.71700&lng=85.32400"
      />

      <section className="sec pt-2">
        <div className="wrap">
          <div className="panel flex flex-wrap items-center gap-4 p-5">
            {}
            <img
              src="/media/founder-avatar.jpg"
              alt="Your guide — the founder of Acttolog World"
              className="h-12 w-12 flex-none rounded-full object-cover"
              style={{
                border: '1px solid color-mix(in srgb,var(--cy) 60%,transparent)',
                boxShadow: '0 0 16px color-mix(in srgb,var(--cy) 30%,transparent)',
              }}
            />
            <div className="min-w-[220px] flex-1">
              <div className="mono dim mb-1 text-[10.5px] tracking-[.2em]">
                YOUR GUIDE REPLIES · PERSONALLY
              </div>
              <div className="text-[13.6px] font-medium">Your guide — the founder of Acttolog World</div>
            </div>
            <div className="mono flex flex-wrap gap-2 text-[10.6px]">
              <span className="chip">9802336200</span>
              <span className="chip">thesynresearch@gmail.com</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec pt-2">
        <div className="wrap">
          <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <Reveal className="min-w-0">
              <div className="panel p-6 sm:p-9">
                <div className="eyebrow mb-6">SEND A MESSAGE</div>
                <ContactForm divisions={divs.map((d) => ({ id: d.id, name: d.name.en }))} />
              </div>
            </Reveal>

            <div className="min-w-0 space-y-5">
              <Reveal delay={80}>
                <div className="panel p-6 sm:p-7">
                  <div className="eyebrow mb-5">DIRECT CHANNELS</div>
                  <a
                    href={`tel:${s.phone}`}
                    className="mb-3 flex items-center gap-4 rounded-xl p-4 transition-all hover:-translate-y-0.5"
                    style={{ border: '1px solid var(--line)', background: 'var(--panel2)' }}
                  >
                    <span
                      className="grid h-11 w-11 flex-none place-items-center rounded-xl"
                      style={{
                        background: 'color-mix(in srgb,var(--cy) 13%,transparent)',
                        color: 'var(--cy)',
                        border: '1px solid color-mix(in srgb,var(--cy) 30%,transparent)',
                      }}
                    >
                      <Icon name="chat" size={19} />
                    </span>
                    <div>
                      <div className="mono dim mb-0.5 text-[10.5px] tracking-[.2em]">PHONE</div>
                      <div className="font-display text-[15px] font-semibold">{s.phone}</div>
                    </div>
                  </a>
                  <a
                    href={`mailto:${s.email}`}
                    className="flex items-center gap-4 rounded-xl p-4 transition-all hover:-translate-y-0.5"
                    style={{ border: '1px solid var(--line)', background: 'var(--panel2)' }}
                  >
                    <span
                      className="grid h-11 w-11 flex-none place-items-center rounded-xl"
                      style={{
                        background: 'color-mix(in srgb,var(--vi) 13%,transparent)',
                        color: 'var(--vi)',
                        border: '1px solid color-mix(in srgb,var(--vi) 30%,transparent)',
                      }}
                    >
                      <Icon name="mail" size={19} />
                    </span>
                    <div className="min-w-0">
                      <div className="mono dim mb-0.5 text-[10.5px] tracking-[.2em]">EMAIL</div>
                      <div className="font-display truncate text-[14px] font-semibold">{s.email}</div>
                    </div>
                  </a>
                  {s.address && (
                    <div className="mut mt-4 flex items-center gap-3 text-[14.3px]">
                      <Icon name="compass" size={17} />
                      {s.address}
                    </div>
                  )}
                </div>
              </Reveal>

              <Reveal delay={140}>
                <div className="panel p-6 sm:p-7">
                  <div className="eyebrow mb-4">WHICH DIVISION?</div>
                  <div className="space-y-2">
                    {divs.map((d) => (
                      <div key={d.id} className="mut flex items-center gap-3 text-[13.2px]">
                        <span
                          className="grid h-7 w-7 flex-none place-items-center rounded-lg"
                          style={{ background: `${d.color}1f`, color: d.color }}
                        >
                          <Icon name={d.icon} size={13} />
                        </span>
                        <span>
                          <b style={{ color: 'var(--txt)' }}>{d.name.en}</b> — {d.sub.en}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="dim mt-5 text-[11.6px] leading-relaxed">{s.respNote.en}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
