<p align="center">
  <img src="store/fox-dots.png" width="120" alt="">
</p>

<h1 align="center">outline.</h1>

<p align="center"><b>See any website on the latest phones, tablets and foldables, right inside Chrome.</b><br>
Paste a link and the site renders inside a minimal black-and-white outline of the device, at its real CSS viewport.</p>

<p align="center">
  <img src="docs/screenshot.png" width="860" alt="outline. showing a website on iPhone 18 Pro">
</p>

## Features

- **55 presets.**
  - **iPhone:** every model from iPhone 13 / 13 mini / SE (3rd gen) to iPhone 18 Pro Max and the foldable iPhone Duo
  - **iPad:** Pro 13″ / 11″ (M4 · M5), Pro 12.9″ (M2), Air 13″ / 11″ (M4), iPad (A16), iPad mini (A17 Pro, A20 Pro)
  - **Samsung:** Galaxy S24 → S26 (Ultra, +, base), A56, Z Fold8 / Fold8 Ultra, Z Flip7 / Flip8, Tab S11 / S11 Ultra
  - **Google:** Pixel 11 / 11 Pro / 11 Pro XL / 11 Pro Fold
  - **Desktop:** large (1920 × 1080), medium (1440 × 900), small (1366 × 768)
- **Desktop page zoom** (50 – 200 %, or `+` `−` `0`), to check layouts at the browser zoom or Windows scaling people actually use. 1920 × 1080 at 125 % lays out like a 1536 × 864 viewport.
- **Compare up to 6 sites** on the same device. Add one with `+` (or `N`); pick it with its numbered chip next to the link field (or `1`–`6`); `×` removes it. Phones line up side by side; desktops go 2 wide, then 3 × 2.
- **Saved links.** `☆` in the link field (or `S`) saves the open site; **Saved** lists them: open one, add it to the comparison, or open them all at once. Synced across your Chrome profile, no account or database needed.
- **Always fits the window.** Devices use all the vertical space and never spill off-screen. A single desktop is shown no wider than the small desktop preset.
- **Foldables.** Open and close them (`F`) to switch between cover and inner screen.
- **Rotate** to landscape (`R`). The page keeps its state, like on a real phone.
- **Responsive mode.** A plain black border you can resize by dragging or by typing exact sizes.
- **Real mobile behaviour, not only width.** Each device gets:
  - its User-Agent (in HTTP headers *and* in `navigator.userAgent`)
  - its Client Hints
  - touch detection
  - overlay scrollbars
  - iPad presents itself as a Mac, as iPadOS Safari really does
- **Works with sites that refuse to be framed** (`X-Frame-Options`, CSP `frame-ancestors`), only inside the preview tab.
- **Local files and localhost.** Open an `.html` file in Chrome and click the icon, or paste a path or `localhost:3000`.
- **Frame-busting blocked.** The preview can't redirect the viewer.
- **Fit to window** or **100%** (`Z`).
- **Remembers** your last link and device. English and Italian UI.

| | | |
|---|---|---|
| ![](store/screenshot-2-foldable.png) | ![](store/screenshot-3-ipad.png) | ![](store/screenshot-4-responsive.png) |

## Install

**Chrome Web Store:** *coming soon*

**From source:**

1. Download this repository (`Code → Download ZIP`) and unzip it, or `git clone` it
2. Open `chrome://extensions` and turn on **Developer mode**
3. Click **Load unpacked** and select the folder
4. *(For local `.html` files)* open the extension's **Details** and enable **Allow access to file URLs**

Click the icon (or press `Alt+Shift+O`). The viewer opens with the page you were on already loaded.

## Shortcuts

| Key | Action |
|---|---|
| `Alt+Shift+O` | Open outline. |
| `L` | Focus the link field |
| `N` | Add a site to compare (max 6) |
| `1`–`6` | Pick which site the link field edits |
| `S` | Save / unsave the open link |
| `R` | Rotate |
| `F` | Fold / unfold |
| `Z` | Fit / 100% |
| `+` `−` `0` | Page zoom (desktop) |

