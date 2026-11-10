// outline. — viewer
'use strict';

const $ = (id) => document.getElementById(id);
const el = {
  form: $('urlForm'), url: $('url'), chips: $('chips'), add: $('add'),
  favsBtn: $('favsBtn'), favsCount: $('favsCount'), drawer: $('drawer'), drawerList: $('drawerList'),
  drawerClose: $('drawerClose'), openAll: $('openAll'),
  device: $('device'), dims: $('dims'), rw: $('rw'), rh: $('rh'), pz: $('pz'), pzWrap: $('pzWrap'),
  rotate: $('rotate'), fold: $('fold'), reload: $('reload'), zoom: $('zoom'), open: $('open'),
  stage: $('stage'), grid: $('grid'), caption: $('caption'), tpl: $('slotTpl')
};

/* ── i18n ─────────────────────────────────────────── */

const t = (key, fallback) => {
  try { return chrome.i18n.getMessage(key) || fallback || key; } catch (e) { return fallback || key; }
};
function translate(root) {
  root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n, n.textContent); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((n) => { n.placeholder = t(n.dataset.i18nPlaceholder, n.placeholder); });
  root.querySelectorAll('[data-i18n-title]').forEach((n) => {
    const s = t(n.dataset.i18nTitle, n.title);
    n.title = s; n.setAttribute('aria-label', s);
  });
}
document.documentElement.lang = t('@@ui_locale', 'en').split('_')[0];
translate(document);
translate(el.tpl.content);

/* ── State ────────────────────────────────────────── */

const MAX_SITES = 6;
const ALL = [RESPONSIVE, ...DEVICES];
const DEFAULT_DEVICE = 'iphone-18-pro';
const byId = (id) => ALL.find((d) => d.id === id) || ALL.find((d) => d.id === DEFAULT_DEVICE);

const state = {
  urls: [''],         // up to 5 sites, compared side by side on the same device
  active: 0,          // which site the link field edits
  device: 'iphone-18-pro',
  landscape: false,
  folded: true,       // foldables start closed, like a phone in your pocket
  fit: true,
  rw: 1280,
  rh: 800,
  pageZoom: 1         // desktop only: browser zoom level
};

const clampDim = (v) => Math.max(200, Math.min(3840, Math.round(+v || 0) || 200));

const save = () => { try { chrome.storage.local.set({ outline: state }); } catch (e) {} };

async function restore() {
  try {
    const got = await chrome.storage.local.get('outline');
    const saved = got && got.outline;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
    // older versions stored a single `url`
    const urls = Array.isArray(saved.urls) ? saved.urls : [saved.url];
    state.urls = urls.map((u) => (typeof u === 'string' ? normalize(u) || '' : '')).slice(0, MAX_SITES);
    if (!state.urls.length) state.urls = [''];
    const idx = Number.isInteger(saved.active) ? saved.active : 0;
    state.active = Math.min(Math.max(0, idx), state.urls.length - 1);
    if (typeof saved.device === 'string' && ALL.some((d) => d.id === saved.device)) state.device = saved.device;
    for (const k of ['landscape', 'folded', 'fit']) if (typeof saved[k] === 'boolean') state[k] = saved[k];
    for (const k of ['rw', 'rh']) if (Number.isFinite(+saved[k]) && +saved[k] > 0) state[k] = clampDim(saved[k]);
    const z = +saved.pageZoom;
    if (PAGE_ZOOMS.includes(z)) state.pageZoom = z;
  } catch (e) {}
}

/* ── Device spec ──────────────────────────────────── */

const STAND_H = 96;   // desktop stand, drawn below the monitor

function spec(dev) {
  const d = dev || byId(state.device);
  if (d.responsive) {
    return { d, responsive: true, w: state.rw, h: state.rh, screenW: state.rw, screenH: state.rh, boxW: state.rw, boxH: state.rh, frameH: state.rh };
  }
  const s = d.states ? d.states[state.folded ? 'closed' : 'open'] : d;
  const f = s.frame;
  const bx = f.bezel;
  const by = f.bezelY == null ? f.bezel : f.bezelY;
  const FW = s.w + 2 * bx;
  const FH = s.h + 2 * by;
  const L = state.landscape && !d.desktop;
  const frameW = L ? FH : FW;
  const frameH = L ? FW : FH;
  return {
    d, s, f, bx, by, FW, FH, L,
    w: s.w, h: s.h,
    screenW: L ? s.h : s.w,
    screenH: L ? s.w : s.h,
    frameH,
    boxW: frameW,
    boxH: frameH + (f.stand ? STAND_H : 0)
  };
}

const displayName = (d) => (d.nameKey ? t(d.nameKey, d.name) : d.name);

/* ── Frame drawing (SVG outline, portrait coordinates) ── */

