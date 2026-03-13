const { test, expect } = require("@playwright/test");
const { mockBookingApi } = require("./helpers/mock-booking-api");

test.describe("booking UI", () => {
  test.beforeEach(async ({ page }) => {
    await mockBookingApi(page);
  });

  test("can select a facility, fill the form, and see booking success", async ({ page }) => {
    await page.goto("/book.html");

    await expect(page.getByRole("heading", { name: "BOOK" })).toBeVisible();
    await page.getByRole("button", { name: /Meeting Room/i }).click();
    await page.getByLabel("Date").fill("2026-03-15");
    await page.getByRole("button", { name: "09:00 - 10:00" }).click();
    await page.getByLabel("Name").fill("田中一郎");
    await page.getByLabel("Email").fill("tanaka@example.com");
    await page.getByLabel("Phone").fill("090-1234-5678");
    await page.getByLabel("Guests").fill("4");
    await page.getByLabel("Purpose").fill("チームミーティング");

    await expect(page.locator("#booking-panel")).toBeVisible();
    await expect(page.locator("#booking-name")).toHaveValue("田中一郎");

    await page.getByRole("button", { name: "予約する" }).click();

    await expect(page.locator("#booking-success")).toBeVisible();
    await expect(page.locator("#booking-success-detail")).toContainText("Meeting Room / 2026-03-15 09:00-10:00");
  });

  test("can open cancel page and complete cancellation", async ({ page }) => {
    await page.goto("/cancel.html#id=mock-booking-id&facility=meeting-room&token=mock-token");

    await expect(page.getByText("Meeting Room")).toBeVisible();
    await expect(page.getByText("2026-03-15 09:00 - 10:00")).toBeVisible();

    await page.getByRole("button", { name: "予約をキャンセルする" }).click();

    await expect(page.getByRole("heading", { name: "キャンセルが完了しました" })).toBeVisible();
  });
});
