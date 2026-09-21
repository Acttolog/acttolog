import 'server-only';
import { buildSearchIndex } from '@/lib/search';
import type { Locale } from '@/lib/content/types';

/**
 * Acttolog AI — server side (spec §56–62).
 *
 * Knowledge priority: ACTTOLOG CONTENT first, EXTERNAL WEB second.
 * Sources are always labelled. Without an OpenAI key the assistant answers
 * from deterministic retrieval over published Acttolog content and says so —
 * it never invents external results.
 */

export interface AiSource {
  title: string;
  route: string;
  meta: string;
  origin: 'acttolog' | 'web';
}

export interface AiReply {
  answer: string;
  sources: AiSource[];
  provider: 'openai' | 'acttolog-index';
  mode: 'act' | 'actweb';
}

interface IndexItem { title: string; route: string; meta: string; txt: string; ext?: boolean }

export function aiIndex(locale: Locale): IndexItem[] {
  return buildSearchIndex(locale).map((e) => ({
    title: e.title, route: e.route, meta: `${e.k}${e.mem ? ' · members' : ''}`, txt: e.txt, ext: e.ext,
  }));
}

/** Deterministic Acttolog-first retrieval (prototype `aiAnswer` scoring). */
export function retrieveActtolog(q: string, locale: Locale, limit = 6) {
  const idx = aiIndex(locale);
  const terms = q.toLowerCase().split(/\s+/).filter((x) => x.length > 2);
  const scored = idx
    .map((it) => {
      let s = 0;
      terms.forEach((w) => {
        if (it.title.toLowerCase().includes(w)) s += 7;
        if (it.txt.includes(w)) s += 2;
      });
      if (/free|निःशुल्क/.test(q) && /free/.test(it.txt)) s += 3;
      if (/tool|software|औजार/.test(q) && it.meta.startsWith('darkroom')) s += 4;
      if (/course|learn|सिक्न|पाठ्यक्रम/.test(q) && it.meta.startsWith('academy')) s += 4;
      if (/thesis|research|अनुसन्धान/.test(q) && (it.meta.startsWith('research') || /research/.test(it.txt))) s += 3;
      if (/nepal|नेपाल/.test(q) && /nepal/i.test(it.txt)) s += 5;
      return { it, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit);
}

export const openaiConfigured = (): boolean => Boolean(process.env.OPENAI_API_KEY);

const SYSTEM_RULES = `You are Acttolog AI, the assistant of Acttolog — a digital ecosystem connecting technology, research, education, entertainment, creativity and useful resources.
Rules:
1. ACTTOLOG CONTENT has priority. Retrieved Acttolog items are provided below; ground answers in them and cite them as [ACTTOLOG SOURCE].
2. When you must use your own knowledge (only in "Acttolog + Web" mode), label those statements [EXTERNAL WEB SOURCE] and never present them as Acttolog content.
3. Never fabricate URLs, prices, statistics, affiliations or guarantees. If Acttolog has nothing on the topic, say so plainly.
4. Answer in the language of the user's message (English or Nepali).
5. Be concise, warm and practical. Thesyn Research claims: support and experience only, no university affiliation, no absolute guarantees.`;

/** Compose the reply. OpenAI when configured; deterministic index answer otherwise. */
export async function aiReply(opts: {
  question: string;
  mode: 'act' | 'actweb';
  locale: Locale;
  history?: { role: 'user' | 'assistant'; text: string }[];
}): Promise<AiReply> {
  const { question, mode, locale, history = [] } = opts;
  const hits = retrieveActtolog(question, locale);
  const sources: AiSource[] = hits.map((h) => ({
    title: h.it.title,
    route: h.it.route,
    meta: h.it.meta,
    origin: 'acttolog' as const,
  }));

  if (!openaiConfigured()) {
    return { answer: indexAnswer(question, hits, mode, locale), sources, provider: 'acttolog-index', mode };
  }

  try {
    const context = hits.length
      ? hits.map((h, i) => `${i + 1}. ${h.it.title} (${h.it.meta}) — ${h.it.route}`).join('\n')
      : '(no matching published Acttolog content)';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: 'system', content: `${SYSTEM_RULES}\n\nMode: ${mode === 'act' ? 'Acttolog only — do NOT use external knowledge; if Acttolog content is insufficient, say so.' : 'Acttolog + Web — external knowledge allowed, always labelled.'}\n\nRetrieved Acttolog content:\n${context}` },
          ...history.slice(-8).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
          { role: 'user', content: question },
        ],
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('empty completion');
    return { answer, sources, provider: 'openai', mode };
  } catch (e) {
    console.error('AI provider failed, falling back to index answer', e);
    return {
      answer: indexAnswer(question, hits, mode, locale) + (locale === 'ne'
        ? '\n\n(नोट: AI प्रदायक अस्थायी रूपमा अनुपलब्ध — उत्तर Acttolog सामग्री सूचकांकबाट दिइएको छ।)'
        : '\n\n(Note: the AI provider was temporarily unavailable — this answer comes from the Acttolog content index.)'),
      sources, provider: 'acttolog-index', mode,
    };
  }
}