function frameSVG(p) {
  const { f, FW, FH, w, h, d, bx, by } = p;
  const R = f.bodyRadius != null ? f.bodyRadius : f.radius + bx;
  const parts = [];
  const line = 'fill="#fff" stroke="#000"';

  // desktop stand, behind the monitor
  if (f.stand) {
    const nw = Math.min(180, FW * 0.12), bw = Math.min(420, FW * 0.3);
    parts.push(`<path d="M ${FW / 2 - nw / 2} ${FH - 2} L ${FW / 2 - nw / 2 - 6} ${FH + STAND_H - 12} L ${FW / 2 + nw / 2 + 6} ${FH + STAND_H - 12} L ${FW / 2 + nw / 2} ${FH - 2} Z" ${line} stroke-width="1.5"/>`);
    parts.push(`<rect x="${FW / 2 - bw / 2}" y="${FH + STAND_H - 14}" width="${bw}" height="12" rx="6" ${line} stroke-width="1.5"/>`);
  }

  // buttons first, so the body edge sits on top of them
  for (const btn of f.buttons || []) {
    const a = btn.from, z = btn.to;
    if (btn.side === 'left')  parts.push(`<rect x="-3" y="${a * FH}" width="4" height="${(z - a) * FH}" rx="1.5" ${line} stroke-width="1.2"/>`);
    if (btn.side === 'right') parts.push(`<rect x="${FW - 1}" y="${a * FH}" width="4" height="${(z - a) * FH}" rx="1.5" ${line} stroke-width="1.2"/>`);
    if (btn.side === 'top')   parts.push(`<rect x="${a * FW}" y="-3" width="${(z - a) * FW}" height="4" rx="1.5" ${line} stroke-width="1.2"/>`);
  }

  // body
  parts.push(`<rect x="0.75" y="0.75" width="${FW - 1.5}" height="${FH - 1.5}" rx="${R}" ${line} stroke-width="1.5"/>`);
  // screen edge
  parts.push(`<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="${f.screenRadius != null ? f.screenRadius : f.radius}" fill="#f4f4f4" stroke="#000" stroke-width="1"/>`);

  // cameras in the bezel
  if (f.camera === 'short')   parts.push(`<circle cx="${FW / 2}" cy="${by / 2}" r="2.6" fill="none" stroke="#000" stroke-width="1"/>`);
  if (f.camera === 'long')    parts.push(`<circle cx="${FW - bx / 2}" cy="${FH / 2}" r="2.6" fill="none" stroke="#000" stroke-width="1"/>`);
  if (f.camera === 'top-dot') parts.push(`<circle cx="${FW / 2}" cy="${by / 2}" r="2.2" fill="#000"/>`);

  // home-button iPhone: earpiece + home button
  if (f.home) {
    parts.push(`<rect x="${FW / 2 - 24}" y="${by / 2 - 2.5}" width="48" height="5" rx="2.5" fill="none" stroke="#000" stroke-width="1"/>`);
    parts.push(`<circle cx="${FW / 2 - 44}" cy="${by / 2}" r="3" fill="none" stroke="#000" stroke-width="1"/>`);
    parts.push(`<circle cx="${FW / 2}" cy="${FH - by / 2}" r="${by * 0.3}" fill="none" stroke="#000" stroke-width="1.2"/>`);
  }

  // hinge marks
  const hinge = (x1, y1, x2, y2) => parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="1.2"/>`);
  if (d.fold === 'book' && !state.folded) {
    hinge(FW / 2, 0.75, FW / 2, by * 0.7);
    hinge(FW / 2, FH - by * 0.7, FW / 2, FH - 0.75);
  }
  if (d.fold === 'book' && state.folded) {
    parts.push(`<path d="M ${bx * 0.45} ${R} V ${FH - R}" stroke="#000" stroke-width="1"/>`);
  }
  if (d.fold === 'flip') {
    hinge(0.75, FH / 2, bx * 0.7, FH / 2);
    hinge(FW - bx * 0.7, FH / 2, FW - 0.75, FH / 2);
  }

  return `<svg viewBox="0 0 ${FW} ${FH}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

function cutoutSVG(p) {
  const { f, FW, FH, w, bx, by } = p;
  const c = f.cutout;
  let shape = '';
  if (c && c.type === 'island') {
    shape = `<rect x="${bx + w / 2 - c.w / 2}" y="${by + c.top}" width="${c.w}" height="${c.h}" rx="${c.h / 2}" fill="#000"/>`;
  } else if (c && c.type === 'punch') {
    shape = `<circle cx="${bx + w * c.x}" cy="${by + c.top + c.d / 2}" r="${c.d / 2}" fill="#000"/>`;
  } else if (c && c.type === 'notch') {
    const x0 = bx + w / 2 - c.w / 2, x1 = x0 + c.w, y0 = by, y1 = by + c.h, r = 18, e = 6;
    shape = `<path d="M ${x0 - e} ${y0} Q ${x0} ${y0} ${x0} ${y0 + e} L ${x0} ${y1 - r} Q ${x0} ${y1} ${x0 + r} ${y1} L ${x1 - r} ${y1} Q ${x1} ${y1} ${x1} ${y1 - r} L ${x1} ${y0 + e} Q ${x1} ${y0} ${x1 + e} ${y0} Z" fill="#000"/>`;
  }
  return `<svg viewBox="0 0 ${FW} ${FH}" xmlns="http://www.w3.org/2000/svg">${shape}</svg>`;
}

/* ── Emulation: UA + headers ──────────────────────── */

const chromeMajor = (navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] || '142';

function emulation(p) {
  const d = p.d;
  if (d.responsive || d.desktop || !d.os) return { hideScrollbar: false };
  if (d.os === 'ios') {
    return {
      os: 'ios', touch: 5, mobile: true, hideScrollbar: true,
      platform: 'iPhone', vendor: 'Apple Computer, Inc.',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
    };
  }
  if (d.os === 'ipados') {
    // iPadOS Safari presents itself as a Mac by default — that's the real behaviour.
    return {
      os: 'ipados', touch: 5, mobile: false, hideScrollbar: true,
      platform: 'MacIntel', vendor: 'Apple Computer, Inc.',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
    };
  }
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) ||
    [{ brand: 'Chromium', version: chromeMajor }, { brand: 'Google Chrome', version: chromeMajor }];
  // Android tablets: Chrome drops "Mobile" from the UA, like on a real tablet
  const mobile = !d.tablet;
  return {
    os: 'android', touch: 5, mobile, hideScrollbar: true,
    platform: 'Linux armv81', vendor: 'Google Inc.', model: d.model, brands,
    ua: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 ${mobile ? 'Mobile ' : ''}Safari/537.36`
  };
}

// The network rules (frame headers, User-Agent, client hints) are created by
// the service worker, scoped to this tab, and removed when this page goes away.
let lastEmu = null;
async function applyRules(emu) {
  lastEmu = emu;
  const res = await chrome.runtime.sendMessage({
    type: 'outline:apply',
    emu: { ua: emu.ua || '', os: emu.os || '', mobile: !!emu.mobile }
  });
  if (!res || !res.ok) throw new Error((res && res.error) || 'no answer');
}

window.addEventListener('pagehide', () => {
  try { chrome.runtime.sendMessage({ type: 'outline:release' }).catch(() => {}); } catch (e) {}
});
// back/forward cache: the rules were dropped on pagehide, put them back
window.addEventListener('pageshow', (e) => {
  if (e.persisted && lastEmu) applyRules(lastEmu).catch((err) => console.warn('[outline.] rules', err));
});

/* ── Loading ──────────────────────────────────────── */

const MAX_URL = 8192;   // generous for real links, but bounded (storage, sync quota)

function normalize(raw) {
  if (raw != null && typeof raw !== 'string') return null;
  const s = (raw || '').trim();
  if (!s || s.length > MAX_URL) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return /^(https?|file):\/\//i.test(s) ? s : null;
  // a path dragged or pasted from the file manager: C:\... or /Users/...
  if (/^[a-z]:[\\/]/i.test(s)) return 'file:///' + s.replace(/\\/g, '/');
  if (/^\/(Users|home|Volumes|mnt|tmp)\//.test(s)) return 'file://' + s;
  // anything else must look like a host: no spaces, no other scheme (javascript:, data:, mailto:…)
  if (/\s/.test(s) || /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(s)) return null;
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.)/i.test(s)) return 'http://' + s;
  if (!/^[^/?#]+\.[^/?#]+/.test(s)) return null;
  return 'https://' + s;
}


/* ── Slots (one per compared site) ────────────────── */

const slots = [];

function makeSlot() {
  const root = el.tpl.content.firstElementChild.cloneNode(true);
  const q = (c) => root.querySelector(c);
  const slot = {
    root, sizer: q('.sizer'), box: q('.device-box'), under: q('.frame-under'), over: q('.frame-over'),
    screen: q('.screen'), view: q('.view'), empty: q('.empty'), name: q('.slot-name'), x: q('.slot-x'), save: q('.slot-save'),
    emuKey: '', src: ''
  };
  const index = () => slots.indexOf(slot);
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.slot-x, .slot-save')) return;   // removing a slot shouldn't select it first
    if (index() !== state.active) setActive(index());
  }, true);
  slot.x.addEventListener('click', (e) => { e.stopPropagation(); removeSite(index()); });
  slot.save.addEventListener('click', (e) => { e.stopPropagation(); saveFromSlot(index()); });
  root.querySelectorAll('.handle').forEach((h) => wireHandle(h, slot));
  el.grid.appendChild(root);
  return slot;
}

function syncSlots() {
  while (slots.length < state.urls.length) slots.push(makeSlot());
  while (slots.length > state.urls.length) slots.pop().root.remove();
  document.body.classList.toggle('multi', slots.length > 1);
  el.add.disabled = slots.length >= MAX_SITES;
}

function setActive(i) {
  state.active = i;
  el.url.value = state.urls[i] || '';
  save();
  layout();
}

function addSite(url) {
  if (state.urls.length >= MAX_SITES) return;
  const u = typeof url === 'string' ? url : '';
  state.urls.push(u);
  state.active = state.urls.length - 1;
  syncSlots();
  save();
  layout();
  navigate(state.active, true);
  el.url.value = u;
  if (!u) el.url.focus();
}

function removeSite(i) {
  if (state.urls.length <= 1) return;
  state.urls.splice(i, 1);
  slots.splice(i, 1)[0].root.remove();
  state.active = Math.min(state.active > i ? state.active - 1 : state.active, state.urls.length - 1);
  syncSlots();
  el.url.value = state.urls[state.active] || '';
  save();
  layout();
}

const shortUrl = (u) => {
  try { const x = new URL(u); return x.protocol === 'file:' ? decodeURIComponent(x.pathname) : (x.host + x.pathname + x.search).replace(/\/$/, ''); }
  catch (e) { return u; }
};

const hostOf = (u) => {
  try { const x = new URL(u); return x.protocol === 'file:' ? decodeURIComponent(x.pathname.split('/').pop()) : x.host + (x.pathname !== '/' ? x.pathname : ''); }
  catch (e) { return u; }
};

/* ── Loading ──────────────────────────────────────── */

async function navigate(i, force) {
  const slot = slots[i];
  const url = state.urls[i];
  if (!slot) return;
  if (!url) {
    slot.view.classList.remove('loaded');
    slot.view.removeAttribute('src');
    slot.src = '';
    slot.empty.hidden = false;
    return;
  }
  const emu = emulation(spec());
  const key = JSON.stringify(emu);
  if (!force && key === slot.emuKey && slot.src === url) return;
  slot.emuKey = key;
  slot.src = url;
  try { await applyRules(emu); } catch (e) { console.warn('[outline.] rules', e); }
  // A fresh iframe each time: Chrome only reads the frame name at creation,
  // and emulate.js reads its settings from that name.
  const frame = slot.view.cloneNode(false);
  frame.removeAttribute('src');
  frame.name = '__outline__' + key;
  frame.classList.add('loaded');
  slot.view.replaceWith(frame);
  slot.view = frame;
  slot.empty.hidden = true;
  // Lay the frame out before navigating, so the page never sees a 0×0 window.
  void frame.offsetWidth;
  await new Promise(requestAnimationFrame);
  frame.src = url;
}

const navigateAll = (force) => Promise.all(slots.map((_, i) => navigate(i, force)));

/* ── Layout ───────────────────────────────────────── */

let frozenScale = null;   // kept still while dragging the responsive handles
let lastScale = 1;
let lastCols = 1;

function drawSlot(slot, p, z) {
  const responsive = !!p.responsive;
  if (responsive) {
    slot.under.innerHTML = '';
    slot.over.innerHTML = '';
  } else {
    for (const node of [slot.under, slot.over]) {
      node.style.width = p.FW + 'px';
      node.style.height = p.FH + 'px';
      node.style.left = (p.boxW - p.FW) / 2 + 'px';
      node.style.top = (p.frameH - p.FH) / 2 + 'px';
      node.style.transform = p.L ? 'rotate(-90deg)' : 'none';
    }
    slot.under.innerHTML = frameSVG(p);
    slot.over.innerHTML = cutoutSVG(p);
  }
  slot.box.style.width = p.boxW + 'px';
  slot.box.style.height = p.boxH + 'px';
  const sc = slot.screen.style;
  sc.width = p.screenW + 'px';
  sc.height = p.screenH + 'px';
  sc.left = (p.boxW - p.screenW) / 2 + 'px';
  sc.top = (p.frameH - p.screenH) / 2 + 'px';
  sc.boxShadow = responsive ? '' : '0 0 0 1px #000';
  sc.borderRadius = responsive ? '0' : (p.f.screenRadius != null ? p.f.screenRadius : p.f.radius) + 'px';

  // desktop page zoom: the page lays out at screen ÷ zoom CSS px, then is scaled up
  const v = slot.view.style;
  if (z !== 1) {
    v.width = p.screenW / z + 'px';
    v.height = p.screenH / z + 'px';
    v.transform = `scale(${z})`;
    v.transformOrigin = '0 0';
  } else {
    v.width = v.height = v.transform = '';
  }
}

// Real free space in the stage, measured (paddings, caption, per-site labels).
function room(n) {
  const cs = getComputedStyle(el.stage);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const capCs = getComputedStyle(el.caption);
  // only the fixed top margin: the bottom one is `auto` (it centres the content)
  const captionH = el.caption.offsetHeight + parseFloat(capCs.marginTop);
  const gs = getComputedStyle(el.grid);
  const gapX = parseFloat(gs.columnGap) || 0, gapY = parseFloat(gs.rowGap) || 0;
  let rowExtra = 0;
  if (n > 1 && slots[0]) {
    const cap = slots[0].root.querySelector('.slot-cap');
    rowExtra = cap.offsetHeight + (parseFloat(getComputedStyle(slots[0].root).rowGap) || 0) + parseFloat(getComputedStyle(cap).marginTop || 0);
  }
  return {
    availW: el.stage.clientWidth - padX,
    availH: el.stage.clientHeight - padY - captionH,
    gapX, gapY, rowExtra
  };
}

function applyScale(p, scale, cols, responsive) {
  slots.forEach((slot, i) => {
    slot.box.style.transform = `scale(${scale})`;
    slot.screen.style.outline = responsive ? `${1.5 / scale}px solid #000` : '';
    slot.sizer.style.width = p.boxW * scale + 'px';
    slot.sizer.style.height = p.boxH * scale + 'px';
    // with several sites, only the last one in the first row gets the drag handles
    slot.root.classList.toggle('resizable', i === Math.min(cols, slots.length) - 1);
  });
}

