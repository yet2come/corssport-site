const { OPERATING_HOURS } = require("./facilities-config");

function toIso(date, time) {
  return `${date}T${time}:00+09:00`;
}

function getDayBounds(date) {
  const start = new Date(`${date}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    timeMin: `${date}T00:00:00+09:00`,
    timeMax: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(end)
      .replace(" ", "T")
      .replace(/\//g, "-") + "+09:00",
  };
}

function buildSlots(date) {
  const slots = [];
  const [openHours] = OPERATING_HOURS.open.split(":").map(Number);
  const [closeHours] = OPERATING_HOURS.close.split(":").map(Number);

  for (let hour = openHours; hour < closeHours; hour += 1) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(hour + 1).padStart(2, "0")}:00`;
    slots.push({
      start,
      end,
      startIso: toIso(date, start),
      endIso: toIso(date, end),
    });
  }

  return slots;
}

function slotsFromBusy(date, busyPeriods = []) {
  return buildSlots(date).map((slot) => {
    const available = !busyPeriods.some((busy) => {
      return !(busy.end <= slot.startIso || busy.start >= slot.endIso);
    });

    return {
      start: slot.start,
      end: slot.end,
      available,
    };
  });
}

function formatDateTime(dateTime) {
  const value = new Date(dateTime);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

module.exports = {
  buildSlots,
  formatDateTime,
  getDayBounds,
  slotsFromBusy,
  toIso,
};
