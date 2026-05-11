---
status: accepted
date: 2026-05-12
---

# 0003 — Panorama slicing convention

## Context

A panorama is conceptually a 360° image wrapped around the user. The app needs to map a given compass bearing to a particular sub-image so that pointing in that direction reveals only that slice. The choice of slicing convention determines the asset layout, the bearings array math, and how easy it is for contributors to add new panoramas.

## Decision

- **N = 4** slices by default. Bearings spaced 90° apart.
- Source panorama is a single image of width `N × 800 = 3200 px` and any height (we use 800 px for the bundled samples, giving square 800×800 slices). The full panorama spans 360° of horizontal field of view.
- Slicing: slice `i` (1-indexed) is the strip from `x = (i-1) * 800` to `x = i * 800`. ImageMagick command:

```sh
magick source.png -crop 800x800+$(( (i-1) * 800 ))+0 +repage slice-$i.png
```

- Each panorama lives in `public/panoramas/<id>/slice-<n>.png`, n ∈ {1, 2, 3, 4}.
- The bearings array is computed at runtime as `bearingForSlice(panoramaId, i) = (startBearing + (i-1) * 90) % 360`, where `startBearing` is per-panorama config in `src/features/direction/panoramas.ts`.
- `startBearing` is the bearing where the **leftmost edge of the source image** is "looking from." For the sunrise panorama with a sun centred on slice 1, we set `startBearing = 90` (east) because the sun rises in the east.

## Adding a new panorama

1. Find or generate a 3200×800 source image (CC0-licensed if photographic).
2. Run the slice command four times with `i ∈ {1..4}`.
3. Drop the slices in `public/panoramas/<your-id>/`.
4. Add `{ id, name, startBearing }` to `panoramas.ts`.
5. Update `public/panoramas/README.md` with attribution.

## Consequences

- Trivial to swap panoramas — no code change beyond the `panoramas.ts` registry.
- N is fixed at 4 in v1. Supporting variable N would require per-panorama config and a runtime division (and re-slicing); we deferred until someone asks for it.
- Asset sizes for procedurally-generated panoramas are < 100 KB / slice; even the aurora (with Gaussian blur) fits in ~1 MB / slice. Total panorama set under 5 MB.

## Alternatives considered

- **Equirectangular projection with WebGL spherical rendering.** Rejected — vastly more code, only marginally more correct for the use case (a user looking at the horizon).
- **Variable-N slicing.** Useful but adds runtime complexity; deferred.
- **Cylindrical slicing with overlap.** Rejected — overlap would mean two slices show at the boundary, undermining the "exactly one slice per phone" mechanic.
