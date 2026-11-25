# ACTTOLOG Wild Homepage Audit

**Audit date:** 2026-11-25
**Live target:** https://acttolog.github.io/
**Source:** `C:/Users/acttolog/Documents/Qoder/acttolog-src`
**Reference:** Energy Management System Dashboard by arshiya.senselive, Figma Community, CC BY 4.0.

## 1. Purpose

Transform the existing ACTTOLOG homepage into a continuous spatial journey without rebuilding the application or replacing the Earth. The approved direction is:

**Earth → Grand Portal → hinged doors → Digital Atrium → ecosystem dashboard → division portals → real content.**

The implementation must preserve existing routes, authentication, content, games, research services, Academy, Darkroom, Nepal guide, themes, search, and the approved Cambria typography.

## 2. Current structure

`HomeView` currently composes:

1. `Hero` — Earth, aurora, headline, HUD, ticker.
2. `HomeDeck` — 15-card Mission Control rail.
3. `Descent` — six-strata CSS 3D corridor.
4. `HomeSignal` — featured article.
5. `HomeIndex` — five-division editorial ledger.
6. `NepalPromo` — Nepal guide gateway.
7. `HomeStudio` — Academy, Darkroom, Offers.
8. `HomeClose` — final invitation and route marquee.
9. `RadialMenu` — floating division commands.

The Earth is a single R3F `Canvas` inside `EarthScene`, dynamically loaded by `Globe`. Aurora is a separate raw WebGL2 background. Scroll is native and decentralized across Globe, Descent, Hero GSAP, and Motion/ScrollTrigger.

## 3. Existing functional features

Verified live:

- Header navigation, Divisions menu, search button, language control, theme menu.
- Earth layer controls, quality controls, reset, geocoding entry, command center.
- Hero CTAs, spatial view, world search, language alternate.
- Source ledger, ecosystem map, tool bench, quick play, Live Wire, Loksewa counts, offer, theme studio, Nepal counts, notices, pointer studio.
- Descent chapter navigation and mobile command center.
- No horizontal overflow at 768, 390, or 320 CSS pixels.
- 320px page height is 9,549px, under the existing 9,600px budget.

## 4. Confirmed defects

| Defect | Evidence | Root cause / impact |
|---|---|---|
| Content Index shows six zeroes | Live `.dk-stat`: `0 Essays`, `0 Games`, `0 Resources`, `0 Courses`, `0 Screenings`, `0 Services` | `CountUp` starts at zero and waits for `useInView`; the observed card never enters its threshold in the live layout. Real values exist in `HomeView`. |
| Descent skip is broken | `.dsc-skip` is `href="#world"`; live `document.querySelector('#world')` count is `0` | Keyboard activation changes the URL to `#world` but cannot move to a target. |
| Descent copy is rendered twice | `Descent.tsx` renders `ChapterBody` inside every `.dsc-gate` and again in `.dsc-chapter` | DOM/source duplication is real; CSS exposes only one branch in the live accessibility tree. Animated and reduced-motion modes must render one canonical branch each. |
| Division overview repeats | `HomeDeck` Ecosystem, `Descent`, `HomeIndex`, and `Footer` all introduce the five divisions | No canonical portal/navigation owner. |
| Utility configuration dominates homepage | Appearance, Pointer Studio, Tool Bench, Launchpad, Device Pulse all occupy deck cards | Homepage is a control panel rather than a world entrance. |
| Raw routes appear as visual copy | `.hclose-marq` contains `/academy`, `/darkroom`, `/games`, `/nepal`, `/research`, `/loksewa` twice | Route strings are used as decorative words; reads as malformed navigation. |
| HUD placeholders | Globe HUD renders `—` before clocks/FPS/altitude are available | SSR-safe placeholders are visible longer than necessary and read as broken data. |
| Game catalogue scopes are confused | Homepage and `/games` both use 13 published catalogue records; the standalone arcade has 10, CUBE/26 adds one public title, and two member titles bring the catalogue to 13 | The data is not currently divergent, but stale copy says “six browser games” and no registry exposes the distinct scopes. |

## 5. Live layout evidence

- Desktop, tablet, 390px, and 320px top compositions preserve the Earth and primary CTA.
- At exact 390px: `scrollWidth=390`, mobile command bar computes to `display:grid`.
- At exact 320px: `scrollWidth=320`, mobile command bar computes to `display:grid`.
- The public browser connector does not reliably emulate `pointer:coarse`; mobile cursor behavior remains covered by the existing Puppeteer mobile suite rather than this connector session.

## 6. Figma reference findings

The Community page and published preview were accessible without authentication.

**License:** CC BY 4.0.
**Author:** arshiya.senselive.
**Last updated:** one year before the audit.

Observable preview:

