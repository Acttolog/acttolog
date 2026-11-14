# ACTTOLOG Intelligence — Architecture

Phase 2 design. Adapts the Enterprise brief to the **existing** conventions rather
than imposing a parallel stack. Read with `ACTTOLOG_ENTERPRISE_AUDIT.md` and
`METRIC_DICTIONARY.md`.

## Guiding decisions

1. **Extend, don't duplicate.** `/admin/intelligence` and `AnalyticsEvent` already
   exist. The programme grows them; it does not create a second admin or analytics model.
2. **Reuse the design system.** The project uses a hand-authored `globals.css`
   (`panel`, `btn`, `chip`, `badge`, `inp`, `aside`, `anav`) and a custom `Icon`. We keep
   it. shadcn/Radix/Lucide are **not** introduced (they would clash). The 13-theme engine
   in `src/lib/prefs.tsx` already exceeds the 8 requested themes; charts/tables read the
   same CSS variables so they adapt automatically.
3. **Add only gap-filling libraries.** Recharts (charts) and TanStack Table (grid) are
   added, **dynamically imported on admin routes only** — never in the public homepage
   bundle. No competing chart library. Zustand/TanStack Query are optional; URL search
   params + React state cover the filter needs without new global state machinery.
4. **Server-side authorization always.** Every intelligence API uses `requireStaff()`
   (and the new role guard). The client never decides access.
5. **Honesty by construction.** Rates with zero denominators return `null` →
   "Insufficient measured data". Forecasts are labelled "AUTOMATED FORECAST — NOT
   MEASURED". Connectors report only measured connection status.

## Deployment split (brief §41)

| Capability | GitHub Pages (live, static) | Vercel + PostgreSQL (server) |
| --- | --- | --- |
| Public homepage, Earth, games, content | ✅ works | ✅ works |
| First-party event ingestion `/api/track` | ❌ no-op (honest) | ✅ stores |
| Intelligence dashboard data | "No measured data yet" | ✅ measured |
| Connectors / ETL / queries / AI / alerts / reports / audit | ❌ unavailable | ✅ requires DB |

**Blocking dependency:** Vercel deployment + `DATABASE_URL` + server secrets
(`AUTH_SECRET`, `OWNER_EMAIL`, `ADMIN_EMAILS`). Not yet provisioned. The platform is
built and tested locally against the embedded-Postgres harness; it goes live when the
owner activates Vercel + Postgres. The static mirror never fakes server features.

## Folder structure (adapted to existing `src/`)

```
src/
  app/
    admin/
      intelligence/
        page.tsx                  # exists → becomes the shell entry
        overview/ analytics/ content/ audience/ games/ research/ academy/
        geography/ datasets/ connectors/ etl/ queries/ ai-insights/ alerts/
        automations/ reports/ dashboards/ audit/ settings/   # added per phase
      IntelligenceClient.tsx      # exists → refactored into shell + panels
    api/
      admin/
        analytics/route.ts        # exists → uses lib/metrics
        metrics/ datasets/ connectors/ etl/ queries/ ai/ alerts/ reports/
        exports/ audit/           # added per phase, all requireStaff/role-guarded
  lib/
    metrics.ts                    # DONE — pure engine + dictionary (tested)
    analytics.ts                  # exists — client track()
    intelligence/
      filters.ts                  # URL <-> filter state, shared across widgets
      sessionize.ts               # (lives in metrics.ts)
      forecast.ts                 # moving average / exp smoothing / linear trend
      anomaly.ts                  # baseline + deviation, severity
      connectors/
        registry.ts types.ts health.ts
        postgres/ csv/ json/ ga4/ search-console/ github/ vercel/ ...
      etl/                        # import → map → transform → validate → run
      queries/                    # visual builder + allowlisted read-only SQL
      exports/                    # csv / pdf / xlsx, filter+role aware
      rbac.ts                     # Owner/Admin/Analyst/Viewer permission matrix
      audit.ts                    # AuditLog writer (server-only)
  components/
    intelligence/
      shell/ (DashboardShell, Sidebar, Topbar, Breadcrumbs)
      filters/ (GlobalFilterBar, DateRangePicker, RegionSelector)
      metrics/ (KpiCard, MetricComparison, Sparkline)
      charts/ (AreaTrend, Forecast, DrilldownBar, Donut, GeoHeatmap)  # Recharts
      tables/ (DataGrid, ColumnSelector, ExportMenu)                 # TanStack
      ai/ (IntelligenceAssistant, InsightCard, EvidencePanel)
      connectors/ alerts/ automation/ layouts/ themes/
  stores/                         # only if needed; URL params preferred
prisma/
  schema.prisma                   # add missing models per module
  migrations/
docs/
  ACTTOLOG_ENTERPRISE_AUDIT.md    # DONE
  DASHBOARD_ARCHITECTURE.md       # this file
  METRIC_DICTIONARY.md            # DONE
  CONNECTOR_GUIDE.md DATA_GOVERNANCE.md   # added with those modules
```

## RBAC target (brief §25)

Existing session roles: Owner / Admin / Member (`src/lib/auth/session.ts`). Prisma enum
also has EDITOR / CONTRIBUTOR (future). Add **ANALYST** and **VIEWER** to the enum and a
`lib/intelligence/rbac.ts` permission matrix:

- OWNER/ADMIN: full management (users, connectors, alerts, reports, datasets, audit).
- ANALYST: view permitted datasets, build reports, personal dashboards, approved queries,
  export authorized data.
- VIEWER: view assigned dashboards, approved filters/charts, authorized reports.
- MEMBER: no intelligence access (existing behavior preserved).

Enforced in every API via a `requireRole(min)` guard built on `requireStaff`.

## Schema additions (incremental, per module — brief §27)

Added only when their module is built, with relations/indexes/UTC timestamps:
MetricDefinition, MetricSnapshot, DataSource, ConnectorConfig, ConnectorSyncRun,
Dataset, DatasetVersion, DataImport, ETLJob, ETLRun, TransformationStep,
QueryDefinition, QueryExecution, Dashboard, DashboardWidget, DashboardLayout,
SavedFilter, AlertRule, AlertDelivery, AutomationWorkflow, WorkflowExecution,
ScheduledReport, ReportDelivery, AuditLog, ForecastRun, AnomalyDetection,
DataQualityIssue. **Never** duplicate AnalyticsEvent/GameScore/SavedItem/etc.

## Phasing (tested stages)

- **Stage 1 (done):** audit, architecture, metric dictionary, truthful metric engine
  (10 unit tests), wired into `/api/admin/analytics` + IntelligenceClient.
- **Stage 2:** foundational schema (AuditLog, MetricDefinition/Snapshot) + RBAC guard +
  intelligence shell with URL global filters.
- **Stage 3:** Recharts charts + TanStack grid + executive overview KPIs.
- **Stage 4:** AI assistant (deterministic-first), connectors registry, ETL, queries.
- **Stage 5:** forecast/anomaly, alerts, automations, reports, audit UI.
- **Stage 6:** homepage discovery integration, new games, mobile/a11y/perf, full QA,
  deploy static-safe parts, verify live; flag server parts awaiting Vercel+Postgres.

Each stage: `npm run test:unit` + `npx tsc --noEmit` + relevant puppeteer suite + build.