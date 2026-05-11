import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { appConfig } from "../../shared/config";
import {
  ALIGN_TOLERANCE_DEG,
  SLICE_COUNT,
  angleDiff,
  bearingForSlice,
  isAligned,
  panoramas,
} from "./panoramas";

type DeviceOrientationRequest = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type AwarenessDir = {
  slice?: number;
  currentHeading?: number | null;
  aligned?: boolean;
  ts?: number;
};

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

type Props = {
  roomId: string;
  slice: number;
  panoramaId: string;
};

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function Direction({ roomId, slice, panoramaId }: Props) {
  const [armed, setArmed] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [calibrationHintSeen, setCalibrationHintSeen] = useState(
    () => localStorage.getItem(`${appConfig.storagePrefix}:calhint`) === "1",
  );
  const [allAligned, setAllAligned] = useState({ aligned: 0, total: 0 });

  const targetBearing = bearingForSlice(panoramaId, slice);

  const mesh = useMemo(() => {
    if (!armed) return null;
    return createRoomSync(roomId);
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.provider?.destroy();
    };
  }, [mesh]);

  // DeviceOrientation → compass heading
  useEffect(() => {
    if (!armed) return undefined;
    let cancelled = false;
    let onOrient: ((e: DeviceOrientationEvent) => void) | null = null;

    const start = async () => {
      const req = (window as unknown as { DeviceOrientationEvent?: DeviceOrientationRequest })
        .DeviceOrientationEvent;
      if (req?.requestPermission) {
        try {
          const result = await req.requestPermission();
          if (result !== "granted") {
            setPermissionError("Orientation permission denied — direction can't be measured.");
            return;
          }
        } catch (err) {
          setPermissionError(`Orientation permission error: ${err}`);
          return;
        }
      }
      if (cancelled) return;

      onOrient = (e: DeviceOrientationEvent) => {
        // iOS exposes webkitCompassHeading (already adjusted to magnetic north, 0 = N, clockwise).
        // Other browsers expose `alpha` (0..360, but z-axis-up rotation; some quirks).
        const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
        const h =
          typeof ev.webkitCompassHeading === "number"
            ? ev.webkitCompassHeading
            : typeof ev.alpha === "number"
              ? (360 - ev.alpha) % 360
              : null;
        if (h !== null) setHeading(h);
      };
      window.addEventListener("deviceorientation", onOrient, true);
    };

    void start();

    return () => {
      cancelled = true;
      if (onOrient) window.removeEventListener("deviceorientation", onOrient, true);
    };
  }, [armed]);

  // Publish my awareness state
  useEffect(() => {
    if (!mesh?.provider) return undefined;
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;

    const publish = () => {
      awareness.setLocalStateField("dir", {
        slice,
        currentHeading: heading,
        aligned: heading !== null && isAligned(targetBearing, heading),
        ts: Date.now(),
      });
    };
    publish();
    const i = setInterval(publish, 1000);

    const refresh = () => {
      const states = awareness.getStates();
      let aligned = 0;
      let total = 0;
      const fresh = Date.now() - 5000;
      states.forEach((s) => {
        const v = s["dir"] as AwarenessDir | undefined;
        if (!v || (v.ts ?? 0) < fresh) return;
        total++;
        if (v.aligned) aligned++;
      });
      setAllAligned({ aligned, total });
    };
    awareness.on("change", refresh);
    refresh();

    return () => {
      clearInterval(i);
      awareness.off("change", refresh);
    };
  }, [mesh, slice, heading, targetBearing]);

  const dismissCalHint = () => {
    setCalibrationHintSeen(true);
    localStorage.setItem(`${appConfig.storagePrefix}:calhint`, "1");
  };

  if (!armed) {
    return (
      <div className="dir-arm">
        <h1>mesh-direction-finder</h1>
        <p>
          Phones become a compass-aligned panorama. Your phone is <strong>slice {slice}</strong> of{" "}
          {SLICE_COUNT}, panorama <em>{panoramaId}</em>. Point your phone at the right bearing to
          reveal your slice. When all {SLICE_COUNT} phones align, the group sees the full panorama.
        </p>
        <button type="button" className="dir-arm-button" onClick={() => setArmed(true)}>
          Allow orientation &amp; connect
        </button>
        <p className="dir-hint">
          Target bearing: <strong>{Math.round(targetBearing)}°</strong>. Room <code>{roomId}</code>.
        </p>
      </div>
    );
  }

  if (heading === null) {
    return (
      <div className="dir-stage">
        <div className="dir-msg">
          {permissionError ?? "Waiting for compass…"}
          <p className="dir-hint">
            If your compass never reports a heading, your browser may not support DeviceOrientation,
            or you may need to enable Location services for Safari (iOS uses GPS heading on first
            calibration).
          </p>
        </div>
      </div>
    );
  }

  const aligned = isAligned(targetBearing, heading);
  const diff = angleDiff(targetBearing, heading);
  const sliceImg = `${BASE}/panoramas/${panoramaId}/slice-${slice}.png`;

  return (
    <div className={`dir-stage ${aligned ? "dir-aligned" : "dir-misaligned"}`}>
      {!calibrationHintSeen && (
        <div className="dir-calhint">
          <p>
            Wave your phone in a figure-8 for ~5 seconds to calibrate the magnetometer. Indoor
            accuracy can be ±45°; outdoors is much better.
          </p>
          <button type="button" onClick={dismissCalHint}>
            Got it
          </button>
        </div>
      )}

      {aligned ? (
        <>
          <img src={sliceImg} alt={`slice ${slice}`} className="dir-slice" />
          <div className="dir-corner">
            slice {slice} / {SLICE_COUNT} · {allAligned.aligned} / {allAligned.total} aligned
          </div>
        </>
      ) : (
        <>
          <div className="dir-arrow" style={{ transform: `rotate(${diff}deg)` }} aria-label="Turn">
            <svg viewBox="0 0 100 100" width="60%" height="60%">
              <polygon points="50,5 80,75 50,60 20,75" fill="currentColor" />
            </svg>
          </div>
          <div className="dir-instruction">
            {diff > 0
              ? `Turn right ${Math.round(Math.abs(diff))}°`
              : `Turn left ${Math.round(Math.abs(diff))}°`}
          </div>
          <div className="dir-readout">
            current {Math.round(heading)}° · target {Math.round(targetBearing)}° · tolerance ±
            {ALIGN_TOLERANCE_DEG}°
          </div>
          <div className="dir-room">
            {allAligned.aligned} / {allAligned.total} aligned in room · slice {slice}
          </div>
        </>
      )}
    </div>
  );
}

export { panoramas };
