# ACTTOLOG Home Content Map

## Canonical registry

Create `src/lib/content/home-registry.ts` as the single build-time source for homepage inventory.

Inputs:

- `getDB()` published posts, entertainment, Academy courses, Darkroom resources, services, offers.
- `nepalGuide()` places and regions.
- `loksewaCounts()` papers, subjects, points, questions.
- One game registry shared by homepage, Games page, and arcade metadata.

Outputs:

```ts
type HomeRegistry = {
  divisions: DivisionSummary[];
  counts: {
    divisions: number;
    services: number;
    games: number;
    courses: number;
    resources: number;
    posts: number;
    entertainment: number;
    nepalPlaces: number;
    nepalRegions: number;
  };
  latest: {
    post?: BlogPost;
    games: GameSummary[];
    resources: DarkroomResource[];
    courses: AcademyCourse[];
  };
  featured: {
    post?: BlogPost;
    offer?: Offer;
    game?: GameSummary;
    resource?: DarkroomResource;
    course?: AcademyCourse;
  };
  cadence: { label: string; count: number }[];
};
```

## Section ownership

| Section | Canonical purpose | Source | Must not repeat |
|---|---|---|---|
| Earth hero | Brand and entry | settings, Earth | Division descriptions, dashboard stats |
| Grand Portal | Spatial transition | journey config | Full division copy |
| Atrium dashboard | Overview and quick actions | registry | Full article/game cards |
| Division portals | Five canonical division entries | divisions + registry | Second division ledger |
| Latest Signals | Recent real records | four newest wire events | Same full cards elsewhere |
| Nepal Explorer | Nepal gateway | nepalGuide | Nepal totals in every card |
| Featured Games | Direct play | game registry | Duplicate quick-play list |
| Featured Learning | Research/Academy discovery | compact Academy/Darkroom/Offers records | Same course cards in dashboard |
| Founder & Guide | Approved human story | existing about copy/photos | Invented credentials |
| Final invitation | One CTA | settings | Route-string marquee |

SourceLedger and full NoticeBoard remain on their destination pages; the homepage carries their latest measured states through LiveWire. Mobile portals, games and learning cards use horizontal snap rails to preserve every record without vertical repetition.

## Count rules

- Counts describe catalogue records only.
- No visitor, traffic, engagement, or forecast claims.
- Empty categories show `0` honestly or an editorial empty state.
- Games count comes from the shared registry, not separate arrays.
- `CountUp` renders the real value immediately when reduced motion or when intersection never fires.

## Utility relocation

- Appearance → Design Lab `#appearance`.
- Pointer Studio → Design Lab `#pointer`.
- Tool Bench → Design Lab `#instruments`.
- Device Pulse → Design Lab `#diagnostics`.
- Launchpad → existing global search/command interface.
- Notice Board → Latest Signals.
- Quick Play → Featured Games.

## Founder content

Use only the approved story and existing photos:

> Acttolog was built by one person with one idea: technology, research, education, entertainment and discovery should feel like a single connected world — not scattered pages.

The founder ring remains part of ACTTOLOG-owned 360° environments.

## Figma attribution

Information hierarchy adapted from **Energy Management System Dashboard** by arshiya.senselive, licensed **CC BY 4.0**. No energy metrics or third-party artwork are used.
