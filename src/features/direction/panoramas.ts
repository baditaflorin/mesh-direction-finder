export type Panorama = {
  id: string;
  name: string;
  // Bearing (in degrees, 0 = north, clockwise) where slice 1 belongs.
  // The other slices are offset by 90° each.
  startBearing: number;
};

export const panoramas: Panorama[] = [
  { id: "sunrise", name: "Sunrise", startBearing: 90 }, // east
  { id: "city", name: "City skyline", startBearing: 0 }, // north
  { id: "forest", name: "Forest", startBearing: 180 }, // south
  { id: "aurora", name: "Aurora", startBearing: 0 }, // north
];

export const SLICE_COUNT = 4;
export const ALIGN_TOLERANCE_DEG = 15;

export function bearingForSlice(panoramaId: string, sliceIdx: number): number {
  const p = panoramas.find((x) => x.id === panoramaId) ?? panoramas[0]!;
  return (p.startBearing + ((sliceIdx - 1) * 360) / SLICE_COUNT) % 360;
}

/** Returns the signed shortest angular difference target - current, in (-180, 180]. */
export function angleDiff(target: number, current: number): number {
  let d = ((target - current + 540) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

export function isAligned(target: number, current: number): boolean {
  return Math.abs(angleDiff(target, current)) <= ALIGN_TOLERANCE_DEG;
}
