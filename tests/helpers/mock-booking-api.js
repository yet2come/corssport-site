async function mockBookingApi(page) {
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
            payload.facility === "meeting-room" ? "Meeting Room" : payload.facility,
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
}

module.exports = { mockBookingApi };
