/**
 * Alert rules over measured data (brief §13).
 *
 * Rules are evaluated client-side against the measured aggregate; they are
 * stored in the operator's browser (labelled local), never faked as server
 * automations. A rule only fires on a real measured value — a null metric
 * (insufficient data) never triggers. Anomaly rules reuse the statistical
 * detector and carry its non-causal label.
 */
import { detectAnomalies, ANOMALY_LABEL } from './anomaly.ts';

export type AlertMetric = 'page_views' | 'sessions' | 'engaged_rate';
export type AlertOp = 'gt' | 'lt' | 'anomaly';

export interface AlertRule {
  id: string;
  label: string;
  metric: AlertMetric;
  op: AlertOp;
  threshold: number;
}

export interface TriggeredAlert {
  rule: AlertRule;
  value: number | null;
  detail: string;
}

export const ALERT_LABEL = 'ALERT ON MEASURED DATA — REVIEW, NOT PROOF';

export const DEFAULT_RULES: AlertRule[] = [
  { id: 'pv-drop', label: 'Daily page views below 5', metric: 'page_views', op: 'lt', threshold: 5 },
  { id: 'eng-low', label: 'Engaged rate below 40%', metric: 'engaged_rate', op: 'lt', threshold: 40 },
  { id: 'pv-anomaly', label: 'Statistical anomaly in daily page views', metric: 'page_views', op: 'anomaly', threshold: 2 },
];

export interface AlertInput {
  latest: Record<AlertMetric, number | null>;
  byDay: [string, number][];
}

export function evaluateRules(rules: AlertRule[], input: AlertInput): TriggeredAlert[] {
  const out: TriggeredAlert[] = [];
  for (const rule of rules) {
    if (rule.op === 'anomaly') {
      const flagged = detectAnomalies(input.byDay, rule.threshold);
      if (flagged.length) {
        out.push({
          rule,
          value: null,
          detail: `${flagged.length} flagged day(s): ${flagged.map((f) => `${f.x} (${f.direction}, z ${f.z})`).join('; ')}. ${ANOMALY_LABEL}`,
        });
      }
      continue;
    }
    const v = input.latest[rule.metric];
    if (v === null || v === undefined) continue; // insufficient data never alerts
    const hit = rule.op === 'gt' ? v > rule.threshold : v < rule.threshold;
    if (hit) {
      out.push({ rule, value: v, detail: `${rule.metric} = ${v} ${rule.op === 'gt' ? '>' : '<'} ${rule.threshold}. ${ALERT_LABEL}` });
    }
  }
  return out;
}