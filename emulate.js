// outline. — device emulation inside the preview frame.
// Runs at document_start in every frame, but exits immediately unless the
// frame is the preview iframe of the outline. viewer (marked via window.name
// and hosted by a chrome-extension:// page). It never touches normal browsing.
(() => {
  const PREFIX = '__outline__';
  if (window === window.top) return;
  let name = '';
  try { name = window.name; } catch (e) { return; }
  if (!name || !name.startsWith(PREFIX)) return;
  const ao = location.ancestorOrigins;
  if (!ao || ao.length !== 1 || !ao[0].startsWith('chrome-extension://')) return;

  let cfg;
  try { cfg = JSON.parse(name.slice(PREFIX.length)); } catch (e) { return; }

  // Overlay scrollbars, like on a real phone/tablet (a desktop scrollbar
  // would steal ~15px of viewport width and break the breakpoints).
  if (cfg.hideScrollbar) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('html{scrollbar-width:none!important}');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    } catch (e) {}
  }

  if (!cfg.ua) return;

  const def = (obj, prop, value) => {
    try { Object.defineProperty(obj, prop, { get: () => value, configurable: true }); } catch (e) {}
  };
  const N = Navigator.prototype;
  def(N, 'userAgent', cfg.ua);
  def(N, 'appVersion', cfg.ua.replace(/^Mozilla\//, ''));
  def(N, 'platform', cfg.platform);
  def(N, 'vendor', cfg.vendor);
  def(N, 'maxTouchPoints', cfg.touch);

  if (cfg.os === 'android' && cfg.brands) {
    const uaData = {
      brands: cfg.brands,
      mobile: !!cfg.mobile,
      platform: 'Android',
      getHighEntropyValues: async (hints) => ({
        brands: cfg.brands, mobile: !!cfg.mobile, platform: 'Android',
        platformVersion: '16.0.0', model: cfg.model || '', architecture: '', bitness: '',
        fullVersionList: cfg.brands, uaFullVersion: cfg.brands[cfg.brands.length - 1].version
      }),
      toJSON() { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; }
    };
    def(N, 'userAgentData', uaData);
  } else if (cfg.os === 'ios' || cfg.os === 'ipados') {
    // Safari has no User-Agent Client Hints.
    def(N, 'userAgentData', undefined);
  }

  if (cfg.touch > 0 && !('ontouchstart' in window)) {
    try { window.ontouchstart = null; } catch (e) {}
  }
})();
