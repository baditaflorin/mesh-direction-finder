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

/**
 * Honest graceful-degradation path: most devices (laptops, desktops, the
 * headless test browser) have NO magnetometer, so the compass never reports a
 * heading. The app must NOT dead-end on "Waiting for compass…" — it surfaces a
 * manual-aim slider, and the manually-aimed heading must publish into the same
 * awareness `{slice, currentHeading, aligned}` state so the cross-screen
 * panorama still assembles.
 *
 * This test injects NO synthetic DeviceOrientationEvent — it relies purely on
 * the manual fallback, exactly what a real desktop user gets. Peer B (kept
 * misaligned) must see the room-aligned count rise when peer A drags its slider
 * onto its target bearing, proving the manual heading crossed the mesh.
 */
test("manual aim (no sensor) still raises the aligned count seen by the other peer", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByRole("button", { name: /allow orientation/i }).click();
    await b.getByRole("button", { name: /allow orientation/i }).click();

    // No sensor event is ever dispatched. After the ~2.5s fallback timeout the
    // manual aim slider appears on both peers — the app degraded gracefully
    // instead of hanging on "Waiting for compass…".
    const aimA = a.locator("#dir-manual-aim");
    const aimB = b.locator("#dir-manual-aim");
    await expect(aimA).toBeVisible({ timeout: 10_000 });
    await expect(aimB).toBeVisible({ timeout: 10_000 });

    // Default config: slice 1 / panorama "sunrise" → target bearing 90°.
    // Park BOTH peers off-target so the room starts at 0 aligned and B keeps
    // rendering the misaligned counter.
    await aimA.fill("200");
    await aimB.fill("0");
    await expect(b.locator(".dir-room")).toBeVisible();
    await expect(b.locator(".dir-room")).toContainText(/0 \/ \d+ aligned/);

    // Drag A's manual aim exactly onto its target bearing → aligned.
    await aimA.fill("90");
    await expect(a.locator(".dir-aligned")).toBeVisible({ timeout: 10_000 });

    // The manually-aimed heading must cross the mesh: B's room count rises.
    await expect(b.locator(".dir-room")).toContainText(/[1-9]\d* \/ \d+ aligned/, {
      timeout: 15_000,
    });
  } finally {
    await cleanup();
  }
});
