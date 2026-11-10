// outline. — device emulation inside the preview frame.
// Runs at document_start in every frame, but returns before touching anything
// unless ALL of these hold:
//   1. it is a sub-frame, and its only ancestor is a chrome-extension:// page
//      (location.ancestorOrigins is set by the browser and cannot be faked);
//   2. the frame's name carries the outline. config (set by viewer.js).
// In normal browsing (top-level pages, frames inside websites) it only compares
// window with window.top and reads location.ancestorOrigins, then exits: no
// globals, no listeners, no DOM changes, no network, and it never reads or
// sends page content.
// This MAIN-world script cannot learn its own extension id, so another
// extension's page could, in theory, pass check 1 and set a frame name too.
// The worst it could do is make that frame report a different User-Agent /
// touch support to itself: nothing that frame couldn't do on its own.
(() => {
  'use strict';
  try {
    if (window === window.top) return;
    const ao = location.ancestorOrigins;
    if (!ao || ao.length !== 1 || !/^chrome-extension:\/\/[a-p]{32}$/.test(ao[0])) return;
    const PREFIX = '__outline__';
    let name = '';
    try { name = window.name; } catch (e) { return; }
    if (typeof name !== 'string' || name.length > 4096 || !name.startsWith(PREFIX)) return;

    let cfg;
    try { cfg = JSON.parse(name.slice(PREFIX.length)); } catch (e) { return; }
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return;

    // Overlay scrollbars, like on a real phone/tablet (a desktop scrollbar
    // would steal ~15px of viewport width and break the breakpoints).
    if (cfg.hideScrollbar === true) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('html{scrollbar-width:none!important}');
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      } catch (e) {}
    }

    const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : '');
    const ua = str(cfg.ua, 512);
    const os = ['ios', 'ipados', 'android'].includes(cfg.os) ? cfg.os : '';
    if (!ua || !os) return;
    const touch = Number.isInteger(cfg.touch) && cfg.touch >= 0 && cfg.touch <= 10 ? cfg.touch : 0;
    const mobile = cfg.mobile === true;

    const def = (obj, prop, value) => {
      try { Object.defineProperty(obj, prop, { get: () => value, configurable: true }); } catch (e) {}
    };
    const N = Navigator.prototype;
    def(N, 'userAgent', ua);
    def(N, 'appVersion', ua.replace(/^Mozilla\//, ''));
    def(N, 'platform', str(cfg.platform, 64));
    def(N, 'vendor', str(cfg.vendor, 64));
    def(N, 'maxTouchPoints', touch);

    if (os === 'android') {
      const brands = Array.isArray(cfg.brands)
        ? cfg.brands.filter((b) => b && typeof b.brand === 'string' && typeof b.version === 'string')
          .slice(0, 10).map((b) => Object.freeze({ brand: b.brand.slice(0, 64), version: b.version.slice(0, 32) }))
        : [];
      if (brands.length) {
        const model = str(cfg.model, 64);
        const uaData = {
          brands,
          mobile,
          platform: 'Android',
          getHighEntropyValues: async () => ({
            brands, mobile, platform: 'Android',
            platformVersion: '16.0.0', model, architecture: '', bitness: '',
            fullVersionList: brands, uaFullVersion: brands[brands.length - 1].version
          }),
          toJSON() { return { brands, mobile, platform: 'Android' }; }
        };
        def(N, 'userAgentData', uaData);
      }
    } else {
      // Safari has no User-Agent Client Hints.
      def(N, 'userAgentData', undefined);
    }

    if (touch > 0 && !('ontouchstart' in window)) {
      try { window.ontouchstart = null; } catch (e) {}
    }
  } catch (e) {}
})();
