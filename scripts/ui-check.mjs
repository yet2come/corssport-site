import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = Number(process.env.UI_CHECK_PORT || 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = "tmp/ui-check";

function startPreview() {
  const child = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(PORT)], {
    stdio: "pipe",
    env: process.env,
  });

  return child;
}

async function waitForServer(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(BASE_URL, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the preview server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Preview server did not start within ${timeoutMs}ms`);
}

async function capture() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

  await page.route("**/api/availability**", async (route) => {
    const url = new URL(route.request().url());
    const facility = url.searchParams.get("facility");
    const slots = [
      { start: "09:00", end: "10:00", available: true },
      { start: "10:00", end: "11:00", available: false },
      { start: "11:00", end: "12:00", available: true },
      { start: "12:00", end: "13:00", available: true },
      { start: "13:00", end: "14:00", available: true },
      { start: "14:00", end: "15:00", available: false },
      { start: "15:00", end: "16:00", available: true },
      { start: "16:00", end: "17:00", available: true },
      { start: "17:00", end: "18:00", available: true },
    ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        facility,
        facilityName: facility,
        date: "2026-03-15",
        timezone: "Asia/Tokyo",
        operatingHours: { open: "09:00", close: "18:00" },
        slots,
      }),
    });
  });

  await page.route("**/api/book", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        booking: {
          id: "mock-booking-id",
          facility: payload.facility,
          facilityName:
            payload.facility === "meeting-room"
              ? "Meeting Room"
              : payload.facility,
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
        },
      }),
    });
  });

  await page.route("**/api/booking**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        booking: {
          id: "mock-booking-id",
          facility: "meeting-room",
          facilityName: "Meeting Room",
          date: "2026-03-15",
          startTime: "09:00",
          endTime: "10:00",
          name: "田中一郎",
        },
      }),
    });
  });

  await page.route("**/api/cancel", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "予約をキャンセルしました",
      }),
    });
  });

  await page.goto(`${BASE_URL}/book.html`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/book.png`, fullPage: true });

  await page.getByRole("button", { name: /Meeting Room/i }).click();
  await page.getByLabel("Date").fill("2026-03-15");
  await page.getByRole("button", { name: "09:00 - 10:00" }).click();
  await page.getByLabel("Name").fill("田中一郎");
  await page.getByLabel("Email").fill("tanaka@example.com");
  await page.getByLabel("Phone").fill("090-1234-5678");
  await page.getByLabel("Guests").fill("4");
  await page.getByLabel("Purpose").fill("チームミーティング");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/book-form-filled.png`, fullPage: true });

  await page.getByRole("button", { name: "予約する" }).click();
  await page.locator("#booking-success").waitFor({ state: "visible" });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/book-success.png`, fullPage: true });

  await page.goto(
    `${BASE_URL}/cancel.html#id=mock-booking-id&facility=meeting-room&token=mock-token`,
    { waitUntil: "networkidle" }
  );
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cancel.png`, fullPage: true });
  await page.getByRole("button", { name: "予約をキャンセルする" }).click();
  await page.getByText("キャンセルが完了しました").waitFor();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cancel-success.png`, fullPage: true });

  await browser.close();
}

const preview = startPreview();

try {
  await waitForServer();
  await capture();
  process.stdout.write(`Saved screenshots to ${SCREENSHOT_DIR}\n`);
} finally {
  preview.kill("SIGTERM");
}
