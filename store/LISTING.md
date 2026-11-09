# Chrome Web Store — listing kit

Text and answers to paste into the Developer Dashboard (https://chrome.google.com/webstore/devconsole).

## Package

Upload `outline-store-v1.0.0.zip` (manifest at the root of the zip).

## Store listing

**Name:** outline. — device preview *(comes from the manifest)*

**Summary** *(from the manifest, max 132 characters)*:
See any website as it looks on the latest iPhone, iPad, Galaxy, Pixel and foldables — or resize it freely.

**Category:** Developer Tools
**Language:** English (Italian is included through `_locales`)

**Description (EN):**

```
Paste a link and see the site inside a minimal black-and-white outline of a real device, at its real CSS viewport size.

55 DEVICES
• Every iPhone from 13 / 13 mini / SE to iPhone 18 Pro Max and iPhone Duo
• iPad Pro, iPad Air, iPad, iPad mini
• Galaxy S24 to S26, A56, Z Fold8, Z Flip, Galaxy Tab S11
• Pixel 11, 11 Pro, 11 Pro XL, 11 Pro Fold
• Desktop large, medium and small, with page zoom (50–200%)
• Responsive mode: a plain border you can drag to any size
• Compare up to 5 sites side by side

MORE THAN JUST A NARROW WINDOW
• Device User-Agent in both headers and JavaScript
• Touch detection, overlay scrollbars, mobile client hints
• iPad behaves like iPadOS Safari (presents as a Mac)
• Works with sites that block framing, and with local HTML files
• Rotate (R), fold and unfold (F), fit to window or 100% (Z)

PRIVATE BY DESIGN
No tracking, no accounts, no servers. Network changes apply only inside the viewer tab and disappear when you close it.

Open source (MIT).
```

**Description (IT)** *(add it under "Localized listing → Italiano" if you want an Italian page)*:

```
Incolla un link e guarda il sito dentro il contorno essenziale, bianco e nero, di un dispositivo reale, alla sua vera dimensione CSS.

55 DISPOSITIVI
• Tutti gli iPhone dal 13 / 13 mini / SE fino a iPhone 18 Pro Max e iPhone Duo
• iPad Pro, iPad Air, iPad, iPad mini
• Galaxy dalla S24 alla S26, A56, Z Fold8, Z Flip, Galaxy Tab S11
• Pixel 11, 11 Pro, 11 Pro XL, 11 Pro Fold
• Desktop grande, medio e piccolo, con zoom della pagina (50–200%)
• Modalità responsive: un bordo da trascinare alla misura che vuoi
• Confronta fino a 5 siti affiancati

NON SOLO UNA FINESTRA STRETTA
• User-Agent del dispositivo sia negli header sia in JavaScript
• Touch, scrollbar sovrapposte, client hints mobile
• L'iPad si comporta come Safari su iPadOS (si presenta come Mac)
• Funziona anche con i siti che bloccano gli iframe e con i file HTML locali
• Ruota (R), apri e chiudi i pieghevoli (F), adatta alla finestra o 100% (Z)

PRIVACY
Nessun tracciamento, nessun account, nessun server. Le modifiche di rete valgono solo nella scheda dell'anteprima e spariscono quando la chiudi.

Open source (MIT).
```

## Images

| Field | File |
|---|---|
| Store icon (128×128) | `icons/icon128.png` |
| Screenshots (1280×800, up to 5) | `store/screenshot-1-iphone.png` … `screenshot-5-galaxy.png` |
| Small promo tile (440×280) | `store/promo-small-440x280.png` |
| Marquee promo tile (1400×560, optional) | `store/promo-marquee-1400x560.png` |

## Privacy practices tab

**Single purpose:**
Preview websites inside device-sized frames (phones, tablets, foldables, or a freely resizable responsive frame) so designers and developers can check responsive layouts.

**Permission justifications:**

- **declarativeNetRequest:** In the extension's own viewer tab only, it removes `X-Frame-Options` / `Content-Security-Policy` from framed documents so the site can be shown in the preview frame. It also sets the selected device's `User-Agent` and client-hint headers. The rules are session rules scoped to the viewer tab ID and are deleted when the tab closes or navigates away.
- **activeTab:** When the user clicks the toolbar icon, it reads the URL of the current tab to prefill the viewer with the page they were looking at.
- **storage:** Saves the last previewed link and chosen device locally so the viewer reopens the same way.
- **Host permissions (`<all_urls>`):** The user can preview any website, including localhost and local files. Header modification (declarativeNetRequest modifyHeaders) requires host access to the previewed site. The content script `emulate.js` must be able to run in the preview frame of any site to emulate the device (User-Agent, touch, scrollbars). It exits immediately in every frame that is not the extension's preview frame and never reads or sends page content.

**Remote code:** No, I am not using remote code. *(All JavaScript is in the package.)*

**Data usage:** Tick nothing. The extension does not collect any of the listed data types. Then tick the three certifications:

- I do not sell or transfer user data to third parties…
- I do not use or transfer user data for purposes unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:**
`https://github.com/<your-username>/outline/blob/main/PRIVACY.md`

## Distribution

Visibility: **Public**. Regions: all.

## Note for the reviewer (optional field)

```
To test: click the toolbar icon, paste any URL (e.g. https://example.com), pick a device from the dropdown. Header rules are session-scoped to the viewer tab only (see viewer.js → applyRules). emulate.js only acts inside the viewer's preview iframe (checks window.name + location.ancestorOrigins).
```