// Numbered chips next to the link field: pick a site, × removes it.
function renderChips(n) {
  el.chips.hidden = n < 2;
  if (n < 2) { el.chips.textContent = ''; return; }
  if (el.chips.children.length !== n) {
    el.chips.textContent = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'chip';
      b.innerHTML = `<button type="button" class="chip-n"></button><button type="button" class="chip-x" aria-label="${t('removeSite', 'Remove')}" title="${t('removeSite', 'Remove')}">×</button>`;
      b.querySelector('.chip-n').addEventListener('click', () => setActive([...el.chips.children].indexOf(b)));
      b.querySelector('.chip-x').addEventListener('click', (e) => { e.stopPropagation(); removeSite([...el.chips.children].indexOf(b)); });
      el.chips.appendChild(b);
    }
  }
  [...el.chips.children].forEach((b, i) => {
    b.classList.toggle('on', i === state.active);
    const nBtn = b.querySelector('.chip-n');
    nBtn.textContent = i + 1;
    nBtn.title = state.urls[i] || t('emptySlot', 'empty');
  });
}

function layout() {
  const p = spec();
  const responsive = !!p.responsive;
  const n = slots.length;
  const z = p.d.desktop && state.pageZoom > 0 ? state.pageZoom : 1;
  document.body.classList.toggle('responsive', responsive);

  for (const slot of slots) drawSlot(slot, p, z);

  // toolbar state (before measuring: it can change heights)
  renderChips(n);
  el.dims.hidden = !responsive;
  if (document.activeElement !== el.rw) el.rw.value = state.rw;
  if (document.activeElement !== el.rh) el.rh.value = state.rh;
  el.fold.hidden = !(p.d.states);
  el.fold.classList.toggle('on', !!p.d.states && !state.folded);
  el.rotate.hidden = !!p.d.desktop;
  el.rotate.classList.toggle('on', !!p.L);
  el.pzWrap.hidden = !p.d.desktop;
  el.pz.value = String(state.pageZoom);
  el.zoom.textContent = state.fit ? t('fit', 'Fit') : '100%';
  slots.forEach((slot, i) => {
    slot.root.classList.toggle('active', n > 1 && i === state.active);
    const u = state.urls[i];
    slot.name.textContent = `${i + 1} · ${u ? hostOf(u) : t('emptySlot', 'empty')}`;
    slot.name.title = u || '';
    slot.x.hidden = n < 2;
  });

  // columns: phones side by side in one row · desktops 2 wide, then 3 × 2 ·
  // tablets / responsive: whatever grid shows them biggest
  const kind = p.d.desktop ? 'desktop' : (responsive || p.d.tablet || (p.d.states && !state.folded)) ? 'wide' : 'phone';
  let cols;
  if (frozenScale !== null) cols = lastCols;
  else if (kind === 'phone') cols = n;
  else if (kind === 'desktop') cols = Math.min(n, 3);
  else cols = null;   // decided below
  const { availW, availH, gapX, gapY, rowExtra } = room(n);
  const PAD_W = 12, PAD_H = 8;   // side buttons stick out a little
  const fitFor = (c, bw, bh) => {
    const r = Math.ceil(n / c);
    return Math.min(
      (availW - gapX * (c - 1)) / (c * (bw + PAD_W)),
      (availH - gapY * (r - 1) - rowExtra * r) / (r * (bh + PAD_H))
    );
  };
  let scale = 1;
  if (frozenScale !== null) {
    scale = frozenScale;
  } else {
    if (cols === null) {
      let best = -1;
      for (let rows = 1; rows <= Math.min(3, n); rows++) {
        const c = Math.ceil(n / rows);
        const f = fitFor(c, p.boxW, p.boxH);
        if (f > best + 0.001) { best = f; cols = c; }
      }
    }
    if (state.fit) {
      scale = fitFor(cols, p.boxW, p.boxH);
      // a single desktop is never shown wider than the small desktop would be
      if (p.d.desktop && n === 1) {
        const small = spec(byId('desktop-s'));
        const capW = small.boxW * Math.min(1, fitFor(1, small.boxW, small.boxH));
        scale = Math.min(scale, capW / p.boxW);
      }
      scale = Math.max(0.05, Math.min(1, scale));
    }
  }
  lastCols = cols;
  el.grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
  applyScale(p, scale, cols, responsive);

  // safety net: if anything still sticks out at the bottom, shrink to fit
  if (state.fit && frozenScale === null) {
    for (let k = 0; k < 2; k++) {
      const over = el.stage.scrollHeight - el.stage.clientHeight;
      if (over <= 1) break;
      const used = el.grid.offsetHeight;
      scale = Math.max(0.05, scale * (used - over - 2) / used);
      applyScale(p, scale, cols, responsive);
    }
  }
  lastScale = scale;

  // caption
  const approx = p.d.approx ? '≈ ' : '';
  const foldState = p.d.states ? ` <span class="m">· ${state.folded ? t('closed', 'closed') : t('opened', 'open')}</span>` : '';
  const name = responsive ? t('responsive', 'Responsive') : displayName(p.d);
  const zoomInfo = z !== 1
    ? ` <span class="m">· zoom ${Math.round(z * 100)}% →</span> ${Math.round(p.screenW / z)} × ${Math.round(p.screenH / z)} <span class="m">CSS</span>`
    : '';
  el.caption.innerHTML = `${name}${foldState} <span class="m">—</span> ${approx}${p.screenW} × ${p.screenH}${zoomInfo} <span class="m">· ${Math.round(scale * 100)}%</span>`;
  if (typeof updateStar === 'function') updateStar();
  el.caption.title = p.d.approx ? t('approxHint', 'Approximate: derived from resolution ÷ pixel ratio') : '';
}

