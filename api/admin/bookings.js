const { FACILITIES, getCalendarIds, getFacilityConfig } = require("../_lib/facilities-config");
const { calendarFetch, CalendarApiError } = require("../_lib/google-calendar");
const { HttpError, methodNotAllowed, sendJson } = require("../_lib/http");

function verifyAdminToken(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    throw new HttpError(500, "ADMIN_TOKEN is not configured");
  }

  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!bearer || bearer !== token) {
    throw new HttpError(401, "Unauthorized");
  }
}

function parseDateParam(value, fallback) {
  if (!value) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `Invalid date format: ${value}`);
  }
  return value;
}

function parseEvent(event, facilityId, facilityConfig) {
  const ext = event.extendedProperties?.private || {};
  const start = new Date(event.start?.dateTime || event.start?.date);
  const end = new Date(event.end?.dateTime || event.end?.date);

  const fmt = (d) =>
    d.toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const fmtDate = (d) =>
    d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  // Extract guests from description
  let guests = null;
  if (event.description) {
    const match = event.description.match(/人数[：:]\s*(\d+)/);
    if (match) guests = Number(match[1]);
  }

  // Extract purpose from description
  let purpose = "";
  if (event.description) {
    const match = event.description.match(/利用目的[：:]\s*(.+)/);
    if (match) purpose = match[1].trim();
  }

  return {
    id: event.id,
    facility: facilityId,
    facilityName: facilityConfig.name,
    facilityLabel: facilityConfig.label,
    date: fmtDate(start),
    startTime: fmt(start),
    endTime: fmt(end),
    customerName: ext.customerName || event.summary?.replace(/.*予約\s*-\s*/, "") || "",
    customerEmail: ext.customerEmail || "",
    guests,
    purpose,
    resourceLabel: ext.resourceLabel || null,
    layoutChange: ext.layoutChange === "true",
    createdAt: event.created || null,
  };
}

async function fetchFacilityBookings(facilityId, timeMin, timeMax) {
  const config = getFacilityConfig(facilityId);
  if (!config) return [];

  const calendars = getCalendarIds(facilityId);
  const results = [];

  for (const cal of calendars) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      timeZone: "Asia/Tokyo",
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    try {
      const data = await calendarFetch(
        `/calendars/${encodeURIComponent(cal.id)}/events?${params}`
      );

      if (data?.items) {
        for (const event of data.items) {
          if (event.status === "cancelled") continue;
          results.push(parseEvent(event, facilityId, config));
        }
      }
    } catch (error) {
      if (error instanceof CalendarApiError && error.status === 404) {
        console.error(`[admin] Calendar not found for ${facilityId}: ${cal.id}`);
        continue;
      }
      throw error;
    }
  }

  return results;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(req, res, ["GET"]);
  }

  try {
    verifyAdminToken(req);

    const today = new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

    const from = parseDateParam(req.query.from, today);
    const to = parseDateParam(
      req.query.to,
      new Date(new Date(`${from}T00:00:00+09:00`).getTime() + 7 * 86400000)
        .toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
    );

    const timeMin = `${from}T00:00:00+09:00`;
    const timeMax = `${to}T23:59:59+09:00`;

    const facilityIds = Object.keys(FACILITIES);
    const allBookings = (
      await Promise.all(
        facilityIds.map((id) => fetchFacilityBookings(id, timeMin, timeMax))
      )
    ).flat();

    allBookings.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return sendJson(res, 200, {
      bookings: allBookings,
      period: { from, to },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendJson(res, error.status, { error: error.message });
    }
    console.error("[admin] request failed", error);
    return sendJson(res, 500, { error: "Internal Server Error" });
  }
};
