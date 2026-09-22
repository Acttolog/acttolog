'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { useSession } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { useSaved, type SavedEntry } from '@/lib/saved';
import { useToast } from '@/lib/toast';
import type { SessionUser } from '@/lib/auth/session';

type Tab = 'profile' | 'saved' | 'recent' | 'academy' | 'games' | 'darkroom' | 'ai' | 'notifications' | 'settings';

/** My Acttolog — simple private dashboard, no profile forms (spec §48–51). */
export function MyDashboard({ serverUser, initialTab }: { serverUser: SessionUser | null; initialTab?: Tab }) {
  const { user, loading, signOut } = useSession();
  const { t, locale } = useI18n();
  const me = user || serverUser;

  if (loading && !me) {
    return (
      <section className="pt-[calc(var(--nav)+80px)] pb-20">
        <div className="wrap text-center dim mono tracking-[.2em] text-[11px]">LOADING SESSION…</div>
      </section>
    );
  }

  if (!me) {
    return (
      <section className="pt-[calc(var(--nav)+68px)] pb-20">
        <div className="wrap">
          <div className="panel p-9 sm:p-14 max-w-[560px] mx-auto text-center">
            <div className="flex justify-center mb-6">
              <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{ background: 'var(--grad)', color: '#04060e' }}>
                <Icon name="users" size={22} />
              </span>
            </div>
            <h1 className="h2">{t('gate.t')}</h1>
            <p className="lead mx-auto mt-5">{t('gate.b')}</p>
            <GoogleButton returnTo="/my" className="mx-auto mt-8" />
            <p className="dim text-[11.6px] mt-7 leading-relaxed">
              {locale === 'ne' ? 'लगइन पछि तपाईं My Acttolog मा पुग्नुहुनेछ।' : 'After sign-in you land on My Acttolog.'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return <DashboardTabs me={me} onSignOut={signOut} initialTab={initialTab} />;
}

function DashboardTabs({ me, onSignOut, initialTab }: { me: SessionUser; onSignOut: () => void; initialTab?: Tab }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { items: saved } = useSaved();
  const [tab, setTab] = useState<Tab>(initialTab || 'profile');
  const [recent, setRecent] = useState<{ kind: string; id: string; title: string; at: string }[]>([]);
  const [personalization, setPersonalization] = useState(false);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(`act_recent_${me.uid}`) || '[]'));
      setPersonalization(localStorage.getItem('act_personalization') === 'on');
    } catch { /* ignore */ }
  }, [me.uid]);

  const initials = (me.name || 'A').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const tabs: [Tab, string, string][] = [
    ['profile', locale === 'ne' ? 'प्रोफाइल' : 'Profile', 'users'],
    ['saved', locale === 'ne' ? 'सुरक्षित सामग्री' : 'Saved Items', 'heart'],
    ['recent', locale === 'ne' ? 'भर्खरै हेरेको' : 'Recently Viewed', 'clock'],
    ['academy', locale === 'ne' ? 'एकेडेमी' : 'Academy', 'book'],
    ['games', locale === 'ne' ? 'खेलहरू' : 'Games', 'game'],
    ['darkroom', 'Darkroom', 'search'],
    ['ai', locale === 'ne' ? 'एआई कुराकानी' : 'AI Conversations', 'brain'],
    ['notifications', locale === 'ne' ? 'सूचनाहरू' : 'Notifications', 'bell'],
    ['settings', locale === 'ne' ? 'सेटिङ' : 'Settings', 'gear'],
  ];

  const requestDeletion = async () => {
    try {
      const res = await fetch('/api/my/deletion', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast(locale === 'ne'
          ? 'मेटाउने अनुरोध पठाइयो — प्रशासनले निजी रूपमा प्रक्रिया गर्नेछ।'
          : 'Deletion request sent — administration will process it privately.', 'ok', 6000);
      } else {
        toast(data.error === 'not_configured'
          ? (locale === 'ne' ? 'अनुरोध दर्ता प्रणाली अझै कन्फिगर भएको छैन।' : 'The request registry is not configured yet.')
          : 'Request failed.', 'err');
      }
    } catch { toast('Network error.', 'err'); }
  };

  const savedByKind = (kind: string) => saved.filter((s: SavedEntry) => s.kind === kind);

  return (
    <section className="pt-[calc(var(--nav)+44px)] pb-16">
      <div className="wrap">
        <div className="flex flex-wrap items-center gap-5 mb-9">
          <span className="w-16 h-16 rounded-2xl grid place-items-center font-display font-bold text-[22px]"
            style={{ background: 'var(--grad)', color: '#04060e' }}>{initials}</span>
          <div>
            <h1 className="h2 !text-[clamp(1.55rem,3.6vw,2.4rem)]">{t('my')}</h1>
            <div className="mut text-[13.5px] mt-1">
              {me.name} · <span className="mono text-[12.3px]">{me.email}</span>
            </div>
            <div className="flex gap-2 mt-2.5">
              <span className="badge b-info">{me.role}</span>
              <span className="badge b-mut">Google</span>
              <span className="badge b-mut">{locale === 'ne' ? 'खाता निजी' : 'PROFILE PRIVATE'}</span>
            </div>
          </div>
          <div className="ml-auto flex gap-2.5 flex-wrap">
            {(me.role === 'Owner' || me.role === 'Admin') && (
              <Link className="btn btn-g btn-sm" href="/admin">{t('admin')}</Link>
            )}
            <button className="btn btn-g btn-sm" onClick={onSignOut}>{t('signout')}</button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-7 items-start">
          <nav className="panel p-3 space-y-1" aria-label="My Acttolog">
            {tabs.map(([id, label, icon]) => (
              <button key={id}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[11px] text-[13.5px] transition-colors text-left"
                style={tab === id
                  ? { background: 'linear-gradient(90deg,color-mix(in srgb,var(--cy) 16%,transparent),color-mix(in srgb,var(--vi) 8%,transparent))', color: 'var(--txt)', border: '1px solid color-mix(in srgb,var(--cy) 30%,transparent)' }
                  : { color: 'var(--mut)', border: '1px solid transparent' }}
                onClick={() => setTab(id)}>
                <Icon name={icon} size={16} />{label}
              </button>
            ))}
          </nav>

          <div>
            {tab === 'profile' && (
              <div className="panel p-6 sm:p-8">
                <div className="eyebrow mb-5">PRIVATE PROFILE</div>
                <div className="space-y-2.5 text-[13.6px]">
                  <div className="flex justify-between gap-4"><span className="dim">Name</span><span>{me.name}</span></div>
                  <div className="flex justify-between gap-4"><span className="dim">Email</span><span className="mono text-[12.6px]">{me.email}</span></div>
                  <div className="flex justify-between gap-4"><span className="dim">Role</span><span>{me.role}</span></div>
                  <div className="flex justify-between gap-4"><span className="dim">Provider</span><span>Google</span></div>
                </div>
                <p className="mut text-[12.8px] leading-relaxed mt-6">
                  {locale === 'ne'
                    ? 'Acttolog ले Google पहिचानबाट नाम, इमेल र फोटो मात्र राख्छ। कुनै प्रोफाइल फारम भर्नु पर्दैन। तपाईंको प्रोफाइल सधैं निजी हुन्छ — कुनै सार्वजनिक निर्देशिका छैन।'
                    : 'Acttolog keeps only name, email and photo from your Google identity. There is no profile form to complete, and your profile is private by default — no public directory, no activity feed.'}
                </p>
              </div>
            )}

            {tab === 'saved' && (
              <div className="panel p-6 sm:p-8">
                <div className="eyebrow mb-5">SAVED ITEMS</div>
                {saved.length ? (
                  <div className="space-y-2">
                    {saved.map((s) => (
                      <div key={`${s.kind}_${s.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3.5"
                        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                        <div className="min-w-0">
                          <div className="text-[13.6px] font-medium truncate">{s.title}</div>
                          <div className="dim mono text-[9.8px] tracking-[.14em] mt-0.5">{s.kind.toUpperCase()}</div>
                        </div>
                        <Icon name="heart" size={15} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyNote text={locale === 'ne' ? 'अझै केही सुरक्षित छैन।' : 'Nothing saved yet.'} />
                )}
              </div>
            )}

            {tab === 'recent' && (
              <div className="panel p-6 sm:p-8">
                <div className="eyebrow mb-5">RECENTLY VIEWED</div>
                {recent.length ? (
                  <div className="space-y-2">
                    {recent.map((r, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-xl border p-3.5"
                        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                        <div className="min-w-0">
                          <div className="text-[13.6px] truncate">{r.title}</div>
                          <div className="dim mono text-[9.8px] tracking-[.14em] mt-0.5">{r.kind.toUpperCase()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyNote text={locale === 'ne' ? 'भर्खरै हेरेको केही छैन।' : 'Nothing viewed recently.'} />
                )}
              </div>
            )}

            {tab === 'academy' && <LinkPanel href="/academy" icon="book"
              title={locale === 'ne' ? 'मेरो एकेडेमी' : 'My Academy'}
              body={locale === 'ne' ? 'पाठ्यक्रम र प्रगति निजी हुन्छ।' : 'Your courses and private progress live here.'} />}
            {tab === 'games' && <LinkPanel href="/games" icon="game"
              title={locale === 'ne' ? 'मेरो खेलहरू' : 'My Games'}
              body={locale === 'ne' ? 'स्कोर र उपलब्धिहरू निजी हुन्छन्।' : 'Scores, achievements and favorites — private to you.'} />}
            {tab === 'darkroom' && <LinkPanel href="/darkroom" icon="search"
              title="My Darkroom"
              body={locale === 'ne'
                ? `तपाईंले सुरक्षित गरेका ${savedByKind('dr').length} स्रोतहरू। खोज सधैं ग्लोबल हुन्छ — व्यक्तिगत पारिँदैन।`
                : `You have ${savedByKind('dr').length} saved resources. Darkroom search stays global — never personalised.`} />}
            {tab === 'ai' && <LinkPanel href="/ai" icon="brain"
              title={locale === 'ne' ? 'एआई कुराकानी' : 'AI Conversations'}
              body={locale === 'ne' ? 'सुरक्षित कुराकानीहरू निजी हुन्छन् — डाटाबेस जोडिएपछि यहाँ देखिनेछन्।' : 'Saved conversations are private — they appear here once persistence is connected.'} />}

            {tab === 'notifications' && (
              <div className="panel p-6 sm:p-8">
                <div className="eyebrow mb-5">NOTIFICATIONS</div>
                <EmptyNote text={locale === 'ne' ? 'कुनै नयाँ सूचना छैन।' : 'No new notifications.'} />
                <p className="dim text-[11.8px] mt-4 leading-relaxed">
                  {locale === 'ne' ? 'सूचना केन्द्र आन्तरिक छ — इमेल आवश्यक छैन।' : 'The notification center is internal — no email required.'}
                </p>
              </div>
            )}

            {tab === 'settings' && (
              <div className="space-y-5">
                <div className="panel p-6 sm:p-8">
                  <div className="eyebrow mb-5">AI PERSONALIZATION</div>
                  <label className="flex items-center justify-between gap-4">
                    <span className="mut text-[13.4px]">
                      {locale === 'ne' ? 'व्यक्तिगतकरण (ऐच्छिक)' : 'Personalization (optional)'}
                    </span>
                    <button className={`sw${personalization ? ' on' : ''}`} aria-pressed={personalization}
                      aria-label="Personalization"
                      onClick={() => {
                        const next = !personalization;
                        setPersonalization(next);
                        try { localStorage.setItem('act_personalization', next ? 'on' : 'off'); } catch { /* ignore */ }
                      }} />
                  </label>
                  <p className="dim text-[11.8px] mt-3 leading-relaxed">
                    {locale === 'ne'
                      ? 'Darkroom खोज व्यक्तिगतकरणबाट सधैं बाहिर रहन्छ।'
                      : 'Darkroom search always stays outside personalization.'}
                  </p>
                </div>

                <div className="panel p-6 sm:p-8" style={{ borderColor: 'color-mix(in srgb,var(--err) 26%,transparent)' }}>
                  <div className="eyebrow mb-4" style={{ color: 'var(--err)' }}>ACCOUNT</div>
                  <p className="mut text-[13px] leading-relaxed mb-5">
                    {locale === 'ne'
                      ? 'खाता मेटाउने अनुरोध निजी प्रशासन वर्कफ्लोमा जान्छ। तत्काल आत्म-मेटाउने सुविधा छैन — सुरक्षाका लागि।'
                      : 'Account deletion goes through a private admin workflow — there is no instant self-delete, for your safety. Requests are reviewed before processing.'}
                  </p>
                  <button className="btn btn-g btn-sm" style={{ color: 'var(--err)', borderColor: 'color-mix(in srgb,var(--err) 40%,transparent)' }}
                    onClick={requestDeletion}>
                    <Icon name="trash" size={14} />
                    {locale === 'ne' ? 'खाता मेटाउने अनुरोध' : 'Request Account Deletion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border p-8 text-center mut text-[13.2px]"
      style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
      {text}
    </div>
  );
}

function LinkPanel({ href, icon, title, body }: { href: string; icon: string; title: string; body: string }) {
  return (
    <Link href={href} className="panel p-6 sm:p-8 block group">
      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl grid place-items-center flex-none transition-transform group-hover:-translate-y-1"
          style={{ background: 'color-mix(in srgb,var(--cy) 12%,transparent)', color: 'var(--cy)', border: '1px solid color-mix(in srgb,var(--cy) 28%,transparent)' }}>
          <Icon name={icon} size={21} />
        </span>
        <div>
          <h2 className="font-display font-semibold text-[16.5px] mb-1.5">{title}</h2>
          <p className="mut text-[13px] leading-relaxed">{body}</p>
        </div>
        <span className="ml-auto" style={{ color: 'var(--cy)' }}><Icon name="arrow" size={17} /></span>
      </div>
    </Link>
  );
}
