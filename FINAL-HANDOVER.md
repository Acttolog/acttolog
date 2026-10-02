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

---

# ADDENDUM — IMMERSIVE 3D DIGITAL WORLD UPGRADE (2026-10-02)

Same codebase, same deployments. The BEAST-MODE "digital world" pass below was implemented
directly on top of the verified production app (no rebuild, no parallel demo).

## Added / upgraded (all browser-verified, see VERIFIED)
- **First-visit experience** (§35): WELCOME TO ACTTOLOG WORLD card with EXPLORE EARTH /
  ENTER ACTTOLOG / SEARCH WORLD + skip; once per browser; never stacks on the consent dialog.
- **Hero (§3)**: EXPLORE EARTH → `/explore?mode=earth`, ENTER ACTTOLOG, SEARCH WORLD (⌘K).
  Hero deck gained COMMAND CENTER (carries current camera into /explore).
- **⌘K command center (§18/§26)**: WORLD COMMANDS grid (Earth/Map/Sat/360/Search Kathmandu/
  Pokhara/Research/Academy/Games/Darkroom/AI/My ACTTOLOG) + live **PLACES** group (Nominatim,
  deep-linked). `/search` page gained the same PLACES group. Deep links re-apply live when
  clicked while already on /explore (searchParams re-application).
- **/explore fixes + upgrades**: real WASD/arrow movement, 1–4 mode keys, `/` search, Space
  recenter (help dialog now matches reality); DISCOVER drawer (18 real places, 8 categories);
  all 9 camera presets; Street View honesty chip (map/sat/360 + place) with CONFIGURATION
  REQUIRED panel; 360 `world=` deep links; mobile bottom command bar + bottom-sheet place panel.
- **Layout bug fixed (pre-existing)**: `.panel`/`.hud` outside-layer `position` defeated Tailwind
  `absolute`, so the explore HUD + mode bar rendered as full-width bands; now positioned wrappers.
- **Null-Island bug fixed (pre-existing)**: `Number(null) === 0` made bare `/explore` fly to (0,0)
  zoom 2; params are now parsed strictly with range validation.
- **360 worlds (§23)**: 6 → 11 procedural worlds (Editorial, Offers, Entertainment, Intelligence
  Core, Global Contact added); per-world hotspots (35) that travel world→world and world→section;
  pinch-zoom on touch; home WorldShowcase lists all 11 with launchers.
- **World nodes (§17)**: globe nodes 5 → 7 (Blog, AI) with new connection arcs; config registry
  adds BLOG/AI/EARTH nodes + 18-card DISCOVERY registry (real coordinates only).
- **Section world portals (§13/WOW6)**: WorldPortal (CSS/SVG portal, reduced-motion aware) on
  research, academy, entertainment, games, darkroom, blog, offers, about, contact, ai —
  each ENTER THE PORTAL → `/explore?mode=360&world=…` + VIEW ON EARTH.
- **Google service layer (§10/§53)**: `src/lib/world/google.ts` (Maps JS loader, Places
  Autocomplete/Details, Street View embed URL) + admin integration rows (Google Maps Platform,
  OSM, Esri) + boot line + help-dialog setup steps. Dormant until the key exists; never faked.
- **Place Explorer (§7/§20)**: 14 nearby categories (nodes+ways via Overpass), DIRECTIONS
  (OSM directions, external), Google-sourced result labels when Places is active.

## VERIFIED (this addendum)
- `npm test` (typecheck + eslint + build): green — eslint 0 errors.
- `tools/go-live-verify.js` vs local production build: **46/46**.
- `tools/world-qa.js` (new, committed): **42/42** incl. mobile viewport, deep links, portals,
  zero runtime JS errors; screenshots in `qa-shots/world/`.
- Static mirror harvest (`tools/build-static.sh` + `tools/build-pages-site.js`) regenerated with
  the new surfaces present in the output.

## CONFIGURATION REQUIRED (unchanged + one new)
1. `acttolog.com.np` free registration (owner) — DNS steps unchanged.
2. Google OAuth client credentials (owner) — flow already built.
3. Supabase `DATABASE_URL` — CMS/analytics persistence.
4. **NEW**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (+ optional `NEXT_PUBLIC_GOOGLE_MAP_ID`) —
   activates Street View / Places / Google layers; four setup steps in `.env.example` and in
   the /explore help dialog.

## NOT DONE (honest)
- Deployment of this addendum to Vercel/Pages awaits push credentials (see chat report).
- Google-gated runtime paths are compiled + type-checked but not exercised end-to-end
  (no key exists anywhere); they stay dormant and labelled until configured.

