# Privacy threat model — mesh-direction-finder

## What other peers in the same room can see

Per peer in the awareness map:

- Your assigned **slice number** (1–4).
- Your current **compass heading** in degrees, or `null` if your sensor hasn't reported yet.
- An **`aligned`** boolean (true when within ±15° of your target bearing).
- The most recent **timestamp**.

The aggregate "X / N aligned" is computed by counting `aligned` flags. Per-peer headings are technically visible in the awareness map; the UI does not render them per-peer.

## What stays local

- Your raw orientation/magnetometer samples.
- All settings (room ID, slice number, panorama choice, signaling overrides).
- The calibration-hint-seen flag.

## What the signaling server sees

`signaling-server` sees the room name (`mesh-direction-finder:<roomId>`), the encrypted SDP relayed between peers, and your IP. It cannot see your heading or slice.

## What the TURN server sees

`coturn-hetzner` relays encrypted DataChannel bytes when peers can't directly connect. It cannot decrypt the payload.

## Permissions asked

- **Orientation / magnetometer** (`DeviceOrientationEvent.requestPermission` on iOS) — required for the compass heading. Asked only on the "Allow orientation & connect" tap.
- iOS may additionally surface a **location prompt** when a magnetometer-derived heading is requested; this is a system-level prompt the app does not control. The app does not request, collect, or transmit your location coordinates.

## What's NOT in the threat model

- Magnetometer fingerprinting. The raw heading values are public to the room; an adversary could in principle correlate calibration noise. We don't defend against this; the data is too low-bandwidth to be useful.
- Network observers. Your Wi-Fi sees a WebSocket to `turn.0docker.com` and maybe a TURN relay flow. Contents are encrypted.
