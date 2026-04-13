function createCancelUrl({ siteUrl, bookingId, facility, token }) {
  const fragment = new URLSearchParams({
    id: bookingId,
    facility,
    token,
  }).toString();

  return `${siteUrl.replace(/\/$/, "")}/cancel.html#${fragment}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createBookingEmail({ customerName, facilityName, date, startTime, endTime, guests, purpose, cancelUrl, resourceLabel }) {
  const subject = `【CROSSPORT MSZ】予約確認 - ${facilityName} / ${date} ${startTime}-${endTime}`;
  const purposeLine = purpose ? purpose : "未入力";
  const resourceLine = resourceLabel ? `部屋: ${resourceLabel}` : null;
  const customerNameHtml = escapeHtml(customerName);
  const facilityNameHtml = escapeHtml(facilityName);
  const dateHtml = escapeHtml(date);
  const startTimeHtml = escapeHtml(startTime);
  const endTimeHtml = escapeHtml(endTime);
  const guestsHtml = escapeHtml(`${guests}`);
  const purposeLineHtml = escapeHtml(purposeLine);
  const resourceLabelHtml = resourceLabel ? escapeHtml(resourceLabel) : "";
  const cancelUrlHtml = escapeHtml(cancelUrl);
  const text = [
    "━━━━━━━━━━━━━━━━━━━━━",
    "CROSSPORT MSZ - 予約確認",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `${customerName} 様`,
    "",
    "このたびはクロスポート武生水のご利用ありがとうございます。",
    "以下の内容でご予約を承りました。",
    "",
    `施設: ${facilityName}`,
    resourceLine,
    `日時: ${date} ${startTime} - ${endTime}`,
    `人数: ${guests}名`,
    `利用目的: ${purposeLine}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    "キャンセルをご希望の場合は以下のリンクからお手続きください。",
    cancelUrl,
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    "クロスポート武生水（むしょうず）",
    "CROSSPORT MSZ",
    "TEL: 050-5211-5434",
    "MAIL: crossport@xmo.jp",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:'Noto Sans JP',sans-serif;line-height:1.7;color:#1A1A1D">
      <p>${customerNameHtml} 様</p>
      <p>このたびはクロスポート武生水のご利用ありがとうございます。<br />以下の内容でご予約を承りました。</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">施設</td><td>${facilityNameHtml}</td></tr>
        ${resourceLabel ? `<tr><td style="padding:4px 12px 4px 0;font-weight:700">部屋</td><td>${resourceLabelHtml}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">日時</td><td>${dateHtml} ${startTimeHtml} - ${endTimeHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">人数</td><td>${guestsHtml}名</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">利用目的</td><td>${purposeLineHtml}</td></tr>
      </table>
      <p style="margin-top:24px">
        キャンセルをご希望の場合は以下のリンクからお手続きください。<br />
        <a href="${cancelUrlHtml}">${cancelUrlHtml}</a>
      </p>
      <p style="margin-top:24px">
        クロスポート武生水（むしょうず）<br />
        CROSSPORT MSZ<br />
        TEL: 050-5211-5434<br />
        MAIL: crossport@xmo.jp
      </p>
    </div>
  `;

  return { subject, text, html };
}

function createAdminNewBookingEmail({
  customerName,
  customerEmail,
  phone,
  facilityName,
  date,
  startTime,
  endTime,
  guests,
  purpose,
  resourceLabel,
  layoutChange,
}) {
  const subject = `【CROSSPORT MSZ】新規予約通知 - ${facilityName} / ${date} ${startTime}-${endTime}`;
  const purposeLine = purpose ? purpose : "未入力";
  const resourceLine = resourceLabel ? `部屋: ${resourceLabel}` : null;
  const customerNameHtml = escapeHtml(customerName);
  const customerEmailHtml = escapeHtml(customerEmail);
  const phoneHtml = escapeHtml(phone);
  const facilityNameHtml = escapeHtml(facilityName);
  const dateHtml = escapeHtml(date);
  const startTimeHtml = escapeHtml(startTime);
  const endTimeHtml = escapeHtml(endTime);
  const guestsHtml = escapeHtml(`${guests}`);
  const purposeLineHtml = escapeHtml(purposeLine);
  const resourceLabelHtml = resourceLabel ? escapeHtml(resourceLabel) : "";
  const layoutChangeHtml = escapeHtml(layoutChange ? "あり" : "なし");
  const text = [
    "CROSSPORT MSZ に新規予約が入りました。",
    "",
    `施設: ${facilityName}`,
    resourceLine,
    `日時: ${date} ${startTime} - ${endTime}`,
    `予約者: ${customerName}`,
    `メール: ${customerEmail}`,
    `電話: ${phone}`,
    `人数: ${guests}名`,
    `利用目的: ${purposeLine}`,
    `レイアウト変更: ${layoutChange ? "あり" : "なし"}`,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:'Noto Sans JP',sans-serif;line-height:1.7;color:#1A1A1D">
      <p>CROSSPORT MSZ に新規予約が入りました。</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">施設</td><td>${facilityNameHtml}</td></tr>
        ${resourceLabel ? `<tr><td style="padding:4px 12px 4px 0;font-weight:700">部屋</td><td>${resourceLabelHtml}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">日時</td><td>${dateHtml} ${startTimeHtml} - ${endTimeHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">予約者</td><td>${customerNameHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">メール</td><td>${customerEmailHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">電話</td><td>${phoneHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">人数</td><td>${guestsHtml}名</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">利用目的</td><td>${purposeLineHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">レイアウト変更</td><td>${layoutChangeHtml}</td></tr>
      </table>
    </div>
  `;

  return { subject, text, html };
}

function createAdminCancelledBookingEmail({
  customerName,
  customerEmail,
  facilityName,
  date,
  startTime,
  endTime,
  resourceLabel,
  guests,
  layoutChange,
}) {
  const subject = `【CROSSPORT MSZ】キャンセル通知 - ${facilityName} / ${date} ${startTime}-${endTime}`;
  const customerNameHtml = escapeHtml(customerName || "不明");
  const customerEmailHtml = escapeHtml(customerEmail || "不明");
  const facilityNameHtml = escapeHtml(facilityName);
  const dateHtml = escapeHtml(date);
  const startTimeHtml = escapeHtml(startTime);
  const endTimeHtml = escapeHtml(endTime);
  const resourceLabelHtml = resourceLabel ? escapeHtml(resourceLabel) : "";
  const guestsHtml = typeof guests === "number" ? escapeHtml(`${guests}`) : "";
  const layoutChangeHtml = typeof layoutChange === "boolean" ? escapeHtml(layoutChange ? "あり" : "なし") : "";
  const text = [
    "CROSSPORT MSZ の予約がキャンセルされました。",
    "",
    `施設: ${facilityName}`,
    resourceLabel ? `部屋: ${resourceLabel}` : null,
    `日時: ${date} ${startTime} - ${endTime}`,
    `予約者: ${customerName || "不明"}`,
    `メール: ${customerEmail || "不明"}`,
    typeof guests === "number" ? `人数: ${guests}名` : null,
    typeof layoutChange === "boolean" ? `レイアウト変更: ${layoutChange ? "あり" : "なし"}` : null,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:'Noto Sans JP',sans-serif;line-height:1.7;color:#1A1A1D">
      <p>CROSSPORT MSZ の予約がキャンセルされました。</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">施設</td><td>${facilityNameHtml}</td></tr>
        ${resourceLabel ? `<tr><td style="padding:4px 12px 4px 0;font-weight:700">部屋</td><td>${resourceLabelHtml}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">日時</td><td>${dateHtml} ${startTimeHtml} - ${endTimeHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">予約者</td><td>${customerNameHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">メール</td><td>${customerEmailHtml}</td></tr>
        ${typeof guests === "number" ? `<tr><td style="padding:4px 12px 4px 0;font-weight:700">人数</td><td>${guestsHtml}名</td></tr>` : ""}
        ${typeof layoutChange === "boolean" ? `<tr><td style="padding:4px 12px 4px 0;font-weight:700">レイアウト変更</td><td>${layoutChangeHtml}</td></tr>` : ""}
      </table>
    </div>
  `;

  return { subject, text, html };
}

function createAdminDeliveryFailureEmail({
  eventType,
  recipient,
  subjectLine,
  reason,
  createdAt,
  messageId,
}) {
  const subject = `【CROSSPORT MSZ】メール配信失敗通知 - ${eventType}`;
  const eventTypeHtml = escapeHtml(eventType);
  const recipientHtml = escapeHtml(recipient || "不明");
  const subjectLineHtml = escapeHtml(subjectLine || "不明");
  const reasonHtml = escapeHtml(reason || "不明");
  const createdAtHtml = escapeHtml(createdAt || "不明");
  const messageIdHtml = escapeHtml(messageId || "不明");
  const text = [
    "Resend Webhook でメール配信失敗イベントを受信しました。",
    "",
    `イベント種別: ${eventType}`,
    `宛先: ${recipient || "不明"}`,
    `件名: ${subjectLine || "不明"}`,
    `理由: ${reason || "不明"}`,
    `発生時刻: ${createdAt || "不明"}`,
    `メッセージID: ${messageId || "不明"}`,
  ].join("\n");

  const html = `
    <div style="font-family:'Noto Sans JP',sans-serif;line-height:1.7;color:#1A1A1D">
      <p>Resend Webhook でメール配信失敗イベントを受信しました。</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">イベント種別</td><td>${eventTypeHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">宛先</td><td>${recipientHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">件名</td><td>${subjectLineHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">理由</td><td>${reasonHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">発生時刻</td><td>${createdAtHtml}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">メッセージID</td><td>${messageIdHtml}</td></tr>
      </table>
    </div>
  `;

  return { subject, text, html };
}

module.exports = {
  createAdminCancelledBookingEmail,
  createAdminDeliveryFailureEmail,
  createAdminNewBookingEmail,
  createBookingEmail,
  createCancelUrl,
};
