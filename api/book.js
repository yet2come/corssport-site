const { Resend } = require("resend");
const { buildSlots, getDayBounds, toIso } = require("./_lib/calendar-slots");
const { createBookingEmail, createCancelUrl } = require("./_lib/email-templates");
const { getCalendarId, getFacilityConfig } = require("./_lib/facilities-config");
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

async function ensureSlotAvailable(calendarId, date, startTime, endTime) {
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
  const slot = buildSlots(date).find((item) => item.start === startTime && item.end === endTime);
  if (!slot) {
    throw new HttpError(400, "Invalid slot");
  }

  const hasConflict = busy.some((item) => !(item.end <= slot.startIso || item.start >= slot.endIso));
  if (hasConflict) {
    throw new HttpError(409, "Selected slot is no longer available");
  }
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
    calendarId = getCalendarId(booking.facility);

    if (!calendarId) {
      throw new HttpError(500, "Calendar is not configured");
    }

    ensureEnv("CANCEL_SECRET");
    const siteUrl = ensureEnv("SITE_URL");
    const resendKey = ensureEnv("RESEND_API_KEY");
    const fromEmail = ensureEnv("RESEND_FROM_EMAIL");

    await ensureSlotAvailable(calendarId, booking.date, booking.startTime, booking.endTime);

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
