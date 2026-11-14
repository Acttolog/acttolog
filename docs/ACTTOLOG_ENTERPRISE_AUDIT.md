# ACTTOLOG Enterprise Audit

Phase 1 of the Enterprise Intelligence programme. Every claim below is backed by a
file path or a live measurement taken on **2026-11-14**. Nothing here is invented;
where a number could not be measured it is labelled as such.

Live site measured: <https://acttolog.github.io/> (fetched 2026-11-14T17:24Z).
Baseline `npx tsc --noEmit` → **exit 0** (clean) before any change.

---

## 1. Existing architecture

| Layer | Reality | Evidence |
| --- | --- | --- |
| Framework | Next.js **16.3.5** App Router, React **19.2.8**, TypeScript 5 | `package.json` |
| Styling | Tailwind v4 installed, but the design system is a hand-authored **unlayered `globals.css`** (~8,300 lines) with utility classes (`panel`, `btn`, `btn-p`, `btn-g`, `chip`, `badge`, `inp`, `aside`, `anav`). **No shadcn/Radix component library is present.** | `src/app/globals.css`, `src/app/admin/AdminNav.tsx` |
| Data | Prisma **6.19** + PostgreSQL (Supabase-compatible). Two-mode content layer: DB when `DATABASE_URL` is set, bundled seed otherwise. | `prisma/schema.prisma`, `src/lib/db.ts` |
| Auth | `jose` HS256 httpOnly cookie JWT; roles resolved server-side from `OWNER_EMAIL` / `ADMIN_EMAILS`; **fail-closed** if `AUTH_SECRET` missing/public in production. | `src/lib/auth/session.ts` |
| 3D Earth | `three` 0.186 + `@react-three/fiber` 9; quality tiers AUTO/HIGH/MEDIUM/LOW/MOBILE. | `src/components/three/EarthScene.tsx` |
| Motion | `gsap` 3.15 + native scroll-driven CSS (`animation-timeline`), IntersectionObserver reveals, reduced-motion gated. | `src/components/fx/Motion.tsx`, `src/components/Reveal.tsx` |
| Icons | Custom `Icon` component (not Lucide). | `src/components/ui/Icon.tsx` |
| Deploy | Static harvest → GitHub Pages mirror (`pages-deploy`). `.nojekyll` preserved. | `tools/build-pages-site.js`, `tools/sync-pages-deploy.js` |

**Stack note:** the brief proposes shadcn/ui + Radix + Lucide + Recharts + TanStack +
Zustand + TanStack Query + React Grid Layout. The existing project deliberately uses
its own premium design system. To avoid a clashing second UI language, this programme
**reuses the existing tokens/components** and adds only the libraries that fill a real
gap (charts + data grid). The 13-theme engine already exceeds the 8 themes requested.

## 2. Existing routes (measured from `src/app/**/page.tsx`)

- **Public:** `/`, `/ne`, `/explore` (Earth/Map/Sat), `/nepal`, `/research`,
  `/entertainment` (+`[slug]`), `/academy` (+`[slug]`), `/games` (+`[slug]`),
  `/darkroom` (+`[slug]`), `/blog` (+`[slug]`), `/offers` (+`[slug]`), `/about`,
  `/contact`, `/ai`, `/search`, `/design-lab`, `/loksewa` (+`[paper]`, `[paper]/[subject]`,
  `print/[doc]`, `explorer`, `downloads`), `/forbidden`.
- **My ACTTOLOG (private):** `/my`, `/my/saved`, `/my/recent`, `/my/games`,
  `/my/academy`, `/my/darkroom`, `/my/ai`, `/my/notifications`, `/my/settings`.
- **Admin (28 pages):** dashboard, home, settings, navigation, seo, research,
  entertainment, academy, games, darkroom, blog, offers, messages, users, roles,
  **analytics**, **intelligence**, scene, ai, media, backup, integrations, security,
  system, login.
- **API:** `admin/analytics`, `admin/backups(+backup)`, `admin/messages`, `admin/users`,
  `ai`, `auth/{google,callback,session,signout}`, `contact`, `darkroom/{check,nl,submit}`,
  `my/deletion`, `newsletter`, `saved`, `search`, `track`.

`/admin/intelligence` **already exists** and renders `IntelligenceClient`
(`src/app/admin/IntelligenceClient.tsx`). The programme extends it; it does not
create a parallel admin.

## 3. Existing Prisma models (40)

Identity/CMS: `User`, `Role`(enum), `SiteSettings`, `NavigationItem`, `Division`,
`Page`, `HomeSection`. Research: `ResearchService`, `ResearchProgram`,
`ResearchPackage`. Entertainment: `EntertainmentItem`. Academy: `AcademyCourse`,
`AcademyModule`, `AcademyLesson`. Games: `Game`, `GameScore`, `GameProgress`.
Darkroom: `DarkroomResource`, `DarkroomCategory`, `DarkroomCollection`,
`DarkroomSubmission`, `DarkroomSettings`. Blog: `BlogPost`, `BlogCategory`, `BlogTag`.
Commerce: `Offer`, `Order`, `Payment`. Media: `MediaAsset`. Communication:
`ContactMessage`, `NewsletterSubscriber`, `Notification`. AI: `AiConversation`,
`AiMessage`. SEO/analytics/system: `SEOSettings`, **`AnalyticsEvent`**,
`AnalyticsIntegration`, `BackupRecord`. My: `SavedItem`, `RecentItem`.

