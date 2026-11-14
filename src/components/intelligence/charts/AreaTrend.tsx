'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FORECAST_LABEL, type Forecast } from '@/lib/intelligence/forecast';

interface Datum {
  label: string;
  measured?: number | null;
  forecast?: number | null;
  lower?: number | null;
  upper?: number | null;
}

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: Datum }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isForecast = d.measured == null && d.forecast != null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-[11.5px]"
      style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt)' }}
    >
      <div className="mono dim mb-1 text-[10px] tracking-[.12em]">{label}</div>
      {d.measured != null && <div>Measured: <span className="mono">{d.measured.toLocaleString('en-US')}</span></div>}
      {d.forecast != null && (
        <div style={{ color: 'var(--vi)' }}>
          Forecast: <span className="mono">{d.forecast.toLocaleString('en-US')}</span>
          {d.lower != null && d.upper != null && (
            <span className="dim"> ({d.lower}–{d.upper})</span>
          )}
        </div>
      )}
      {isForecast && <div className="dim mt-1 text-[9.5px] tracking-[.08em]">{FORECAST_LABEL}</div>}
    </div>
  );
}

/**
 * Measured page-view trend (area) with an optional, clearly-separated forecast
 * overlay. Measured uses the theme accent; forecast uses the secondary colour and
 * is labelled "AUTOMATED FORECAST — NOT MEASURED" — never blended into measured.
 */
export function AreaTrend({
  data,
  forecast,
  height = 220,
}: {
  data: [string, number][];
  forecast?: Forecast | null;
  height?: number;
}) {
  if (!data.length) {
    return <p className="mut text-[12.6px]">No events in this period.</p>;
  }

  const rows: Datum[] = data.map(([label, v]) => ({ label, measured: v }));
  const boundary = forecast && forecast.points.length ? rows[rows.length - 1].label : null;
  if (forecast) {
    forecast.points.forEach((p, i) => {
      rows.push({ label: `+${i + 1}`, forecast: p.y, lower: p.lower, upper: p.upper });
    });
  }

  return (
    <div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="atlMeasured" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cy)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--cy)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="atlForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--vi)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--vi)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--dim)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--dim)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <Tooltip content={<Tip />} />
            {boundary && <ReferenceLine x={boundary} stroke="var(--vi)" strokeDasharray="4 4" />}
            <Area type="monotone" dataKey="measured" stroke="var(--cy)" strokeWidth={2} fill="url(#atlMeasured)" connectNulls={false} isAnimationActive={false} />
            {forecast && (
              <Area type="monotone" dataKey="forecast" stroke="var(--vi)" strokeWidth={2} strokeDasharray="5 4" fill="url(#atlForecast)" connectNulls={false} isAnimationActive={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {forecast && (
        <div className="mono mt-2 text-[9.5px] tracking-[.14em]" style={{ color: 'var(--vi)' }}>
          {FORECAST_LABEL} · {forecast.method} · based on {forecast.basedOn} measured points
        </div>
      )}
    </div>
  );
}