/* ── Controls ─────────────────────────────────────── */

function buildSelect() {
  const groups = {};
  const opt = (d) => {
    const o = document.createElement('option');
    o.value = d.id;
    o.textContent = d.responsive ? t('responsive', 'Responsive') : displayName(d);
    return o;
  };
  el.device.appendChild(opt(RESPONSIVE));
  for (const d of DEVICES) {
    const g = d.group || d.brand;
    if (!groups[g]) {
      groups[g] = document.createElement('optgroup');
      groups[g].label = g;
      el.device.appendChild(groups[g]);
    }
    groups[g].appendChild(opt(d));
  }
  for (const z of PAGE_ZOOMS) {
    const o = document.createElement('option');
    o.value = String(z);
    o.textContent = `${Math.round(z * 100)}%`;
    el.pz.appendChild(o);
  }
}

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = normalize(el.url.value);
  if (!url) { el.url.focus(); el.url.select(); return; }
  state.urls[state.active] = url;
  el.url.value = url;
  save();
  layout();
  navigate(state.active, true);
  el.url.blur();
});

// pasting a link loads it straight away
el.url.addEventListener('paste', () => setTimeout(() => {
  if (normalize(el.url.value)) el.form.requestSubmit();
}, 0));

el.add.addEventListener('click', () => addSite());