**Already present and must NOT be duplicated:** `AnalyticsEvent` (t, path, div, sid,
src, dev, geo, q, meta, ts; indexed on ts / [t,ts] / [div,ts]), `AnalyticsIntegration`
(GA4), `GameScore`/`GameProgress`, `SavedItem`/`RecentItem`, `Notification`,
`BackupRecord`, `AiConversation`/`AiMessage`.

**Genuinely missing (candidates for Phase 3):** MetricDefinition, MetricSnapshot,
DataSource/ConnectorConfig, ConnectorSyncRun, Dataset/DatasetVersion, DataImport,
ETLJob/ETLRun/TransformationStep, QueryDefinition/QueryExecution,
Dashboard/DashboardWidget/DashboardLayout, SavedFilter, AlertRule/AlertDelivery,
AutomationWorkflow/WorkflowExecution, ScheduledReport/ReportDelivery, AuditLog,
ForecastRun, AnomalyDetection, DataQualityIssue. These are added **only as each module
is built**, with correct relations/indexes — not all at once.

## 4. Existing analytics — and a real truthfulness defect

Pipeline (real, working):
- Client `track()` is **consent-gated** (`window.__atlConsent.analytics`) and attaches
  only an anonymous session id (`src/lib/analytics.ts`).
- `POST /api/track` stores UTC events, derives coarse device from UA, **never attaches
  identity**; no-ops honestly when DB absent (`src/app/api/track/route.ts`).
- `GET /api/admin/analytics` aggregates behind `requireStaff()`; CSV export supported
  (`src/app/api/admin/analytics/route.ts`).
- `IntelligenceClient` shows period chips, live-now, KPI cards, trend bars, division
  bars, a deterministic "ask your data", event breakdown; honest "No measured data yet"
  empty state when DB is not configured.

