// outline. — service worker
// Opens the viewer and owns the per-tab network rules: it creates them for a
// viewer tab on request, and deletes them as soon as that viewer goes away.
'use strict';

const VIEWER = chrome.runtime.getURL('viewer.html');
const MAX_URL = 8192;
const DNR = chrome.declarativeNetRequest;

const isViewerUrl = (u) => typeof u === 'string' && (u === VIEWER || u.startsWith(VIEWER + '?') || u.startsWith(VIEWER + '#'));

/* ── Toolbar button ───────────────────────────────── */

chrome.action.onClicked.addListener((tab) => {
  let url = VIEWER;
  // Prefill with the page you were on (activeTab gives us its URL on click).
  // Only web pages and local files: never chrome://, data:, javascript:, …
  const u = tab && typeof tab.url === 'string' ? tab.url : '';
  if (u.length <= MAX_URL && /^(https?|file):\/\//i.test(u)) {
    url += '?url=' + encodeURIComponent(u);
  }
  chrome.tabs.create({ url, index: tab ? tab.index + 1 : undefined });
});

/* ── Rules ────────────────────────────────────────── */
// Every rule is scoped to exactly one viewer tab (condition.tabIds = [tabId]):
// the session rules themselves are the record of which tab owns which ids, so
// ids are allocated from what is actually free (no tabId arithmetic, no
// collisions). The document that owns a tab's rules is kept in
// storage.session, so a viewer that is going away can only drop its own rules.
// All operations run one at a time, in order.

let queue = Promise.resolve();
const serial = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

const ownerTab = (r) => (r.condition && Array.isArray(r.condition.tabIds) && r.condition.tabIds.length === 1 ? r.condition.tabIds[0] : null);

async function getOwners() {
  try { const got = await chrome.storage.session.get('owners'); return (got && got.owners) || {}; } catch (e) { return {}; }
}
async function setOwners(owners) {
  try { await chrome.storage.session.set({ owners }); } catch (e) {}
}

function freeIds(rules, keep, n) {
  const used = new Set(rules.map((r) => r.id));
  const ids = keep.slice(0, n);
  for (let id = 1; ids.length < n; id++) if (!used.has(id)) ids.push(id);
  return ids;
}

const ALL_SUBRESOURCES = ['sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest',
  'ping', 'csp_report', 'media', 'websocket', 'webtransport', 'webbundle', 'other'];

// The viewer only sends three fields; everything else is decided here.
function sanitizeEmu(emu) {
  const e = emu && typeof emu === 'object' ? emu : {};
  const ua = typeof e.ua === 'string' && e.ua.length <= 512 && /^[\x20-\x7e]+$/.test(e.ua) ? e.ua : '';
  const os = ['ios', 'ipados', 'android'].includes(e.os) ? e.os : '';
  return { ua: ua && os ? ua : '', os, mobile: !!e.mobile };
}

function buildRules(tabId, emu, cspOnlyWithFrameAncestors) {
  const scope = { tabIds: [tabId], resourceTypes: ['sub_frame'] };
  const rules = [
    // Let sites that refuse to be framed render inside the preview —
    // only in this tab, only for frames.
    { priority: 1,
      action: { type: 'modifyHeaders', responseHeaders: [{ header: 'x-frame-options', operation: 'remove' }] },
      condition: scope },
    // CSP is dropped only when it carries frame-ancestors (the one directive
    // that blocks framing); any other CSP stays, so the previewed page keeps
    // its own protections and behaves as it does on the real device.
    { priority: 1,
      action: { type: 'modifyHeaders', responseHeaders: [{ header: 'content-security-policy', operation: 'remove' }] },
      condition: cspOnlyWithFrameAncestors
        ? { ...scope, responseHeaders: [{ header: 'content-security-policy', values: ['*frame-ancestors*'] }] }
        : scope }
  ];
  if (emu.ua) {
    const requestHeaders = [{ header: 'user-agent', operation: 'set', value: emu.ua }];
    if (emu.os === 'android') {
      requestHeaders.push(
        { header: 'sec-ch-ua-mobile', operation: 'set', value: emu.mobile ? '?1' : '?0' },
        { header: 'sec-ch-ua-platform', operation: 'set', value: '"Android"' }
      );
    } else {
      requestHeaders.push(
        { header: 'sec-ch-ua', operation: 'remove' },
        { header: 'sec-ch-ua-mobile', operation: 'remove' },
        { header: 'sec-ch-ua-platform', operation: 'remove' }
      );
    }
    rules.push({ priority: 1, action: { type: 'modifyHeaders', requestHeaders },
      condition: { tabIds: [tabId], resourceTypes: ALL_SUBRESOURCES } });
  }
  return rules;
}

