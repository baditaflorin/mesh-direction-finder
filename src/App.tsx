import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { Direction } from "./features/direction/Direction";
import { SettingsExtras } from "./features/settings/SettingsExtras";
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
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          slice={slice}
          onSliceChange={(n) => setSlice(clampSlice(n))}
          panoramaId={panoramaId}
          onPanoramaChange={setPanoramaId}
        />
      }
    >
      <Direction roomId={roomId} slice={slice} panoramaId={panoramaId} />
    </MeshShell>
  );
}
