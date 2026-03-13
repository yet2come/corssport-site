const { calendarFetch } = require("./_lib/google-calendar");
const { getCalendarIds } = require("./_lib/facilities-config");
const { HttpError, methodNotAllowed, sendJson } = require("./_lib/http");
const { enforceRateLimit } = require("./_lib/rate-limit");
const { timingSafeTokenEqual } = require("./_lib/security");
const { validateFacility } = require("./_lib/validate");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(req, res, ["GET"]);
  }

  try {
    enforceRateLimit(req, "booking", 30, 60 * 1000);

    const facility = validateFacility(req.query.facility);
    const bookingId = req.query.id;
    const token = req.query.token;

    if (typeof bookingId !== "string" || !bookingId || typeof token !== "string" || !token) {
      throw new HttpError(400, "id, facility and token are required");
    }

    const calendars = getCalendarIds(facility);
    if (calendars.length === 0) {
      throw new HttpError(500, "Calendar is not configured");
    }
    let event = null;
    for (const calendar of calendars) {
      try {
        event = await calendarFetch(`/calendars/${encodeURIComponent(calendar.id)}/events/${encodeURIComponent(bookingId)}`);
        break;
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }
    }
    if (!event) {
      throw new HttpError(404, "Booking not found");
    }
    const privateProps = event.extendedProperties?.private || {};

    if (privateProps.facilityId !== facility || !timingSafeTokenEqual(privateProps.cancelToken, token)) {
      throw new HttpError(403, "Invalid token");
    }

    const dateTime = event.start?.dateTime;
    const endDateTime = event.end?.dateTime;
    if (!dateTime || !endDateTime) {
      throw new HttpError(500, "Booking data is incomplete");
    }

    const start = new Date(dateTime);
    const end = new Date(endDateTime);
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(start);
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return sendJson(res, 200, {
      booking: {
        id: event.id,
        facility,
        facilityName: privateProps.facilityName || facility,
        date,
        startTime: timeFormatter.format(start),
        endTime: timeFormatter.format(end),
        name: privateProps.customerName || "",
        resourceLabel: privateProps.resourceLabel || "",
      },
    });
  } catch (error) {
    const status = error.status || (error.message?.includes("404") ? 404 : 500);
    return sendJson(res, status, {
      error: status === 500 ? "Failed to fetch booking" : error.message,
      details: error.details,
    });
  }
};
