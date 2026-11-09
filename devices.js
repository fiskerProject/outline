// outline. — device catalogue
// w × h = CSS viewport in portrait (points / dp), the size media queries see.
// approx: true  → the maker doesn't publish CSS sizes; value derived from
//                 physical resolution ÷ device pixel ratio.
// group         → optgroup in the device menu.
// Frame geometry (bezel, radius, cutouts, buttons) is a stylised outline in
// CSS px. Button positions are fractions of the body height (or width for
// "top"), measured from the top-left of the device in portrait.

const ISLAND = { type: 'island', w: 124, h: 36, top: 11 };
const NOTCH = { type: 'notch', w: 162, h: 32 };
const punch = (d = 11, top = 11, x = 0.5) => ({ type: 'punch', d, top, x });

// iPhone 16 and later (except 16e): Action button + Camera Control
const IPHONE_CC = [
  { side: 'left', from: 0.17, to: 0.205 },
  { side: 'left', from: 0.255, to: 0.33 },
  { side: 'left', from: 0.355, to: 0.43 },
  { side: 'right', from: 0.27, to: 0.40 },
  { side: 'right', from: 0.57, to: 0.64 }
];
// iPhone 13 – 15, 16e: switch / Action button, volume, side button
const IPHONE = [
  { side: 'left', from: 0.17, to: 0.205 },
  { side: 'left', from: 0.255, to: 0.33 },
  { side: 'left', from: 0.355, to: 0.43 },
  { side: 'right', from: 0.27, to: 0.40 }
];
const IPHONE_SE = [
  { side: 'left', from: 0.13, to: 0.16 },
  { side: 'left', from: 0.20, to: 0.26 },
  { side: 'left', from: 0.28, to: 0.34 },
  { side: 'right', from: 0.20, to: 0.28 }
];
const SAMSUNG = [
  { side: 'right', from: 0.22, to: 0.33 },
  { side: 'right', from: 0.36, to: 0.43 }
];
const PIXEL = [
  { side: 'right', from: 0.24, to: 0.30 },
  { side: 'right', from: 0.34, to: 0.47 }
];
const IPAD = [
  { side: 'top', from: 0.80, to: 0.88 },
  { side: 'right', from: 0.07, to: 0.13 },
  { side: 'right', from: 0.145, to: 0.205 }
];
const TAB = [
  { side: 'right', from: 0.10, to: 0.15 },
  { side: 'right', from: 0.17, to: 0.25 }
];

const iphone = (id, name, year, w, h, opt = {}) => ({
  id, group: 'iPhone', brand: 'Apple', name, year, os: 'ios', w, h, approx: opt.approx,
  frame: {
    bezel: opt.bezel || 9,
    radius: opt.radius || 55,
    cutout: opt.cutout === undefined ? ISLAND : opt.cutout,
    buttons: opt.buttons || IPHONE_CC
  }
});

const ipad = (id, name, year, w, h, opt = {}) => ({
  id, group: 'iPad', brand: 'Apple', name, year, os: 'ipados', tablet: true, w, h, approx: opt.approx,
  frame: { bezel: opt.bezel || 20, radius: opt.radius || 18, cutout: null, camera: opt.camera || 'long', buttons: IPAD }
});

const galaxy = (id, name, year, w, h, opt = {}) => ({
  id, group: 'Samsung', brand: 'Samsung', name, year, os: 'android', model: opt.model || '', w, h, approx: opt.approx,
  frame: { bezel: opt.bezel || 9, radius: opt.radius || 36, cutout: punch(opt.punch || 10, 10), buttons: SAMSUNG }
});

const desktop = (id, nameKey, name, w, h) => ({
  id, group: 'Desktop', brand: '', name, nameKey, os: null, desktop: true, w, h,
  frame: { bezel: 14, radius: 4, screenRadius: 0, cutout: null, buttons: [], stand: true, camera: 'top-dot' }
});

