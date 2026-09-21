# ACTTOLOG — Welcome to Acttolog World

**Discover. Learn. Create. Connect.** · **One World. Endless Possibilities.** · **Explore the Digital World.**

Production website of the Acttolog digital ecosystem — rebuilt from the audited HTML prototype into a real,
secure, CMS-ready, multilingual (English + नेपाली) production application.

🌐 https://www.acttolog.com

---

## Ecosystem

```text
ACTTOLOG
│
├── THESYN RESEARCH   Research & Academic Support     /research
├── ENTERTAINMENT     Stories & Digital Media         /entertainment
├── ACADEMY           Learning & Knowledge            /academy   (protected)
├── GAMES             Interactive Experiences         /games     (play = Google sign-in)
├── DARKROOM          Digital Discovery & Resources   /darkroom  (fully public)
├── BLOG                                              /blog
├── OFFERS                                            /offers
├── ABOUT US                                          /about
├── CONTACT US                                        /contact
├── ACTTOLOG AI                                       /ai
└── ACTTOLOG INTELLIGENCE                             /admin/intelligence (private)
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, webpack builder for low-memory CI) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 + migrated prototype design tokens (dark/light, cyan/violet/magenta) |
| 3D | three.js + React Three Fiber + drei + postprocessing — `EarthScene` with High/Medium/Low tiers |
| Fonts | next/font (Space Grotesk · Inter · JetBrains Mono · Noto Sans Devanagari) — build-time, no CDNs |
| Database | PostgreSQL (Supabase-compatible) via Prisma 6 — optional at runtime (seed-content fallback) |
| Auth | Google OAuth 2.0 code flow · server-side ID-token verification (jose + Google JWKS) · httpOnly JWT cookie |
| AI | OpenAI (server-side only) with Acttolog-first retrieval fallback — honest, never fabricates |
| Analytics | First-party consent-gated events (PostgreSQL) + GA4 after consent |

## Quick start

```bash
npm install
cp .env.example .env        # fill what you have; everything degrades gracefully
npm run dev                 # http://localhost:3000
```

Production:

```bash
npm run build               # next build --webpack (memory-friendly)
npm start
```

With a database connected:

```bash
npx prisma db push          # or prisma migrate deploy
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (webpack) |
| `npm start` | Production server |
| `npm run lint` | ESLint (flat config, eslint-config-next 16) |
| `npm run typecheck` | tsc --noEmit |
| `npm test` | typecheck + lint + build |
| `npm run db:push` | Prisma schema → database |
| `npm run db:seed` | Re-extract prototype content → `src/lib/content/seed.json` |

## Architecture notes

- **Content layer** (`src/lib/content`): typed seed content extracted *mechanically* from the audited
  prototype (tool: `tools/extract-seed.mjs`). When `DATABASE_URL` is set, Prisma becomes the source of
  truth; until then the site serves the same real copy with zero fabricated metrics.
- **Honesty rules** (enforced in code): no sample data presented as traffic; AI never invents sources;
  integrations report real `Not Configured` states; payments never report success without provider
  verification; Darkroom popularity numbers stay private; automated link checks are never called a
  safety guarantee.
- **Privacy**: owner email lives only in server env (`OWNER_EMAIL`) and never renders publicly;
  profiles private by default; no public directories/feeds/followers; Darkroom search never
  personalised; account deletion is a reviewed admin workflow.
- **i18n**: manual EN | नेपाली switch (never browser-auto), persisted; bilingual content model
  `{en, ne}` with fallback flagging (`नेपाली बाँकी`).
- **3D Earth**: day/night terminator shader, fresnel atmosphere, stars, dust, orbital rings,
  great-circle arcs, 5 clickable division nodes, scroll-linked dolly, drag inertia, pointer parallax,
  IntersectionObserver pause, `prefers-reduced-motion` still frame, WebGL-failure poster fallback.
  Tiers: High (bloom, pulses, DPR≤2) · Medium · Low (no labels/particles, DPR 1).
- **Security**: server-side authz on every admin page/API (`requireStaff`), edge middleware as
  convenience layer only, CSRF state cookie on OAuth, open-redirect protection, Zod validation,
  rate limiting, honeypot on public forms, security headers (HSTS, XFO, XCTO, Referrer, Permissions).

## Environment

See `.env.example` — every variable is optional for local runs; production requires
`AUTH_SECRET`, and features activate as credentials appear (Admin → Integrations shows real status).

## Remaining (tracked, honest)

- CMS write flows (admin CRUD mutations) — schema + admin console ready; editors activate with DB
- Google Drive backup jobs — policy/records modeled; service account pending authorization
- Payment adapters — modular, disabled until a provider is authorized
- CSP header — deferred to hardening pass (needs nonce wiring for inline theme script)
- Email delivery — provider pending; contact/newsletter persist server-side meanwhile

## Repository hygiene

`.env*` is git-ignored. Pre-push secret scan:

```bash
grep -rInE "(api[_-]?key|secret|password|token|PRIVATE_KEY)[\"' ]*[:=][\"' ]*[A-Za-z0-9_\-]{12,}" src prisma tools || echo "clean"
```

© Acttolog — one connected digital world.
