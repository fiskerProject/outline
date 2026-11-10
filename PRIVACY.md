# Privacy policy — outline.

_Last updated: November 2026 (v1.4.1)_

**outline. does not collect, sell or transmit any personal data. The developers never receive anything from it.**

- No analytics, no tracking, no accounts, no remote servers, no remote code. The extension makes no network requests of its own.

## What is stored, and where

| Data | Where | Who can see it |
|---|---|---|
| The links currently open in the viewer, the chosen device, orientation, fold state, zoom and responsive size | `chrome.storage.local`, on your computer only | Only you. Removed when you uninstall the extension. |
| Your **saved links** (the ones you bookmark with ☆ / `S`) | `chrome.storage.sync` | If Chrome Sync is turned on, Chrome syncs them to your Google account, like your bookmarks, so they appear on your other computers. They are never sent to the developers. With Sync off they stay on this computer. Delete them from the **Saved** panel at any time. |
| Which viewer tab owns which network rule (a tab number and an internal page id) | `chrome.storage.session`, in memory | Only the extension. Erased when Chrome closes. |

When you click the toolbar icon, the address of the page you are on is passed to the viewer to prefill it (only `http`, `https` and `file` addresses). Like any link you open in the viewer, it is stored locally as described above.

## What happens on the network

- Websites you preview are loaded directly from those websites, as if you opened them yourself, with your own cookies for those sites.
- The preview frame sends **no referrer**. It does not tell the site your extension page's address.
- To show sites as a phone or tablet would, the extension changes some headers, **only for requests made inside the outline. viewer tab**:
  - it sets the device's `User-Agent` and `Sec-CH-UA-*` client-hint request headers (or removes the client hints for Apple devices, like Safari);
  - it removes `X-Frame-Options` from framed pages, and removes their `Content-Security-Policy` **only when that policy contains `frame-ancestors`** (the rule that blocks framing). Any other security policy a site sends stays in force.
- These rules are session rules tied to the viewer tab's ID. They are deleted when that tab is closed or navigates elsewhere (a reloaded viewer replaces them with its own), and leftovers are cleaned up whenever the extension starts. Your normal browsing is never affected.
- A small script (`emulate.js`) is declared for all pages, because the previewed site can be any site. In every frame that is not the viewer's preview frame it stops right away: it does not read, change or send page content.

The source code is public: anyone can verify the above.

Questions: open an issue on the GitHub repository.
