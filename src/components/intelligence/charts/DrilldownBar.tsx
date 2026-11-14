'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-[11.5px]"
      style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt)' }}
    >
      <span className="mono">{d.name}</span>: <span className="mono">{d.value.toLocaleString('en-US')}</span>
    </div>
  );
}

/**
 * Horizontal categorical bars (divisions / event types). Clicking a bar invokes
 * onSelect so the dashboard can cross-filter. Horizontal bars are used for
 * categories per the dense-dashboard convention (no pie/donut).
 */
export function DrilldownBar({
  data,
  onSelect,
}: {
  data: [string, number][];
  onSelect?: (key: string) => void;
}) {
  if (!data.length) {
    return <p className="mut text-[12.6px]">No measured views yet.</p>;
  }
  const rows = [...data].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const height = Math.max(180, rows.length * 34);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--line)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--dim)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={104} tick={{ fill: 'var(--mut)', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--line)' }} />
          <Bar
            dataKey="value"
            fill="var(--cy)"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            cursor={onSelect ? 'pointer' : 'default'}
            onClick={(entry) => {
              const name = (entry as unknown as { name?: string })?.name;
              if (name && onSelect) onSelect(name);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}