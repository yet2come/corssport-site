const facilities = {
  "event-space": {
    name: "Event Hall",
    description: "最大20名収容。ワークショップや講演会向けのイベントスペース。",
    capacity: 20,
    close: "21:00",
  },
  "meeting-room": {
    name: "Meeting Room",
    description: "モニターとホワイトボードを備えた打ち合わせ向けの会議室。",
    capacity: 8,
    close: "21:00",
  },
  "solo-booth": {
    name: "Solo Booth",
    description: "集中作業やオンライン会議向けの個室ブース。",
    capacity: 5,
    close: "18:00",
  },
};

const state = {
  facility: null,
  date: "",
  selectedStarts: [],
};

const panel = document.getElementById("booking-panel");
const facilityName = document.getElementById("booking-facility-name");
const facilityDescription = document.getElementById("booking-facility-description");
const capacity = document.getElementById("booking-capacity");
const facilityInput = document.getElementById("booking-facility-input");
const dateInput = document.getElementById("booking-date");
const slotHint = document.getElementById("booking-slot-hint");
const slotContainer = document.getElementById("booking-slots");
const form = document.getElementById("booking-form");
const banner = document.getElementById("booking-banner");
const successPanel = document.getElementById("booking-success");
const successDetail = document.getElementById("booking-success-detail");
const submitButton = document.getElementById("booking-submit");
const startTimeInput = document.getElementById("booking-start-time");
const endTimeInput = document.getElementById("booking-end-time");
const priceBox = document.getElementById("booking-price");
const layoutOption = document.getElementById("booking-layout-option");
const layoutCheckbox = document.getElementById("booking-layout-change");

function tokyoDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTokyoNowParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function getTokyoDateOffset(days) {
  return tokyoDateString(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

function showBanner(message, tone = "info") {
  banner.textContent = message;
  banner.classList.remove("hidden", "bg-white", "bg-[#ffe9e7]", "text-basalt-black");
  banner.classList.add("text-basalt-black");
  if (tone === "error") {
    banner.classList.add("bg-[#ffe9e7]");
  } else {
    banner.classList.add("bg-white");
  }
}

function clearBanner() {
  banner.classList.add("hidden");
}

function formatApiError(payload) {
  if (!payload || typeof payload !== "object") {
    return "予約に失敗しました";
  }

  if (payload.details && typeof payload.details === "object") {
    const firstDetail = Object.values(payload.details).find(
      (value) => typeof value === "string" && value.trim()
    );
    if (firstDetail) {
      return firstDetail;
    }
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return "予約に失敗しました";
}

function formatYen(value) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function setPriceLines(lines) {
  priceBox.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
  priceBox.classList.remove("hidden");
}

function setPriceDisplay(selectedSlots) {
  if (selectedSlots.length === 0) {
    priceBox.classList.add("hidden");
    priceBox.innerHTML = "";
    return;
  }

  if (state.facility === "event-space") {
    let visitorTotal = selectedSlots.reduce((sum, slot) => {
      return sum + (slot.start >= "18:00" ? 13200 : 8800);
    }, 0);
    let memberTotal = selectedSlots.reduce((sum, slot) => {
      return sum + (slot.start >= "18:00" ? 9900 : 6600);
    }, 0);
    if (layoutCheckbox.checked) {
      visitorTotal += 3300;
      memberTotal += 3300;
    }
    setPriceLines([
      `ビジター料金: ${formatYen(visitorTotal)} (${selectedSlots.length}時間)`,
      `メンバー料金: ${formatYen(memberTotal)} (${selectedSlots.length}時間)`,
    ]);
  } else if (state.facility === "meeting-room") {
    const visitorTotal = selectedSlots.reduce((sum, slot) => {
      return sum + (slot.start >= "18:00" ? 4400 : 2200);
    }, 0);
    const memberTotal = selectedSlots.reduce((sum, slot) => {
      return sum + (slot.start >= "18:00" ? 3300 : 1100);
    }, 0);
    setPriceLines([
      `ビジター料金: ${formatYen(visitorTotal)} (${selectedSlots.length}時間)`,
      `メンバー料金: ${formatYen(memberTotal)} (${selectedSlots.length}時間)`,
    ]);
  } else if (state.facility === "solo-booth") {
    const hours = selectedSlots.length;
    let visitorTotal = 1200;
    let memberTotal = 600;
    if (hours > 2) {
      visitorTotal += (hours - 2) * 600;
      memberTotal += (hours - 2) * 300;
    }
    visitorTotal = Math.min(visitorTotal, 2500);
    memberTotal = Math.min(memberTotal, 1000);
    setPriceLines([
      `ビジター料金: ${formatYen(visitorTotal)} (${hours}時間 / 18:00まで上限 ${formatYen(2500)})`,
      `メンバー料金: ${formatYen(memberTotal)} (${hours}時間 / 18:00まで上限 ${formatYen(1000)})`,
    ]);
  }
}

function sortTimes(times) {
  return [...times].sort((left, right) => left.localeCompare(right));
}

function getSelectedSlots() {
  return sortTimes(state.selectedStarts)
    .map((start) => slotContainer.querySelector(`[data-start="${start}"]`))
    .filter(Boolean)
    .map((element) => ({
      start: element.dataset.start,
      end: element.dataset.end,
    }));
}

function updateSelectedState() {
  const selectedSlots = getSelectedSlots();
  startTimeInput.value = selectedSlots[0]?.start || "";
  endTimeInput.value = selectedSlots[selectedSlots.length - 1]?.end || "";
  setPriceDisplay(selectedSlots);

  if (selectedSlots.length === 0) {
    slotHint.textContent = "時間を複数選択できます";
  } else {
    slotHint.textContent = `${selectedSlots[0].start} - ${selectedSlots[selectedSlots.length - 1].end} を選択中 (${selectedSlots.length}時間)`;
  }

  slotContainer.querySelectorAll("[data-slot]").forEach((button) => {
    const active = state.selectedStarts.includes(button.dataset.start);
    button.classList.toggle("is-selected", active);
  });
}

function setSelectedStarts(starts) {
  state.selectedStarts = sortTimes(starts);
  updateSelectedState();
}

function toggleSlot(slot) {
  const selected = new Set(state.selectedStarts);
  if (selected.has(slot.start)) {
    selected.delete(slot.start);
  } else {
    selected.add(slot.start);
  }

  setSelectedStarts([...selected]);
}

function renderSlots(slots) {
  slotContainer.innerHTML = "";
  setSelectedStarts([]);
  const now = getTokyoNowParts();
  const isToday = dateInput.value === now.date;
  const cutoffMinutes = now.hour * 60 + now.minute;

  if (!slots || slots.length === 0) {
    slotHint.textContent = "営業時間内のスロットがありません";
    setPriceDisplay([]);
    return;
  }

  slotHint.textContent = "時間を複数選択できます";
  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.slot = "true";
    button.dataset.start = slot.start;
    button.dataset.end = slot.end;
    button.className = "booking-slot brutalist-border";
    if (slot.start >= "18:00") {
      button.classList.add("is-evening");
    }
    if (state.facility === "solo-booth") {
      button.textContent = slot.available
        ? `${slot.start} - ${slot.end} / 残り ${slot.remaining}`
        : `${slot.start} - 満室`;
    } else {
      button.textContent = slot.available
        ? `${slot.start} - ${slot.end}`
        : `${slot.start} - 予約済`;
    }
    const [hours, minutes] = slot.start.split(":").map(Number);
    const isPastSlot = isToday && hours * 60 + minutes <= cutoffMinutes;
    if (!slot.available || isPastSlot) {
      button.disabled = true;
      button.classList.add("is-unavailable", "cursor-not-allowed");
      if (isPastSlot && slot.available) {
        button.textContent = `${slot.start} - 締切`;
      }
    } else {
      button.addEventListener("click", () => toggleSlot(slot));
    }
    slotContainer.appendChild(button);
  });
}

async function fetchAvailability(facility, date) {
  slotHint.textContent = "読み込み中...";
  slotContainer.innerHTML = `<div class="booking-slot booking-slot-skeleton brutalist-border"></div>`.repeat(9);
  const response = await fetch(`/api/availability?facility=${encodeURIComponent(facility)}&date=${encodeURIComponent(date)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "空き状況の取得に失敗しました");
  }
  renderSlots(payload.slots);
}

function selectFacility(facilityId) {
  state.facility = facilityId;
  const facility = facilities[facilityId];
  facilityName.textContent = facility.name;
  facilityDescription.textContent = facility.description;
  capacity.textContent = `定員: ${facility.capacity}名`;
  document.querySelector("#booking-panel .space-y-3 p").textContent = `営業時間: 09:00 - ${facility.close}`;
  facilityInput.value = facilityId;
  layoutCheckbox.checked = false;
  if (facilityId === "event-space") {
    layoutOption.classList.remove("hidden");
  } else {
    layoutOption.classList.add("hidden");
  }
  successPanel.classList.add("hidden");
  form.classList.remove("hidden");
  setSelectedStarts([]);
  panel.classList.remove("hidden");
  document.querySelectorAll("[data-facility-card]").forEach((card) => {
    card.classList.toggle("is-selected-card", card.dataset.facility === facilityId);
  });
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!dateInput.value) {
    dateInput.value = tokyoDateString();
  }
  loadAvailability();
}

async function loadAvailability() {
  if (!state.facility || !dateInput.value) {
    return;
  }
  state.date = dateInput.value;
  clearBanner();
  try {
    await fetchAvailability(state.facility, dateInput.value);
  } catch (error) {
    showBanner(error.message, "error");
    slotContainer.innerHTML = "";
    slotHint.textContent = "取得に失敗しました";
  }
}

async function loadCardStatuses() {
  const now = getTokyoNowParts();
  const minutesNow = now.hour * 60 + now.minute;
  const showTomorrow = minutesNow >= 16 * 60 + 30;
  const targetDate = showTomorrow
    ? tokyoDateString(new Date(Date.now() + 24 * 60 * 60 * 1000))
    : now.date;
  const thresholdMinutes = showTomorrow ? 0 : minutesNow + 30;
  await Promise.all(
    [...document.querySelectorAll("[data-facility-card]")].map(async (card) => {
      const status = card.querySelector("[data-facility-status]");
      try {
        const response = await fetch(`/api/availability?facility=${encodeURIComponent(card.dataset.facility)}&date=${targetDate}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error();
        }
        const candidateSlots = payload.slots.filter((slot) => {
          const [hours, minutes] = slot.start.split(":").map(Number);
          return hours * 60 + minutes >= thresholdMinutes;
        });
        if (card.dataset.facility === "solo-booth") {
          const nextAvailable = candidateSlots.find((slot) => slot.remaining > 0);
          status.textContent = nextAvailable
            ? `${showTomorrow ? "明日" : "本日"}空き ${nextAvailable.remaining} / 5 / 次の空き: ${nextAvailable.start}`
            : `${showTomorrow ? "明日" : "本日"}は満室`;
        } else {
          const nextAvailable = candidateSlots.find((slot) => slot.available);
          status.textContent = nextAvailable
            ? `${showTomorrow ? "明日" : "本日"}空きあり / 次の空き: ${nextAvailable.start}`
            : `${showTomorrow ? "明日" : "本日"}は空きなし`;
        }
      } catch {
        status.textContent = "空き状況を取得できません";
      }
    })
  );
}

