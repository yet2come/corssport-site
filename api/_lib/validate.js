const { HttpError } = require("./http");
const { FACILITIES, OPERATING_HOURS } = require("./facilities-config");

class ValidationError extends HttpError {
  constructor(details) {
    super(400, "Validation failed", details);
    this.name = "ValidationError";
  }
}

function validateFacility(facility) {
  if (!FACILITIES[facility]) {
    throw new ValidationError({ facility: "対象外の施設です" });
  }

  return facility;
}

function isValidDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateDate(date) {
  if (!isValidDateString(date)) {
    throw new ValidationError({ date: "日付は YYYY-MM-DD 形式で指定してください" });
  }

  const now = new Date();
  const tokyoToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const start = new Date(`${date}T00:00:00+09:00`);
  const today = new Date(`${tokyoToday}T00:00:00+09:00`);
  const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime())) {
    throw new ValidationError({ date: "有効な日付を指定してください" });
  }

  if (start < today || start > maxDate) {
    throw new ValidationError({ date: "予約日は本日から90日以内で指定してください" });
  }

  return date;
}

function isValidTimeString(value) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateSlot({ startTime, endTime }) {
  const errors = {};
  if (!isValidTimeString(startTime)) {
    errors.startTime = "開始時間は HH:MM 形式で指定してください";
  }
  if (!isValidTimeString(endTime)) {
    errors.endTime = "終了時間は HH:MM 形式で指定してください";
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const openMinutes = timeToMinutes(OPERATING_HOURS.open);
  const closeMinutes = timeToMinutes(OPERATING_HOURS.close);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (
    startMinutes < openMinutes ||
    endMinutes > closeMinutes ||
    endMinutes - startMinutes !== OPERATING_HOURS.slotMinutes
  ) {
    throw new ValidationError({
      startTime: "営業時間内の1時間スロットを選択してください",
      endTime: "営業時間内の1時間スロットを選択してください",
    });
  }

  return { startTime, endTime };
}

function validateEmail(email) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError({ email: "メールアドレス形式が不正です" });
  }
  return email.trim().toLowerCase();
}

function validatePhone(phone) {
  if (typeof phone !== "string" || !/^(0\d{1,4}-?\d{1,4}-?\d{3,4})$/.test(phone.trim())) {
    throw new ValidationError({ phone: "電話番号形式が不正です" });
  }
  return phone.trim();
}

function validateName(name) {
  if (typeof name !== "string") {
    throw new ValidationError({ name: "お名前を入力してください" });
  }

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) {
    throw new ValidationError({ name: "お名前は1〜100文字で入力してください" });
  }

  return trimmed;
}

function validatePurpose(purpose) {
  if (purpose == null || purpose === "") {
    return "";
  }
  if (typeof purpose !== "string") {
    throw new ValidationError({ purpose: "利用目的は文字列で入力してください" });
  }

  const trimmed = purpose.trim();
  if (trimmed.length > 500) {
    throw new ValidationError({ purpose: "利用目的は500文字以内で入力してください" });
  }

  return trimmed.replace(/[<>]/g, "");
}

function validateGuests(guests, facility) {
  const value = Number(guests);
  if (!Number.isInteger(value) || value < 1 || value > FACILITIES[facility].capacity) {
    throw new ValidationError({
      guests: `人数は1〜${FACILITIES[facility].capacity}名で入力してください`,
    });
  }

  return value;
}

function validateBookingPayload(payload) {
  const facility = validateFacility(payload.facility);
  const date = validateDate(payload.date);
  const { startTime, endTime } = validateSlot(payload);
  const name = validateName(payload.name);
  const email = validateEmail(payload.email);
  const phone = validatePhone(payload.phone);
  const purpose = validatePurpose(payload.purpose);
  const guests = validateGuests(payload.guests, facility);

  return {
    facility,
    date,
    startTime,
    endTime,
    name,
    email,
    phone,
    purpose,
    guests,
  };
}

module.exports = {
  ValidationError,
  validateBookingPayload,
  validateDate,
  validateFacility,
};
