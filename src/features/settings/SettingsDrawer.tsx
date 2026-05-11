import { useEffect, useState } from "react";
import {
  loadSignalingUrl,
  loadTurnTokenUrl,
  resetIceServers,
  saveSignalingUrl,
  saveTurnTokenUrl,
} from "../sync/iceConfig";
import { appConfig } from "../../shared/config";
import { SLICE_COUNT, panoramas } from "../direction/panoramas";

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onRoomChange: (next: string) => void;
  slice: number;
  onSliceChange: (next: number) => void;
  panoramaId: string;
  onPanoramaChange: (next: string) => void;
};

export function SettingsDrawer({
  open,
  onClose,
  roomId,
  onRoomChange,
  slice,
  onSliceChange,
  panoramaId,
  onPanoramaChange,
}: Props) {
  const [signaling, setSignaling] = useState(loadSignalingUrl());
  const [tokenUrl, setTokenUrl] = useState(loadTurnTokenUrl());

  useEffect(() => {
    if (open) {
      setSignaling(loadSignalingUrl());
      setTokenUrl(loadTurnTokenUrl());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <label>
          <span>Room ID</span>
          <input value={roomId} onChange={(e) => onRoomChange(e.target.value)} />
        </label>

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
            // Auto-distribute by current Yjs awareness order: not implemented yet at this layer.
            // We give the user a sensible nudge: cycle to the next slice.
            const next = (slice % SLICE_COUNT) + 1;
            onSliceChange(next);
          }}
        >
          Cycle my slice → {(slice % SLICE_COUNT) + 1}
        </button>

        <hr />

        <h3>Self-hosted infra (advanced)</h3>
        <p className="settings-help">
          Override the default signaling and TURN endpoints. Leave blank to use the built-in
          defaults (<code>{appConfig.signalingUrl}</code> and <code>{appConfig.turnTokenUrl}</code>
          ).
        </p>

        <label>
          <span>Signaling URL</span>
          <input
            value={signaling}
            onChange={(e) => setSignaling(e.target.value)}
            placeholder={appConfig.signalingUrl}
          />
        </label>

        <label>
          <span>TURN credentials URL</span>
          <input
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            placeholder={appConfig.turnTokenUrl}
          />
        </label>

        <div className="settings-actions">
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl(signaling);
              saveTurnTokenUrl(tokenUrl);
              onClose();
              location.reload();
            }}
          >
            Save and reload
          </button>
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl("");
              saveTurnTokenUrl("");
              resetIceServers();
              onClose();
              location.reload();
            }}
          >
            Reset to defaults
          </button>
        </div>

        <hr />

        <footer className="settings-footer">
          <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
            source on github
          </a>
          <span>
            v{appConfig.version} · {appConfig.commit}
          </span>
        </footer>
      </div>
    </div>
  );
}
