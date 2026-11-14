# ACTTOLOG Metric Dictionary

Every KPI in the Intelligence dashboard is defined here. Definitions are implemented
in `src/lib/metrics.ts` (pure, unit-tested in `src/lib/metrics.test.mts`) and rendered
from `METRIC_DICTIONARY`. No metric is shown without a definition; no rate is shown
when its denominator is zero.

Run the engine tests: `npm run test:unit`.

## Global rules

- **Source of truth:** first-party `AnalyticsEvent` rows, recorded only after the
  visitor grants analytics consent (`src/lib/analytics.ts`, `src/app/api/track/route.ts`).
- **Identity:** events carry an anonymous session id (`sid`) only. No authenticated
  identity, no precise location. "Users" is therefore labelled **Anonymous ids**.
- **Time:** stored UTC; displayed in Asia/Kathmandu.
- **Insufficient data:** any rate with a zero denominator returns `null` and the UI
  renders **"Insufficient measured data"** — never a fabricated 0% or 100%.
- **Comparison:** a period-over-period change is shown only when the previous period
  has a non-zero base; otherwise "no prior-period base".

## Sessionization (explicit)

Events are grouped by `sid`, sorted by time. A **new session** starts when the gap
from the previous event exceeds **30 minutes** (`SESSION_TIMEOUT_MS`).

## Engagement (explicit)

A session is **engaged** if ANY of:
1. duration ≥ **10 seconds** (`ENGAGED_MIN_MS`), OR
2. ≥ **2 page views** (`ENGAGED_MIN_PV`), OR
3. contains a **key event** (`KEY_EVENTS`): sign_in, search, game_launch,
   game_completed, contact_submit, newsletter_subscribe, download, offer_interaction,
   resource_save.

## Metrics

| Key | Name | Formula | Unit | Source |
| --- | --- | --- | --- | --- |
| page_views | Page views | `count(t = page_view)` | count | AnalyticsEvent |
| sessions | Sessions | `sessionize(events, 30m)` | count | AnalyticsEvent |
| users | Anonymous ids | `count(distinct sid)` | count | AnalyticsEvent |
| engaged_sessions | Engaged sessions | `count(engaged sessions)` | count | derived |
| engaged_rate | Engaged rate | `engaged_sessions / sessions × 100` (null if 0 sessions) | percent | derived |
| game_completion_rate | Game completion rate | `count(game_completed) / count(game_launch) × 100` | percent | game events |
| search_success_rate | Search success rate | `count(search_result_selected) / count(search) × 100` | percent | search events |

`game_completion_rate` and `search_success_rate` require the corresponding events to
be emitted by the games/search surfaces; until those events accumulate they report
"Insufficient measured data". They are defined now so the definition is never hidden.

## Fixed defect (2026-11-14)

The previous aggregation computed `eng = users/users × 100` (always 100%) and set
`sessions = users`. Both were replaced by the real engine above. See
`ACTTOLOG_ENTERPRISE_AUDIT.md` §4.