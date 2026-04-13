const { Resend } = require("resend");

async function sendAdminNotification({ subject, text, html }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return { skipped: true, reason: "ADMIN_EMAIL is not configured" };
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !fromEmail) {
      throw new Error("RESEND_API_KEY or RESEND_FROM_EMAIL is not configured");
    }

    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject,
      text,
      html,
    });
    if (result?.error) {
      throw Object.assign(new Error(result.error.message), result.error);
    }

    return { skipped: false };
  } catch (error) {
    console.error("[admin-notify] failed", {
      subject,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStatus: error?.status,
      errorBody: error?.body,
    });
    return { skipped: false, failed: true };
  }
}

module.exports = { sendAdminNotification };
