const { calendarFetch } = require("./_lib/google-calendar");
const { buildSlots, getDayBounds, slotsFromBusy } = require("./_lib/calendar-slots");
const { getCalendarIds, getFacilityConfig, getOperatingHours } = require("./_lib/facilities-config");
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
    const operatingHours = getOperatingHours(facility);
    const calendars = getCalendarIds(facility);
    if (calendars.length === 0) {
      throw new HttpError(500, "Calendar is not configured");
    }

    const { timeMin, timeMax } = getDayBounds(date);
    const payload = await calendarFetch("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "Asia/Tokyo",
        items: calendars.map((calendar) => ({ id: calendar.id })),
      }),
    });
    let slots;
    if (facility === "solo-booth") {
      const capacity = calendars.length;
      slots = buildSlots(date, operatingHours).map((slot) => {
        const busyCount = calendars.reduce((count, calendar) => {
          const busyPeriods = payload.calendars?.[calendar.id]?.busy || [];
          const hasConflict = busyPeriods.some((busy) => !(busy.end <= slot.startIso || busy.start >= slot.endIso));
          return count + (hasConflict ? 1 : 0);
        }, 0);
        const remaining = capacity - busyCount;
        return {
          start: slot.start,
          end: slot.end,
          available: remaining > 0,
          remaining,
          capacity,
        };
      });
    } else {
      const busy = payload.calendars?.[calendars[0].id]?.busy || [];
      slots = slotsFromBusy(date, busy, operatingHours);
    }
    return sendJson(res, 200, {
      facility,
      facilityName: facilityConfig.name,
      date,
      timezone: "Asia/Tokyo",
      operatingHours,
      slots,
    });
  } catch (error) {
    const status = error.status || 500;
    return sendJson(res, status, {
      error: status === 500 ? "Failed to fetch availability" : error.message,
      details: error.details,
    });
  }
};
