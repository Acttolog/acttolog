import type { Metadata } from 'next';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { ContactForm } from './ContactForm';
import { getDB, seoFor } from '@/lib/content';

const db = getDB();
const s = db.settings;

export const metadata: Metadata = {
  title: seoFor('/contact').title,
  description: seoFor('/contact').desc,
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({ searchParams }: {
  searchParams: Promise<{ offer?: string; oauth?: string }>;
}) {
  const sp = await searchParams;
  const divs = db.divisions.filter((d) => d.visible !== false);

  return (
    <>
      <PageHead kicker="CONTACT US" title="Contact Acttolog"
        body="Public contact — no login required. Messages route to the private admin inbox."
        art="editorial" />
      <section className="sec pt-2">
        <div className="wrap">
          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-6 items-start">
            <Reveal>
              <div className="panel p-6 sm:p-9">
                <div className="eyebrow mb-6">SEND A MESSAGE</div>
                <ContactForm divisions={divs.map((d) => ({ id: d.id, name: d.name.en }))} preselectedOffer={sp.offer} />
              </div>
            </Reveal>

            <div className="space-y-5">
              <Reveal delay={80}>
                <div className="panel p-6 sm:p-7">
                  <div className="eyebrow mb-5">DIRECT CHANNELS</div>
                  <a href={`tel:${s.phone}`} className="flex items-center gap-4 p-4 rounded-xl mb-3 transition-all hover:-translate-y-0.5"
                    style={{ border: '1px solid var(--line)', background: 'var(--panel2)' }}>
                    <span className="w-11 h-11 rounded-xl grid place-items-center flex-none"
                      style={{ background: 'color-mix(in srgb,var(--cy) 13%,transparent)', color: 'var(--cy)', border: '1px solid color-mix(in srgb,var(--cy) 30%,transparent)' }}>
                      <Icon name="chat" size={19} />
                    </span>
                    <div>
                      <div className="mono text-[9.6px] tracking-[.2em] dim mb-0.5">PHONE</div>
                      <div className="font-display font-semibold text-[15px]">{s.phone}</div>
                    </div>
                  </a>
                  <a href={`mailto:${s.email}`} className="flex items-center gap-4 p-4 rounded-xl transition-all hover:-translate-y-0.5"
                    style={{ border: '1px solid var(--line)', background: 'var(--panel2)' }}>
                    <span className="w-11 h-11 rounded-xl grid place-items-center flex-none"
                      style={{ background: 'color-mix(in srgb,var(--vi) 13%,transparent)', color: 'var(--vi)', border: '1px solid color-mix(in srgb,var(--vi) 30%,transparent)' }}>
                      <Icon name="mail" size={19} />
                    </span>
                    <div className="min-w-0">
                      <div className="mono text-[9.6px] tracking-[.2em] dim mb-0.5">EMAIL</div>
                      <div className="font-display font-semibold text-[14px] truncate">{s.email}</div>
                    </div>
                  </a>
                  {s.address && (
                    <div className="flex items-center gap-3 text-[14.3px] mt-4 mut">
                      <Icon name="compass" size={17} />{s.address}
                    </div>
                  )}
                </div>
              </Reveal>

              <Reveal delay={140}>
                <div className="panel p-6 sm:p-7">
                  <div className="eyebrow mb-4">WHICH DIVISION?</div>
                  <div className="space-y-2">
                    {divs.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 text-[13.2px] mut">
                        <span className="w-7 h-7 rounded-lg grid place-items-center flex-none"
                          style={{ background: `${d.color}1f`, color: d.color }}>
                          <Icon name={d.icon} size={13} />
                        </span>
                        <span><b style={{ color: 'var(--txt)' }}>{d.name.en}</b> — {d.sub.en}</span>
                      </div>
                    ))}
                  </div>
                  <p className="dim text-[11.6px] leading-relaxed mt-5">{s.respNote.en}</p>
                </div>
              </Reveal>

              {sp.oauth === 'not_configured' && (
                <div className="panel p-5" style={{ borderColor: 'color-mix(in srgb,var(--warn) 34%,transparent)' }}>
                  <div className="flex gap-3 items-start">
                    <span style={{ color: 'var(--warn)' }}><Icon name="shield" size={17} /></span>
                    <p className="mut text-[12.8px] leading-relaxed">
                      Google sign-in is not configured on this environment yet. Browsing stays fully open —
                      member areas activate once OAuth credentials are connected.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
