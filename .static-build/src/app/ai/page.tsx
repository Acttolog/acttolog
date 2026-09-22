import type { Metadata } from 'next';
import { Reveal } from '@/components/ui/Reveal';
import { AiPageClient } from './AiPageClient';
import { seoFor } from '@/lib/content';

export const metadata: Metadata = {
  title: seoFor('/ai').title,
  description: seoFor('/ai').desc,
  alternates: { canonical: '/ai' },
};

export default function AiPage() {
  return (
    <section className="pt-[calc(var(--nav)+44px)] pb-16">
      <div className="wrap">
        <Reveal>
          <div className="sechead">
            <div>
              <div className="eyebrow mb-3">ACTTOLOG AI</div>
              <h1 className="h1 !text-[clamp(1.9rem,5vw,3.4rem)] max-w-[20ch]">Acttolog AI</h1>
              <p className="lead mt-5">
                Acttolog-first assistant: it searches published Acttolog content first — Thesyn Research, Darkroom,
                Blog, Academy, Games, Entertainment and Offers — and only then the external web, always labelled.
              </p>
            </div>
          </div>
        </Reveal>

        <AiPageClient />

        <Reveal>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              ['Source priority', 'ACTTOLOG SOURCE cards come from published content. EXTERNAL WEB SOURCE is labelled separately and never mixed in.', 'brain'],
              ['Honesty rules', 'No fabricated URLs, prices, statistics or guarantees. When Acttolog has nothing, the assistant says so plainly.', 'shield'],
              ['Private by default', 'Guest chats are temporary. Signed-in conversations stay private — reopen, rename or delete any time.', 'lock'],
            ].map(([title, body, icon]) => (
              <div key={title} className="panel p-6">
                <div className="eyebrow mb-4">{title.toUpperCase()}</div>
                <p className="mut text-[12.9px] leading-relaxed">{body}</p>
                <span className="hidden">{icon}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
