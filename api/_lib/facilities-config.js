const FACILITIES = {
  "event-space": {
    id: "event-space",
    name: "Event Hall",
    label: "イベントスペース",
    calendarEnv: "GCAL_ID_EVENT_HALL",
    capacity: 20,
    close: "21:00",
    description: "最大20名収容。ワークショップや講演会向けのイベントスペース。",
  },
  "meeting-room": {
    id: "meeting-room",
    name: "Meeting Room",
    label: "会議室",
    calendarEnv: "GCAL_ID_MEETING_ROOM",
    capacity: 8,
    close: "21:00",
    description: "モニターとホワイトボードを備えた打ち合わせ向けの会議室。",
  },
  "solo-booth": {
    id: "solo-booth",
    name: "Solo Booth",
    label: "ソロブース",
    calendarEnvs: [
      "GCAL_ID_SOLO_BOOTH_1",
      "GCAL_ID_SOLO_BOOTH_2",
      "GCAL_ID_SOLO_BOOTH_3",
      "GCAL_ID_SOLO_BOOTH_4",
      "GCAL_ID_SOLO_BOOTH_5",
    ],
    capacity: 1,
    inventory: 5,
    close: "18:00",
    description: "集中作業やオンライン会議向けの個室ブース。",
  },
};

const OPERATING_HOURS = {
  open: "09:00",
  close: "21:00",
  slotMinutes: 60,
};

function getFacilityConfig(facilityId) {
  return FACILITIES[facilityId] || null;
}

function getCalendarId(facilityId) {
  const facility = getFacilityConfig(facilityId);
  if (!facility) {
    return null;
  }

  if (facility.calendarEnvs) {
    return process.env[facility.calendarEnvs[0]] || null;
  }

  return process.env[facility.calendarEnv] || null;
}

function getCalendarIds(facilityId) {
  const facility = getFacilityConfig(facilityId);
  if (!facility) {
    return [];
  }

  if (facility.calendarEnvs) {
    return facility.calendarEnvs.map((name, index) => ({
      id: process.env[name] || null,
      resourceId: String(index + 1),
    })).filter((item) => item.id);
  }

  const id = process.env[facility.calendarEnv] || null;
  return id ? [{ id, resourceId: "1" }] : [];
}

function getOperatingHours(facilityId) {
  const facility = getFacilityConfig(facilityId);
  return {
    open: OPERATING_HOURS.open,
    close: facility?.close || OPERATING_HOURS.close,
    slotMinutes: OPERATING_HOURS.slotMinutes,
  };
}

module.exports = {
  FACILITIES,
  OPERATING_HOURS,
  getFacilityConfig,
  getCalendarId,
  getCalendarIds,
  getOperatingHours,
};
