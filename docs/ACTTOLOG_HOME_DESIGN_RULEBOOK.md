# ACTTOLOG Home Design Rulebook

## Direction

**Architectural observatory / digital atrium.** The site should feel like entering a carefully built world: monumental but quiet, data-rich but legible, immersive but direct.

Reference hierarchy is adapted from the observable Energy Management System Dashboard by arshiya.senselive (CC BY 4.0). ACTTOLOG keeps its own identity, content, Earth, typography, and visual language.

## Color

### Core palette

- Canvas: existing theme `--bg` / `--bg2`.
- Primary text: `--txt`.
- Secondary text: `--mut`.
- Tertiary/HUD: `--dim`.
- Architecture: deep charcoal, forest green, emerald, soft mint, warm white, neutral stone, silver.
- Accent: existing theme `--cy`, `--vi`, `--mg`, `--gold`, `--ok`.

### Atrium tokens

```css
--atrium-bg: #07110e;
--atrium-panel: rgba(12, 28, 23, .78);
--atrium-line: rgba(154, 220, 187, .18);
--atrium-accent: #45d49a;
--atrium-mint: #b8f1d5;
--atrium-white: #f7f4ee;
```

Light themes keep `--txt` and panel tokens theme-aware; architecture never forces white text onto a light surface.

## Typography

- Display/wordmark: `Cambria, Caladea, Georgia, Noto Sans Devanagari, serif`, weight 600.
- Body/UI: Inter, weight 500.
- Mono/HUD: JetBrains Mono, existing sizes and tracking.
- Nepali: Noto Sans Devanagari, unchanged.
- Numeric data: tabular numerals.

Scale:

- Hero: existing fluid `.htitle`.
- Dashboard welcome: `clamp(1.6rem, 3vw, 2.6rem)`.
- Section title: existing `.h2`.
- Card heading: 600, 15–18px.
- Body: 500, 13–15px.
- Caption/HUD: 10.5–11px, never below the existing accessibility floor.

## Layout

- Desktop: persistent 72px global nav; atrium sidebar 232px; content max 1440px.
- Tablet: collapsed icon sidebar 72px; two-column dashboard.
- Mobile: no sidebar; horizontal scrollable quick actions; stacked metrics; bottom command nav.
- One canonical section per purpose.
- Negative space is structural, not decorative.

## Surfaces

- Glass only for floating HUD, command palette, selected dashboard overlays, and modal controls.
- Architecture panels use solid or low-alpha surfaces with 1px borders.
- Radius: 18px for major panels, 10–12px for controls, 4–6px for data rows.
- No excessive transparency, bloom, particles, or rounded cards.

## Charts

- Use Recharts only when real records support the chart.
- Content distribution: horizontal bars or donut only if categories are meaningful.
- Publishing timeline: area/line from actual `publishedAt`.
- Game/course/resource distribution: categorical bars.
- Empty data becomes an editorial discovery module, not a fake chart.

## Motion

- One GSAP journey timeline.
- R3F consumes refs; no React state per frame.
- Doors rotate around hinge pivots.
- Camera motion is damped and interruptible.
- Reduced motion: static Earth/poster, open doors, dashboard visible.
- No Lenis; preserve native scroll.

## Accessibility

- Real DOM buttons/links for every action.
- `Skip to atrium` before the immersive sequence.
- Direct division navigation always available.
- Focus-visible uses existing cyan outline.
- Canvas is aria-hidden; semantic copy lives in DOM.
- No focus trap outside intentional dialogs.
- 44px minimum primary touch targets.

## Content voice

- Precise, calm, adult.
- No fake live metrics, visitor counts, forecasts, or energy terminology.
- Counts describe catalogue inventory only.
- Bilingual parity is required.
- ACTTOLOG brand name remains exactly `ACTTOLOG`.

## Attribution

Design hierarchy reference: **Energy Management System Dashboard**, arshiya.senselive, Figma Community, licensed **CC BY 4.0**. No third-party artwork is copied.