const DEVICES = [
  // ── iPhone ──────────────────────────────────────────
  iphone('iphone-18-pro-max', 'iPhone 18 Pro Max', 2026, 440, 956, { radius: 60 }),
  iphone('iphone-18-pro', 'iPhone 18 Pro', 2026, 402, 874, { radius: 58 }),
  {
    id: 'iphone-duo', group: 'iPhone', brand: 'Apple', name: 'iPhone Duo', year: 2026,
    os: 'ios', approx: true, fold: 'book',
    states: {
      closed: { w: 466, h: 678, frame: { bezel: 9, radius: 42, cutout: punch(11, 12), buttons: [
        { side: 'right', from: 0.20, to: 0.34 }, { side: 'left', from: 0.22, to: 0.32 }, { side: 'left', from: 0.35, to: 0.45 } ] } },
      open: { w: 890, h: 626, frame: { bezel: 10, radius: 26, cutout: null, buttons: [
        { side: 'top', from: 0.80, to: 0.90 }, { side: 'right', from: 0.20, to: 0.34 } ] } }
    }
  },
  iphone('iphone-17-pro-max', 'iPhone 17 Pro Max', 2025, 440, 956, { radius: 60 }),
  iphone('iphone-17-pro', 'iPhone 17 Pro', 2025, 402, 874, { radius: 58 }),
  iphone('iphone-air', 'iPhone Air', 2025, 420, 912, { radius: 56 }),
  iphone('iphone-17', 'iPhone 17', 2025, 402, 874, { bezel: 10, radius: 55 }),
  iphone('iphone-16e', 'iPhone 16e', 2025, 390, 844, { bezel: 11, radius: 47, cutout: NOTCH, buttons: IPHONE }),
  iphone('iphone-16-pro-max', 'iPhone 16 Pro Max', 2024, 440, 956, { radius: 60 }),
  iphone('iphone-16-pro', 'iPhone 16 Pro', 2024, 402, 874, { radius: 58 }),
  iphone('iphone-16-plus', 'iPhone 16 Plus', 2024, 430, 932, { bezel: 10, radius: 55 }),
  iphone('iphone-16', 'iPhone 16', 2024, 393, 852, { bezel: 10, radius: 55 }),
  iphone('iphone-15-pro-max', 'iPhone 15 Pro Max', 2023, 430, 932, { radius: 55, buttons: IPHONE }),
  iphone('iphone-15-pro', 'iPhone 15 Pro', 2023, 393, 852, { radius: 55, buttons: IPHONE }),
  iphone('iphone-15-plus', 'iPhone 15 Plus', 2023, 430, 932, { bezel: 10, radius: 55, buttons: IPHONE }),
  iphone('iphone-15', 'iPhone 15', 2023, 393, 852, { bezel: 10, radius: 55, buttons: IPHONE }),
  iphone('iphone-14-pro-max', 'iPhone 14 Pro Max', 2022, 430, 932, { bezel: 10, radius: 55, buttons: IPHONE }),
  iphone('iphone-14-pro', 'iPhone 14 Pro', 2022, 393, 852, { bezel: 10, radius: 55, buttons: IPHONE }),
  iphone('iphone-14-plus', 'iPhone 14 Plus', 2022, 428, 926, { bezel: 11, radius: 50, cutout: NOTCH, buttons: IPHONE }),
  iphone('iphone-14', 'iPhone 14', 2022, 390, 844, { bezel: 11, radius: 47, cutout: NOTCH, buttons: IPHONE }),
  iphone('iphone-se-3', 'iPhone SE (3rd gen)', 2022, 375, 667, { buttons: IPHONE_SE, cutout: null }),
  iphone('iphone-13-pro-max', 'iPhone 13 Pro Max', 2021, 428, 926, { bezel: 11, radius: 50, cutout: NOTCH, buttons: IPHONE }),
  iphone('iphone-13-pro', 'iPhone 13 Pro', 2021, 390, 844, { bezel: 11, radius: 47, cutout: NOTCH, buttons: IPHONE }),
  iphone('iphone-13', 'iPhone 13', 2021, 390, 844, { bezel: 11, radius: 47, cutout: NOTCH, buttons: IPHONE }),
  iphone('iphone-13-mini', 'iPhone 13 mini', 2021, 375, 812, { bezel: 11, radius: 44, cutout: NOTCH, buttons: IPHONE }),

  // ── iPad ────────────────────────────────────────────
  ipad('ipad-pro-13', 'iPad Pro 13″ (M4 · M5)', 2025, 1032, 1376, { bezel: 22 }),
  ipad('ipad-pro-11', 'iPad Pro 11″ (M4 · M5)', 2025, 834, 1210),
  ipad('ipad-air-13', 'iPad Air 13″ (M4)', 2026, 1024, 1366, { bezel: 24 }),
  ipad('ipad-air-11', 'iPad Air 11″ (M4)', 2026, 820, 1180, { bezel: 24 }),
  ipad('ipad-a16', 'iPad (A16)', 2025, 820, 1180, { bezel: 26 }),
  ipad('ipad-mini-a20', 'iPad mini (A20 Pro)', 2026, 756, 1158, { camera: 'short', approx: true }),
  ipad('ipad-mini-a17', 'iPad mini (A17 Pro)', 2024, 744, 1133, { camera: 'short', bezel: 22 }),
  ipad('ipad-pro-129', 'iPad Pro 12.9″ (M2)', 2022, 1024, 1366, { bezel: 24 }),

  // ── Samsung ─────────────────────────────────────────
  galaxy('galaxy-s26-ultra', 'Galaxy S26 Ultra', 2026, 412, 891, { radius: 24, punch: 11, model: 'SM-S948B' }),
  galaxy('galaxy-s26-plus', 'Galaxy S26+', 2026, 412, 891, { radius: 40, model: 'SM-S947B' }),
  galaxy('galaxy-s26', 'Galaxy S26', 2026, 360, 780, { radius: 40, model: 'SM-S942B' }),
  galaxy('galaxy-s25-ultra', 'Galaxy S25 Ultra', 2025, 412, 891, { radius: 24, punch: 11, model: 'SM-S938B' }),
  galaxy('galaxy-s25', 'Galaxy S25', 2025, 360, 780, { radius: 40, model: 'SM-S931B' }),
  galaxy('galaxy-s24-ultra', 'Galaxy S24 Ultra', 2024, 384, 832, { radius: 14, punch: 11, model: 'SM-S928B', approx: true }),
  galaxy('galaxy-s24', 'Galaxy S24', 2024, 360, 780, { radius: 36, model: 'SM-S921B' }),
  galaxy('galaxy-a56', 'Galaxy A56', 2025, 412, 891, { bezel: 11, radius: 34, model: 'SM-A566B', approx: true }),
  {
    id: 'galaxy-z-fold8-ultra', group: 'Samsung', brand: 'Samsung', name: 'Galaxy Z Fold8 Ultra', year: 2026,
    os: 'android', model: 'SM-F978B', approx: true, fold: 'book',
    states: {
      closed: { w: 412, h: 960, frame: { bezel: 9, radius: 32, cutout: punch(10, 10), buttons: SAMSUNG } },
      open: { w: 832, h: 750, frame: { bezel: 9, radius: 20, cutout: punch(10, 10, 0.75), buttons: [
        { side: 'right', from: 0.22, to: 0.36 }, { side: 'right', from: 0.40, to: 0.50 } ] } }
    }
  },
  {
    id: 'galaxy-z-fold8', group: 'Samsung', brand: 'Samsung', name: 'Galaxy Z Fold8', year: 2026,
    os: 'android', model: 'SM-F976B', approx: true, fold: 'book',
    states: {
      closed: { w: 416, h: 657, frame: { bezel: 9, radius: 32, cutout: punch(10, 10), buttons: SAMSUNG } },
      open: { w: 779, h: 616, frame: { bezel: 9, radius: 22, cutout: punch(10, 10, 0.75), buttons: [
        { side: 'right', from: 0.22, to: 0.36 }, { side: 'right', from: 0.40, to: 0.50 } ] } }
    }
  },
  {
    id: 'galaxy-z-flip8', group: 'Samsung', brand: 'Samsung', name: 'Galaxy Z Flip8', year: 2026,
    os: 'android', model: 'SM-F776B', w: 360, h: 840, approx: true, fold: 'flip',
    frame: { bezel: 9, radius: 34, cutout: punch(10, 10), buttons: [
      { side: 'right', from: 0.30, to: 0.39 }, { side: 'right', from: 0.41, to: 0.46 } ] }
  },
  {
    id: 'galaxy-z-flip7', group: 'Samsung', brand: 'Samsung', name: 'Galaxy Z Flip7', year: 2025,
    os: 'android', model: 'SM-F766B', w: 360, h: 840, fold: 'flip',
    frame: { bezel: 10, radius: 34, cutout: punch(10, 10), buttons: [
      { side: 'right', from: 0.30, to: 0.39 }, { side: 'right', from: 0.41, to: 0.46 } ] }
  },
  {
    id: 'galaxy-tab-s11-ultra', group: 'Samsung', brand: 'Samsung', name: 'Galaxy Tab S11 Ultra', year: 2025,
    os: 'android', tablet: true, model: 'SM-X930', w: 924, h: 1480, approx: true,
    frame: { bezel: 16, radius: 14, cutout: null, camera: 'long', buttons: TAB }
  },
  {
    id: 'galaxy-tab-s11', group: 'Samsung', brand: 'Samsung', name: 'Galaxy Tab S11', year: 2025,
    os: 'android', tablet: true, model: 'SM-X730', w: 800, h: 1280, approx: true,
    frame: { bezel: 18, radius: 14, cutout: null, camera: 'long', buttons: TAB }
  },

  // ── Google ──────────────────────────────────────────
  {
    id: 'pixel-11-pro-xl', group: 'Google Pixel', brand: 'Google', name: 'Pixel 11 Pro XL', year: 2026,
    os: 'android', model: 'Pixel 11 Pro XL', w: 448, h: 997, approx: true,
    frame: { bezel: 9, radius: 46, cutout: punch(11, 12), buttons: PIXEL }
  },
  {
    id: 'pixel-11-pro', group: 'Google Pixel', brand: 'Google', name: 'Pixel 11 Pro', year: 2026,
    os: 'android', model: 'Pixel 11 Pro', w: 427, h: 952, approx: true,
    frame: { bezel: 9, radius: 46, cutout: punch(11, 12), buttons: PIXEL }
  },
  {
    id: 'pixel-11', group: 'Google Pixel', brand: 'Google', name: 'Pixel 11', year: 2026,
    os: 'android', model: 'Pixel 11', w: 412, h: 924, approx: true,
    frame: { bezel: 11, radius: 42, cutout: punch(11, 12), buttons: PIXEL }
  },
  {
    id: 'pixel-11-pro-fold', group: 'Google Pixel', brand: 'Google', name: 'Pixel 11 Pro Fold', year: 2026,
    os: 'android', model: 'Pixel 11 Pro Fold', approx: true, fold: 'book',
    states: {
      closed: { w: 412, h: 900, frame: { bezel: 9, radius: 38, cutout: punch(11, 12), buttons: PIXEL } },
      open: { w: 755, h: 785, frame: { bezel: 11, radius: 22, cutout: punch(10, 12, 0.85), buttons: [
        { side: 'top', from: 0.70, to: 0.78 }, { side: 'top', from: 0.82, to: 0.94 } ] } }
    }
  },

  // ── Desktop ─────────────────────────────────────────
  desktop('desktop-l', 'desktopLarge', 'Desktop — large', 1920, 1080),
  desktop('desktop-m', 'desktopMedium', 'Desktop — medium', 1440, 900),
  desktop('desktop-s', 'desktopSmall', 'Desktop — small', 1366, 768)
];

// Fix up the iPhone SE: home-button design, square screen, tall top/bottom bezels.
(() => {
  const se = DEVICES.find((d) => d.id === 'iphone-se-3');
  se.frame = { bezel: 12, bezelY: 66, radius: 0, bodyRadius: 54, cutout: null, home: true, buttons: IPHONE_SE };
})();

const RESPONSIVE = { id: 'responsive', brand: '', name: 'Responsive', os: null, responsive: true };

const PAGE_ZOOMS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
