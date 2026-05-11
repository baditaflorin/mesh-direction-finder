# Panoramas

Each panorama is a 3200×800 image, sliced into four 800×800 vertical strips named `slice-1.png` … `slice-4.png`. Slice `i` lives at the bearing `(startBearing + (i-1) * 90) % 360`, so the four slices wrap a full 360° in 90° steps.

The four sample panoramas bundled with this app are **synthetic, procedurally generated** with ImageMagick (see `docs/adr/0003-panoramas.md`). They are released into the public domain (CC0). No third-party images are bundled.

If you want to add a real photographic panorama:

1. Find one with an explicit CC0 or public-domain licence on https://openverse.org/, https://commons.wikimedia.org/, or https://unsplash.com/.
2. Resize so that the full panorama is 3200 px wide × 800 px tall (or any equal-strip ratio; the slicing command divides width by N).
3. Run the slice command from ADR 0003.
4. Add the panorama id to `src/features/direction/panoramas.ts`.
5. Add an entry here noting **source URL, author, and licence**.

## Bundled panoramas

| Panorama  | Source    | Licence | Notes                                           |
| --------- | --------- | ------- | ----------------------------------------------- |
| `sunrise` | synthetic | CC0     | Warm gradient + sun disk, generated locally.    |
| `city`    | synthetic | CC0     | Procedural skyline silhouette with lit windows. |
| `forest`  | synthetic | CC0     | Procedural green vertical-stripe tree-line.     |
| `aurora`  | synthetic | CC0     | Gradient + green/purple curves, Gaussian blur.  |
