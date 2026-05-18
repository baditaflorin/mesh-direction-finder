export const appConfig = {
  appName: "mesh-direction-finder",
  storagePrefix: "mesh-direction-finder",
  description:
    "Peer-to-peer browser mesh. A pre-sliced panorama is split across N phones. Each phone reveals its slice only when pointed at its target compass bearing.",
  accentHex: "#4FC2EE",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-direction-finder",
  pagesUrl: "https://baditaflorin.github.io/mesh-direction-finder/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
