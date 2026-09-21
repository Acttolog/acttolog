import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDB } from '@/lib/content';
import { parseIntent, drRank } from '@/lib/darkroom';
import { rateLimit, clientKey } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const Body = z.object({ q: z.string().min(1).max(500), locale: z.enum(['en', 'ne']).default('en') });

/**
 * POST /api/darkroom/nl — natural-language interpretation (spec §34).
 * Layer 2 intent parsing first; AI (Layer 3) only when configured and useful.
 */
export async function POST(req: Request) {
  if (!rateLimit(`drnl:${clientKey(req)}`, 15, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const db = getDB();
  const intent = parseIntent(body.q, db.drCats);
  const matches = drRank(db.dr.filter((r) => r.visible !== false && r.status === 'published'), body.q, db.drW, body.locale).slice(0, 8);

  const note = body.locale === 'ne'
    ? 'इन्टेन्ट तलका फिल्टरहरूमा लागू गर्न सकिन्छ। साधारण खोजहरू OpenAI मा पठाइँदैन।'
    : 'Intent can be applied as filters below. Simple queries never reach OpenAI.';

  return NextResponse.json({
    intent: {
      pricing: intent.pricing || null,
      categories: intent.cats.length ? intent.cats : null,
      subcategories: intent.subs.length ? intent.subs : null,
      region: intent.region || null,
      officialOnly: intent.official || null,
    },
    matches: matches.map((m) => ({ slug: m.r.slug, name: m.r.name, score: m.score })),
    note,
  });
}
