import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Settings | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export default function Page() {
  const s = getDB().settings;
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex flex-wrap justify-between gap-3 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
      <span className="mono text-[10px] tracking-[.16em] dim pt-1">{k.toUpperCase()}</span>
      <span className="mut text-[13px] leading-relaxed max-w-[70ch] text-right">{v}</span>
    </div>
  );
  return (
    <div>
      <AHead title="Settings" desc="Brand, purpose, vision, mission, values, contact and currency rate — all CMS-editable." />
      <DbNotice configured={dbReady()} />
      <div className="panel p-6 sm:p-8">
        <Row k="Brand" v={s.brand} />
        <Row k="Organization" v={s.org} />
        <Row k="Tagline" v={s.tagline.en + ' | ' + (s.tagline.ne || '')} />
        <Row k="Purpose" v={s.purpose.en} />
        <Row k="Vision" v={s.vision.en} />
        <Row k="Mission" v={s.mission.en} />
        <Row k="Values" v={s.values.join(' · ')} />
        <Row k="Phone (public)" v={s.phone} />
        <Row k="Email (public)" v={s.email} />
        <Row k="USD→NPR rate" v={String(s.usdToNpr)} />
        <Row k="Social" v={Object.entries(s.social).filter(([, v]) => v).length ? 'configured' : 'all blank — never add fake links (§83)'} />
      </div>
    </div>
  );
}
