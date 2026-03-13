const { Resend } = require("resend");
const { getDayBounds, toIso } = require("./_lib/calendar-slots");
const { createBookingEmail, createCancelUrl } = require("./_lib/email-templates");
const { getCalendarIds, getFacilityConfig } = require("./_lib/facilities-config");
const { calendarFetch, CalendarApiError } = require("./_lib/google-calendar");
const { HttpError, methodNotAllowed, readJsonBody, sendJson } = require("./_lib/http");
const { enforceRateLimit } = require("./_lib/rate-limit");
const { createBookingEventId, generateCancelToken } = require("./_lib/security");
const { validateBookingPayload } = require("./_lib/validate");

function ensureEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(500, `${name} is not configured`);
  }
  return value;
}

async function getAvailableCalendar(calendars, date, startTime, endTime) {
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

  const startIso = toIso(date, startTime);
  const endIso = toIso(date, endTime);
  for (const calendar of calendars) {
    const busy = payload.calendars?.[calendar.id]?.busy || [];
    const hasConflict = busy.some((item) => !(item.end <= startIso || item.start >= endIso));
    if (!hasConflict) {
      return calendar;
    }
  }

  throw new HttpError(409, "Selected slot is no longer available");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(req, res, ["POST"]);
  }

  let createdEventId = null;
  let calendarId = null;

  try {
    enforceRateLimit(req, "book", 5, 60 * 1000);

    const body = await readJsonBody(req);
    const booking = validateBookingPayload(body);
    const facility = getFacilityConfig(booking.facility);
    const calendars = getCalendarIds(booking.facility);
    if (calendars.length === 0) {
      throw new HttpError(500, "Calendar is not configured");
    }

    ensureEnv("CANCEL_SECRET");
    const siteUrl = ensureEnv("SITE_URL");
    const resendKey = ensureEnv("RESEND_API_KEY");
    const fromEmail = ensureEnv("RESEND_FROM_EMAIL");

    const selectedCalendar = await getAvailableCalendar(calendars, booking.date, booking.startTime, booking.endTime);
    calendarId = selectedCalendar.id;
    const resourceLabel = booking.facility === "solo-booth" ? `Solo Booth ${selectedCalendar.resourceId}` : null;

    const eventId = createBookingEventId(booking);
    const cancelToken = generateCancelToken(eventId, booking.email);

    await calendarFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      body: JSON.stringify({
        id: eventId,
        summary: `[${facility.name}] 予約 - ${booking.name}`,
        description: [
          `お名前: ${booking.name}`,
          `メール: ${booking.email}`,
          `電話: ${booking.phone}`,
          `利用目的: ${booking.purpose || "未入力"}`,
          `人数: ${booking.guests}名`,
        ].join("\n"),
        start: {
          dateTime: toIso(booking.date, booking.startTime),
          timeZone: "Asia/Tokyo",
        },
        end: {
          dateTime: toIso(booking.date, booking.endTime),
          timeZone: "Asia/Tokyo",
        },
        extendedProperties: {
          private: {
            cancelToken,
            customerEmail: booking.email,
            customerName: booking.name,
            facilityId: booking.facility,
            facilityName: facility.name,
            resourceCalendarId: calendarId,
            resourceLabel: resourceLabel || "",
          },
        },
      }),
    });
    createdEventId = eventId;

    const cancelUrl = createCancelUrl({
      siteUrl,
      bookingId: eventId,
      facility: booking.facility,
      token: cancelToken,
    });
    const email = createBookingEmail({
      customerName: booking.name,
      facilityName: facility.name,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      guests: booking.guests,
      purpose: booking.purpose,
      cancelUrl,
      resourceLabel,
    });

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: booking.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return sendJson(res, 201, {
      success: true,
      booking: {
        id: eventId,
        facility: booking.facility,
        facilityName: facility.name,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        resourceLabel,
      },
    });
  } catch (error) {
    if (createdEventId && calendarId) {
      try {
        await calendarFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(createdEventId)}`, {
          method: "DELETE",
        });
      } catch {
        // Best effort rollback.
      }
    }

    if (error instanceof CalendarApiError && error.status === 409) {
      return sendJson(res, 409, { error: "Selected slot is no longer available" });
    }

    const status = error.status || 500;
    return sendJson(res, status, {
      error:
        status === 500 ? "Failed to create booking" : error.message,
      details: error.details,
    });
  }
};
