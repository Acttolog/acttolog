'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/analytics';

/** Public contact form — no login (spec §45). Honeypot + client validation; server rate-limits. */
export function ContactForm({ divisions, preselectedOffer }: {
  divisions: { id: string; name: string }[];
  preselectedOffer?: string;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const err = (k: string) => Boolean(errors[k]);
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    subject: preselectedOffer ? `Offer inquiry: ${preselectedOffer}` : '',
    division: '', message: '', website: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ck = {
      name: form.name.trim().length >= 2,
      email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email.trim()),
      subject: form.subject.trim().length >= 2,
      message: form.message.trim().length >= 10,
    };
    setErrors(Object.fromEntries(Object.entries(ck).map(([k, v]) => [k, !v])));
    if (!Object.values(ck).every(Boolean)) {
      toast(locale === 'ne' ? 'कृपया हाइलाइट गरिएका फिल्ड सच्याउनुहोस्।' : 'Please correct the highlighted fields.', 'err');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        track('contact_submit');
        setSent(true);
        toast(locale === 'ne' ? 'सन्देश प्राप्त भयो' : 'Message received', 'ok');
      } else if (res.status === 503) {
        toast(data.hint || (locale === 'ne'
          ? 'सन्देश भण्डारण अझै कन्फिगर भएको छैन — कृपया इमेल वा फोन गर्नुहोस्।'
          : 'Message storage is not configured yet — please email or call directly.'), 'err', 6000);
      } else {
        toast(locale === 'ne' ? 'पठाउन सकिएन — फेरि प्रयास गर्नुहोस्।' : 'Sending failed — please try again.', 'err');
      }
    } catch {
      toast('Network error — please try again.', 'err');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-10">
        <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-5"
          style={{ background: 'color-mix(in srgb,var(--ok) 14%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 34%,transparent)', color: 'var(--ok)' }}>
          <Icon name="check" size={26} />
        </span>
        <h3 className="h3 mb-2">{locale === 'ne' ? 'सन्देश प्राप्त भयो' : 'Message received'}</h3>
        <p className="mut text-[13.4px] leading-relaxed max-w-[46ch] mx-auto">
          {locale === 'ne'
            ? 'धन्यवाद! Acttolog टोलीले तपाईंको सन्देश निजी इनबक्समा प्राप्त गरेको छ र चाँडै सम्पर्क गर्नेछ।'
            : 'Thank you — the Acttolog team has your message in the private inbox and will respond soon.'}
        </p>
        <button className="btn btn-g btn-sm mt-6" onClick={() => { setSent(false); setForm({ ...form, subject: '', message: '' }); }}>
          {locale === 'ne' ? 'अर्को सन्देश' : 'Send another'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {/* honeypot — invisible to humans */}
      <label className="hp" aria-hidden="true">
        Website<input name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" />
      </label>

      <div className="grid sm:grid-cols-2 gap-x-5">
        <label className="fld">
          <span>{t('c.name')} *</span>
          <input className={`inp${err('name') ? ' err' : ''}`} value={form.name} onChange={set('name')} autoComplete="name" />
          <div className={`emsg${err('name') ? ' show' : ''}`}>{locale === 'ne' ? 'नाम आवश्यक छ' : 'Name is required'}</div>
        </label>
        <label className="fld">
          <span>{t('c.email')} *</span>
          <input className={`inp${err('email') ? ' err' : ''}`} type="email" value={form.email} onChange={set('email')} autoComplete="email" />
          <div className={`emsg${err('email') ? ' show' : ''}`}>{locale === 'ne' ? 'मान्य इमेल आवश्यक छ' : 'Valid email required'}</div>
        </label>
        <label className="fld">
          <span>{t('c.phone')}</span>
          <input className="inp" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </label>
        <label className="fld">
          <span>{t('c.div')}</span>
          <select className="sel" value={form.division} onChange={set('division')}>
            <option value="">—</option>
            {divisions.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </label>
      </div>
      <label className="fld">
        <span>{t('c.subject')} *</span>
        <input className={`inp${err('subject') ? ' err' : ''}`} value={form.subject} onChange={set('subject')} />
        <div className={`emsg${err('subject') ? ' show' : ''}`}>{locale === 'ne' ? 'विषय आवश्यक छ' : 'Subject is required'}</div>
      </label>
      <label className="fld">
        <span>{t('c.msg')} *</span>
        <textarea className={`ta${err('message') ? ' err' : ''}`} rows={6} value={form.message} onChange={set('message')} />
        <div className={`emsg${err('message') ? ' show' : ''}`}>{locale === 'ne' ? 'कम्तीमा १० अक्षर' : 'At least 10 characters'}</div>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-p" type="submit" disabled={busy}>
          {busy ? (locale === 'ne' ? 'पठाइँदै…' : 'Sending…') : <>{t('c.send')} <Icon name="arrow" size={15} /></>}
        </button>
        <span className="dim text-[11.6px] leading-relaxed max-w-[38ch]">
          {locale === 'ne' ? 'कुनै लगइन आवश्यक छैन। सन्देश निजी एडमिन इनबक्समा जान्छ।' : 'No login required. Messages go to the private admin inbox.'}
        </span>
      </div>
    </form>
  );
}
