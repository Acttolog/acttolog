import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Body = z.object({
  kind: z.string().max(30),
  id: z.string().max(80),
  title: z.string().max(300),
  route: z.string().max(300).nullable().optional(),
  remove: z.boolean().optional(),
});

/** GET /api/saved — private saved list for the signed-in user. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ items: [] });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ items: [], stored: false });
  const items = await prisma.savedItem.findMany({
    where: { userId: user.uid }, orderBy: { at: 'desc' }, take: 200,
  });
  return NextResponse.json({ items: items.map((i) => ({ kind: i.kind, id: i.refId, title: i.title, at: i.at })), stored: true });
}

/** POST /api/saved — toggle a saved item (server-side, private by default §49). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: true, stored: false });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const where = { userId_kind_refId: { userId: user.uid, kind: body.kind, refId: body.id } };
  if (body.remove) {
    await prisma.savedItem.deleteMany({ where: { userId: user.uid, kind: body.kind, refId: body.id } });
  } else {
    await prisma.savedItem.upsert({
      where,
      create: { userId: user.uid, kind: body.kind, refId: body.id, title: body.title, route: body.route },
      update: { title: body.title },
    });
  }
  return NextResponse.json({ ok: true, stored: true });
}
