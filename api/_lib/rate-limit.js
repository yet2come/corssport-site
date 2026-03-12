const { HttpError } = require("./http");

const buckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function enforceRateLimit(req, key, limit, windowMs) {
  const ip = getClientIp(req);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = buckets.get(bucketKey) || [];
  const next = existing.filter((timestamp) => timestamp > windowStart);

  if (next.length >= limit) {
    throw new HttpError(429, "Too many requests");
  }

  next.push(now);
  buckets.set(bucketKey, next);
}

module.exports = { enforceRateLimit };
