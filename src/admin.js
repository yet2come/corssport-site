const API_PATH = "/api/admin/bookings";

/* ── State ── */
let allBookings = [];
let activeFilter = "all";

/* ── DOM refs ── */
const authModal = document.getElementById("auth-modal");
const authTokenInput = document.getElementById("auth-token");
const authSubmit = document.getElementById("auth-submit");
const authError = document.getElementById("auth-error");
const dashboard = document.getElementById("dashboard");
const filterFrom = document.getElementById("filter-from");
const filterTo = document.getElementById("filter-to");
const btnRefresh = document.getElementById("btn-refresh");
const loadingEl = document.getElementById("loading");
const emptyEl = document.getElementById("empty");
const errorEl = document.getElementById("error");
const errorMessage = document.getElementById("error-message");
const tableContainer = document.getElementById("table-container");

/* ── Auth ── */
function getToken() {
  return sessionStorage.getItem("admin_token") || "";
}

function setToken(token) {
  sessionStorage.setItem("admin_token", token);
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove("hidden");
}

async function handleLogin() {
  const token = authTokenInput.value.trim();
  if (!token) {
    showAuthError("トークンを入力してください。");
    return;
  }

  authSubmit.disabled = true;
  authSubmit.textContent = "CHECKING...";

  try {
    const today = todayStr();
    const res = await fetch(`${API_PATH}?from=${today}&to=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      showAuthError("トークンが正しくありません。");
      return;
    }

    if (!res.ok) {
      showAuthError(`エラー: ${res.status}`);
      return;
    }

    setToken(token);
    authModal.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadBookings();
  } catch {
    showAuthError("接続に失敗しました。");
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = "LOGIN";
  }
}

authSubmit.addEventListener("click", handleLogin);
authTokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});

/* ── Date helpers ── */
function todayStr() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date()
  );
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
}

function formatDateHeading(dateStr) {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = weekdays[d.getDay()];
  return `${m}月${day}日（${dow}）`;
}

/* ── Init dates ── */
function initDates() {
  const today = todayStr();
  filterFrom.value = today;
  filterTo.value = addDays(today, 7);
}

/* ── Fetch bookings ── */
async function loadBookings() {
  const token = getToken();
  const from = filterFrom.value;
  const to = filterTo.value;

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  tableContainer.classList.add("hidden");

  try {
    const res = await fetch(`${API_PATH}?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      sessionStorage.removeItem("admin_token");
      authModal.classList.remove("hidden");
      dashboard.classList.add("hidden");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    allBookings = data.bookings || [];
    renderAll();
  } catch (err) {
    errorMessage.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

/* ── Filter ── */
function getFilteredBookings() {
  if (activeFilter === "all") return allBookings;
  return allBookings.filter((b) => b.facility === activeFilter);
}

document.querySelectorAll(".facility-filter").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".facility-filter").forEach((b) => {
      b.classList.remove("is-active", "bg-basalt-black", "text-white");
      b.classList.add("bg-white");
    });
    btn.classList.add("is-active", "bg-basalt-black", "text-white");
    btn.classList.remove("bg-white");
    activeFilter = btn.dataset.filter;
    renderAll();
  });
});

btnRefresh.addEventListener("click", loadBookings);
filterFrom.addEventListener("change", loadBookings);
filterTo.addEventListener("change", loadBookings);

/* ── Render ── */
function renderSummary() {
  const counts = { total: 0, "event-space": 0, "meeting-room": 0, "solo-booth": 0 };
  for (const b of allBookings) {
    counts.total++;
    if (counts[b.facility] !== undefined) counts[b.facility]++;
  }
  document.getElementById("summary-total").textContent = counts.total;
  document.getElementById("summary-event-space").textContent = counts["event-space"];
  document.getElementById("summary-meeting-room").textContent = counts["meeting-room"];
  document.getElementById("summary-solo-booth").textContent = counts["solo-booth"];
}

