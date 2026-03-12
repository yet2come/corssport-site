const facilities = {
  "event-space": {
    name: "Event Space",
    description: "最大20名収容。ワークショップや講演会向けのイベントスペース。",
    capacity: 20,
  },
  "meeting-room": {
    name: "Meeting Room",
    description: "モニターとホワイトボードを備えた打ち合わせ向けの会議室。",
    capacity: 8,
  },
  "solo-booth": {
    name: "Solo Booth",
    description: "集中作業やオンライン会議向けの個室ブース。",
    capacity: 1,
  },
};

const state = {
  facility: null,
  date: "",
  slot: null,
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

function tokyoDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

function setSelectedSlot(slot) {
  state.slot = slot;
  startTimeInput.value = slot?.start || "";
  endTimeInput.value = slot?.end || "";

  slotContainer.querySelectorAll("[data-slot]").forEach((button) => {
    const active = button.dataset.start === slot?.start;
    button.classList.toggle("bg-basalt-black", active);
    button.classList.toggle("text-white", active);
    button.classList.toggle("border-white", active);
  });
}

function renderSlots(slots) {
  slotContainer.innerHTML = "";
  setSelectedSlot(null);

  if (!slots || slots.length === 0) {
    slotHint.textContent = "営業時間内のスロットがありません";
    return;
  }

  slotHint.textContent = "時間を選択してください";
  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.slot = "true";
    button.dataset.start = slot.start;
    button.dataset.end = slot.end;
    button.className = "booking-slot brutalist-border";
    button.textContent = `${slot.start} - ${slot.end}`;
    if (!slot.available) {
      button.disabled = true;
      button.classList.add("opacity-30", "cursor-not-allowed");
    } else {
      button.addEventListener("click", () => setSelectedSlot(slot));
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
  facilityInput.value = facilityId;
  panel.classList.remove("hidden");
  document.querySelectorAll("[data-facility-card]").forEach((card) => {
    card.classList.toggle("bg-seaweed-green", card.dataset.facility === facilityId);
    card.classList.toggle("text-white", card.dataset.facility === facilityId);
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
  const today = tokyoDateString();
  await Promise.all(
    [...document.querySelectorAll("[data-facility-card]")].map(async (card) => {
      const status = card.querySelector("[data-facility-status]");
      try {
        const response = await fetch(`/api/availability?facility=${encodeURIComponent(card.dataset.facility)}&date=${today}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error();
        }
        const nextAvailable = payload.slots.find((slot) => slot.available);
        status.textContent = nextAvailable ? `本日空きあり / 次の空き: ${nextAvailable.start}` : "本日は空きなし";
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
dateInput.max = tokyoDateString(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
dateInput.addEventListener("change", loadAvailability);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearBanner();

  if (!state.facility || !dateInput.value || !state.slot) {
    showBanner("施設・日付・時間を選択してください", "error");
    return;
  }

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.date = dateInput.value;
  payload.guests = Number(payload.guests);

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
      throw new Error(data.error || "予約に失敗しました");
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
