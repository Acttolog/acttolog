'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useConsent } from '@/lib/consent';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/analytics';
import { getDB, divisions } from '@/lib/content';

const db = getDB();
const s = db.settings;

export function Footer() {
  const { t, L, locale } = useI18n();
  const { user, signIn } = useSession();
  const { consent, reset: resetConsent } = useConsent();
  const toast = useToast();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState(false);
  const isStaff = user?.role === 'Owner' || user?.role === 'Admin';
  const socials = Object.entries(s.social || {}).filter(([, v]) => v);
  const divs = divisions();

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) { setEmailErr(true); toast(locale === 'ne' ? 'मान्य इमेल ठेगाना राख्नुहोस्।' : 'Enter a valid email address.', 'err'); return; }
    setEmailErr(false);
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { track('newsletter_subscribe'); toast(data.note || (locale === 'ne' ? 'सदस्यता दर्ता भयो।' : 'Subscribed.'), 'ok'); setEmail(''); }
      else toast(data.error || 'Subscription failed.', 'err');
    } catch {
      toast(locale === 'ne' ? 'यस पूर्वदर्शनमा सदस्यता उपलब्ध छैन — पूरा उत्पादनमा चाँडै।' : 'Signups activate on the full production deployment.', 'info', 5000);
    }
  };

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="grid gap-11 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.25fr]">
          <div>
            <Logo variant="horizontal" width={190} />
            <p className="mut text-[13.6px] leading-relaxed mt-5 max-w-[38ch]">{L(s.purpose)}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {socials.length
                ? socials.map(([k, v]) => (
                  <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="chip capitalize">{k}</a>
                ))
                : <span className="chip">{locale === 'ne' ? 'सोसल लिङ्क एडमिनबाट थपिनेछ' : 'Social links added by admin'}</span>}
            </div>
            <div className="mt-6 space-y-1.5 text-[13.4px] mut">
              <a href={`tel:${s.phone}`} className="flex items-center gap-2.5 hover:text-[var(--cy)]">
                <Icon name="chat" size={15} />{s.phone}
              </a>
              <a href={`mailto:${s.email}`} className="flex items-center gap-2.5 hover:text-[var(--cy)]">
                <Icon name="mail" size={15} />{s.email}
              </a>
            </div>
          </div>

          <div className="fcol">
            <h4>{t('nav.div')}</h4>
            {divs.map((d) => <Link key={d.id} href={d.route}>{L(d.name)}</Link>)}
          </div>

          <div className="fcol">
            <h4>{locale === 'ne' ? 'सामग्री' : 'Content'}</h4>
            <Link href="/blog">{t('nav.blog')}</Link>
            <Link href="/offers">{t('nav.offers')}</Link>
            <Link href="/ai">{t('ai.t')}</Link>
            <Link href="/search">{t('search')}</Link>
          </div>

          <div className="fcol">
            <h4>{locale === 'ne' ? 'खाता' : 'Account'}</h4>
            {user
              ? <Link href="/my">{t('my')}</Link>
              : <button onClick={() => signIn()} className="text-left hover:text-[var(--cy)] transition-colors">{t('signin')}</button>}
            {isStaff && <Link href="/admin">{t('admin')}</Link>}
            <button onClick={() => setPrivacyOpen(true)} className="text-left hover:text-[var(--cy)] transition-colors">
              {locale === 'ne' ? 'गोपनीयता' : 'Privacy'}
            </button>
            {consent && (
              <button onClick={resetConsent} className="text-left hover:text-[var(--cy)] transition-colors">
                {locale === 'ne' ? 'सहमति सेटिङ' : 'Consent settings'}
              </button>
            )}
          </div>

          <div className="fcol">
            <h4>{locale === 'ne' ? 'सूचना सूची' : 'Dispatch'}</h4>
            <p className="mut text-[13.1px] leading-relaxed mb-4">{L(s.nlNote)}</p>
            <form onSubmit={subscribe} noValidate className="flex gap-2 flex-wrap">
              <input className={`inp flex-1 min-w-[150px]${emailErr ? ' err' : ''}`} type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" />
              <button className="btn btn-p btn-sm" type="submit">{locale === 'ne' ? 'सदस्यता' : 'Subscribe'}</button>
            </form>
            <p className="dim text-[11.4px] mt-3 leading-relaxed">
              {locale === 'ne'
                ? 'इमेल सेवा नजोडिएसम्म सूचना सर्भरमा मात्र दर्ता हुन्छ।'
                : 'Until an email provider is connected, signups are recorded server-side only.'}
            </p>
          </div>
        </div>

        <hr className="hr my-8" />
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <p className="dim text-[12.2px] mono">© {new Date().getFullYear()} {s.org} — https://www.acttolog.com</p>
          <p className="dim text-[12.2px] mono flex items-center gap-2">
            <span className="dot" /> {L(s.footerNote)}
          </p>
        </div>
      </div>

      {privacyOpen && <PrivacyModal onClose={() => setPrivacyOpen(false)} />}
    </footer>
  );
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const { consent, reset: resetConsent } = useConsent();
  return (
    <div className="mbd" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mcard" role="dialog" aria-modal="true" aria-label={t('privacy')}>
        <div className="p-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h3 className="h3">{locale === 'ne' ? 'गोपनीयता र डाटा' : 'Privacy & data'}</h3>
            <button className="btn btn-g btn-sm" onClick={onClose}>{t('close')}</button>
          </div>
          <div className="prose !text-[14px]">
            {locale === 'ne' ? (
              <>
                <p>Acttolog ले आवश्यक कार्य सञ्चालनका लागि मात्र डाटा प्रशोधन गर्छ। एनालिटिक्स र व्यक्तिगतकरण ऐच्छिक छन् र तपाईंको सहमतिपछि मात्र सक्रिय हुन्छन्।</p>
                <h3>हामी के राख्छौं</h3>
                <ul>
                  <li>Google साइन-इन: नाम, इमेल, प्रोफाइल फोटो र प्रदायक ID — अरू केही होइन।</li>
                  <li>सम्पर्क सन्देशहरू: तपाईंले पठाउनुभएको सामग्री र मिति।</li>
                  <li>एनालिटिक्स घटनाहरू: सहमति दिएपछि मात्र, गुमनाम सेसन ID सहित।</li>
                </ul>
                <h3>हामी के गर्दैनौं</h3>
                <ul>
                  <li>सार्वजनिक प्रोफाइल निर्देशिका, सार्वजनिक गतिविधि फिड वा फलोअर प्रणाली बनाउँदैनौं।</li>
                  <li>Darkroom खोज नतिजाहरू व्यक्तिगत पार्दैनौं।</li>
                  <li>तपाईंको गोपनीय डाटा बेच्दैनौं वा साझा गर्दैनौं।</li>
                </ul>
                <p>खाता मेटाउन: My Acttolog → Settings → Request Account Deletion।</p>
              </>
            ) : (
              <>
                <p>Acttolog processes only what is necessary to operate. Analytics and personalisation are optional and activate only after your consent.</p>
                <h3>What we keep</h3>
                <ul>
                  <li>Google sign-in: name, email, profile photo and provider ID — nothing else.</li>
                  <li>Contact messages: what you send, plus timestamps.</li>
                  <li>Analytics events: only after consent, tied to an anonymous session id.</li>
                </ul>
                <h3>What we never do</h3>
                <ul>
                  <li>No public profile directory, public activity feed or follower system.</li>
                  <li>Darkroom search results are never personalised.</li>
                  <li>Your data is never sold or shared.</li>
                </ul>
                <p>To delete your account: My Acttolog → Settings → Request Account Deletion.</p>
              </>
            )}
            <p className="dim text-[12.4px] mt-4">
              {consent
                ? `${locale === 'ne' ? 'यस ब्राउजरको सहमति स्थिति' : 'Consent state in this browser'}: analytics ${consent.analytics ? '✓' : '✗'} · personalisation ${consent.personalization ? '✓' : '✗'}`
                : locale === 'ne' ? 'अझै कुनै सहमति चयन रेकर्ड छैन।' : 'No consent choice recorded yet.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