el.device.addEventListener('change', () => {
  state.device = el.device.value;
  save();
  layout();
  navigateAll(false);
});

el.pz.addEventListener('change', () => {
  state.pageZoom = parseFloat(el.pz.value) || 1;
  save();
  layout();
});

el.rotate.addEventListener('click', () => {
  const d = byId(state.device);
  if (d.desktop) return;
  if (d.responsive) [state.rw, state.rh] = [state.rh, state.rw];
  else state.landscape = !state.landscape;
  save();
  layout();
});

el.fold.addEventListener('click', () => {
  state.folded = !state.folded;
  save();
  layout();
});

el.reload.addEventListener('click', () => navigateAll(true));

el.zoom.addEventListener('click', () => {
  state.fit = !state.fit;
  save();
  layout();
});

el.open.addEventListener('click', () => {
  const u = state.urls[state.active];
  if (u) window.open(u, '_blank', 'noopener');
});

for (const [input, key] of [[el.rw, 'rw'], [el.rh, 'rh']]) {
  input.addEventListener('change', () => { state[key] = clampDim(input.value); save(); layout(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
}

// responsive drag handles: the box being dragged stays pinned under the
// pointer (the grid is nudged to compensate for re-centring), then settles.
function wireHandle(h, slot) {
  h.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    h.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, w: state.rw, h: state.rh };
    const r0 = slot.box.getBoundingClientRect();
    let tx = 0, ty = 0;
    const dir = h.dataset.dir;
    frozenScale = lastScale;
    document.body.classList.add('dragging');
    const move = (ev) => {
      if (dir.includes('x')) state.rw = clampDim(start.w + (ev.clientX - start.x) / frozenScale);
      if (dir.includes('y')) state.rh = clampDim(start.h + (ev.clientY - start.y) / frozenScale);
      layout();
      const r = slot.box.getBoundingClientRect();
      tx += r0.left - r.left;
      ty += r0.top - r.top;
      el.grid.style.translate = `${tx}px ${ty}px`;
    };
    const up = () => {
      h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerup', up);
      h.removeEventListener('pointercancel', up);
      document.body.classList.remove('dragging');
      el.grid.style.translate = '';
      frozenScale = null;
      save();
      layout();
    };
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', up);
  });
}

