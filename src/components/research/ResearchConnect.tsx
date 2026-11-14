'use client';

import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { getDB } from '@/lib/content';

const db = getDB();
const FB = db.settings.social.facebook;
const PHONE = db.settings.phone;
const EMAIL = db.settings.email;
const WA = `https://wa.me/977${PHONE.replace(/\D/g, '')}`;

/** Public Facebook page + direct contact channels for the research division. */
export function ResearchConnect() {
  const { locale } = useI18n();
  const ne = locale === 'ne';

  return (
    <section className="sec pt-2" id="connect">
      <div className="wrap">
        <Reveal>
          <div className="sechead">
            <div>
              <div className="secnum mb-3">{ne ? 'समुदाय र सम्पर्क' : 'COMMUNITY & CONTACT'}</div>
              <h2 className="h2 max-w-[30ch]">
                {ne ? 'थेसिन रिसर्चसँग जोडिनुहोस्' : 'Stay connected to Thesyn Research'}
              </h2>
              <p className="lead mt-4">
                {ne
                  ? 'विभागको सार्वजनिक फेसबुक पेज फलो गर्नुहोस्, वा हामीलाई सिधै WhatsApp वा इमेलमा सम्पर्क गर्नुहोस्।'
                  : 'Follow the division’s public Facebook page, or reach us directly on WhatsApp or email.'}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <div className="rsc-fb h-full">
              <div className="flex items-start gap-4">
                <span className="rsc-logo" aria-hidden="true">
                  <Icon name="facebook" size={26} />
                </span>
                <div>
                  <div className="font-display text-[19px] font-bold tracking-[-.02em]">Thesyn Research</div>
                  <div className="mut mt-1 text-[12.6px]">
                    {ne ? 'काठमाडौँ · आधिकारिक फेसबुक पेज' : 'Kathmandu · Official Facebook page'}
                  </div>
                </div>
              </div>
              <p className="font-display mt-5 text-[15.5px] font-semibold" style={{ color: 'var(--cy)' }}>
                {ne
                  ? 'थिसिस र शैक्षिक अनुसन्धानको तपाईंको विश्वसनीय साथी।'
                  : 'Your Trusted Partner for Thesis & Academic Research.'}
              </p>
              <p className="mut mt-3 text-[13.2px] leading-relaxed">
                {ne
                  ? 'पेजमा विभागका सूचना र गतिविधि साझा गरिन्छ। फलो गरेर नजिकै रहनुहोस्, वा तलका माध्यमबाट सिधै कुरा गर्नुहोस्।'
                  : 'The page carries the division’s announcements and work. Follow to stay close, or talk to us directly through the channels here.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  className="btn btn-fb"
                  href={FB}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('social_follow', { network: 'facebook', where: 'research_connect' })}
                >
                  <Icon name="facebook" size={16} />
                  {ne ? 'फेसबुकमा फलो गर्नुहोस्' : 'Follow on Facebook'}
                </a>
                <a
                  className="btn btn-g"
                  href={WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('contact_click', { channel: 'whatsapp', where: 'research_connect' })}
                >
                  <Icon name="whatsapp" size={16} />
                  WhatsApp
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="panel h-full p-7">
              <div className="eyebrow mb-4">{ne ? 'प्रत्यक्ष सम्पर्क' : 'DIRECT CONTACT'}</div>
              <div className="space-y-3">
                <a
                  className="rsc-row"
                  href={WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('contact_click', { channel: 'whatsapp', where: 'research_connect' })}
                >
                  <span className="rsc-ico" style={{ color: 'var(--ok)' }}>
                    <Icon name="whatsapp" size={17} />
                  </span>
                  <span>
                    <span className="rsc-label">{ne ? 'WhatsApp / फोन' : 'WhatsApp / phone'}</span>
                    <span className="rsc-value">{PHONE}</span>
                  </span>
                </a>
                <a
                  className="rsc-row"
                  href={`mailto:${EMAIL}`}
                  onClick={() => track('contact_click', { channel: 'email', where: 'research_connect' })}
                >
                  <span className="rsc-ico" style={{ color: 'var(--cy)' }}>
                    <Icon name="mail" size={17} />
                  </span>
                  <span>
                    <span className="rsc-label">{ne ? 'इमेल' : 'Email'}</span>
                    <span className="rsc-value">{EMAIL}</span>
                  </span>
                </a>
                <Link className="rsc-row" href="/contact">
                  <span className="rsc-ico" style={{ color: 'var(--vi)' }}>
                    <Icon name="chat" size={17} />
                  </span>
                  <span>
                    <span className="rsc-label">{ne ? 'सम्पर्क फारम' : 'Contact form'}</span>
                    <span className="rsc-value">{ne ? 'लिखित सन्देश पठाउनुहोस्' : 'Send a written message'}</span>
                  </span>
                </Link>
              </div>
              <p className="dim mt-5 text-[11.8px] leading-relaxed">
                {ne
                  ? 'काठमाडौँ, नेपाल। कार्यक्षेत्र र मूल्य काम सुरु हुनुअघि लिखित रूपमा पठाइन्छ।'
                  : 'Kathmandu, Nepal. Scope and pricing are confirmed in writing before any work begins.'}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}