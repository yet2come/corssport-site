const { getCalendarIds } = require("./_lib/facilities-config");
const { calendarFetch, CalendarApiError } = require("./_lib/google-calendar");
const { HttpError, methodNotAllowed, readJsonBody, sendJson } = require("./_lib/http");
const { enforceRateLimit } = require("./_lib/rate-limit");
const { timingSafeTokenEqual } = require("./_lib/security");
const { validateFacility } = require("./_lib/validate");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(req, res, ["POST"]);
  }

  try {
    enforceRateLimit(req, "cancel", 10, 60 * 1000);

    const body = await readJsonBody(req);
    const facility = validateFacility(body.facility);
    const bookingId = body.bookingId;
    const token = body.token;

    if (typeof bookingId !== "string" || !bookingId || typeof token !== "string" || !token) {
      throw new HttpError(400, "bookingId, facility and token are required");
    }

    const calendars = getCalendarIds(facility);
    if (calendars.length === 0) {
      throw new HttpError(500, "Calendar is not configured");
    }
    let event = null;
    let calendarId = null;
    for (const calendar of calendars) {
      try {
        event = await calendarFetch(`/calendars/${encodeURIComponent(calendar.id)}/events/${encodeURIComponent(bookingId)}`);
        calendarId = calendar.id;
        break;
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }
    }
    if (!event || !calendarId) {
      throw new HttpError(404, "Booking not found");
    }
    const privateProps = event.extendedProperties?.private || {};

    if (privateProps.facilityId !== facility || !timingSafeTokenEqual(privateProps.cancelToken, token)) {
      throw new HttpError(403, "Invalid token");
    }

    await calendarFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(bookingId)}`, {
      method: "DELETE",
    });

    return sendJson(res, 200, {
      success: true,
      message: "予約をキャンセルしました",
    });
  } catch (error) {
    const status =
      error.status ||
      (error instanceof CalendarApiError && error.status === 404 ? 404 : 500);
    return sendJson(res, status, {
      error: status === 500 ? "Failed to cancel booking" : error.message,
      details: error.details,
    });
  }
};
