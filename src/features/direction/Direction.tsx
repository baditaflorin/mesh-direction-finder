import { useEffect, useMemo, useState } from "react";
import { useCompass } from "@baditaflorin/mesh-common";
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
  const compass = useCompass({ armed });
  const sensorHeading = compass.heading;
  const permissionError = compass.error;
  const [calibrationHintSeen, setCalibrationHintSeen] = useState(
    () => localStorage.getItem(`${appConfig.storagePrefix}:calhint`) === "1",
  );
  const [allAligned, setAllAligned] = useState({ aligned: 0, total: 0 });

  // Manual-aim fallback. Many devices have no magnetometer (laptops, desktops,
  // a lot of Android browsers), and iOS needs HTTPS + a granted permission. If
  // no real heading arrives shortly after arming, we surface a manual aim
  // slider so the cross-screen panorama is still usable everywhere — the app
  // never dead-ends on "Waiting for compass…". A live sensor reading always
  // wins over the manual value.
  const targetBearing = bearingForSlice(panoramaId, slice);
  const [manualMode, setManualMode] = useState(false);
  // Start the manual aim 90° off the target so the user has something to do
  // (drag toward the target to reveal the slice) — defaulting it onto the
  // target would show the slice instantly and defeat the "aim to reveal" point.
  const [manualHeading, setManualHeading] = useState(() => Math.round((targetBearing + 90) % 360));

  // After arming, if the sensor hasn't produced a heading within 2.5s, fall
  // back to manual aim. A denied/unsupported sensor flips this immediately.
  useEffect(() => {
    if (!armed) return undefined;
    if (sensorHeading !== null) {
      setManualMode(false);
      return undefined;
    }
    if (permissionError) {
      setManualMode(true);
      return undefined;
    }
    const t = setTimeout(() => setManualMode(true), 2500);
    return () => clearTimeout(t);
  }, [armed, sensorHeading, permissionError]);

  // The heading the rest of the UI + the mesh act on: real sensor when present,
  // otherwise the user's manual aim once they've opted into it.
  const heading = sensorHeading ?? (manualMode ? manualHeading : null);

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
          No compass? You can aim manually — works on any device.
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
            No compass yet. iOS needs Location services on for Safari; many laptops and desktops
            have no magnetometer at all.
          </p>
          <button type="button" className="dir-arm-button" onClick={() => setManualMode(true)}>
            Aim manually instead
          </button>
        </div>
      </div>
    );
  }

  const aligned = isAligned(targetBearing, heading);
  const diff = angleDiff(targetBearing, heading);
  const sliceImg = `${BASE}/panoramas/${panoramaId}/slice-${slice}.png`;
  const usingManual = sensorHeading === null && manualMode;

  return (
    <div className={`dir-stage ${aligned ? "dir-aligned" : "dir-misaligned"}`}>
      {!calibrationHintSeen && !usingManual && (
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

      {usingManual && (
        <div className="dir-manual">
          <label htmlFor="dir-manual-aim">
            No compass detected — aim manually ({Math.round(manualHeading)}°)
          </label>
          <input
            id="dir-manual-aim"
            type="range"
            min={0}
            max={359}
            value={manualHeading}
            onChange={(e) => setManualHeading(Number(e.target.value))}
          />
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
