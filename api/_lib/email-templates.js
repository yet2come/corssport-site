function createCancelUrl({ siteUrl, bookingId, facility, token }) {
  const fragment = new URLSearchParams({
    id: bookingId,
    facility,
    token,
  }).toString();

  return `${siteUrl.replace(/\/$/, "")}/cancel.html#${fragment}`;
}

function createBookingEmail({ customerName, facilityName, date, startTime, endTime, guests, purpose, cancelUrl }) {
  const subject = `【CROSSPORT MSZ】予約確認 - ${facilityName} / ${date} ${startTime}-${endTime}`;
  const purposeLine = purpose ? purpose : "未入力";
  const text = [
    "━━━━━━━━━━━━━━━━━━━━━",
    "CROSSPORT MSZ - 予約確認",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `${customerName} 様`,
    "",
    "以下の内容でご予約を承りました。",
    "",
    `施設: ${facilityName}`,
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
    "CROSSPORT MSZ",
    "TEL: 050-5211-5434",
    "MAIL: crossport@xmo.jp",
  ].join("\n");

  const html = `
    <div style="font-family:'Noto Sans JP',sans-serif;line-height:1.7;color:#1A1A1D">
      <p>${customerName} 様</p>
      <p>以下の内容でご予約を承りました。</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">施設</td><td>${facilityName}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">日時</td><td>${date} ${startTime} - ${endTime}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">人数</td><td>${guests}名</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">利用目的</td><td>${purposeLine}</td></tr>
      </table>
      <p style="margin-top:24px">
        キャンセルをご希望の場合は以下のリンクからお手続きください。<br />
        <a href="${cancelUrl}">${cancelUrl}</a>
      </p>
    </div>
  `;

  return { subject, text, html };
}

module.exports = {
  createBookingEmail,
  createCancelUrl,
};
