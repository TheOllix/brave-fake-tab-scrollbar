// popup.js
const defaults = {
  barColor: "#342d41",
  barWidth: 6,
  fillerHeight: 40,
  fillerColor: "#3f384c",
  thumbColor: "#717171",
  thumbHoverColor: "#ba79ff",
  minThumb: 20,
  labelOpacity: 1,

  showPreview: true // ✅ NEW
};

const ids = Object.keys(defaults);
let saveTimer = null;

/* ---------- HELPERS ---------- */

function collectValues() {
  const data = {};

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === "checkbox") {
      data[id] = el.checked; // ✅ handle toggle
    } else if (el.type === "color") {
      data[id] = el.value;
    } else {
      data[id] = Number(el.value);
    }
  });

  return data;
}

/* ---------- LOAD ---------- */

async function load() {
  const data = await chrome.storage.sync.get(defaults);

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === "checkbox") {
      el.checked = data[id]; // ✅ checkbox restore
    } else {
      el.value = data[id];
    }
  });
}

/* ---------- LIVE PREVIEW ---------- */

function sendPreview() {
  chrome.runtime.sendMessage({
    type: "preview-settings",
    settings: collectValues()
  });
}

/* ---------- SAVE ---------- */

async function commitSave() {
  await chrome.storage.sync.set(collectValues());
}

/* ---------- DEBOUNCED SAVE ---------- */

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(commitSave, 400);
}

/* ---------- RESET ---------- */

async function resetField(id) {
  const el = document.getElementById(id);
  if (!el) return;

  if (el.type === "checkbox") {
    el.checked = defaults[id];
  } else {
    el.value = defaults[id];
  }

  sendPreview(); // instant UI update
  await chrome.storage.sync.set({ [id]: defaults[id] });
}

/* ---------- CUSTOM NUMBER ---------- */

function initCustomNumbers() {
  document.querySelectorAll(".num").forEach(box => {
    const input = box.querySelector("input");
    const dec = box.querySelector(".dec");
    const inc = box.querySelector(".inc");

    const min = Number(box.dataset.min);
    const max = Number(box.dataset.max);

    const clamp = v => Math.min(max, Math.max(min, v));

    function change(delta) {
      input.value = clamp(Number(input.value || 0) + delta);
      sendPreview();
      scheduleSave();
    }

    dec.onclick = () => change(-1);
    inc.onclick = () => change(1);

    input.addEventListener("keydown", e => {
      if (e.key === "ArrowUp") { change(1); e.preventDefault(); }
      if (e.key === "ArrowDown") { change(-1); e.preventDefault(); }
    });

    input.addEventListener("input", () => {
      sendPreview();
      scheduleSave();
    });
  });
}

/* ---------- INIT ---------- */

window.addEventListener("DOMContentLoaded", async () => {
  await load();

  document.querySelectorAll("[data-reset]").forEach(btn =>
    btn.onclick = () => resetField(btn.dataset.reset)
  );

  // color + range inputs
  document.querySelectorAll('input[type="color"], input[type="range"]')
    .forEach(el => el.addEventListener("input", () => {
      sendPreview();
      scheduleSave();
    }));

  // ✅ checkbox inputs (like showPreview)
  document.querySelectorAll('input[type="checkbox"]')
    .forEach(el => el.addEventListener("change", () => {
      sendPreview();
      scheduleSave();
    }));

  initCustomNumbers();

  // send preview once popup opens
  sendPreview();
});