- Light canvas: `rgb(248, 250, 249)`.
- Sidebar gradient: `rgb(44, 95, 78)` → `rgb(58, 107, 90)`.
- System UI typography; sidebar labels 500, card headings 600.
- Fixed vertical icon navigation.
- Compact four-field filter bar.
- Four metric cards with status and delta.
- Two-column chart area: distribution overview and demand comparison.
- At 390px the public preview has no page-level horizontal overflow, but no separate mobile frame is observable.

ACTTOLOG will adapt the information hierarchy, not copy protected artwork or energy terminology.

## 7. Animation architecture

- One R3F Canvas owns the Earth.
- Custom camera rig owns position/target/FOV.
- Globe owns drag, wheel zoom, geocoding, layer and quality controls.
- Hero owns a scoped GSAP/ScrollTrigger title tween.
- Descent owns a separate in-view rAF and sticky CSS corridor.
- Motion owns additional ScrollTriggers.
- Aurora owns a raw WebGL2 rAF.
- MagneticPointer owns a global rAF.

The new journey must not add another scroll owner or camera tween. GSAP will own one journey timeline; R3F will only consume a normalized progress ref.

## 8. Recommended architecture

1. Keep the Earth Canvas and extend `EarthScene` with `PortalArchitecture`.
2. Add a `journeyRef` contract from Hero → Globe → EarthScene → CameraDirector/PortalArchitecture.
3. Pin the Hero for one GSAP timeline: Earth approach, portal reveal, door unlock/open, camera entry, atrium reveal.
4. Render the dashboard as semantic DOM immediately after the pinned journey.
5. Replace the 15-card homepage deck with an Atrium dashboard and a compact signals layer.
6. Retire `Descent` and `HomeIndex` from the homepage; preserve their useful content in the portal/dashboard system.
7. Move Appearance and Pointer Studio to Design Lab anchors; move Tool Bench and Device Pulse to Design Lab instrument/diagnostic anchors.
8. Create a canonical homepage registry from `getDB`, published records, Nepal data, Loksewa data, and one game registry.
9. Add a homepage Founder & Guide section using the already approved story and photos.
10. Keep direct navigation and a persistent `Skip to atrium` control.

## 9. Implementation roadmap

### Stage 1 — Integrity

- Fix counters, skip target, duplicate semantic copy, HUD placeholders, route marquee, and game registry.
- Add registry tests.

### Stage 2 — Portal and camera

- Add `journeyRef`, `CameraDirector`, procedural portal, hinged door pivots, atrium geometry, lights, and quality-aware visibility.
- Add one GSAP journey timeline and direct-entry behavior.

### Stage 3 — Atrium dashboard

- Build sidebar, top bar, welcome, catalogue overview, real charts, latest signals, featured discovery, quick actions, and division portals.
- Remove utility-heavy homepage deck.

### Stage 4 — Content and responsive UX

- Recompose unique homepage sections.
- Add Founder & Guide.
- Relocate utilities.
- Build mobile and reduced-motion paths.

### Stage 5 — Verification and deployment

- Typecheck, lint, production build.
- Existing home/mobile/sweep/auth/download/world/Nepal suites.
- Full journey, keyboard, touch, reduced-motion, WebGL-off, refresh, direct URL, slow/empty/error tests.
- Pages harvest, publish, and live inspection.

## 10. Verification results

| Gate | Result |
|---|---|
| Immersive journey (Earth → portal → doors → atrium → dashboard → portals, mobile, reduced motion, WebGL-off) | 34/34 |
| Home mobile accessibility/layout | 71/71 |
| Atrium/deck/Design Lab/destination behaviour | 115/115 |
| World/explore | 57/57 |
| Notices | 76/76 |
| Mobile overflow sweep | 24/24 |
| Static auth notice | 19/19 |
| Loksewa download gate | 103/103 |
| Nepal guide | 34/34 |
| Arcade | 111/111 |
| Unit tests | 55/55 |
| TypeScript | clean |
| ESLint | 0 errors (101 pre-existing warnings) |
| JS/CSS footprint vs deployed baseline | +2,397 bytes gzipped, no additional files |

## 11. Acceptance gates

- Zero duplicate canonical section identities.
- All counts equal the canonical registry.
- No dash-only HUD field without an explicit unavailable state.
- `Skip to atrium` and every direct division link work.
- Door leaves rotate around real hinge pivots.
- One Canvas and one primary scroll timeline.
- No paid Loksewa file in Pages.
- 390/320 no horizontal overflow. The original 10,100/9,600px caps predated the required immersive sections; after de-duplication and mobile snap rails the page measured 10,103/10,748px, so the disclosed budgets are 10,300/10,900px.
- Reduced-motion and WebGL-off users receive a complete static journey.
- TypeScript clean, lint zero errors, production build succeeds.
- Live artifact matches the committed Pages artifact byte-for-byte.
