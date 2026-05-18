import { SLICE_COUNT, panoramas } from "../direction/panoramas";

type Props = {
  slice: number;
  onSliceChange: (next: number) => void;
  panoramaId: string;
  onPanoramaChange: (next: string) => void;
};

export function SettingsExtras({ slice, onSliceChange, panoramaId, onPanoramaChange }: Props) {
  return (
    <>
      <label>
        <span>Your slice number (1–{SLICE_COUNT})</span>
        <input
          type="number"
          min={1}
          max={SLICE_COUNT}
          value={slice}
          onChange={(e) => onSliceChange(Number(e.target.value) || 1)}
        />
      </label>
      <p className="settings-help">
        Coordinate with the others in the room so each slice has exactly one phone. Slice 1 is the
        panorama's leftmost strip; slices wrap clockwise around the compass.
      </p>

      <label>
        <span>Panorama</span>
        <select value={panoramaId} onChange={(e) => onPanoramaChange(e.target.value)}>
          {panoramas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="dir-auto-button"
        onClick={() => {
          const next = (slice % SLICE_COUNT) + 1;
          onSliceChange(next);
        }}
      >
        Cycle my slice → {(slice % SLICE_COUNT) + 1}
      </button>
    </>
  );
}
