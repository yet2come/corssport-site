const FACILITIES = {
  "event-space": {
    id: "event-space",
    name: "Event Space",
    label: "イベントスペース",
    calendarEnv: "GCAL_ID_EVENT_SPACE",
    capacity: 20,
    description: "最大20名収容。ワークショップや講演会向けのイベントスペース。",
  },
  "meeting-room": {
    id: "meeting-room",
    name: "Meeting Room",
    label: "会議室",
    calendarEnv: "GCAL_ID_MEETING_ROOM",
    capacity: 8,
    description: "モニターとホワイトボードを備えた打ち合わせ向けの会議室。",
  },
  "solo-booth": {
    id: "solo-booth",
    name: "Solo Booth",
    label: "ソロブース",
    calendarEnv: "GCAL_ID_SOLO_BOOTH",
    capacity: 1,
    description: "集中作業やオンライン会議向けの個室ブース。",
  },
};

const OPERATING_HOURS = {
  open: "09:00",
  close: "18:00",
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

  return process.env[facility.calendarEnv] || null;
}

module.exports = {
  FACILITIES,
  OPERATING_HOURS,
  getFacilityConfig,
  getCalendarId,
};
