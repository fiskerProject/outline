// outline. — service worker
// Opens the viewer and cleans up the per-tab network rules when the viewer goes away.

const VIEWER = chrome.runtime.getURL('viewer.html');

const ruleIdsFor = (tabId) => {
  const base = (tabId % 100000) * 10;
  return [base + 1, base + 2];
};

chrome.action.onClicked.addListener((tab) => {
  let url = VIEWER;
  // Prefill with the page you were on (activeTab gives us its URL on click).
  if (tab && tab.url && /^(https?|file):\/\//i.test(tab.url)) {
    url += '?url=' + encodeURIComponent(tab.url);
  }
  chrome.tabs.create({ url, index: tab ? tab.index + 1 : undefined });
});

const clear = (tabId) =>
  chrome.declarativeNetRequest
    .updateSessionRules({ removeRuleIds: ruleIdsFor(tabId) })
    .catch(() => {});

chrome.tabs.onRemoved.addListener(clear);

// If the viewer tab navigates somewhere else, the rules must not follow it.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url && !info.url.startsWith(VIEWER)) clear(tabId);
});
