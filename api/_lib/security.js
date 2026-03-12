const crypto = require("node:crypto");

function createBookingEventId({ facility, date, startTime, endTime }) {
  return crypto
    .createHash("sha256")
    .update(`booking:${facility}:${date}:${startTime}-${endTime}`)
    .digest("hex")
    .slice(0, 32);
}

function generateCancelToken(eventId, email) {
  return crypto
    .createHmac("sha256", process.env.CANCEL_SECRET || "")
    .update(`${eventId}:${email}`)
    .digest("hex");
}

function timingSafeTokenEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  createBookingEventId,
  generateCancelToken,
  timingSafeTokenEqual,
};
