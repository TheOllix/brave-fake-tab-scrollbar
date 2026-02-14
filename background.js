// background.js (FINAL OPTIMIZED)

let cachedTabs = [];
let tabIndexMap = new Map();

let sendTimer = null;
let refreshTimer = null;

/* ---------- TAB CACHE ---------- */

function scheduleRefresh() {
  clearTimeout(refreshTimer);

  refreshTimer = setTimeout(async () => {
    cachedTabs = await chrome.tabs.query({ currentWindow: true });

    tabIndexMap.clear();
    cachedTabs.forEach((tab, i) => {
      tabIndexMap.set(tab.id, i);
    });
  }, 80);
}

chrome.tabs.onCreated.addListener(scheduleRefresh);
chrome.tabs.onRemoved.addListener(scheduleRefresh);
chrome.tabs.onMoved.addListener(scheduleRefresh);
chrome.windows.onFocusChanged.addListener(scheduleRefresh);

scheduleRefresh();

/* ---------- SEND TAB POSITION ---------- */

function scheduleSend(tabId) {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => sendTabPosition(tabId), 60);
}

async function sendTabPosition(tabId) {
  const index = tabIndexMap.get(tabId);
  if (index === undefined) return;

  const percent =
    cachedTabs.length > 1
      ? index / (cachedTabs.length - 1)
      : 0;

  chrome.tabs
    .sendMessage(tabId, {
      type: "tab-position",
      percent,
      index: index,
      total: cachedTabs.length,
    })
    .catch(() => {});
}

/* ---------- SINGLE MESSAGE LISTENER ---------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_TAB_BY_INDEX") {
    const tab = cachedTabs[msg.index];

    sendResponse(
      tab
        ? {
            title: tab.title,
            favIconUrl: tab.favIconUrl,
            index: msg.index,
            total: cachedTabs.length,
          }
        : null
    );

    return true;
  }

if (msg.type === "REQUEST_INITIAL_POSITION" && sender.tab?.id) {
  (async () => {
    // Force immediate refresh so map is guaranteed valid
    cachedTabs = await chrome.tabs.query({ currentWindow: true });

    tabIndexMap.clear();
    cachedTabs.forEach((tab, i) => {
      tabIndexMap.set(tab.id, i);
    });

    sendTabPosition(sender.tab.id);
  })();

  return true;
}


  if (msg.type === "jump-to-percent") {
    const index = Math.round(
      msg.percent * (cachedTabs.length - 1)
    );

    const tab = cachedTabs[index];
    if (tab) chrome.tabs.update(tab.id, { active: true });
  }
});

/* ---------- TAB EVENTS ---------- */

chrome.tabs.onActivated.addListener(({ tabId }) => {
  scheduleSend(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "complete" && tab.active) {
    scheduleSend(tabId);
  }
});

chrome.tabs.onRemoved.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) scheduleSend(tabs[0].id);
  });
});