## How it works

| File | Role |
|---|---|
| `viewer.html / .css / .js` | The page: toolbar, device outlines (inline SVG), scaling, responsive handles |
| `devices.js` | Device catalogue: viewport sizes and frame geometry |
| `background.js` | Opens the viewer, creates the per-tab network rules on request, and removes them when the viewer goes away |
| `emulate.js` | Runs only inside the preview frame and emulates UA, platform, touch and scrollbars |

Header changes use `declarativeNetRequest` **session rules scoped to the viewer tab's ID**. Your normal browsing is never touched, and the rules are removed when the viewer closes, reloads or navigates away (and on every extension start, if a tab crashed).

## Permissions

| Permission | Why |
|---|---|
| `declarativeNetRequest` | Inside the viewer tab only: sets the device `User-Agent` / client hints, removes `X-Frame-Options`, and removes `Content-Security-Policy` only when it contains `frame-ancestors`. |
| `storage` | Remembers your last links and device (`storage.local`), syncs your saved links (`storage.sync`), and tracks which viewer tab owns which rule (`storage.session`). |
| `activeTab` | Reads the address of the current tab when you click the icon, to prefill the viewer. |
| Host access (`<all_urls>`) | Needed to modify headers for, and run the emulation script in, whatever site you preview (including `localhost` and local files). |

## Security

- Strict Content Security Policy for the extension's pages: only its own scripts, no `eval`, no network requests of its own, no plugins, and the viewer can't be framed by anyone. Frames may only load `http`, `https` and `file` pages (plus `blob:` / `data:` a site opens inside its own frame).
- No `web_accessible_resources`: websites can't load or probe any file of the extension.
- Preview frames are sandboxed (no top-level navigation, so a site can't take over the viewer) and send no referrer.
- Every link from the address field, `?url=`, local storage or synced saved links is checked: only `http`, `https` and `file` links, max 8192 characters, max 100 saved links. Untrusted text is never inserted as HTML.
- Network rules are created by the service worker for the requesting viewer tab only; the tab ID comes from Chrome, not from the page.

## Notes and limits

- Sizes marked **≈** are approximate. The maker doesn't publish CSS viewport sizes, so they are derived from physical resolution ÷ pixel ratio.
- `devicePixelRatio` stays your monitor's, so images load at desktop density.
- Desktop Chrome ignores `<meta name="viewport">`. Pages with a fixed viewport width won't zoom out the way they do on a phone.
- Logins and third-party cookies inside the frame may not persist.

## Privacy

No data is collected and nothing is sent to the developers. Your last links and device stay in `chrome.storage.local` on your computer; saved links live in `chrome.storage.sync`, which Chrome syncs to your Google account only if Chrome Sync is on. See [PRIVACY.md](PRIVACY.md).

## Add a device

Add an entry to `devices.js`:

```js
{
  id: 'my-phone', brand: 'Brand', name: 'My Phone', year: 2026,
  os: 'android',            // 'ios' | 'ipados' | 'android'
  w: 412, h: 915,           // CSS viewport, portrait
  frame: { bezel: 9, radius: 40, cutout: punch(11, 12), buttons: PIXEL_BUTTONS }
}
```

## Releasing

Bump `version` in `manifest.json`, then push a matching tag:

```bash
git tag v1.0.1 && git push origin v1.0.1
```

GitHub Actions builds `outline-v1.0.1.zip` and attaches it to a Release, ready for the Chrome Web Store.

## License

MIT © 2026 Tommaso Chiusi, Luca Artesani — [acadesign.eu](https://acadesign.eu)

---

### 🇮🇹 In breve

**outline.** è un'estensione Chrome open source: incolli un link e vedi il sito dentro il contorno dell'iPhone, iPad, Galaxy, Pixel o pieghevole più recente, oppure in modalità responsive ridimensionabile. Funziona anche con i file HTML locali. Installazione: `chrome://extensions` → Modalità sviluppatore → *Carica estensione non pacchettizzata*.