function facilityBadge(facility) {
  const colors = {
    "event-space": "bg-seaweed-green text-white",
    "meeting-room": "bg-basalt-black text-white",
    "solo-booth": "bg-concrete-dark text-white",
  };
  return colors[facility] || "bg-concrete-mid text-white";
}

function renderAll() {
  renderSummary();

  const bookings = getFilteredBookings();

  if (bookings.length === 0) {
    emptyEl.classList.remove("hidden");
    tableContainer.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  tableContainer.classList.remove("hidden");

  // Group by date
  const grouped = {};
  for (const b of bookings) {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  }

  let html = "";

  for (const [date, items] of Object.entries(grouped)) {
    html += `
      <div class="mb-8">
        <h3 class="text-xl md:text-2xl font-black uppercase tracking-wide border-b-4 border-basalt-black pb-2 mb-4">
          ${formatDateHeading(date)}
          <span class="text-sm font-bold text-concrete-dark ml-3">${items.length}件</span>
        </h3>

        <!-- Desktop table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-4 border-basalt-black text-left">
                <th class="py-3 pr-4 font-black uppercase tracking-widest text-xs">時間</th>
                <th class="py-3 pr-4 font-black uppercase tracking-widest text-xs">施設</th>
                <th class="py-3 pr-4 font-black uppercase tracking-widest text-xs">予約者</th>
                <th class="py-3 pr-4 font-black uppercase tracking-widest text-xs">メール</th>
                <th class="py-3 pr-4 font-black uppercase tracking-widest text-xs">人数</th>
                <th class="py-3 font-black uppercase tracking-widest text-xs">目的</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (b) => `
                <tr class="border-b-2 border-concrete-mid/30 hover:bg-[#f2f7f9] transition-colors">
                  <td class="py-3 pr-4 font-bold whitespace-nowrap">${b.startTime} - ${b.endTime}</td>
                  <td class="py-3 pr-4">
                    <span class="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider ${facilityBadge(b.facility)}">
                      ${b.facilityName}${b.resourceLabel ? ` / ${b.resourceLabel}` : ""}
                    </span>
                  </td>
                  <td class="py-3 pr-4 font-bold">${escapeHtml(b.customerName)}</td>
                  <td class="py-3 pr-4 text-xs font-mono text-concrete-dark">${escapeHtml(b.customerEmail)}</td>
                  <td class="py-3 pr-4 font-bold text-center">${b.guests ?? "-"}</td>
                  <td class="py-3 text-xs font-bold text-concrete-dark truncate max-w-[200px]">${escapeHtml(b.purpose || "-")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="md:hidden grid gap-3">
          ${items
            .map(
              (b) => `
            <div class="brutalist-border p-4 bg-white">
              <div class="flex items-center justify-between">
                <span class="font-black text-lg">${b.startTime} - ${b.endTime}</span>
                <span class="inline-block px-2 py-1 text-xs font-black uppercase ${facilityBadge(b.facility)}">
                  ${b.facilityName}
                </span>
              </div>
              ${b.resourceLabel ? `<p class="mt-1 text-xs font-bold text-concrete-dark">${b.resourceLabel}</p>` : ""}
              <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p class="text-xs font-black uppercase text-seaweed-green">予約者</p>
                  <p class="font-bold">${escapeHtml(b.customerName)}</p>
                </div>
                <div>
                  <p class="text-xs font-black uppercase text-seaweed-green">人数</p>
                  <p class="font-bold">${b.guests ?? "-"}</p>
                </div>
              </div>
              <p class="mt-2 text-xs font-mono text-concrete-dark break-all">${escapeHtml(b.customerEmail)}</p>
              ${b.purpose ? `<p class="mt-2 text-xs font-bold text-concrete-dark">${escapeHtml(b.purpose)}</p>` : ""}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  tableContainer.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ── Init ── */
initDates();

const savedToken = getToken();
if (savedToken) {
  authModal.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadBookings();
}
