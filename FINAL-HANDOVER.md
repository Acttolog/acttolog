# ACTTOLOG — FINAL HANDOVER (§107)

**Date:** 2026-09-22 · **Campaign:** BEASTMODE full lifecycle · **Source commits:** 19 (main)

---

## 1. Website (live, verified 45/45 smoke checks each)

| Deployment | URL | Nature |
|---|---|---|
| **Production (SSR)** | **https://acttolog.vercel.app** | Full app: server sessions, admin console, APIs, analytics ingestion, 3D Earth, bilingual, consent |
| **Static mirror** | **https://acttolog.github.io** | Same public experience from Next static export; search + AI run from bundled index |
| **Canonical (pending free .com.np registration)** | **https://www.acttolog.com.np** | Canonical switched product-wide (metadata, OG, sitemap, robots, JSON-LD, footer, admin SEO). Domains attached on Vercel (apex→www 301, SSL auto). Goes live the moment the free .com.np registration completes + 2 DNS records added |

## 2. GitHub

| Repository | Purpose |
|---|---|
| https://github.com/Acttolog/acttolog | Source of truth — 19 professional commits, secret-scanned, auto-deploys to Vercel |
| https://github.com/Acttolog/Acttolog.github.io | Pages mirror (built via `tools/build-static.sh`); legacy files preserved on branch `legacy-backup` |

## 3. Hosting
**Vercel** (project `acttolog`, account `mrpramodghimire-6077`) — free Hobby tier, Next.js 16 SSR, deployment protection removed, env keys present (`AUTH_SECRET`, `OWNER_EMAIL` encrypted; `NEXT_PUBLIC_SITE_URL` per target). Auto-deploy on push via CLI/Vercel pipeline.

## 4. Admin (private)
`https://acttolog.vercel.app/admin` → Google sign-in → Owner/Admin gate (three layers: proxy middleware, client gate, server-side re-verification on every `/api/admin/*`).
Owner role resolves from encrypted `OWNER_EMAIL` env — never rendered publicly (leak-scan verified on all key pages).

## 5. Completed & verified systems
- **Audit → migration**: prototype read end-to-end; truncation detected; KEEP/REFACTOR/REBUILD executed
- **Design system**: tokens/components ported 1:1; logo system (SVG icon/horizontal/mono/favicon); dark/light; reduced-motion
- **Content**: 150 KB bilingual seed mechanically extracted (zero fabrication); CMS-ready Prisma schema (40 tables) + initial migration SQL + idempotent `db:seed`
- **Public site**: home 12 layers with 3D Earth (day/night shader, atmosphere, arcs, division nodes, tiers, reduced-motion, WebGL fallback); research/entertainment/academy/games/darkroom/blog/offers/about/contact/ai/search + detail routes; 404/403/500
- **Darkroom**: public browse/search/sort (owner-weighted ranking), NL 3-layer interpretation, profiles, authenticated submission → pre-checks → private queue
- **Auth**: Google OAuth code flow + JWKS verification + httpOnly JWT sessions; My Acttolog (saved/recent/tabs/deletion-request); no profile forms; privacy-by-default
- **Admin console**: 24 sections incl. Intelligence (measured-fact-only, live panel, CSV export), integrations registry with honest statuses, security controls, backup policy UI
- **AI**: Acttolog-first retrieval with labelled sources (ACTTOLOG SOURCE / EXTERNAL WEB SOURCE); OpenAI adapter; honest index-mode fallback (works even on static)
- **Analytics**: consent-gated events (UTC), GA4 loader behind consent, `/api/track`, admin aggregation
- **Backups**: Drive adapter (service-account JWT, ACTTOLOG/Backups chain, indefinite retention) + staff-gated run/list API
- **Payments**: modular registry, disabled until authorized, provider-verified success only
- **SEO/a11y/perf**: per-route bilingual metadata, canonicals, OG, JSON-LD, sitemap, robots, manifest; skip-link, focus management, aria-live; 396 KB textures, tiered 3D, static export
- **QA**: tsc 0 errors · ESLint 0 errors · builds green · §101 smoke suite **45/45 on both live deployments** · browser QA (desktop+mobile, 0 runtime errors) · security scans clean

## 6. Remaining (genuine, in order)
1. **Register `acttolog.com.np` — FREE** at the official .np registry: **https://www.register.com.np**
   - .com.np is free for Nepali citizens (citizenship certificate or passport) and Nepal-registered companies/brands (registration certificate) — the registry verifies documents manually (hours to ~2 days)
   - Steps: create account → Check domain → `acttolog.com.np` → Register (upload your document, fill registrant/admin/tech contacts) → wait for approval → DNS management panel
   - In the register.com.np DNS zone add exactly:
   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |
   - Everything else is pre-wired: Vercel domains attached (apex→www 301), SSL auto-issues, canonical/OG/sitemap/robots/JSON-LD already point at https://www.acttolog.com.np (verified live on the Vercel deployment)
   - Acceptance loop afterwards: `node tools/domain-watch.js` + `node tools/go-live-verify.js https://www.acttolog.com.np`
   - (`acttolog.com` remains attached as well if you ever register it later — no changes needed)
2. **Google OAuth client** (makes "Continue with Google" registrable): Cloud Console → Credentials → OAuth client (Web) → authorized origins `https://www.acttolog.com.np`, `https://acttolog.vercel.app` → redirect URIs `https://www.acttolog.com.np/api/auth/callback` + `https://acttolog.vercel.app/api/auth/callback` → paste Client ID + Secret → set as encrypted Vercel envs (flow already built & tested).
3. **Supabase `DATABASE_URL`** → `npx prisma migrate deploy && npm run db:seed` → contact inbox, saved sync, submissions, analytics storage, admin writes go live.
4. **Optional**: `OPENAI_API_KEY` (AI web-mode), `NEXT_PUBLIC_GA_ID` (confirm no existing property first), Drive service account (weekly backups), payment provider when authorized.

## 7. Security notes
- No secrets in either repository (4-pattern scans + owner-email leak scan clean); `.env` ignored; tokens passed via environment only
- **Revoke now**: the GitHub fine-grained PAT and the Vercel token used in this campaign
- Server-side authorization on every sensitive route; CSRF state cookie on OAuth; rate limits; honeypot; security headers on SSR production

**BUILD ✅ TEST ✅ FIX ✅ PUSH ✅ DEPLOY ✅ VERIFY ✅**