async function apply(tabId, documentId, emu) {
  const rules = await DNR.getSessionRules();
  const mine = rules.filter((r) => ownerTab(r) === tabId).map((r) => r.id);
  const add = async (conditional) => {
    const addRules = buildRules(tabId, emu, conditional);
    const ids = freeIds(rules, mine, addRules.length);
    addRules.forEach((r, i) => { r.id = ids[i]; });
    await DNR.updateSessionRules({ removeRuleIds: mine, addRules });
  };
  try { await add(true); }
  catch (e) { await add(false); }   // Chrome without responseHeaders conditions
  const owners = await getOwners();
  owners[tabId] = documentId || '';
  await setOwners(owners);
}

async function drop(tabId) {
  const rules = await DNR.getSessionRules();
  const ids = rules.filter((r) => ownerTab(r) === tabId).map((r) => r.id);
  if (ids.length) await DNR.updateSessionRules({ removeRuleIds: ids });
  const owners = await getOwners();
  if (tabId in owners) { delete owners[tabId]; await setOwners(owners); }
}

// Keeps a tab's rules only while the viewer document that created them is
// still open in it. Tab URLs are not visible without the "tabs" permission,
// so this asks Chrome which of our own pages are alive instead.
async function sweep(onlyTab) {
  const rules = await DNR.getSessionRules();
  const tabs = new Set();
  const stray = [];
  for (const r of rules) {
    const t = ownerTab(r);
    if (t === null) stray.push(r.id);   // not scoped to one tab: never ours
    else if (onlyTab === undefined || t === onlyTab) tabs.add(t);
  }
  if (stray.length) await DNR.updateSessionRules({ removeRuleIds: stray });
  if (!tabs.size) return;
  const owners = await getOwners();
  for (const t of tabs) {
    let alive = false;
    try {
      const ctx = await chrome.runtime.getContexts({ contextTypes: ['TAB'], tabIds: [t] });
      alive = ctx.some((c) => isViewerUrl(c.documentUrl) && (!owners[t] || c.documentId === owners[t]));
    } catch (e) {
      try { await chrome.tabs.get(t); alive = true; } catch (e2) { alive = false; }
    }
    if (!alive) await drop(t);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  // Only the viewer page of this extension, in a normal tab, may ask.
  if (!msg || typeof msg !== 'object' || sender.id !== chrome.runtime.id ||
      !sender.tab || typeof sender.tab.id !== 'number' || sender.tab.id < 0 ||
      sender.frameId !== 0 || !isViewerUrl(sender.url)) return;
  const tabId = sender.tab.id;
  if (msg.type === 'outline:apply') {
    const emu = sanitizeEmu(msg.emu);
    serial(() => apply(tabId, sender.documentId, emu))
      .then(() => reply({ ok: true }), (e) => reply({ ok: false, error: String(e && e.message || e) }));
    return true;
  }
  if (msg.type === 'outline:release') {
    // pagehide: drop the rules only if this very document still owns them
    // (a reloaded viewer may already have taken over the tab).
    serial(async () => {
      const owners = await getOwners();
      if (!owners[tabId] || owners[tabId] === sender.documentId) await drop(tabId);
    }).catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener((tabId) => { serial(() => drop(tabId)).catch(() => {}); });
chrome.tabs.onReplaced.addListener((added, removed) => { serial(() => drop(removed)).catch(() => {}); });

// If the viewer tab navigates somewhere else, the rules must not follow it.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url || info.status) serial(() => sweep(tabId)).catch(() => {});
});

// Leftovers from a crashed tab or a sleeping worker: clean up on every start.
chrome.runtime.onStartup.addListener(() => { serial(() => sweep()).catch(() => {}); });
serial(() => sweep()).catch(() => {});
