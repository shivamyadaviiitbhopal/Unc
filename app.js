// ===== UNC — University Network Connection (demo) =====

const PLATFORM_FEE = 3;

const seedRequests = [
  {
    id: 101, item: "Engineering Mathematics notes",
    pickup: "Library", drop: "Academic Block",
    itemCost: 0, distanceFee: 10, when: "Within 30 minutes",
    notes: "Please message before pickup.",
    owner: "Riya Verma", status: "open", icon: "📚",
    createdAt: Date.now() - 1000000
  },
  {
    id: 102, item: "USB-C charging cable",
    pickup: "Hostel Block A", drop: "Academic Block",
    itemCost: 180, distanceFee: 15, when: "Within 1 hour",
    notes: "Black cable, any standard USB-C.",
    owner: "Kabir Singh", status: "open", icon: "🔌",
    createdAt: Date.now() - 600000
  },
  {
    id: 103, item: "Ruled notebook",
    pickup: "Canteen", drop: "Hostel Block B",
    itemCost: 40, distanceFee: 8, when: "Today",
    notes: "Any standard ruled notebook is fine.",
    owner: "Mehak Jain", status: "open", icon: "📒",
    createdAt: Date.now() - 400000
  },
  {
    id: 104, item: "Scientific calculator",
    pickup: "Hostel Block B", drop: "Library",
    itemCost: 0, distanceFee: 12, when: "Within 1 hour",
    notes: "Could you bring the calculator I left with my lab partner?",
    owner: "Dev Patel", status: "open", icon: "🧮",
    createdAt: Date.now() - 200000
  },
  {
    id: 105, item: "Physics lab manual",
    pickup: "Academic Block", drop: "Hostel Block A",
    itemCost: 0, distanceFee: 10, when: "Within 30 minutes",
    notes: "Demo request to show the complete requester-to-runner flow.",
    owner: "You", status: "open", icon: "📘",
    createdAt: Date.now()
  }
];

let requests = [];
try {
  const stored = localStorage.getItem("unc_strategy_v2");
  requests = stored ? JSON.parse(stored) : seedRequests;
} catch (e) {
  requests = seedRequests;
}

let role = "requester";
let page = "dashboard";
let activeFilter = "all";
let activeChatId = null;

const $ = id => document.getElementById(id);