/** Honest deterministic answer (prototype behaviour when no key is configured). */
function indexAnswer(q: string, hits: ReturnType<typeof retrieveActtolog>, mode: 'act' | 'actweb', locale: Locale): string {
  const ne = locale === 'ne';
  if (!hits.length) {
    return ne
      ? 'Acttolog को प्रकाशित सामग्रीमा यस सोधसँग मिल्ने कुरा भेटिएन। अलि विशिष्ट वाक्यांश प्रयोग गर्नुहोस् — जस्तै "panel data", "thesis formatting" वा "free statistics tool" — वा Darkroom मा सिधै खोज्नुहोस्। म स्रोतहरू गढ्ने छैन।'
      : 'Nothing in the published Acttolog content matches that yet. Try a more specific phrase such as "panel data", "thesis formatting" or "free statistics tool", or search Darkroom directly. I will not invent sources.';
  }
  const groups: Record<string, number> = {};
  hits.forEach((x) => { const k = x.it.meta.split(' ·')[0]; groups[k] = (groups[k] || 0) + 1; });
  const names = Object.keys(groups).map((k) => `${k} (${groups[k]})`).join(', ');
  return (ne
    ? `Acttolog-पहिलो खोजले यी क्षेत्रमा सामग्री भेट्टायो: ${names}। तलका स्रोत कार्डहरू प्रकाशित Acttolog सामग्रीबाट आएका हुन् र ACTTOLOG SOURCE लेबल गरिएका छन्।`
    : `Acttolog-first retrieval found matches in: ${names}. Every source card below comes from published Acttolog content and is labelled ACTTOLOG SOURCE.`)
    + '\n\n' + hits.slice(0, 3).map((x) => `• ${x.it.title} — ${x.it.meta}`).join('\n')
    + (q.length > 60 || /\?/.test(q)
      ? (ne ? '\n\nविस्तृत जानकारीका लागि कुनै एउटा स्रोत खोल्नुहोस्।' : '\n\nOpen a source for full detail.')
      : '')
    + (mode === 'actweb'
      ? (ne ? '\n\n(बाहिरी वेब व्याख्या सर्भर-साइड OpenAI कुञ्जी चाहिन्छ। कुञ्जी बिना बाहिरी नतिजा गढिँदैन — Admin → AI मा कन्फिगर गर्नुहोस्।)'
            : '\n\n(External web interpretation requires the server-side OpenAI key. Without it, no external results are invented — configure it in Admin → AI.)')
      : (ne ? '\n\n(मोड: केवल Acttolog — बाहिरी वेब प्रयोग गरिएन।)'
            : '\n\n(Mode: Acttolog only — no external web retrieval was used.)'));
}
