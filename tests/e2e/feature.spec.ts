import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Drive the compass headless by dispatching a synthetic DeviceOrientationEvent.
 * `useDeviceOrientation` maps non-iOS heading as `(360 - alpha) % 360`, so to
 * reach a target compass heading H we set `alpha = (360 - H) % 360`.
 */
async function setHeading(page: Page, headingDeg: number) {
  const alpha = (360 - headingDeg + 360) % 360;
  await page.evaluate((a) => {
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", {
        alpha: a,
        beta: 0,
        gamma: 0,
      } as DeviceOrientationEventInit),
    );
  }, alpha);
}

/**
 * Load-bearing cross-peer assertion for the advertised core action:
 *
 *   "Each phone reveals its slice only when pointed at its target compass
 *    bearing … the aggregate 'X / N aligned' counter renders from these
 *    [awareness] states."
 *
 * Default config puts both peers on slice 1 / panorama "sunrise" → target
 * bearing 90°. We point peer A at 90° (aligned) and peer B at 0° (misaligned,
 * so B still renders the room counter). Peer B — the OPPOSITE peer — must then
 * see the room-aligned count rise to reflect A's alignment, proving the
 * `{slice, currentHeading, aligned}` awareness state crossed the mesh.
 */
test("peer A pointing at its bearing raises the aligned count seen by peer B", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Arm both peers (attaches the deviceorientation listener + joins mesh).
    await a.getByRole("button", { name: /allow orientation/i }).click();
    await b.getByRole("button", { name: /allow orientation/i }).click();

    // Give B a (misaligned) heading so it leaves the "Waiting for compass…"
    // screen and renders the room-aligned counter. Repeat so it survives the
    // 1s publish tick.
    for (let i = 0; i < 3; i++) {
      await setHeading(b, 0); // heading 0°, target 90° → misaligned
      await b.waitForTimeout(150);
    }
    await expect(b.locator(".dir-room")).toBeVisible();
    // Before A aligns, the room shows 0 aligned.
    await expect(b.locator(".dir-room")).toContainText(/0 \/ \d+ aligned/);

    // Point peer A exactly at its target bearing (90°) → aligned: true.
    for (let i = 0; i < 4; i++) {
      await setHeading(a, 90);
      await a.waitForTimeout(150);
    }
    // A should reveal its slice (aligned stage).
    await expect(a.locator(".dir-aligned")).toBeVisible({ timeout: 10_000 });

    // Peer B's room counter must rise to >= 1 aligned, crossing the mesh.
    await expect(b.locator(".dir-room")).toContainText(/[1-9]\d* \/ \d+ aligned/, {
      timeout: 15_000,
    });
  } finally {
    await cleanup();
  }
});
