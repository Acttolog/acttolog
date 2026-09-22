'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge, AccessBadge } from '@/components/ui/Badges';
import { HealthBadge } from './AdminDashClient';
import type { Health } from '@/lib/system';

/** Admin page header (prototype `aH`). */
export function AHead({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <h1 className="font-display font-bold text-[clamp(1.42rem,3vw,2rem)] tracking-[-.025em]">{title}</h1>
        {desc && <p className="mut text-[13.5px] mt-2 max-w-[86ch] leading-relaxed">{desc}</p>}
      </div>
      <div className="flex flex-wrap gap-2.5">{actions}</div>
    </div>
  );
}

/** Honest "editing activates with database" notice. */
export function DbNotice({ configured }: { configured: boolean }) {
  if (configured) return null;
  return (
    <div className="panel p-4 mb-5 flex items-start gap-3"
      style={{ borderColor: 'color-mix(in srgb,var(--warn) 34%,transparent)', background: 'color-mix(in srgb,var(--warn) 7%,transparent)' }}>
      <span style={{ color: 'var(--warn)', marginTop: 2 }}><Icon name="spark" size={17} /></span>
      <div>
        <div className="text-[13.4px] font-medium mb-1">Read-only mode</div>
        <p className="mut text-[12.4px] leading-relaxed max-w-[90ch]">
          Content below is the live published seed. Editing, scheduling, revisions and publishing workflows activate
          once PostgreSQL is connected (Admin → Integrations → Database). Nothing is faked in the meantime.
        </p>
      </div>
    </div>
  );
}

export interface ColumnDef { key: string; label: string }

/** Generic collection table (prototype `admCol`), read-only until DB is connected. */
export function CollectionTable({ rows, cols, empty = 'No entries yet.' }: {
  rows: Record<string, unknown>[];
  cols: ColumnDef[];
  empty?: string;
}) {
  const cell = (r: Record<string, unknown>, k: string) => {
    const v = r[k];
    if (v && typeof v === 'object') {
      const bi = v as { en?: string; ne?: string };
      return <span title={bi.ne || ''}>{bi.en || '—'}</span>;
    }
    if (k === 'status') return <StatusBadge status={String(v || '')} />;
    if (k === 'access') return <AccessBadge access={String(v || 'public')} />;
    if (typeof v === 'boolean') return v ? <span className="badge b-ok">yes</span> : <span className="dim">no</span>;
    if (Array.isArray(v)) return <span className="dim">{v.length ? v.slice(0, 3).join(', ') : '—'}</span>;
    if (v == null || v === '') return <span className="dim">—</span>;
    return <span className="truncate block max-w-[26ch]" title={String(v)}>{String(v)}</span>;
  };

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              {cols.map((c) => <th key={c.key}>{c.label}</th>)}
              <th style={{ width: 90, textAlign: 'right' }}>View</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r, i) => (
              <tr key={String(r.id || i)}>
                {cols.map((c) => <td key={c.key}>{cell(r, c.key)}</td>)}
                <td style={{ textAlign: 'right' }}>
                  {r.__href ? (
                    <Link className="btn btn-g btn-sm !px-2.5 !py-1.5" href={String(r.__href)}>
                      <Icon name="eye" size={13} />
                    </Link>
                  ) : <span className="dim">—</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={cols.length + 1} className="text-center py-12 mut">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { HealthBadge };
export type { Health };
