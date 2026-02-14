// content.js

let wrapper, bar, thumb, filler;
let tooltip, posTop, posBottom, icon, title;

let settings = {};
let lastMsg = null;

let currentThumbHeight = 0;

const defaults = {
  barColor: "#342d41",
  barWidth: 6,
  fillerHeight: 40,
  fillerColor: "#3f384c",
  thumbColor: "#717171",
  thumbHoverColor: "#ba79ff",
  minThumb: 20,
  labelOpacity: 1,
  showPreview: true,
};

let normalColor = defaults.thumbColor;
let hoverColor = defaults.thumbHoverColor;

let dragging = false;
let dragPercent = 0;

let lastPreviewTime = 0;
const PREVIEW_THROTTLE = 80;

/* ================= SETTINGS ================= */

async function loadSettings() {
  settings = await chrome.storage.sync.get(defaults);
}

/* ================= STYLE APPLY ================= */

function updatePreviewVisibility() {
  const visible = settings.showPreview;

  icon.style.display = visible ? "" : "none";
  title.style.display = visible ? "" : "none";
}

function applyStyles() {
  if (!wrapper) return;

  wrapper.style.width = settings.barWidth + "px";

  bar.style.background = settings.barColor;
  bar.style.height = `calc(100vh - ${settings.fillerHeight}px)`;

  filler.style.height = settings.fillerHeight + "px";
  filler.style.background = settings.fillerColor;

  normalColor = settings.thumbColor;
  hoverColor = settings.thumbHoverColor;
  thumb.style.background = normalColor;

  tooltip.style.opacity = 0;

  updatePreviewVisibility();
}

/* ================= UI CREATION ================= */

function createUI() {
  const existing = document.querySelector(".fake-tab-scrollbar-wrapper");
  if (existing) {
    wrapper = existing;
    return;
  }

  wrapper = document.createElement("div");
  wrapper.className = "fake-tab-scrollbar-wrapper";

  bar = document.createElement("div");
  bar.id = "fake-tab-scrollbar";

  thumb = document.createElement("div");
  thumb.id = "fake-tab-thumb";

  filler = document.createElement("div");
  filler.id = "fake-tab-filler";

  tooltip = document.createElement("div");
  tooltip.id = "fake-tab-tooltip";
  tooltip.innerHTML = `
    <div class="pos">
      <span class="top"></span>
      <span class="bottom"></span>
    </div>
    <img class="icon"/>
    <span class="title"></span>
  `;

  posTop = tooltip.querySelector(".top");
  posBottom = tooltip.querySelector(".bottom");
  icon = tooltip.querySelector(".icon");
  title = tooltip.querySelector(".title");

  document.body.appendChild(tooltip);

  bar.appendChild(thumb);
  wrapper.appendChild(bar);
  wrapper.appendChild(filler);
  document.body.appendChild(wrapper);

  /* ---------- hover ---------- */

  thumb.addEventListener("mouseenter", () => {
    tooltip.classList.add("hover");
    tooltip.style.opacity = settings.labelOpacity;
    thumb.style.background = hoverColor;

    const thumbRect = thumb.getBoundingClientRect();
    const centerY = thumbRect.top + thumbRect.height / 2;
    const offset = computeVerticalOffset(centerY)

    tooltip.style.top = `${centerY + offset}px`;
  });

  thumb.addEventListener("mouseleave", () => {
    if (!dragging) {
      tooltip.classList.remove("hover", "drag");
      tooltip.style.opacity = 0;
      thumb.style.background = normalColor;
    }
  });

  /* ---------- drag ---------- */

  bar.addEventListener("mousedown", startDrag);

  thumb.addEventListener("mousedown", (e) => {
    startDrag(e);
    e.preventDefault();
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;

    dragging = false;
    thumb.style.background = normalColor;

    tooltip.classList.remove("drag");
    tooltip.style.opacity = 0;

    chrome.runtime.sendMessage({
      type: "jump-to-percent",
      percent: dragPercent,
    });
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    updateDrag(e);
  });

  applyStyles();
}

/* ================= POSITION RENDER ================= */

function renderPosition(msg) {
  if (!wrapper || dragging) return;

  const { percent, index, total } = msg;

  if (total <= 0) return;

  const usableHeight = window.innerHeight - settings.fillerHeight;
  const thumbHeight = Math.max(settings.minThumb, usableHeight / total);
  currentThumbHeight = thumbHeight;

  thumb.style.height = `${thumbHeight}px`;

  const travel = usableHeight - thumbHeight;
  thumb.style.transform = `translateY(${travel * percent}px)`;

  // Always display 1-based index
  const displayIndex = Number(index) + 1;

  posTop.textContent = String(displayIndex);
  posBottom.textContent = String(total);
}

/* ================= DRAG ================= */

function startDrag(e) {
  dragging = true;

  thumb.style.background = hoverColor;

  tooltip.classList.remove("hover");
  tooltip.classList.add("drag");
  tooltip.style.opacity = "1";

  updateDrag(e);
}

function computeVerticalOffset(centerY) {
  const THRESHOLD = 40;
  const MAX_OFFSET = 20;

  const viewportHeight = window.innerHeight;

  // Near top
  if (centerY <= THRESHOLD) {
    const t = 1 - centerY / THRESHOLD;
    return MAX_OFFSET * t;
  }

  // Near bottom
  if (centerY >= viewportHeight - THRESHOLD) {
    const distanceFromBottom = viewportHeight - centerY;
    const t = 1 - distanceFromBottom / THRESHOLD;
    return -MAX_OFFSET * t;
  }

  return 0;
}

function updateDrag(e) {
  const rect = bar.getBoundingClientRect();
  dragPercent = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

  const usableHeight = window.innerHeight - settings.fillerHeight;
  const thumbHeight = currentThumbHeight;
  const travel = usableHeight - thumbHeight;

  const thumbTop = travel * dragPercent;
  thumb.style.transform = `translateY(${thumbTop}px)`;

  if (!lastMsg) return;

  const total = lastMsg.total;
  const index = Math.round(dragPercent * (total - 1));

  posTop.textContent = index + 1;
  posBottom.textContent = total;

  const thumbRect = thumb.getBoundingClientRect();
  const centerY = thumbRect.top + thumbRect.height / 2;
  const offset = computeVerticalOffset(centerY);

  tooltip.style.top = `${centerY + offset}px`;

  const now = performance.now();
  if (now - lastPreviewTime < PREVIEW_THROTTLE) return;
  lastPreviewTime = now;

  chrome.runtime.sendMessage({ type: "GET_TAB_BY_INDEX", index }, (tab) => {
    if (!tab) return;

    title.textContent = tab.title;
    icon.src = tab.favIconUrl || "chrome://favicon";
  });
}

/* ================= STORAGE ================= */

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync") return;

  await loadSettings();
  applyStyles();

  if (lastMsg) renderPosition(lastMsg);
});

/* ================= MESSAGES ================= */

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "preview-settings") {
    settings = msg.settings;
    if (!wrapper) createUI();
    applyStyles();
    if (lastMsg) renderPosition(lastMsg);
    return;
  }

  if (msg.type === "tab-position") {
    lastMsg = msg;

    if (!wrapper) {
      createUI();
      chrome.runtime.sendMessage({ type: "REQUEST_INITIAL_POSITION" });

      loadSettings().then(() => {
        applyStyles();
        if (lastMsg) renderPosition(lastMsg);
      });
    }

    renderPosition(msg);
  }
});