// keyboard: R rotate · F fold · Z zoom · L link · N new site · 1–6 pick site · + − 0 page zoom
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'r') el.rotate.click();
  else if (k === 'f' && !el.fold.hidden) el.fold.click();
  else if (k === 'z') el.zoom.click();
  else if (k === 'b') { e.preventDefault(); drawerOpen() ? closeDrawer() : openDrawer(); }
  else if (k === 'n') { e.preventDefault(); addSite(); }
  else if (k === 's') { e.preventDefault(); saveFromSlot(state.active); }
  else if (k === 'l') { e.preventDefault(); el.url.focus(); el.url.select(); }
  else if (/^[1-6]$/.test(k) && +k <= slots.length) setActive(+k - 1);
  else if ((k === '+' || k === '=' || k === '-' || k === '0') && byId(state.device).desktop) {
    const i = PAGE_ZOOMS.indexOf(state.pageZoom);
    if (k === '0') state.pageZoom = 1;
    else state.pageZoom = PAGE_ZOOMS[Math.max(0, Math.min(PAGE_ZOOMS.length - 1, (i < 0 ? 5 : i) + (k === '-' ? -1 : 1)))];
    save();
    layout();
  }
});

new ResizeObserver(() => { if (frozenScale === null) layout(); }).observe(el.stage);

