---
status: accepted
date: 2026-05-12
---

# 0002 — Magnetometer calibration and accuracy

## Context

The app reads compass heading from `DeviceOrientationEvent`. iOS exposes the property `webkitCompassHeading` (already adjusted to magnetic north, 0 = N, increasing clockwise). Non-iOS browsers expose `alpha` (0–360, the rotation around the z-axis), which is mathematically the inverse direction; we convert via `(360 - alpha) % 360`. Both depend on the underlying magnetometer, whose calibration quality varies with environment.

Indoor accuracy with metal furniture, transformers, laptops, or steel-frame buildings can be off by **±45°**. Outdoors with a recently-calibrated sensor it can be within ±5°.

## Decision

- Use `webkitCompassHeading` when present, else `alpha`. Round to 1°.
- Treat the slice as "aligned" when `|target − current| ≤ 15°`. The ±15° window is generous because we can't rely on perfect indoor accuracy and we want users to feel the app working rather than chasing the last degree.
- Show a one-time "wave your phone in a figure-8 for ~5 seconds" calibration hint on first arm, dismissible.
- Show the live `current` and `target` degrees in the misaligned view so users can sanity-check what the sensor is reporting.

## Consequences

- The app is forgiving by default. Adjacent slices' bearings are 90° apart, well outside the ±15° tolerance, so a user can never accidentally be "aligned" on the wrong slice.
- If the magnetometer is wildly off, the user will turn in a circle and never find alignment. The current/target readout makes it visible that the sensor itself is the problem, not the app.
- The calibration hint is one-time per device, stored in `localStorage`. Reset via Settings → reset to defaults.

## Alternatives considered

- **±5° tolerance.** Rejected — too strict for indoor use; frustrating.
- **Bigger tolerance (±30°).** Rejected — would risk two adjacent slices both being "aligned" at the same heading.
- **Hide the calibration hint.** Rejected — when the sensor is bad, the user needs a clue what's wrong.
- **Trust the system-provided heading without any UI cue.** Rejected — silent failure is the worst kind.
