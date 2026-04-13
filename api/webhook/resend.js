const { Webhook } = require("svix");
const { sendAdminNotification } = require("../_lib/admin-notify");
const { createAdminDeliveryFailureEmail } = require("../_lib/email-templates");
const { HttpError, methodNotAllowed, sendJson } = require("../_lib/http");
const { enforceRateLimit } = require("../_lib/rate-limit");

const DELIVERY_FAILURE_EVENTS = new Set([
  "email.bounced",
  "email.complained",
  "email.delivery_failed",
]);

function ensureEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(500, `${name} is not configured`);
  }
  return value;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    throw new HttpError(400, "Request body is required");
  }

  return raw;
}

function getFailureDetails(payload) {
  const data = payload.data || {};
  const recipient = data.to || data.email || data.recipient || "";
  const reason =
    data.bounce?.reason ||
    data.bounce?.message ||
    data.complaint?.reason ||
    data.error ||
    data.reason ||
    "";

  return {
    createdAt: payload.created_at || data.created_at || "",
    eventType: payload.type,
    messageId: data.email_id || data.id || payload.id || "",
    reason,
    recipient,
    subjectLine: data.subject || "",
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(req, res, ["POST"]);
  }

  try {
    enforceRateLimit(req, "resend-webhook", 100, 60 * 1000);

    const secret = ensureEnv("RESEND_WEBHOOK_SECRET");
    const rawBody = await readRawBody(req);
    const webhook = new Webhook(secret);

    let payload;
    try {
      payload = webhook.verify(rawBody, {
        "svix-id": req.headers["svix-id"],
        "svix-signature": req.headers["svix-signature"],
        "svix-timestamp": req.headers["svix-timestamp"],
      });
    } catch {
      return sendJson(res, 400, { error: "Invalid webhook signature" });
    }

    if (!DELIVERY_FAILURE_EVENTS.has(payload.type)) {
      return sendJson(res, 200, { received: true });
    }

    const failure = getFailureDetails(payload);
    console.log(JSON.stringify({
      event: "resend_delivery_failure",
      type: failure.eventType,
      recipient: failure.recipient,
      reason: failure.reason,
      messageId: failure.messageId,
      timestamp: new Date().toISOString(),
    }));

    void sendAdminNotification(createAdminDeliveryFailureEmail(failure));
    return sendJson(res, 200, { received: true });
  } catch (error) {
    const status = error.status || 500;
    console.error("[resend-webhook] failed", {
      errorName: error?.name,
      errorMessage: error?.message,
      errorStatus: error?.status,
    });
    return sendJson(res, status, {
      error: status === 500 ? "Failed to process webhook" : error.message,
    });
  }
};
