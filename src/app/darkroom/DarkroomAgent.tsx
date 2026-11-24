'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { getDB, pub, L as resolveBi } from '@/lib/content';
import { drRank, parseIntent } from '@/lib/darkroom';
import { track } from '@/lib/analytics';
import type { DarkroomResource, Locale } from '@/lib/content/types';

const db = getDB();

interface Step {
  label: string;
  detail: string;
}
interface AgentResult {
  steps: Step[];
  answer: string;
  sources: DarkroomResource[];
}

/**
 * Darkroom Agent — an agentic finder scoped to the Darkroom index.
 * Visible reasoning steps: intent → filter → rank → compose.
 * Deterministic and global (never personalised), honest about limits.
 */
export function DarkroomAgent() {
  const { L, t, locale } = useI18n();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AgentResult | null>(null);

  const run = async (query: string) => {
    const question = (query ?? q).trim();
    if (!question || busy) return;
    setBusy(true);
    track('search', { q: question, where: 'darkroom-agent' });
    const loc: Locale = locale;
    const steps: Step[] = [];

    await new Promise((r) => setTimeout(r, 120));
    const intent = parseIntent(question, db.drCats);
    steps.push({
      label: 'INTENT PARSED',
      detail:
        [
          intent.pricing && `pricing=${intent.pricing}`,
          intent.region && `region=${intent.region}`,
          intent.official && 'official-only',
          intent.subs.length && `areas: ${intent.subs.slice(0, 3).join(', ')}`,
        ]
          .filter(Boolean)
          .join(' · ') || 'open query',
    });

    await new Promise((r) => setTimeout(r, 120));
    let pool = pub(db.dr);
    const before = pool.length;
    if (intent.pricing) pool = pool.filter((r2) => r2.pricing === intent.pricing);
    if (intent.region) pool = pool.filter((r2) => r2.region === intent.region || r2.region === 'Global');
    if (intent.official) pool = pool.filter((r2) => r2.official);
    steps.push({ label: 'FILTER INDEX', detail: `${before} → ${pool.length} published resources` });

    await new Promise((r) => setTimeout(r, 120));
    const ranked = drRank(pool, question, db.drW, loc).slice(0, 6);
    steps.push({
      label: 'RANK (owner weights)',
      detail: `relevance ${db.drW.relevance}% · official ${db.drW.official}% · verified ${db.drW.verification}% · fresh ${db.drW.freshness}% · usage ${db.drW.usage}%`,
    });

    await new Promise((r) => setTimeout(r, 120));
    const top = ranked.map((x) => x.r);
    const answer = top.length
      ? loc === 'ne'
        ? `डार्करूम एजेन्टले ${top.length} स्रोत भेट्टायो। तलका कार्डहरू प्रकाशित सूचीबाट हुन् — क्रमवद्धता ग्लोबल नियमअनुसार, व्यक्तिगत होइन।`
        : `Darkroom Agent found ${top.length} matching resources. Cards below come from the published index — ranking is global and rule-based, never personalised.`
      : loc === 'ne'
        ? 'मिल्ने स्रोत भेटिएन। अलि विशिष्ट लेख्नुहोस् (जस्तै: "free reference manager APA") वा Acttolog AI सोध्नुहोस्।'
        : 'No matching resource yet. Try a more specific phrase (e.g. "free reference manager APA") or ask Acttolog AI for a wider scan.';
    steps.push({
      label: 'COMPOSE ANSWER',
      detail: top.length ? `${top.length} sources attached` : 'honest no-match reply',
    });

    setRes({ steps, answer, sources: top });
    setBusy(false);
  };

  return (
    <div className="panel mb-8 p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-10 w-10 flex-none place-items-center rounded-xl"
          style={{
            background: 'color-mix(in srgb,var(--gold) 13%,transparent)',
            color: 'var(--gold)',
            border: '1px solid color-mix(in srgb,var(--gold) 30%,transparent)',
          }}
        >
          <Icon name="brain" size={19} />
        </span>
        <div>
          <div className="font-display text-[17px] font-bold tracking-[-.01em]">
            {locale === 'ne' ? 'डार्करूम एजेन्ट' : 'Darkroom Agent'}
          </div>
          <div className="dim mono text-[10.5px] tracking-[.18em]">ASK → INTENT → FILTER → RANK → ANSWER</div>
        </div>
      </div>
      <form
        className="mb-4 flex gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <input
          className="inp flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            locale === 'ne'
              ? 'जस्तै: नेपालको विकास योजनाको आधिकारिक स्रोत?'
              : 'e.g. Where do I find Nepal’s official development plans and SDG reports?'
          }
          aria-label="Ask the Darkroom Agent"
        />
        <button className="btn btn-p" type="submit" disabled={busy || !q.trim()}>
          <Icon name="arrow" size={15} />
        </button>
      </form>
      <div className="mb-2 flex flex-wrap gap-2">
        {(locale === 'ne'
          ? [
              'नेपालका विकास योजना र SDG प्रतिवेदन',
              'निःशुल्क AI औजारहरू',
              'अर्थशास्त्रका वर्किङ पेपर',
              'नक्सा र भू-डाटा',
            ]
          : [
              'Nepal development plans & SDG reports',
              'Free AI tools',
              'Economics working papers',
              'Maps & geo data',
              'Latest Nepal news',
            ]
        ).map((s2) => (
          <button
            key={s2}
            className="chip !text-[11px]"
            onClick={() => {
              setQ(s2);
              run(s2);
            }}
            disabled={busy}
          >
            {s2}
          </button>
        ))}
      </div>

      {res && (
        <div
          className="mt-4 rounded-xl border p-5"
          style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
        >
          <div className="mono dim mb-3 text-[10.5px] tracking-[.2em]">AGENT TRACE</div>
          <div className="mb-4 space-y-2">
            {res.steps.map((s3, i) => (
              <div key={i} className="flex items-start gap-3 text-[12.4px]">
                <span className="badge b-info flex-none">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-none font-semibold" style={{ color: 'var(--txt)' }}>
                  {s3.label}
                </span>
                <span className="mut">{s3.detail}</span>
              </div>
            ))}
          </div>
          <p className="mut mb-4 text-[13.2px] leading-relaxed">{res.answer}</p>
          {res.sources.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {res.sources.map((r2) => (
                <div
                  key={r2.id}
                  className="rounded-xl border p-3.5"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-display truncate text-[13.2px] font-semibold">{r2.name}</span>
                    {r2.official && <span className="badge b-info flex-none">official</span>}
                  </div>
                  <p className="mut line-clamp-2 text-[11.6px] leading-relaxed">
                    {resolveBi(r2.short, locale)}
                  </p>
                  <div className="mt-2 flex gap-3">
                    {r2.presentation === 'profile' ? (
                      <Link
                        className="mono text-[10.5px] tracking-[.14em]"
                        style={{ color: 'var(--cy)' }}
                        href={`/darkroom/${r2.slug}`}
                      >
                        OPEN HERE →
                      </Link>
                    ) : null}
                    <a
                      className="mono dim text-[10.5px] tracking-[.14em]"
                      href={r2.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      OFFICIAL ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="dim mt-4 text-[11.2px] leading-relaxed">
        {locale === 'ne'
          ? 'एजेन्टले डार्करूम सूचकांक मात्र स्क्यान गर्छ — नतिजा सबैका लागि उस्तै। बाहिरी वेब स्क्यानका लागि Acttolog AI प्रयोग गर्नुहोस्।'
          : 'The agent scans only the published Darkroom index — identical results for everyone. For wider web-grounded answers use Acttolog AI.'}
      </p>
    </div>
  );
}