// Clicking inside a preview never reaches this page (it's another site), but the
// iframe takes focus — so follow the focused frame to pick the active site.
setInterval(() => {
  const a = document.activeElement;
  if (!a || a.tagName !== 'IFRAME') return;
  const i = slots.findIndex((s) => s.view === a);
  if (i >= 0 && i !== state.active) setActive(i);
}, 250);


/* ── Saved links (synced with the Chrome profile) ─── */

const FAV_KEY = 'outlineFavs';
const MAX_FAVS = 100;
let favs = [];

// Saved links live in storage.local (always) and are mirrored to storage.sync
// in chunks that respect Chrome's 8 KB-per-item quota, so they follow the user
// to their other Chrome profiles. The newer copy wins on load.
const SYNC_META = FAV_KEY + ':meta';
const SYNC_CHUNK = (i) => `${FAV_KEY}:${i}`;
const CHUNK_BYTES = 7000;

function cleanFavs(list) {
  const seen = new Set();
  const out = [];
  if (Array.isArray(list)) {
    for (const raw of list) {
      const u = normalize(raw);
      if (u && !seen.has(u)) { seen.add(u); out.push(u); }
      if (out.length >= MAX_FAVS) break;
    }
  }
  return out;
}

async function readSyncFavs() {
  try {
    const meta = (await chrome.storage.sync.get(SYNC_META))[SYNC_META];
    if (meta && Number.isInteger(meta.n) && meta.n >= 0 && meta.n <= 50) {
      const keys = Array.from({ length: meta.n }, (_, i) => SYNC_CHUNK(i));
      const got = keys.length ? await chrome.storage.sync.get(keys) : {};
      return { ts: +meta.ts || 0, list: keys.flatMap((k) => (Array.isArray(got[k]) ? got[k] : [])) };
    }
    // v1.3/v1.4 stored everything in one sync key
    const old = (await chrome.storage.sync.get(FAV_KEY))[FAV_KEY];
    if (Array.isArray(old)) return { ts: 0, list: old };
  } catch (e) {}
  return null;
}

async function loadFavs() {
  let local = null;
  try {
    const v = (await chrome.storage.local.get(FAV_KEY))[FAV_KEY];
    if (v && Array.isArray(v.list)) local = { ts: +v.ts || 0, list: v.list };
    else if (Array.isArray(v)) local = { ts: 0, list: v };
  } catch (e) {}
  const synced = await readSyncFavs();
  const pick = !local ? synced : !synced ? local : (synced.ts > local.ts ? synced : local);
  favs = cleanFavs(pick ? pick.list : []);
  renderFavs();
}

