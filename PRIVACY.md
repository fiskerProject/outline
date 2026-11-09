# Privacy policy — outline.

_Last updated: November 2026_

**outline. does not collect, store, sell or transmit any personal data.**

- No analytics, no tracking, no accounts, no remote servers.
- The only data saved is your last previewed link and chosen device. It is kept locally in your browser (`chrome.storage.local`) and never leaves your computer.
- Websites you preview are loaded directly from those websites, exactly as if you opened them yourself.
- To show those sites as a phone or tablet would, the extension changes the `User-Agent` and client-hint request headers and removes `X-Frame-Options` / `Content-Security-Policy` response headers. This happens **only for requests made inside the outline. viewer tab**, and the rules are deleted when that tab is closed.

The source code is public: anyone can verify the above.

Questions: open an issue on the GitHub repository.
