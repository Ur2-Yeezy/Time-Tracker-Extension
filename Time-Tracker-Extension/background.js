// ─── CONFIG ────────────────────────────────────────────────────────────
importScripts('config.js');
// ────────────────────────────────────────────────────────────────────────

// current session state
let currentTabId = null;
let currentSite  = null;
let currentStart = null;

// return the matching site config or null
function matchSite(url) {
  return trackedSites.find(s => url && url.includes(s.base)) || null;
}

// record elapsed ms for the previous site
async function recordTime() {
  if (!currentSite || !currentStart) return;
  const elapsed = Date.now() - currentStart;
  const key     = currentSite.base;
  const stored  = await chrome.storage.local.get(key);
  const prev    = stored[key] || 0;
  const total   = prev + elapsed;

  await chrome.storage.local.set({ [key]: total });

  // if limit crossed, notify once
  if (
    currentSite.limit !== null &&
    total >= currentSite.limit * 1000
  ) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Time Limit Reached',
      message: `You’ve spent ${Math.floor(total/1000)}s on ${key}.`
    });
    currentSite.limit = null;
  }

  currentTabId = null;
  currentSite  = null;
  currentStart = null;
}

// start timing the newly active tab (if it matches)
async function updateCurrent() {
  await recordTime();

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (!tab) return;

  const site = matchSite(tab.url);
  if (!site) return;

  currentTabId = tab.id;
  currentSite  = site;
  currentStart = Date.now();
}

// ─── EVENT HOOKS ───────────────────────────────────────────────────────

// when the user switches tabs
chrome.tabs.onActivated.addListener(updateCurrent);

// when the active tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (tabId === currentTabId && info.status === 'complete') {
    updateCurrent();
  }
});

chrome.windows.onFocusChanged.addListener(winId => {
  if (winId === chrome.windows.WINDOW_ID_NONE) {
    recordTime();
  } else {
    updateCurrent();
  }
});

// just in case the service worker is unloaded
self.addEventListener('unload', recordTime);

// respond to popup’s stats‐request
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg.action === 'getStats') {
    chrome.storage.local.get(
      trackedSites.map(s => s.base),
      data => {
        const now   = Date.now();
        const stats = trackedSites.map(s => {
          let tot = data[s.base] || 0;
          const running =
            currentSite &&
            currentSite.base === s.base &&
            currentStart;
          if (running) tot += now - currentStart;
          return {
            base:   s.base,
            limit:  s.limit,
            totalMs: tot,
            running: !!running
          };
        });
        send({ stats });
      }
    );
    return true;  // async
  }
});
