'use client';

import { useState } from 'react';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useToast } from '@/lib/toast';

/** Submission flow: Continue with Google → Submit → Automated Pre-check → Admin Review → Publish (spec §38). */
export function DarkroomSubmit({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', url: '', cat: '', desc: '', why: '', tags: '' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [precheck, setPrecheck] = useState<[string, boolean][] | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div
        className="mbd"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="mcard" role="dialog" aria-modal="true">
          <div className="p-8 text-center">
            <div className="eyebrow mb-4 justify-center">{t('dark.submit').toUpperCase()}</div>
            <h3 className="h3 mb-3">{t('gate.t')}</h3>
            <p className="mut mx-auto mb-7 max-w-[46ch] text-[13.4px] leading-relaxed">
              {locale === 'ne'
                ? 'स्रोत पेश गर्न Google साइन-इन आवश्यक छ। पेश गरेपछि स्वचालित प्री-चेक र प्रशासन समीक्षा हुन्छ।'
                : 'Only signed-in Google users can submit resources. After submission: automated pre-check, then private admin review.'}
            </p>
            <GoogleButton returnTo="/darkroom" className="mx-auto" />
            <div className="mt-5 flex justify-center">
              <button className="btn btn-g btn-sm" onClick={onClose}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div
        className="mbd"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="mcard" role="dialog" aria-modal="true">
          <div className="p-9 text-center">
            <span
              className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl"
              style={{
                background: 'color-mix(in srgb,var(--ok) 14%,transparent)',
                border: '1px solid color-mix(in srgb,var(--ok) 34%,transparent)',
                color: 'var(--ok)',
              }}
            >
              <Icon name="check" size={26} />
            </span>
            <h3 className="h2 mb-3 !text-[24px]">{t('dark.got')}</h3>
            <p className="mut mx-auto max-w-[46ch] text-[13.5px] leading-relaxed">
              {locale === 'ne'
                ? 'प्रशासनले निजी रूपमा समीक्षा गर्छ। स्वीकृत भएमा स्रोत Darkroom मा देखा पर्नेछ। कुनै इमेल सूचना पठाइँदैन।'
                : 'Administration reviews submissions privately. If accepted, the resource appears in Darkroom. No approval/rejection email is sent — by design.'}
            </p>
            <button className="btn btn-p mt-7" onClick={onClose}>
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const validate = () => {
    const ck = {
      name: form.name.trim().length >= 2,
      url: /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(form.url.trim()),
      desc: form.desc.trim().length >= 20,
      why: form.why.trim().length >= 20,
    };
    setErrors(Object.fromEntries(Object.entries(ck).map(([k, v]) => [k, !v])));
    return Object.values(ck).every(Boolean);
  };

  const runPrecheck = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/darkroom/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.url.trim(), name: form.name.trim() }),
      });
      const data = await res.json();
      setPrecheck(data.checks || []);
    } catch {
      toast('Pre-check unavailable — submission will still be reviewed manually.', 'info');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast(
        locale === 'ne' ? 'हाइलाइट गरिएका फिल्ड सच्याउनुहोस्।' : 'Please correct the highlighted fields.',
        'err',
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/darkroom/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          url: form.url.trim(),
          name: form.name.trim(),
          desc: form.desc.trim(),
          why: form.why.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(
          data.error === 'duplicate'
            ? 'This URL already exists in Darkroom or is pending review.'
            : data.error || 'Submission failed.',
          'err',
        );
        return;
      }
      setDone(true);
    } catch {
      toast('Network error — please try again.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const fld = (k: keyof typeof form, label: string, ta = false) => (
    <label className="fld">
      <span>
        {label}
        {k === 'tags' ? (
          <em className="dim normal-case"> — {locale === 'ne' ? 'ऐच्छिक' : 'optional'}</em>
        ) : (
          ' *'
        )}
      </span>
      {ta ? (
        <textarea
          className={`ta${errors[k] ? ' err' : ''}`}
          rows={3}
          value={form[k]}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        />
      ) : (
        <input
          className={`inp${errors[k] ? ' err' : ''}${k === 'url' ? ' mono !text-[13px]' : ''}`}
          value={form[k]}
          placeholder={k === 'url' ? 'https://' : k === 'tags' ? 'comma, separated' : undefined}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        />
      )}
    </label>
  );

  return (
    <div
      className="mbd"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mcard" role="dialog" aria-modal="true" aria-label={t('dark.submit')}>
        <div className="p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow mb-3">{t('dark.submit').toUpperCase()}</div>
              <h3 className="h3">{locale === 'ne' ? 'स्रोत पेश गर्नुहोस्' : 'Submit a resource'}</h3>
              <p className="mut mt-2 max-w-[58ch] text-[13.1px]">
                {locale === 'ne'
                  ? 'नाम, URL, श्रेणी, विवरण र किन उपयोगी छ — मात्र। कुनै थप प्रश्न छैन।'
                  : 'Name, URL, category, description and why it is useful — nothing more. No profile questions.'}
              </p>
            </div>
            <button className="btn btn-g btn-sm" onClick={onClose} aria-label={t('close')}>
              ✕
            </button>
          </div>

          <form onSubmit={submit} noValidate>
            {fld('name', locale === 'ne' ? 'स्रोत नाम' : 'Resource name')}
            {fld('url', 'URL')}
            <label className="fld">
              <span>{locale === 'ne' ? 'श्रेणी' : 'Category'}</span>
              <select
                className="sel"
                value={form.cat}
                onChange={(e) => setForm({ ...form, cat: e.target.value })}
              >
                <option value="">—</option>
                {[
                  'Research',
                  'Software',
                  'AI',
                  'Databases',
                  'Government',
                  'Education',
                  'Developer',
                  'Creative',
                  'Business',
                  'Documents',
                  'Other',
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {fld('desc', locale === 'ne' ? 'छोटो विवरण' : 'Short description', true)}
            {fld('why', locale === 'ne' ? 'किन उपयोगी?' : 'Why is it useful?', true)}
            {fld('tags', locale === 'ne' ? 'ट्यागहरू' : 'Tags')}

            <div className="mb-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                className="btn btn-g btn-sm"
                onClick={runPrecheck}
                disabled={busy || !form.url.trim()}
              >
                <Icon name="shield" size={14} />
                {locale === 'ne' ? 'प्री-चेक चलाउनुहोस्' : 'Run automated pre-check'}
              </button>
            </div>

            {precheck && (
              <div
                className="mb-5 rounded-xl border p-4"
                style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
              >
                <div className="mono dim mb-3 text-[10.5px] tracking-[.2em]">AUTOMATED PRE-CHECK</div>
                {precheck.map(([label, ok]) => (
                  <div key={label} className="flex items-center gap-2.5 py-1 text-[12.7px]">
                    <span style={{ color: ok ? 'var(--ok)' : 'var(--err)' }}>
                      <Icon name={ok ? 'check' : 'trash'} size={13} />
                    </span>
                    <span className="mut">{label}</span>
                  </div>
                ))}
                <p className="dim mt-3 text-[11.3px] leading-relaxed">
                  These checks do not guarantee that a destination is safe. Human admin verification is
                  required before publication.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button className="btn btn-p" type="submit" disabled={busy}>
                {t('submit')} <Icon name="arrow" size={15} />
              </button>
              <span className="dim mono self-center text-[10.5px] tracking-[.14em]">
                AUTOMATED PRE-CHECK → ADMIN REVIEW → PUBLISH
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
