# ACTTOLOG Portal Architecture

## Decision

Extend the existing Earth Canvas. Do not create a second homepage renderer.

## Component tree

```text
HomeView
├── Hero (pinned journey owner)
│   ├── AuroraGL
│   ├── Globe (existing controls/HUD)
│   │   └── EarthScene (existing single Canvas)
│   │       ├── CameraDirector
│   │       ├── Earth world
│   │       ├── PortalArchitecture
│   │       │   ├── PortalFrame
│   │       │   ├── HingedDoorLeft
│   │       │   ├── HingedDoorRight
│   │       │   ├── InteriorLight
│   │       │   └── AtriumGeometry
│   │       └── quality / reduced-motion guards
│   └── DOM journey overlays
├── AtriumDashboard
├── DivisionPortals
├── LatestSignals
├── NepalPromo
├── FeaturedGames
├── FeaturedLearning
├── FounderGuide
└── HomeClose
```

## Shared journey contract

```ts
type JourneyProgress = React.RefObject<number>; // 0..1
```

- Hero GSAP writes `journeyRef.current`.
- Globe passes it to EarthScene.
- CameraDirector and PortalArchitecture read it in `useFrame`.
- `/explore` omits the ref and retains current Earth behavior.

## CameraDirector keyframes

| Progress | Camera | Target | World state |
|---|---|---|---|
| 0.00 | `[0, .12, 3.15]` | `[0, .10, 0]` | Earth |
| 0.30 | `[0, .18, 2.55]` | `[0, .12, 0]` | Earth approach |
| 0.48 | `[0, .35, 6.4]` | `[0, .2, 0]` | Portal revealed |
| 0.66 | `[0, .35, 5.6]` | `[0, .2, 0]` | Doors opening |
| 0.82 | `[0, .30, 2.4]` | `[0, .2, -5]` | Camera enters |
| 1.00 | `[0, .25, 1.4]` | `[0, .2, -7]` | Atrium |

Values are damped in the existing R3F loop. GSAP never writes the camera directly.

## Door geometry

- Two `THREE.Group` hinge pivots at `x = ±1.55`.
- Each door leaf geometry is offset from its pivot by half its width.
- Rotation around Y opens left and right in opposite directions.
- A shared normalized `doorOpen` value derives from journey progress.
- Frame, handles, light strips and interior plane are separate meshes.
- No CSS transform is used to fake door depth.

## Atrium geometry

Procedural only:

- Floor plane with subtle reflection-like material.
- Six columns or pylons.
- Overhead ring.
- Five portal frames arranged laterally.
- Central information plinth.
- Emerald point lights and one directional light.
- Fog limited to the architecture phase.

## Quality and lifecycle

- Reuse existing `TIER_CONFIG`.
- Low/mobile: fewer columns, no bloom, lower DPR, static doors if needed.
- Off-screen: existing Globe frameloop pause remains.
- Reduced motion: `journeyRef=1`, doors open, camera in atrium, no scrub.
- WebGL unsupported: existing poster plus semantic portal/atrium DOM.
- Dispose procedural geometries/materials through R3F unmount.

## Files

Modify:

- `src/components/home/Hero.tsx`
- `src/components/three/Globe.tsx`
- `src/components/three/EarthScene.tsx`
- `src/app/globals.css`

Create:

- `src/components/home/AtriumDashboard.tsx`
- `src/components/home/DivisionPortals.tsx`
- `src/components/home/FounderGuide.tsx`
- `src/lib/content/home-registry.ts`
