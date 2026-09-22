/**
 * Acttolog-first retrieval core — pure functions shared by server (OpenAI
 * grounding) and client (static-host fallback). No secrets, no server-only.
 */
import type { Locale } from '@/lib/content/types';
import { buildSearchIndex } from '@/lib/search';

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


/** Index-mode answer (no external provider) — honest, labelled, never invented. */
export function clientAiAnswer(question: string, locale: Locale, mode: 'act' | 'actweb' = 'act') {
  const hits = retrieveActtolog(question, locale);
  return { answer: indexAnswer(question, hits, mode, locale), sources: hits.map((h) => ({ title: h.it.title, route: h.it.route, meta: h.it.meta, origin: 'acttolog' as const })), provider: 'acttolog-index' as const, mode };
}

export function indexAnswer(q: string, hits: ReturnType<typeof retrieveActtolog>, mode: 'act' | 'actweb', locale: Locale): string {
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