document.querySelectorAll("[data-facility-card]").forEach((card) => {
  card.addEventListener("click", () => selectFacility(card.dataset.facility));
});

dateInput.min = tokyoDateString();
dateInput.max = getTokyoDateOffset(183);
dateInput.addEventListener("change", loadAvailability);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearBanner();

  const selectedSlots = getSelectedSlots();
  if (!state.facility || !dateInput.value || selectedSlots.length === 0) {
    showBanner("施設・日付・時間を選択してください", "error");
    return;
  }
  for (let index = 1; index < selectedSlots.length; index += 1) {
    if (selectedSlots[index - 1].end !== selectedSlots[index].start) {
      showBanner("複数選択する場合は連続した時間帯を選択してください", "error");
      return;
    }
  }

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.date = dateInput.value;
  payload.guests = Number(payload.guests);
  payload.layoutChange = state.facility === "event-space" && layoutCheckbox.checked;

  submitButton.disabled = true;
  submitButton.textContent = "送信中...";

  try {
    const response = await fetch("/api/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(formatApiError(data));
    }

    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    successDetail.textContent = `${data.booking.facilityName} / ${data.booking.date} ${data.booking.startTime}-${data.booking.endTime} で予約を受け付けました。確認メールをご確認ください。`;
    showBanner("予約を受け付けました", "info");
  } catch (error) {
    showBanner(error.message, "error");
    if (String(error.message).includes("no longer available")) {
      await loadAvailability();
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "予約する";
  }
});

loadCardStatuses();
layoutCheckbox.addEventListener("change", () => {
  setPriceDisplay(getSelectedSlots());
});