**DEFECT (must fix — violates the brief's honesty rules):**
1. `eng` is computed as `Math.round((users.size / Math.max(1, users.size)) * 100)` →
   **always 100%**. "Engaged %" is a fabricated constant, not a measurement.
   (`route.ts:48`)
2. `sessions` is set equal to `users` (unique sid count). There is **no sessionization**
   (no 30-minute inactivity window), so "sessions" is really "unique anonymous ids".
   (`route.ts:46-47`)
3. `geo` column exists but is never populated by `/api/track`; geographic panels would
   have no data. (`schema.prisma:493`, `track/route.ts`)

These are the first code changes in Phase 4: a real metric engine with explicit
sessionization and an engaged-session definition, or an honest "Insufficient measured
data" label.

## 5. Authentication & authorization review

- Server-side guard `requireStaff()` on admin APIs; client never decides authz.
- Session roles collapse to **Owner / Admin / Member** (`session.ts:16`). The Prisma
  `Role` enum also lists EDITOR/CONTRIBUTOR (marked future). **ANALYST and VIEWER do
  not exist yet** — Phase 3/14 must add them and map existing roles.
- Strong posture: `AUTH_SECRET` fail-closed in prod; `sanitizeReturn` blocks open
  redirects; analytics separated from identity; paid `.lk-paid/` material excluded from
  the mirror (QA asserts 404 on `/loksewa/dl/slides-*.pptx`).
- Gaps: no **AuditLog**, no granular dataset permissions, `ratelimit.ts` exists but
  track ingestion should be confirmed rate-limited.

## 6. Earth / 3D

`EarthScene.tsx` renders the globe with EARTH/MAP/SAT modes and a HUD. Live HUD shows
`7 NODES · 12 LINKS · 36 ENTITIES`, quality MEDIUM. Fields like `ZULU —`, `NPT —`,
`RENDER —`, `ALT —` read as dashes **in the pre-hydration static HTML** and fill in via
JS once mounted — this is expected, not a broken feature (confirmed: the globe and HUD
render in a real browser; 2 WebGL canvases, 900px hero). The brief's "unavailable HUD
values" are these pre-hydration placeholders; no fabricated telemetry is shown.

## 7. Games catalogue (reconciled)

The brief says "nine games"; the **live Games division shows 13**. Reconciliation:
- `public/arcade/src/data.js` registers **10** playable arcade games: Khoja Nepal,
  Merge Himalaya, Himalaya Stack, TypeRush Nepal, Nepal Daily, Ludo Himalaya,
  Snake Himalaya, Himalaya Breakout, Danphe Flight, Memory Nepal.
- `public/cube26/` is a standalone 3D CUBE/26 app (11th).
- `seed.json` `games[]` adds **Orbit Recall** and **Signal Drift** (CMS records) → 13.
- `seed.json` has **9** CMS `Game` records; the other 4 are arcade-direct-play.
All arcade games are original, CC-licensed photo assets credited in-app, map data
© OpenStreetMap / © CARTO. New games (Phase 17) must follow the same licensing rule.

## 8. Content counts — displayed vs published (live, 2026-11-14)

| Item | Live display | Source |
| --- | --- | --- |
| Divisions | 5 | seed `divisions[]` |
| Research services | 12 | descent stratum 01 |
| Darkroom resources | 45 | descent stratum 02 |
| Academy courses | 3 | descent stratum 03 |
| Entertainment items | 7 | descent stratum 04 |
| Games | 13 | descent stratum 05 (brief's "9" is stale) |
| Blog articles | 7 | index section |
| Nepal places / regions | 32 / 12 | ticker + Nepal guide |
| Loksewa papers / subjects / points / questions | 4 / 17 / 171 / 14 | deck Loksewa card |

These are **content-ledger counts**, not traffic analytics. The homepage Mission Control
deck reads them from the site's own ledger ("nothing invented"). The deck's CONTENT INDEX
counters read `0` in static HTML and **count up on scroll** (IntersectionObserver) —
verified animating to real values in `tools/deck-qa.js` (24/24). Not a defect.

## 9. Themes

13 themes already shipped (`src/lib/prefs.tsx`): Obsidian, Daylight, Midnight Indigo,
Aurora Teal, Sunset Ember, Himalayan Paper, Cyber Terminal, Royal Violet Gold, Deep
Ocean, Rose Quartz, Nebula Violet, Titanium Light, Holographic Ice. Persisted in
`localStorage`, applied pre-paint by a boot script in `layout.tsx`. This **exceeds** the
8 requested; Phase 15 ensures charts/tables/HUDs adapt to the active theme rather than
adding a competing engine.

## 10. Performance / accessibility / responsive

- Static mirror is fast; charts are hand-rolled (light). Three.js is quality-gated.
- Existing QA suites (puppeteer): deck 24/24, research 17/17, arcade 111/111,
  Loksewa 45/45; 320px + 390px overflow clean; reduced-motion respected; focus-visible
  outlines present.
- No Recharts/TanStack yet → Phase 7/8 add them with bundle discipline (dynamic import,
  only on admin routes, never on the public homepage).

## 11. Deployment architecture — the single blocking dependency

- **GitHub Pages (live):** static only. API routes, Prisma, auth callbacks and analytics
  ingestion **do not execute** there. `getPrisma()` returns null → analytics honestly
  shows "No measured data yet".
- **Vercel + PostgreSQL:** chosen by the owner (per project memory) but **not deployed**;
  `acttolog.com` does not resolve. `DATABASE_URL` is **not set** in this build environment
  (verified: only `.env.example` exists; `process.env.DATABASE_URL` is empty).

**Consequence:** the entire Intelligence platform (connectors, ETL, query builder, AI
queries, forecast, anomaly, alerts, automations, reports, audit) is server+DB dependent.
It can be **built and tested locally** against the embedded-Postgres harness and will run
on Vercel once deployed, but it **cannot show live measured data on the static Pages
mirror**, and this programme will never fake it. Activating Vercel + a PostgreSQL URL +
server secrets is the one external step that requires the owner's accounts.

## 12. Implementation priorities

1. **Truthfulness fix (Phase 4):** real sessionization + engaged-session metric; kill the
   constant-100% `eng`; metric dictionary. Highest value, smallest risk.
2. **Schema (Phase 3):** add missing models incrementally per module; RBAC ANALYST/VIEWER.
3. **Shell + filters + overview (Phase 4-6):** extend `/admin/intelligence` into the
   sectioned shell with URL-persisted global filters and truthful KPI cards.
4. **Charts + grid (Phase 7-8):** Recharts + TanStack Table, theme-aware, admin-only bundle.
5. **AI assistant (Phase 9):** deterministic-first, honesty labels, permission-enforced.
6. **Data platform (Phase 10-14):** connectors (real status checks), ETL, query builder,
   forecast/anomaly (labelled, evaluated), alerts, automations, reports, audit log.
7. **Homepage + games (Phase 16-17):** discovery overview with real CMS content (keep
   Earth/strata); original playable games added progressively.
8. **QA + deploy (Phase 18-20):** full suite, build, deploy static-safe parts, verify live;
   flag server-dependent parts as awaiting Vercel+Postgres.

## 13. What will NOT be done (honesty guardrails)

- No fabricated visitor numbers, growth %, data-quality scores or "LIVE" badges.
- No connector shown CONNECTED without a successful connection check.
- No forecast labelled as measured; forecasts carry "AUTOMATED FORECAST — NOT MEASURED".
- No duplicate models/admin systems; extend what exists.
- No paid `.lk-paid/` material in any deploy.
- No source-repo push without fresh owner approval (standing gate).