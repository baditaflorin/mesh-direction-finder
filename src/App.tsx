import { useEffect, useState } from "react";
import { Direction } from "./features/direction/Direction";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";
import { SLICE_COUNT, panoramas } from "./features/direction/panoramas";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  slice: `${appConfig.storagePrefix}:slice`,
  panorama: `${appConfig.storagePrefix}:panorama`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}
function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function clampSlice(n: number): number {
  return Math.max(1, Math.min(SLICE_COUNT, Math.round(n)));
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [slice, setSlice] = useState(() => clampSlice(readNumber(STORAGE.slice, 1)));
  const [panoramaId, setPanoramaId] = useState(() =>
    readString(STORAGE.panorama, panoramas[0]?.id ?? "sunrise"),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.slice, String(slice));
  }, [slice]);
  useEffect(() => {
    localStorage.setItem(STORAGE.panorama, panoramaId);
  }, [panoramaId]);

  return (
    <div className="app-root">
      <Direction roomId={roomId} slice={slice} panoramaId={panoramaId} />

      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        slice={slice}
        onSliceChange={(n) => setSlice(clampSlice(n))}
        panoramaId={panoramaId}
        onPanoramaChange={setPanoramaId}
      />
    </div>
  );
}
