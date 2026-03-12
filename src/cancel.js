const loading = document.getElementById("cancel-loading");
const errorBox = document.getElementById("cancel-error");
const panel = document.getElementById("cancel-panel");
const success = document.getElementById("cancel-success");
const facility = document.getElementById("cancel-facility");
const dateTime = document.getElementById("cancel-datetime");
const submit = document.getElementById("cancel-submit");

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(raw);
  return {
    id: params.get("id"),
    facility: params.get("facility"),
    token: params.get("token"),
  };
}

function showError(message) {
  loading.classList.add("hidden");
  panel.classList.add("hidden");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

async function loadBooking() {
  const params = parseHash();
  if (!params.id || !params.facility || !params.token) {
    showError("キャンセルリンクが不正です。メール内の URL を再度ご確認ください。");
    return;
  }

  try {
    const response = await fetch(`/api/booking?id=${encodeURIComponent(params.id)}&facility=${encodeURIComponent(params.facility)}&token=${encodeURIComponent(params.token)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "予約情報を取得できませんでした");
    }

    loading.classList.add("hidden");
    panel.classList.remove("hidden");
    facility.textContent = payload.booking.facilityName;
    dateTime.textContent = `${payload.booking.date} ${payload.booking.startTime} - ${payload.booking.endTime}`;

    submit.addEventListener("click", async () => {
      submit.disabled = true;
      submit.textContent = "処理中...";

      try {
        const cancelResponse = await fetch("/api/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: params.id,
            facility: params.facility,
            token: params.token,
          }),
        });
        const cancelPayload = await cancelResponse.json();
        if (!cancelResponse.ok) {
          throw new Error(cancelPayload.error || "キャンセルに失敗しました");
        }

        panel.classList.add("hidden");
        success.classList.remove("hidden");
      } catch (error) {
        showError(error.message);
      } finally {
        submit.disabled = false;
        submit.textContent = "予約をキャンセルする";
      }
    }, { once: true });
  } catch (error) {
    showError(error.message);
  }
}

loadBooking();
