# ACTTOLOG Home Motion Spec

## Controller

One GSAP timeline owns the main journey. Native scroll remains the only scroll system. No Lenis, no second camera tween, no React state per frame.

## Timeline

| Progress | Phase | DOM | 3D |
|---|---|---|---|
| 0–0.18 | Earth hold | Hero copy fully visible | Earth idle |
| 0.18–0.38 | Approach | Headline/lead fade and lift | Camera dolly, Earth scale/position shifts |
| 0.38–0.52 | Portal reveal | Entrance label appears | Frame, emblem, handles and lights activate |
| 0.52–0.70 | Door opening | Enter button remains available | Left/right leaves rotate around hinges |
| 0.70–0.86 | Entry | Hero copy hidden, atrium label appears | Camera crosses threshold |
| 0.86–1.00 | Atrium | Dashboard heading appears | Atrium geometry settles |

## Scroll mapping

- Trigger: `#hero`.
- Start: `top top`.
- End: `+=2600` desktop, `+=1800` tablet, `+=1400` mobile.
- Scrub: `0.8` desktop/tablet, `true` mobile.
- Pin: Hero only.
- Timeline writes `journeyRef.current` with `ease: none`.
- DOM opacity/transform tweens use short durations inside the same timeline.

## Direct entry

`Enter ACTTOLOG` scrolls to the door/atrium phase of the same timeline. `Skip to atrium` jumps to `#atrium`. Both work without waiting for scroll animation.

## Interaction rules

- Manual Earth drag/wheel is disabled during scripted travel and restored at the Earth phase or after exit.
- Portal hotspots are DOM buttons, not canvas hit areas.
- Return to atrium is a real link/button.
- Escape exits any portal preview.

## Reduced motion

- No pin or scrub.
- Static Earth poster or demand-frameloop Earth.
- Doors rendered open.
- Atrium dashboard visible immediately.
- All content reachable by normal scrolling.

## Mobile

- Shorter timeline.
- No pointer parallax.
- Reduced architecture geometry.
- Touch controls remain native.
- Bottom command navigation stays available.

## Performance

- DPR capped by existing tiers.
- No new downloaded models or textures.
- No per-frame allocations.
- Architecture only renders when journey progress is relevant.
- Existing off-screen pause remains.
