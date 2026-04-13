const { sendAdminNotification } = require("./_lib/admin-notify");
const { getCalendarIds, getFacilityConfig } = require("./_lib/facilities-config");
const { createAdminCancelledBookingEmail } = require("./_lib/email-templates");
const { calendarFetch, CalendarApiError } = require("./_lib/google-calendar");
const { HttpError, methodNotAllowed, readJsonBody, sendJson } = require("./_lib/http");
const { enforceRateLimit } = require("./_lib/rate-limit");
const { timingSafeTokenEqual } = require("./_lib/security");
const { validateFacility } = require("./_lib/validate");

function formatDateTimeRange(event) {
  const dateTime = event.start?.dateTime;
  const endDateTime = event.end?.dateTime;
  if (!dateTime || !endDateTime) {
    return null;
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

  return {
    date,
    startTime: timeFormatter.format(start),
    endTime: timeFormatter.format(end),
  };
}

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

    const timing = formatDateTimeRange(event);
    const facilityConfig = getFacilityConfig(facility);
    const guests =
      typeof privateProps.guests === "string" && privateProps.guests
        ? Number.parseInt(privateProps.guests, 10)
        : undefined;
    const layoutChange =
      privateProps.layoutChange === "true" ? true : privateProps.layoutChange === "false" ? false : undefined;
    const adminEmail = createAdminCancelledBookingEmail({
      customerName: privateProps.customerName || "",
      customerEmail: privateProps.customerEmail || "",
      facilityName: privateProps.facilityName || facilityConfig?.name || facility,
      date: timing?.date || "不明",
      startTime: timing?.startTime || "不明",
      endTime: timing?.endTime || "不明",
      resourceLabel: privateProps.resourceLabel || "",
      guests: Number.isNaN(guests) ? undefined : guests,
      layoutChange,
    });
    void sendAdminNotification(adminEmail);

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
