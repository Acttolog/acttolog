import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiReply, openaiConfigured } from '@/lib/ai';
import { rateLimit, clientKey } from '@/lib/ratelimit';
import { getSessionUser } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Body = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(['act', 'actweb']).default('act'),
  locale: z.enum(['en', 'ne']).default('en'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().max(4000),
  })).max(20).optional(),
  conversationId: z.string().max(64).optional(),
});

/** POST /api/ai — Acttolog AI (spec §56–62). Rate-limited; server-side keys only. */
export async function POST(req: Request) {
  if (!rateLimit(`ai:${clientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const reply = await aiReply({
    question: body.message,
    mode: body.mode,
    locale: body.locale,
    history: body.history,
  });

  // Saved conversations: signed-in users only, when persistence is available (§60)
  const user = await getSessionUser();
  if (user && body.conversationId) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.aiConversation.upsert({
          where: { id: body.conversationId },
          create: {
            id: body.conversationId,
            userId: user.uid,
            title: body.message.slice(0, 46),
            mode: body.mode,
            messages: {
              create: [
                { role: 'user', text: body.message },
                { role: 'assistant', text: reply.answer, sources: reply.sources as object[] },
              ],
            },
          },
          update: {
            mode: body.mode,
            messages: {
              create: [
                { role: 'user', text: body.message },
                { role: 'assistant', text: reply.answer, sources: reply.sources as object[] },
              ],
            },
          },
        });
      } catch (e) {
        console.error('conversation persist failed', e);
      }
    }
  }

  return NextResponse.json({
    answer: reply.answer,
    sources: reply.sources,
    provider: reply.provider,
    mode: reply.mode,
    openaiConfigured: openaiConfigured(),
  });
}