async function storeFavs() {
  const ts = Date.now();
  try { await chrome.storage.local.set({ [FAV_KEY]: { ts, list: favs } }); } catch (e) {}
  try {
    // split into chunks under the per-item quota
    const chunks = [];
    let cur = [], size = 2;
    for (const u of favs) {
      const add = JSON.stringify(u).length + 1;
      if (cur.length && size + add > CHUNK_BYTES) { chunks.push(cur); cur = []; size = 2; }
      cur.push(u); size += add;
    }
    if (cur.length) chunks.push(cur);
    const prev = (await chrome.storage.sync.get(SYNC_META))[SYNC_META];
    const data = { [SYNC_META]: { ts, n: chunks.length } };
    chunks.forEach((c, i) => { data[SYNC_CHUNK(i)] = c; });
    await chrome.storage.sync.set(data);
    const stale = [];
    for (let i = chunks.length; i < ((prev && prev.n) || 0); i++) stale.push(SYNC_CHUNK(i));
    stale.push(FAV_KEY);   // old single-key format
    await chrome.storage.sync.remove(stale);
  } catch (e) { /* sync full or disabled: the local copy still holds everything */ }
  renderFavs();
}
function saveFromSlot(i) {
  const u = state.urls[i];
  if (!u) return;
  if (favs.includes(u)) {
    favs = favs.filter((x) => x !== u);
    storeFavs();
    return;
  }
  favs.unshift(u);
  favs = favs.slice(0, MAX_FAVS);
  freshUrl = u;
  storeFavs();
  const s = slots[i] && slots[i].save;
  if (s) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
  openDrawer();
}
let freshUrl = '';

function updateStar() {
  slots.forEach((slot, i) => {
    const u = state.urls[i];
    const on = !!u && favs.includes(u);
    slot.save.hidden = !u;
    slot.save.classList.toggle('on', on);
    const s = on ? t('unsaveLink', 'Remove from saved links') : t('saveLink', 'Save this link');
    slot.save.title = s;
    slot.save.setAttribute('aria-label', s);
  });
}
function renderFavs() {
  el.favsCount.textContent = favs.length ? String(favs.length) : '';
  updateStar();
  const full = state.urls.length >= MAX_SITES;
  el.openAll.parentElement.hidden = favs.length < 2;
  el.drawerList.textContent = '';
  if (!favs.length) {
    const p = document.createElement('p');
    p.className = 'favs-empty';
    p.textContent = t('favsEmpty', 'No saved links yet. Click the bookmark next to a device to save its site.');
    el.drawerList.appendChild(p);
    return;
  }
  favs.forEach((u) => {
    const row = document.createElement('div');
    row.className = 'fav' + (u === freshUrl ? ' fresh' : '');
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'fav-open';
    open.textContent = shortUrl(u);
    open.title = `${t('openHere', 'Open here')} — ${u}`;
    open.addEventListener('click', () => loadInto(state.active, u));
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'fav-add';
    add.textContent = '+';
    add.title = t('addToCompare', 'Add to compare');
    add.disabled = full;
    add.addEventListener('click', () => { addSite(u); renderFavs(); });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'fav-del';
    del.textContent = '×';
    del.title = t('deleteSaved', 'Delete from saved links');
    del.addEventListener('click', () => { favs = favs.filter((x) => x !== u); storeFavs(); });
    row.append(open, add, del);
    el.drawerList.appendChild(row);
  });
  freshUrl = '';
}
const drawerOpen = () => el.drawer.classList.contains('open');
function openDrawer() {
  el.drawer.classList.add('open');
  el.drawer.setAttribute('aria-hidden', 'false');
  el.favsBtn.setAttribute('aria-expanded', 'true');
  renderFavs();
}
function closeDrawer() {
  el.drawer.classList.remove('open');
  el.drawer.setAttribute('aria-hidden', 'true');
  el.favsBtn.setAttribute('aria-expanded', 'false');
}
function openAllFavs() {
  state.urls = favs.slice(0, MAX_SITES);
  state.active = 0;
  syncSlots();
  el.url.value = state.urls[0] || '';
  save();
  layout();
  navigateAll(true);
  closeDrawer();
}
function loadInto(i, url) {
  state.urls[i] = url;
  if (i === state.active) el.url.value = url;
  save();
  layout();
  navigate(i, true);
}

el.favsBtn.addEventListener('click', (e) => { e.stopPropagation(); drawerOpen() ? closeDrawer() : openDrawer(); });
el.drawerClose.addEventListener('click', closeDrawer);
el.openAll.addEventListener('click', openAllFavs);
document.addEventListener('pointerdown', (e) => {
  if (drawerOpen() && !e.target.closest('#drawer, #favsBtn, .slot-save')) closeDrawer();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
try {
  chrome.storage.onChanged.addListener((ch, areaName) => {
    // another device (sync), another viewer tab (local) or an older-format write
    if (ch[SYNC_META] || (ch[FAV_KEY] && ch[FAV_KEY].newValue !== undefined)) loadFavs();
  });
} catch (e) {}

/* ── Boot ─────────────────────────────────────────── */

(async function boot() {
  buildSelect();
  await restore();
  const fromParam = normalize(new URLSearchParams(location.search).get('url'));
  if (fromParam) {
    state.urls[state.active] = fromParam;
    history.replaceState(null, '', location.pathname);
  }
  if (!ALL.some((d) => d.id === state.device)) state.device = DEFAULT_DEVICE;
  el.device.value = state.device;
  el.url.value = state.urls[state.active] || '';
  syncSlots();
  save();
  layout();
  navigateAll(true);
  loadFavs();
  if (!state.urls[state.active]) el.url.focus();
})();
