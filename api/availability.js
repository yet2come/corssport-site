const { calendarFetch } = require("./_lib/google-calendar");
const { getDayBounds, slotsFromBusy } = require("./_lib/calendar-slots");
const { getCalendarId, getFacilityConfig, OPERATING_HOURS } = require("./_lib/facilities-config");
const { HttpError, methodNotAllowed, sendJson } = require("./_lib/http");
const { enforceRateLimit } = require("./_lib/rate-limit");
const { validateDate, validateFacility } = require("./_lib/validate");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(req, res, ["GET"]);
  }

  try {
    enforceRateLimit(req, "availability", 60, 60 * 1000);

    const facility = validateFacility(req.query.facility);
    const date = validateDate(req.query.date);
    const facilityConfig = getFacilityConfig(facility);
    const calendarId = getCalendarId(facility);

    if (!calendarId) {
      throw new HttpError(500, "Calendar is not configured");
    }

    const { timeMin, timeMax } = getDayBounds(date);
    const payload = await calendarFetch("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "Asia/Tokyo",
        items: [{ id: calendarId }],
      }),
    });

    const busy = payload.calendars?.[calendarId]?.busy || [];
    return sendJson(res, 200, {
      facility,
      facilityName: facilityConfig.name,
      date,
      timezone: "Asia/Tokyo",
      operatingHours: {
        open: OPERATING_HOURS.open,
        close: OPERATING_HOURS.close,
      },
      slots: slotsFromBusy(date, busy),
    });
  } catch (error) {
    const status = error.status || 500;
    return sendJson(res, status, {
      error: status === 500 ? "Failed to fetch availability" : error.message,
      details: error.details,
    });
  }
};