function persist() {
  try {
    localStorage.setItem("unc_strategy_v2", JSON.stringify(requests));
  } catch (e) {}
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ===== Distance (demo estimates in km) =====
const CAMPUS_DISTANCE_KM = {
  "Academic Block|Hostel Block A": 0.8,
  "Academic Block|Hostel Block B": 1.1,
  "Academic Block|Library": 0.4,
  "Academic Block|Canteen": 0.5,
  "Academic Block|Admin Block": 0.7,
  "Academic Block|Sports Complex": 1.4,
  "Hostel Block A|Hostel Block B": 0.6,
  "Hostel Block A|Library": 0.9,
  "Hostel Block A|Canteen": 0.7,
  "Hostel Block A|Admin Block": 1.0,
  "Hostel Block A|Sports Complex": 1.6,
  "Hostel Block B|Library": 0.8,
  "Hostel Block B|Canteen": 0.6,
  "Hostel Block B|Admin Block": 0.9,
  "Hostel Block B|Sports Complex": 1.2,
  "Library|Canteen": 0.3,
  "Library|Admin Block": 0.6,
  "Library|Sports Complex": 1.3,
  "Canteen|Admin Block": 0.5,
  "Canteen|Sports Complex": 1.0,
  "Admin Block|Sports Complex": 1.1
};

function routeKm(pickup, drop) {
  if (pickup === drop) return 0;
  const key = [pickup, drop].sort().join("|");
  return CAMPUS_DISTANCE_KM[key] ?? 1.0;
}

function calcDistanceFee(pickup, drop) {
  return Math.ceil(routeKm(pickup, drop) * 5);
}

function syncDistanceFee(r) {
  r.distanceKm = routeKm(r.pickup, r.drop);
  r.distanceFee = calcDistanceFee(r.pickup, r.drop);
  return r.distanceFee;
}

requests.forEach(r => {
  syncDistanceFee(r);
  if (r.itemCost == null) r.itemCost = 0;
});

// ===== Helpers =====
function total(r) {
  return Number(r.itemCost || 0) + Number(r.distanceFee || 0) + PLATFORM_FEE;
}

function payout(r) {
  return Number(r.itemCost || 0) + Number(r.distanceFee || 0);
}

function statusName(s) {
  const names = {
    open: "OPEN",
    offered: "OFFER RECEIVED",
    matched: "MATCH CONFIRMED",
    paid: "PAYMENT HELD",
    picked_up: "PICKED UP",
    delivered: "DELIVERED",
    declined: "OFFER DECLINED"
  };
  return names[s] || String(s).toUpperCase();
}

function iconFor(item) {
  const t = item.toLowerCase();
  if (/book|notes|manual|notebook/.test(t)) return "📚";
  if (/charger|cable|usb/.test(t)) return "🔌";
  if (/calculator/.test(t)) return "🧮";
  if (/food|snack|lunch/.test(t)) return "🥪";
  if (/water|bottle/.test(t)) return "💧";
  if (/pen|pencil/.test(t)) return "🖊️";
  return "📦";
}

function toast(msg) {
  $("toast").textContent = msg;
  $("toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}

function showModal(id) { $(id).classList.add("show"); }
function hideModal(id) { $(id).classList.remove("show"); }

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusChip(r) {
  return `<span class="status ${esc(r.status)}">${esc(statusName(r.status))}</span>`;
}

function routeHtml(r) {
  return `
    <div class="route">
      <div class="route-point">
        <small>PICK UP FROM</small>
        <strong>${esc(r.pickup)}</strong>
      </div>
      <div class="route-line">····➜</div>
      <div class="route-point">
        <small>DELIVER TO</small>
        <strong>${esc(r.drop)}</strong>
      </div>
    </div>`;
}

function mapHtml(r) {
  const km = Number(r.distanceKm ?? routeKm(r.pickup, r.drop)).toFixed(1);
  const pathD = "M23 130 C80 113,121 136,174 103 S260 116,304 83 S373 73,400 34";
  return `
    <div class="map-box">
      <svg viewBox="0 0 420 150" role="img" aria-label="Illustrative campus route map">
        <defs>
          <pattern id="grid${r.id}" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0V25" fill="none" stroke="#d9e5d6" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="420" height="150" fill="#edf4ed"/>
        <rect width="420" height="150" fill="url(#grid${r.id})"/>
        <path d="M0 32 C70 44,75 4,132 27 S210 76,258 42 S330 60,420 18"
              stroke="#d8e6d2" stroke-width="13" fill="none"/>
        <path d="${pathD}" stroke="#fff" stroke-width="18" fill="none" stroke-linecap="round"/>
        <path d="${pathD}" stroke="#6a86f3" stroke-width="4" fill="none"
              stroke-linecap="round" stroke-dasharray="7 5"/>
        <circle cx="23" cy="130" r="8" fill="#315bf5" stroke="white" stroke-width="3"/>
        <circle cx="400" cy="34" r="8" fill="#18a878" stroke="white" stroke-width="3"/>
        <text x="36" y="122" font-size="10" fill="#33445c" font-weight="700">${esc(r.pickup).slice(0, 22)}</text>
        <text x="287" y="22" font-size="10" fill="#33445c" font-weight="700">${esc(r.drop).slice(0, 22)}</text>
      </svg>
      <div class="map-caption">
        <span>Estimated route: <strong>${km} km</strong></span>
        <span>₹5/km fee: <strong>${fmt(r.distanceFee)}</strong></span>
      </div>
    </div>`;
}

function getOpenCount() {
  return requests.filter(r => r.status === "open").length;
}

function isCarrier(r) {
  return r.carrier === "You" || r.carrier === "Arjun Mehta";
}

function updateHeader() {
  document.querySelectorAll("[data-role]").forEach(b => {
    b.classList.toggle("active", b.dataset.role === role);
  });
  $("profileName").textContent = role === "requester" ? "Aarav Sharma" : "Arjun Mehta";
  $("profileSub").textContent = (role === "requester" ? "Requester" : "Runner") + " · IIIT Bhopal";
  $("profileAvatar").textContent = role === "requester" ? "AS" : "AM";
  document.querySelectorAll("[data-page]").forEach(b => {
    b.classList.toggle("active", b.dataset.page === page);
  });
}

function statHtml(label, value, small, ico) {
  return `
    <div class="stat">
      <div class="stat-top">${label}<span class="stat-icon">${ico}</span></div>
      <strong>${value}</strong>
      <small>${small}</small>
    </div>`;
}

// ===== Card buttons =====
function cardActions(r, context = "feed") {
  const isMine = r.owner === "You";
  const id = r.id;

  if (role === "runner") {
    if (r.status === "open") {
      return `<button class="quiet" data-details="${id}">Details</button>
              <button class="secondary" data-offer="${id}">Offer to deliver</button>`;
    }
    if (isCarrier(r) && r.status === "offered") {
      return `<button class="quiet" data-details="${id}">Details</button>
              <button class="secondary" data-chat="${id}">Open chat</button>`;
    }
    if (isCarrier(r) && r.status === "matched") {
      let feeBtn;
      if (r.itemFeeConfirmed) {
        feeBtn = `<button class="quiet" disabled>Item fee confirmed</button>`;
      } else if (r.itemFeeOtp) {
        feeBtn = `<button class="secondary" data-verify-item-fee="${id}">Verify fee code</button>`;
      } else {
        feeBtn = `<button class="secondary" data-set-item-fee="${id}">Set item price</button>`;
      }
      return `<button class="quiet" data-chat="${id}">Chat</button>${feeBtn}`;
    }
    if (isCarrier(r) && r.status === "paid") {
      return `<button class="quiet" data-chat="${id}">Chat</button>
              <button class="secondary" data-pickup="${id}">Mark picked up</button>`;
    }
    if (isCarrier(r) && r.status === "picked_up") {
      return `<button class="quiet" data-chat="${id}">Chat</button>
              <button class="green" data-otp="${id}">Confirm delivery</button>`;
    }
    if (isCarrier(r) && r.status === "delivered") {
      return `<button class="quiet" data-details="${id}">View receipt</button>`;
    }
    if (r.status === "offered") {
      return `<button class="quiet" data-details="${id}">Offer pending</button>`;
    }
    if (["matched", "paid", "picked_up"].includes(r.status)) {
      return `<button class="quiet" data-details="${id}">In progress</button>`;
    }
    return `<button class="quiet" data-details="${id}">Details</button>`;
  }

  // Requester view
  if (r.status === "offered") {
    return `<button class="quiet" data-details="${id}">Details</button>
            <button class="green" data-accept="${id}">Accept runner</button>
            <button class="danger" data-decline="${id}">Decline</button>`;
  }
  if (r.status === "matched") {
    let payBtn;
    if (r.itemFeeOtp && !r.itemFeeConfirmed) {
      payBtn = `<button class="secondary" data-item-fee-code="${id}">Confirm item fee</button>`;
    } else if (r.itemFeeConfirmed) {
      payBtn = `<button class="secondary" data-pay="${id}">Confirm payment</button>`;
    } else {
      payBtn = `<button class="quiet" disabled>Agree item price in chat</button>`;
    }
    return `<button class="quiet" data-chat="${id}">Chat</button>${payBtn}`;
  }
  if (r.status === "paid") {
    return `<button class="quiet" data-chat="${id}">Chat</button>
            <button class="secondary" data-otpview="${id}">View delivery OTP</button>`;
  }
  if (r.status === "picked_up") {
    return `<button class="quiet" data-chat="${id}">Chat</button>
            <button class="secondary" data-otpview="${id}">Show OTP</button>`;
  }
  if (r.status === "delivered") {
    return `<button class="quiet" data-details="${id}">View receipt</button>`;
  }
  if (r.status === "open") {
    const cancelBtn = isMine
      ? `<button class="secondary" data-cancel="${id}">Cancel request</button>`
      : "";
    return `<button class="quiet" data-details="${id}">Details</button>${cancelBtn}`;
  }
  return `<button class="quiet" data-details="${id}">Details</button>`;
}

// ===== Request card =====
function requestCard(r, context = "feed") {
  const km = Number(r.distanceKm ?? routeKm(r.pickup, r.drop)).toFixed(1);
  const feeCaption = role === "requester" ? "ESTIMATED TOTAL" : "RUNNER PAYOUT";
  const feeValue = role === "requester" ? total(r) : payout(r);

  let offerStrip = "";
  if (r.status === "offered" && role === "requester") {
    offerStrip = `
      <div class="detail-strip">
        <strong>Runner offer from ${esc(r.carrier || "Campus runner")}</strong><br>
        ${esc(r.offerNote || "I'm available to deliver this item.")} · Rating ${esc(r.runnerRating || "4.8")} ★
      </div>`;
  }

  let progressStrip = "";
  if (["matched", "paid", "picked_up"].includes(r.status)) {
    const heading = r.status === "matched"
      ? "Match found"
      : r.status === "paid" ? "Payment held safely (demo)" : "Item picked up";
    const who = role === "requester"
      ? `Runner: ${esc(r.carrier || "Campus runner")} · Rating ${esc(r.runnerRating || "4.8")} ★`
      : `Deliver to requester · ${esc(r.drop)}`;
    const held = r.paymentStatus === "held"
      ? `<br>Payment total ${fmt(total(r))} · Runner payout ${fmt(payout(r))}`
      : "";
    progressStrip = `<div class="detail-strip"><strong>${heading}</strong><br>${who}${held}</div>`;
  }

  return `
    <article class="request-card">
      <div class="request-head">
        <div class="item-title">
          <div class="item-icon">${r.icon || iconFor(r.item)}</div>
          <div>
            <h3>${esc(r.item)}</h3>
            <p>Requested by ${esc(r.owner)} · ${esc(r.when || "Today")}</p>
          </div>
        </div>
        ${statusChip(r)}
      </div>
      ${routeHtml(r)}
      <div class="money-row">
        <span class="money-item">Item cost:<strong>${fmt(r.itemCost)}</strong></span>
        <span class="money-item">Distance fee (${km} km × ₹5):<strong>${fmt(r.distanceFee)}</strong></span>
        <span class="money-item">UNC fee:<strong>${fmt(PLATFORM_FEE)}</strong></span>
      </div>
      ${offerStrip}
      ${progressStrip}
      <div class="request-bottom">
        <div class="fee">
          <small>${feeCaption}</small>
          <strong>${fmt(feeValue)}</strong>
        </div>
        <div class="actions">${cardActions(r, context)}</div>
      </div>
    </article>`;
}

function visibleRequests() {
  let arr = [...requests].sort((a, b) => (b.createdAt || b.id) - (a.createdAt || a.id));

  if (page === "activity") {
    if (role === "runner") {
      arr = arr.filter(r => isCarrier(r) || r.status === "open" || r.status === "offered");
    } else {
      arr = arr.filter(r =>
        r.owner === "You" ||
        ["offered", "matched", "paid", "picked_up", "delivered"].includes(r.status)
      );
    }
  }

  if ((page === "community" || page === "dashboard") && activeFilter !== "all") {
    arr = arr.filter(r =>
      activeFilter === "active"
        ? ["offered", "matched", "paid", "picked_up"].includes(r.status)
        : r.status === activeFilter
    );
  }
  return arr;
}

// ===== Page parts =====
function renderStats() {
  const open = getOpenCount();
  const matched = requests.filter(r => ["matched", "paid", "picked_up"].includes(r.status)).length;
  const done = requests.filter(r => r.status === "delivered").length;
  return `
    <section class="stats">
      ${statHtml("Open requests", open, "Waiting for a runner", "♧")}
      ${statHtml("Matches in progress", matched, "Offers accepted", "↗")}
      ${statHtml("Completed deliveries", done, "OTP-confirmed in demo", "✓")}
      ${statHtml("UNC platform fee", fmt(PLATFORM_FEE), "Per completed order · proposal", "₹")}
    </section>`;
}

function renderHero() {
  const isReq = role === "requester";
  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="hero-tag">Your campus. Your community.</div>
        <h2>${isReq ? "Need something from across campus?" : "Already heading that way? Help a student out."}</h2>
        <p>${isReq
          ? "Post what you need. A fellow student going to that building can make the pickup and deliver it to you."
          : "Find requests on your route, accept a delivery, and earn the automatic distance fee plus the agreed item reimbursement."}</p>
      </div>
      <div class="hero-cta">
        <button class="primary" data-action="${isReq ? "create" : "community"}">
          ${isReq ? "＋ Send a request" : "Browse requests →"}
        </button>
      </div>
    </section>`;
}

function renderSide() {
  return `
    <aside class="side-panel">
      <div class="panel">
        <h3>How UNC works</h3>
        <div class="how-step">
          <div class="step-num">1</div>
          <div><strong>Post a request</strong>
          <p>Choose pickup and destination. UNC estimates the route and calculates ₹5/km automatically.</p></div>
        </div>
        <div class="how-step">
          <div class="step-num">2</div>
          <div><strong>Get matched &amp; chat</strong>
          <p>UNC calculates ₹5/km automatically. Discuss the item's price in chat and confirm it with a code.</p></div>
        </div>
        <div class="how-step">
          <div class="step-num">3</div>
          <div><strong>Confirm &amp; deliver</strong>
          <p>Agree the item price in chat, confirm it with a code, then use the delivery OTP after handoff.</p></div>
        </div>
      </div>
      <div class="tip">
        <strong>🛡 Trust &amp; safety</strong>
        Keep delivery inside approved campus spaces. Confirm the item and fee in chat, and never request prohibited items.
      </div>
      <div class="tip warning">
        <strong>Prototype notice</strong>
        Demo mode only: profiles, OTP delivery and payment holds are simulated. Do not enter real payment or personal information.
      </div>
    </aside>`;
}

function renderDashboard() {
  const list = visibleRequests().filter(r => r.status !== "declined").slice(0, 3);
  const isReq = role === "requester";
  const cards = list.length
    ? list.map(r => requestCard(r, "dashboard")).join("")
    : `<div class="empty"><span class="empty-ico">📭</span>No requests yet. Create the first one.</div>`;

  return `
    ${renderHero()}
    ${renderStats()}
    <div class="section-head">
      <div>
        <h2>${isReq ? "Campus request feed" : "Requests you can help with"}</h2>
        <p>${isReq
          ? "Your request is shared with students in the campus community."
          : "Offer to deliver when the route works for you."}</p>
      </div>
      <button class="filter" data-page="community">View all requests →</button>
    </div>
    <div class="content-grid">
      <section class="requests">
        ${cards}
        <button class="quiet" data-page="community" style="width:100%;padding:12px">Open full community feed</button>
      </section>
      ${renderSide()}
    </div>`;
}

function renderCommunity() {
  const list = visibleRequests().filter(r => r.status !== "declined");
  const f = activeFilter;
  const cards = list.length
    ? list.map(r => requestCard(r, "community")).join("")
    : `<div class="empty"><span class="empty-ico">🔎</span>No requests match this filter.</div>`;
  const topBtn = role === "requester"
    ? `<button class="primary" data-action="create">＋ Send request</button>`
    : `<span class="demo-label">Runner mode</span>`;

  return `
    <div class="page-title-row">
      <div>
        <h2>Community requests</h2>
        <p>Requests posted by students across IIIT Bhopal.</p>
      </div>
      ${topBtn}
    </div>
    <div class="section-head">
      <div></div>
      <div class="filters">
        <button class="filter ${f === "all" ? "active" : ""}" data-filter="all">All requests</button>
        <button class="filter ${f === "open" ? "active" : ""}" data-filter="open">Open</button>
        <button class="filter ${f === "active" ? "active" : ""}" data-filter="active">In progress</button>
        <button class="filter ${f === "delivered" ? "active" : ""}" data-filter="delivered">Delivered</button>
      </div>
    </div>
    <div class="content-grid">
      <section class="requests">${cards}</section>
      ${renderSide()}
    </div>`;
}

function renderActivity() {
  const arr = visibleRequests();
  const isReq = role === "requester";
  const cards = arr.length
    ? arr.map(r => requestCard(r, "activity")).join("")
    : `<div class="empty"><span class="empty-ico">🗂️</span>No activity yet.<br>Switch roles or create a request to test the full journey.</div>`;

  return `
    <div class="page-title-row">
      <div>
        <h2>My activity</h2>
        <p>${isReq
          ? "Track requests, offers, payments and delivery verification."
          : "Track offers, pickups and payouts from deliveries."}</p>
      </div>
      <span class="demo-label">${isReq ? "Requester view" : "Runner view"}</span>
    </div>
    <div class="content-grid">
      <section class="requests">${cards}</section>
      <aside class="side-panel">
        <div class="panel">
          <h3>Payment breakdown</h3>
          <div class="how-step">
            <div class="step-num">₹</div>
            <div><strong>Item cost + distance fee</strong>
            <p>Reimbursed to the runner after the delivery OTP is verified.</p></div>
          </div>
          <div class="how-step">
            <div class="step-num">U</div>
            <div><strong>UNC platform fee · ₹3</strong>
            <p>Shown separately so the service fee is transparent.</p></div>
          </div>
        </div>
        <div class="tip purple">
          <strong>🔐 Delivery confirmation</strong>
          The delivery OTP is generated only after the requester confirms the demo payment.
          The runner must enter the correct code after handing over the item.
        </div>
      </aside>
    </div>`;
}

function activeChatRequests() {
  return requests
    .filter(r => ["matched", "paid", "picked_up", "delivered", "offered"].includes(r.status))
    .sort((a, b) => (b.createdAt || b.id) - (a.createdAt || a.id));
}

function renderChat() {
  const arr = activeChatRequests();

  if (!arr.length) {
    return `
      <div class="page-title-row">
        <div><h2>Chat &amp; updates</h2><p>Coordinate the pickup with your matched student.</p></div>
      </div>
      <div class="empty"><span class="empty-ico">💬</span>No active delivery conversations.<br>First make or accept a runner offer.</div>`;
  }

  if (!activeChatId || !arr.some(r => r.id === activeChatId)) {
    activeChatId = arr[0].id;
  }
  const chosen = arr.find(r => r.id === activeChatId);
  const messages = chosen.messages || [{
    from: "system",
    text: "This is the UNC demo chat. Confirm the pickup location and delivery fee here.",
    time: "Just now"
  }];

  const people = arr.map(r => `
    <button class="chat-person ${r.id === activeChatId ? "active" : ""}" data-select-chat="${r.id}">
      <div class="avatar">${r.status === "offered" ? "↗" : "✓"}</div>
      <div>
        <strong>${esc(r.item)}</strong>
        <small>${esc(r.carrier || "Awaiting runner")} · ${esc(statusName(r.status))}</small>
      </div>
    </button>`).join("");

  const messageHtml = messages.map(m => {
    const who = m.from === "system" ? "UNC system" : m.from === "requester" ? "Requester" : "Runner";
    return `
      <div class="bubble ${m.from === role ? "mine" : ""}">
        ${esc(m.text)}
        <small>${who} · ${esc(m.time || "")}</small>
      </div>`;
  }).join("");

  return `
    <div class="page-title-row">
      <div>
        <h2>Chat &amp; updates</h2>
        <p>Share pickup details without exchanging personal phone numbers.</p>
      </div>
    </div>
    <div class="chat-layout">
      <div class="chat-list">
        <div class="chat-list-head">Delivery conversations</div>
        ${people}
      </div>
      <div class="chat-panel">
        <div class="chat-panel-head">
          ${esc(chosen.item)}
          <div class="chat-subtitle">${esc(chosen.pickup)} → ${esc(chosen.drop)} · ${esc(statusName(chosen.status))}</div>
        </div>
        <div class="messages" id="messages">${messageHtml}</div>
        <form class="chat-compose" id="chatForm">
          <input id="chatInput" maxlength="240" placeholder="Message about the pickup…" required>
          <button type="submit">Send</button>
        </form>
      </div>
    </div>`;
}

function render() {
  updateHeader();
  const titles = {
    dashboard: "Campus dashboard",
    community: "Community requests",
    activity: "My activity",
    chat: "Chat & delivery updates"
  };
  $("pageTitle").textContent = titles[page] || "Campus dashboard";

  let html;
  if (page === "dashboard") html = renderDashboard();
  else if (page === "community") html = renderCommunity();
  else if (page === "activity") html = renderActivity();
  else html = renderChat();

  $("pageContent").innerHTML = html;
  document.querySelectorAll("[data-page]").forEach(b => {
    b.classList.toggle("active", b.dataset.page === page);
  });
}

// ===== Modals =====
function openCreate() {
  if (role !== "requester") {
    toast("Switch to Requester view to post a request.");
    return;
  }
  showModal("createModal");
  updateRequestEstimate();
  setTimeout(() => $("item").focus(), 50);
}

function openOffer(id) {
  const r = requests.find(x => x.id === id);
  if (!r) return;
  syncDistanceFee(r);
  const km = Number(r.distanceKm).toFixed(1);

  $("offerRequestId").value = id;
  $("offerNote").value = "I'm heading that way and can help.";
  $("offerDistanceSummary").textContent = `${km} km × ₹5/km = ${fmt(r.distanceFee)} (automatic estimate)`;
  $("offerRequestSummary").innerHTML = `
    <div class="item-title">
      <div class="item-icon">${r.icon || iconFor(r.item)}</div>
      <div><h3>${esc(r.item)}</h3><p>${esc(r.pickup)} → ${esc(r.drop)}</p></div>
    </div>
    <div class="cost-summary">
      <div class="cost-line"><span>Estimated distance</span><strong>${km} km</strong></div>
      <div class="cost-line"><span>Automatic distance fee</span><strong>${fmt(r.distanceFee)}</strong></div>
      <div class="cost-line"><span>Item price</span><strong>Agree in chat</strong></div>
    </div>`;
  showModal("offerModal");
}

function openDetails(id) {
  const r = requests.find(x => x.id === id);
  if (!r) return;
  const runner = r.carrier || "Not matched yet";

  $("detailTitle").textContent = "Request details";
  $("detailBody").innerHTML = `
    <div class="item-title">
      <div class="item-icon">${r.icon || iconFor(r.item)}</div>
      <div>
        <h3>${esc(r.item)}</h3>
        <p>Requested by ${esc(r.owner)} · ${esc(r.when || "Today")}</p>
      </div>
    </div>
    ${routeHtml(r)}
    ${mapHtml(r)}
    <div class="cost-summary">
      <div class="cost-line"><span>Item cost / reimbursement</span><strong>${fmt(r.itemCost)}</strong></div>
      <div class="cost-line"><span>Distance fee</span><strong>${fmt(r.distanceFee)}</strong></div>
      <div class="cost-line"><span>UNC platform fee</span><strong>${fmt(PLATFORM_FEE)}</strong></div>
      <div class="cost-line total"><span>Total estimate</span><strong>${fmt(total(r))}</strong></div>
    </div>
    <p style="font-size:11px;line-height:1.6">
      <strong>Request status:</strong> ${esc(statusName(r.status))}<br>
      <strong>Runner:</strong> ${esc(runner)}${r.runnerRating ? ` · ${esc(r.runnerRating)} ★` : ""}<br>
      <strong>Instructions:</strong> ${esc(r.notes || "No extra instructions")}
    </p>
    ${r.status === "offered"
      ? `<div class="detail-strip">Offer note: ${esc(r.offerNote || "Available to deliver")}</div>`
      : ""}
    <p class="fineprint">Map is illustrative only and does not provide real navigation.</p>`;
  showModal("detailModal");
}

function openPayment(id) {
  const r = requests.find(x => x.id === id);
  if (!r) return;
  $("confirmPayment").dataset.payId = id;

  $("paymentBody").innerHTML = `
    <div class="match-banner">
      <strong>Match found!</strong>
      ${esc(r.carrier || "Your runner")} has offered to deliver your item. Review the demo total before continuing.
    </div>
    <div class="mini-profile">
      <div class="avatar">AM</div>
      <div>
        <strong>${esc(r.carrier || "Arjun Mehta")}</strong>
        <p>Verified profile (demo) · <span class="stars">★★★★★</span> ${esc(r.runnerRating || "4.8")}/5</p>
      </div>
    </div>
    <div class="cost-summary">
      <div class="cost-line"><span>Item cost / reimbursement</span><strong>${fmt(r.itemCost)}</strong></div>
      <div class="cost-line"><span>Distance fee to runner</span><strong>${fmt(r.distanceFee)}</strong></div>
      <div class="cost-line"><span>UNC platform fee</span><strong>${fmt(PLATFORM_FEE)}</strong></div>
      <div class="cost-line total"><span>Total (demo)</span><strong>${fmt(total(r))}</strong></div>
    </div>
    <p style="font-size:11px;color:var(--muted);line-height:1.55">
      The demo marks the payment as held. The item price must first be confirmed with a code after chat.
      After delivery OTP verification, the item cost and automatic distance fee are released to the runner.
      UNC keeps the displayed platform fee in this proposed model.
    </p>`;
  showModal("paymentModal");
}

function showOtp(id, runner = false) {
  const r = requests.find(x => x.id === id);
  if (!r) return;
  $("otpInput").value = "";
  $("otpForm").dataset.otpId = id;

  if (runner) {
    $("otpBody").innerHTML = `
      <div class="match-banner">
        <strong>Delivery confirmation</strong>
        Ask the requester for the OTP only after you hand over the item.
      </div>
      <p style="font-size:12px;line-height:1.6">
        Order: <strong>${esc(r.item)}</strong><br>
        Deliver to: <strong>${esc(r.drop)}</strong><br>
        Runner payout on success: <strong>${fmt(payout(r))}</strong>
      </p>`;
    showModal("otpModal");
  } else {
    $("detailTitle").textContent = "Your delivery OTP";
    $("detailBody").innerHTML = `
      <div class="match-banner">
        <strong>Share this code after delivery</strong>
        Give the runner this code only after the item has been handed to you.
      </div>
      <div class="otp-display">
        <div>
          <span>ONE-TIME DELIVERY CODE</span>
          <strong>${esc(r.otp || "----")}</strong>
          <small>Demo code · not for real transactions</small>
        </div>
        <span style="font-size:25px">🔐</span>
      </div>
      <p style="font-size:11px;line-height:1.6">
        Request: <strong>${esc(r.item)}</strong><br>
        Runner: <strong>${esc(r.carrier || "Not matched yet")}</strong><br>
        Status: <strong>${esc(statusName(r.status))}</strong>
      </p>
      <p class="fineprint">The runner enters this code on their side to mark the delivery complete.</p>`;
    showModal("detailModal");
  }
}

function pushSystem(r, text) {
  if (!r.messages) r.messages = [];
  r.messages.push({ from: "system", text, time: nowTime() });
}

function findReq(value) {
  return requests.find(x => x.id === Number(value));
}

// ===== Click handling =====
document.addEventListener("click", e => {
  const p = e.target.closest("[data-page]");
  if (p) {
    page = p.dataset.page;
    activeFilter = "all";
    render();
    return;
  }

  const rbtn = e.target.closest("[data-role]");
  if (rbtn) {
    role = rbtn.dataset.role;
    render();
    toast(role === "requester" ? "Requester view enabled" : "Runner view enabled");
    return;
  }

  const act = e.target.closest("[data-action]");
  if (act) {
    if (act.dataset.action === "create") {
      openCreate();
    } else if (act.dataset.action === "community") {
      page = "community";
      render();
    }
    return;
  }

  const fil = e.target.closest("[data-filter]");
  if (fil) {
    activeFilter = fil.dataset.filter;
    page = "community";
    render();
    return;
  }

  const close = e.target.closest("[data-close]");
  if (close) {
    hideModal(close.dataset.close);
    return;
  }

  const offer = e.target.closest("[data-offer]");
  if (offer) {
    if (role !== "runner") {
      toast("Switch to Runner view to offer a delivery.");
      return;
    }
    openOffer(Number(offer.dataset.offer));
    return;
  }

  const details = e.target.closest("[data-details]");
  if (details) {
    openDetails(Number(details.dataset.details));
    return;
  }

  const accept = e.target.closest("[data-accept]");
  if (accept) {
    const r = findReq(accept.dataset.accept);
    if (r && r.status === "offered") {
      r.status = "matched";
      r.carrier = r.carrier || "Arjun Mehta";
      r.runnerRating = r.runnerRating || "4.8";
      syncDistanceFee(r);
      pushSystem(r, "Runner matched. Chat to agree on the item price. UNC has automatically calculated the distance fee at ₹5/km.");
      persist();
      render();
      toast("Runner matched! Next, confirm the demo payment.");
    }
    return;
  }

  const decline = e.target.closest("[data-decline]");
  if (decline) {
    const r = findReq(decline.dataset.decline);
    if (r) {
      r.status = "open";
      r.carrier = null;
      r.offerFee = null;
      r.offerNote = "";
      persist();
      render();
      toast("Offer declined. Your request is open again.");
    }
    return;
  }

  const setFee = e.target.closest("[data-set-item-fee]");
  if (setFee) {
    const r = findReq(setFee.dataset.setItemFee);
    if (!r) return;
    const hasRequesterMsg = r.messages && r.messages.some(m => m.from === "requester" && m.text.trim());
    if (!hasRequesterMsg) {
      toast("Please use chat to discuss the item price first.");
      return;
    }
    const answer = prompt("Enter the agreed item price in rupees (from your chat with the requester):", String(r.itemCost || 0));
    if (answer === null) return;
    const amount = Number(answer);
    if (!Number.isFinite(amount) || amount < 0 || amount > 5000) {
      toast("Enter a valid item price between ₹0 and ₹5000.");
      return;
    }
    r.itemCost = amount;
    r.itemFeeConfirmed = false;
    r.itemFeeOtp = String(Math.floor(1000 + Math.random() * 9000));
    pushSystem(r, `Runner proposed item price ${fmt(amount)}. Requester: please review the price and share the item-fee confirmation code in chat.`);
    persist();
    render();
    toast("Item price saved. Requester can review the confirmation code.");
    return;
  }

  const itemCode = e.target.closest("[data-item-fee-code]");
  if (itemCode) {
    const r = findReq(itemCode.dataset.itemFeeCode);
    if (!r || !r.itemFeeOtp) return;
    alert(
      "ITEM FEE CONFIRMATION CODE\n\n" +
      `Agreed item price: ${fmt(r.itemCost)}\n` +
      `Code: ${r.itemFeeOtp}\n\n` +
      "Share this code with the runner in your UNC chat to confirm the item price."
    );
    return;
  }

  const verifyFee = e.target.closest("[data-verify-item-fee]");
  if (verifyFee) {
    const r = findReq(verifyFee.dataset.verifyItemFee);
    if (!r) return;
    const val = prompt("Enter the item-fee confirmation code shared by the requester:");
    if (val === null) return;
    if (val.trim() !== String(r.itemFeeOtp || "")) {
      toast("Code not matched. Ask the requester to confirm the agreed price.");
      return;
    }
    r.itemFeeConfirmed = true;
    pushSystem(r, `Item fee ${fmt(r.itemCost)} verified by confirmation code.`);
    persist();
    render();
    toast("Item fee verified. Requester can proceed to payment.");
    return;
  }

  const pay = e.target.closest("[data-pay]");
  if (pay) {
    const r = findReq(pay.dataset.pay);
    if (r && !r.itemFeeConfirmed) {
      toast("Confirm the item price through chat code first.");
      return;
    }
    openPayment(Number(pay.dataset.pay));
    return;
  }

  const confirmPay = e.target.closest("#confirmPayment");
  if (confirmPay) {
    const r = findReq(confirmPay.dataset.payId);
    if (r) {
      r.status = "paid";
      r.paymentStatus = "held";
      r.otp = String(Math.floor(1000 + Math.random() * 9000));
      pushSystem(r, "Demo payment marked as held. Delivery OTP generated for requester.");
      persist();
      hideModal("paymentModal");
      render();
      toast("Demo payment held. OTP generated!");
    }
    return;
  }

  const pickup = e.target.closest("[data-pickup]");
  if (pickup) {
    const r = findReq(pickup.dataset.pickup);
    if (r) {
      r.status = "picked_up";
      pushSystem(r, "Runner marked the item as picked up. Requester can share OTP after handover.");
      persist();
      render();
      toast("Pickup marked. Deliver the item, then verify OTP.");
    }
    return;
  }

  const otp = e.target.closest("[data-otp]");
  if (otp) {
    showOtp(Number(otp.dataset.otp), true);
    return;
  }

  const otpview = e.target.closest("[data-otpview]");
  if (otpview) {
    showOtp(Number(otpview.dataset.otpview), false);
    return;
  }

  const chat = e.target.closest("[data-chat]");
  if (chat) {
    activeChatId = Number(chat.dataset.chat);
    page = "chat";
    render();
    return;
  }

  const selectChat = e.target.closest("[data-select-chat]");
  if (selectChat) {
    activeChatId = Number(selectChat.dataset.selectChat);
    render();
    return;
  }

  const cancel = e.target.closest("[data-cancel]");
  if (cancel) {
    const r = findReq(cancel.dataset.cancel);
    if (r && r.status === "open") {
      r.status = "declined";
      persist();
      render();
      toast("Request cancelled in this demo.");
    }
    return;
  }
});

// ===== Forms =====
$("requestForm").addEventListener("submit", e => {
  e.preventDefault();
  const item = $("item").value.trim();
  const pickup = $("pickup").value;
  const drop = $("drop").value;

  if (!item || !pickup || !drop) {
    toast("Complete the required fields.");
    return;
  }
  if (pickup === drop) {
    toast("Choose two different buildings.");
    return;
  }

  const distanceKm = routeKm(pickup, drop);
  const distanceFee = calcDistanceFee(pickup, drop);

  requests.unshift({
    id: Date.now(),
    item, pickup, drop,
    itemCost: 0,
    distanceKm, distanceFee,
    when: $("when").value,
    notes: $("notes").value.trim(),
    owner: "You",
    status: "open",
    icon: iconFor(item),
    createdAt: Date.now(),
    messages: []
  });

  persist();
  $("requestForm").reset();
  hideModal("createModal");
  page = "community";
  activeFilter = "all";
  render();
  toast(`Request posted. Auto distance fee: ${fmt(distanceFee)} (${distanceKm.toFixed(1)} km × ₹5/km).`);
});

$("offerForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = Number($("offerRequestId").value);
  const r = requests.find(x => x.id === id);
  if (!r) return;

  syncDistanceFee(r);
  r.status = "offered";
  r.carrier = "Arjun Mehta";
  r.runnerRating = "4.8";
  r.offerNote = $("offerNote").value.trim() || "I'm available to deliver this item.";
  if (!r.messages) r.messages = [];
  r.messages.push({
    from: "system",
    text: `Runner offer sent. Automatic distance fee is ${fmt(r.distanceFee)} for ${Number(r.distanceKm).toFixed(1)} km. Please chat to agree on the item price.`,
    time: "Just now"
  });

  persist();
  hideModal("offerModal");
  render();
  toast("Offer sent. Distance fee is fixed automatically by UNC.");
});

$("otpForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = Number(e.target.dataset.otpId);
  const r = requests.find(x => x.id === id);
  const val = $("otpInput").value.trim();
  if (!r) return;

  if (val !== String(r.otp || "")) {
    toast("That OTP doesn't match. Check the requester's code.");
    return;
  }

  r.status = "delivered";
  r.paymentStatus = "released";
  r.deliveredAt = Date.now();
  pushSystem(r, "OTP verified. Delivery completed; demo runner payout released.");
  persist();
  hideModal("otpModal");
  render();
  toast("OTP verified — delivery complete!");
});

document.addEventListener("submit", e => {
  if (e.target.id !== "chatForm") return;
  e.preventDefault();

  const input = $("chatInput");
  const text = input.value.trim();
  const r = requests.find(x => x.id === activeChatId);
  if (!text || !r) return;

  if (!r.messages) r.messages = [];
  r.messages.push({ from: role, text, time: nowTime() });
  persist();
  render();
  setTimeout(() => {
    const m = $("messages");
    if (m) m.scrollTop = m.scrollHeight;
  }, 20);
});

// ===== Close modals =====
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-backdrop.show").forEach(m => m.classList.remove("show"));
  }
});

document.querySelectorAll(".modal-backdrop").forEach(m => {
  m.addEventListener("click", e => {
    if (e.target === m) m.classList.remove("show");
  });
});

// ===== Live cost estimate in the create form =====
function updateRequestEstimate() {
  const pickup = $("pickup")?.value;
  const drop = $("drop")?.value;
  const summary = $("liveCostSummary");
  if (!summary) return;

  const ready = pickup && drop;
  const km = ready ? routeKm(pickup, drop) : null;
  const fee = ready ? calcDistanceFee(pickup, drop) : null;

  summary.innerHTML = `
    <div class="cost-line"><span>Item price / reimbursement</span><strong>Agreed in chat</strong></div>
    <div class="cost-line"><span>Estimated route distance</span><strong>${km === null ? "Choose buildings" : km.toFixed(1) + " km"}</strong></div>
    <div class="cost-line"><span>Automatic distance fee · ₹5/km</span><strong>${fee === null ? "—" : fmt(fee)}</strong></div>
    <div class="cost-line"><span>UNC platform fee (demo)</span><strong>${fmt(PLATFORM_FEE)}</strong></div>
    <div class="cost-line total"><span>Estimated total before item price</span><strong>${fee === null ? "—" : fmt(fee + PLATFORM_FEE)}</strong></div>`;
}

$("pickup").addEventListener("change", updateRequestEstimate);
$("drop").addEventListener("change", updateRequestEstimate);

// ===== Start =====
render();
