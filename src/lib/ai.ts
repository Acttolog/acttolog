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

export * from './ai-core';
import { retrieveActtolog, indexAnswer } from './ai-core';
import type { AiSource, AiReply } from './ai-core';

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

