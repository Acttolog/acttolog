'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session';
import { useI18n } from '@/lib/i18n';

type Kind = 'not_configured' | 'expired' | 'failed';

/**
 * Explains a failed sign-in instead of dropping the visitor on a bare page.
 * /api/auth/google redirects to /contact?oauth=not_configured when the OAuth
 * keys are absent, and /api/auth/callback redirects to /?auth=error&reason=…
 * for state or token failures. Both used to land silently.
 */
export function AuthNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { signIn } = useSession();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const primary = useRef<HTMLButtonElement | null>(null);

  const oauth = params.get('oauth');
  const reason = params.get('reason');
  const isError = params.get('auth') === 'error';
  const kind: Kind | null =
    oauth === 'not_configured' || (isError && reason === 'oauth_not_configured') ? 'not_configured'
      : isError ? (reason === 'state_mismatch' ? 'expired' : 'failed')
        : null;

  useEffect(() => {
    if (kind && kind !== dismissed) setOpen(true);
  }, [kind, dismissed]);

  useEffect(() => {
    if (!open) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!kind || !open) return null;

  function cleanUrl() {
    const q = new URLSearchParams(params.toString());
    q.delete('oauth');
    q.delete('auth');
    q.delete('reason');
    const rest = q.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname, { scroll: false });
  }

  function close() {
    setOpen(false);
    setDismissed(kind);
    cleanUrl();
  }

  function retry() {
    cleanUrl();
    signIn();
  }

  const ne = locale === 'ne';
  const copy = {
    not_configured: {
      title: ne ? 'Google साइन इन अझै सक्रिय छैन' : 'Google sign-in is not switched on yet',
      body: ne
        ? 'यो डिप्लोयमेन्टमा Google OAuth कुञ्जीहरू छैनन्, त्यसैले साइन इन सुरु हुन सक्दैन। तपाईंको खातामा कुनै समस्या छैन। सुरक्षित सामग्री यही ब्राउजरमा रहन्छ, र तलको फारमबाट सन्देश पठाउन सक्नुहुन्छ।'
        : 'This deployment does not have the Google OAuth keys, so sign-in cannot start. Nothing is wrong with your account. Saved items stay in this browser, and the form below reaches the same private inbox.',
    },
    expired: {
      title: ne ? 'त्यो साइन इन प्रयासको समय सकियो' : 'That sign-in attempt expired',
      body: ne
        ? 'सुरक्षा स्थिति यो ब्राउजरसँग मिलेन — प्रायः पुरानो ट्याब वा ढिलो रिडाइरेक्ट। यहीँबाट फेरि प्रयास गर्नुहोस्।'
        : 'The security state did not match this browser — usually a stale tab or a slow redirect. Nothing was shared. Try again from this page.',
    },
    failed: {
      title: ne ? 'Google ले साइन इन पूरा गर्न सकेन' : 'Google could not complete the sign-in',
      body: ne
        ? 'टोकन प्रमाणित गर्न सकिएन। एकपटक फेरि प्रयास गर्नुहोस्; फेरि पनि नभए सम्पर्क गर्नुहोस् — हामी सर्भर लग हेर्छौं।'
        : 'The token could not be verified. Try once more; if it keeps failing, contact us and we will check the server logs.',
    },
  }[kind];

  return (
    <div className="mbd" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="mcard" role="alertdialog" aria-modal="true" aria-labelledby="auth-notice-title">
        <div className="p-7">
          <div className="eyebrow mb-4">{ne ? 'खाता पहुँच' : 'ACCOUNT ACCESS'}</div>
          <h3 className="h3" id="auth-notice-title">{copy.title}</h3>
          <p className="prose !text-[14px] mt-3">{copy.body}</p>
          <div className="mt-7 flex flex-wrap justify-end gap-2">
            {kind !== 'not_configured' && (
              <button ref={primary} className="btn btn-p btn-sm" onClick={retry}>
                {ne ? 'फेरि प्रयास' : 'TRY AGAIN'}
              </button>
            )}
            <Link href="/contact" className="btn btn-g btn-sm" onClick={close}>
              {ne ? 'सम्पर्क' : 'CONTACT'}
            </Link>
            <button ref={kind === 'not_configured' ? primary : undefined} className="btn btn-g btn-sm" onClick={close}>
              {ne ? 'बन्द' : 'CLOSE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
