# mesh-direction-finder

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--direction--finder-4FC2EE?style=flat-square)](https://baditaflorin.github.io/mesh-direction-finder/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-direction-finder?style=flat-square&color=7a8696)](https://github.com/baditaflorin/mesh-direction-finder/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-06080d?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer browser mesh. A pre-sliced panorama is split across N phones. Each phone reveals its slice only when pointed at its target compass bearing. When all phones align, the room sees the whole panorama assembled across screens.

**Live:** https://baditaflorin.github.io/mesh-direction-finder/

Pick a panorama (4 bundled samples). Each phone gets a slice number; the phone's target bearing is `startBearing + (slice - 1) × 90°`. Point your phone at the bearing — within ±15° you see the slice; outside that tolerance you see a big arrow pointing toward the target ("turn right 47°"). When all N phones are aligned, the group sees the panorama wrap around the room.

## How it works

- `DeviceOrientationEvent` is read with `webkitCompassHeading` (iOS) or `(360 − alpha)` (others) to get magnetic-north heading in degrees.
- Each phone publishes `{slice, currentHeading, aligned, ts}` to a Yjs awareness state. The aggregate "X / N aligned" counter renders from these.
- Panoramas are pre-sliced PNGs at `public/panoramas/<id>/slice-<n>.png`. The four bundled panoramas are procedurally generated and CC0 — see [public/panoramas/README.md](public/panoramas/README.md).
- The alignment tolerance is ±15° because indoor magnetometer accuracy can be ±45°. See [ADR 0002](docs/adr/0002-magnetometer-calibration.md).

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). Peers see your slice number and heading; the signaling server sees room name and SDP relay.

## Architecture

- **Mode A** — pure GitHub Pages. ([ADR 0001](docs/adr/0001-deployment-mode.md))
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-direction-finder.git
cd mesh-direction-finder
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Magnetometer calibration and accuracy](docs/adr/0002-magnetometer-calibration.md)
- [0003 — Panorama slicing convention](docs/adr/0003-panoramas.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
