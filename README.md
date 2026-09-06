# Lostop

**Local-first DLP for GenAI chat.** A browser extension that checks what you type into ChatGPT, Claude, and DeepL — before it's sent — and blocks API keys, credentials, and other secrets from leaking out.

<p>
  <img alt="status" src="https://img.shields.io/badge/status-MVP-orange">
  <img alt="platform" src="https://img.shields.io/badge/platform-Chrome%20%7C%20Chromium-blue">
  <img alt="license" src="https://img.shields.io/badge/backend-FastAPI-009688">
</p>

---

## The problem

Employees paste code, credentials, and confidential text into AI chat tools every day. Once that text is sent, it's gone — no service will delete it from its logs on request. Most enterprise DLP tools monitor email and file storage, but rarely inspect what's typed directly into a browser-based chat interface.

## How it works

1. **Type as usual.** Lostop watches the input field on the page — nothing else.
2. **Local check.** The moment you hit Enter or click Send, the text is checked against known secret patterns on a server running on your own machine. Nothing leaves your device for the check itself.
3. **Pass or block.** Clean text goes through as normal. If a secret is found, the request is stopped, the exact match is highlighted in the input field, and a notification explains why — before anything reaches the network.

## What it catches

Cloud provider access keys (AWS, GCP), source-control access tokens (GitHub, GitLab), AI provider API keys (OpenAI, Anthropic, Hugging Face), private encryption keys (RSA/EC PEM), database connection strings (PostgreSQL, MySQL, MongoDB), payment processor secret keys (Stripe), team-chat webhooks and bot tokens (Slack, Discord), JWT authentication tokens, and card numbers (Luhn-validated to reduce false positives) — **18 signature types** in total, defined in [`backend/main.py`](backend/main.py) and easy to extend.

## Landing page

Full product page with a live demo, the complete signature catalog, and step-by-step install instructions — you can download both the extension and the server directly from there:

**[wowkamran.github.io/lostop →](https://wowkamran.github.io/lostop/)**

> **Chrome Web Store listing:** submitted and currently **pending review**. Once approved, installing the extension will be a single "Add to Chrome" click — no manual download or `chrome://extensions` setup needed. Until then, the landing page and the steps below are the way to install it.

---

## Quick start for Windows (recommended)

The fastest way to get Lostop running — no Python, no terminal.

1. **Download the server:** grab `lostop-server.exe` from the [latest release](https://github.com/wowkamran/lostop/releases/latest) (or the direct link below):
   ```
   https://github.com/wowkamran/lostop/releases/download/v1.0.0/lostop-server.exe
   ```
2. **Run it once.** Double-click the file. No console window opens — it starts working quietly in the background. It needs to be running whenever you want protection active.
   > To skip this step in the future, register it with **Windows Task Scheduler** using an `At log on` trigger — then it starts automatically every time you sign in.
3. **Download and load the extension** — see [Loading the extension into Chrome](#loading-the-extension-into-chrome) below.
4. **Done.** Open ChatGPT, Claude, or DeepL and use it as normal.

---

## Alternative: run from source (for developers)

If you'd rather run the Python server directly — for development, debugging, or on macOS/Linux where the prebuilt `.exe` doesn't apply:

```bash
git clone https://github.com/wowkamran/lostop.git
cd lostop/backend
pip install fastapi uvicorn
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Keep this terminal window open — it's what the extension talks to for every check. `--reload` can be added during development to pick up code changes automatically:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Loading the extension into Chrome

1. Download the extension — either as part of the [full source ZIP](https://github.com/wowkamran/lostop/archive/refs/heads/main.zip), or via `git clone` above.
2. Open `chrome://extensions` (works the same way in any Chromium-based browser — Edge, Brave, Vivaldi).
3. Enable **Developer mode** (toggle, top right).
4. Click **Load unpacked**.
5. Select the `extension/` folder from what you downloaded.
6. The Lostop icon should appear in your extensions list — that's it.

> **Why isn't this a one-click "Add to Chrome" install?** Chrome only allows one-click installs for extensions listed on the Chrome Web Store. Lostop's listing is currently pending review — once approved, steps 2–5 above will no longer be necessary.

### Try it

Open [chatgpt.com](https://chatgpt.com), type something like `AKIAIOSFODNN7EXAMPLE`, and hit Enter. Lostop should block the message, highlight the key, and show a notification explaining why.

---

## Dashboard (optional)

See what's been blocked — filterable by day, week, month, or all time.

**Windows — one-click launcher:**

1. Download `start-dashboard.bat` (included in the `dashboard/` folder of the repo).
2. Double-click it. It installs dependencies on first run if needed and opens the dashboard in your browser at `http://localhost:8501`.

**From source (any OS):**

```bash
cd dashboard
pip install streamlit requests pandas plotly
python -m streamlit run app_dashboard.py
```

The dashboard reads from the same local `incidents.db` the server writes to — nothing is sent anywhere else. Make sure the server (`lostop-server.exe`, or `uvicorn`, from the steps above) is running at the same time, or the dashboard will show "Could not reach the Lostop server."

---

## Architecture

```
Browser (chatgpt.com / claude.ai / deepl.com)
        │  content script watches the input field
        ▼
Service worker (background script)
        │  proxies the request — browsers block a page from
        │  calling localhost directly for security reasons
        ▼
Local server — http://localhost:8000  (FastAPI)
        │  regex signatures + Luhn validation
        ▼
   is_blocked? ──▶ yes ──▶ block + highlight + toast + log to SQLite
        │
        └──▶ no ──▶ message is sent normally
```

The extension is intentionally a thin client — all detection logic lives on the local server, so the two can be developed and tested independently.

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Extension | Chrome Manifest V3, vanilla JS | No build step needed for a small codebase |
| Backend | Python 3.11+, FastAPI, Uvicorn | Async, auto-generated docs at `/docs`, minimal boilerplate |
| Detection | `re` (regex) + Luhn checksum | Deterministic, explainable, no ML dependency |
| Storage | SQLite | Zero-config, single file, perfect for a local-first tool |
| Dashboard | Streamlit + Plotly | Full UI in pure Python, no separate frontend needed |
| Packaging | PyInstaller | Turns the server into a single `.exe`, no Python required on the user's machine |

## Project structure

```
lostop/
├── extension/
│   ├── manifest.json          # MV3 manifest, permissions, content script registration
│   ├── content.js              # DOM interception, blocking logic, toast UI, highlighting
│   └── service_worker.js       # Background proxy to the local server
├── backend/
│   ├── main.py                 # FastAPI app: /scan, /incidents, all detection signatures
│   └── incidents.db            # SQLite database (created automatically on first run)
├── dashboard/
│   ├── app_dashboard.py        # Streamlit dashboard: metrics, timeline, incident table
│   └── start-dashboard.bat     # One-click launcher for Windows
└── docs/
    ├── index.html               # Product landing page
    └── privacy.html             # Privacy policy (required for Chrome Web Store)
```

## Building the server executable yourself

If you want to build `lostop-server.exe` from source instead of using the one in [Releases](https://github.com/wowkamran/lostop/releases):

```bash
cd backend
pip install pyinstaller
pyinstaller --onefile --noconsole --name lostop-server main.py
```

Produces `dist/lostop-server.exe` — a double-click launcher with no visible console window. Must be built on Windows (PyInstaller doesn't cross-compile).

## Privacy

Lostop's local server runs entirely on the user's own machine. No text, secret, or incident is ever sent to a server operated by the project maintainers — there isn't one. See [`docs/privacy.html`](docs/privacy.html) for the full policy.

---

## Roadmap

- [x] Real blocking (both Enter and the Send button), race-condition-free
- [x] 18 secret signatures + Luhn-validated card detection
- [x] Multi-secret detection (not just the first match per message)
- [x] SQLite incident logging
- [x] Streamlit dashboard with date filtering
- [x] Styled toast notifications + in-field secret highlighting
- [x] Windows `.exe` packaging + Task Scheduler autostart
- [x] Prebuilt binary published via GitHub Releases
- [ ] Support for claude.ai and deepl.com (currently ChatGPT only)
- [ ] Chrome Web Store listing (submitted, pending review)
- [ ] Firefox support (requires manifest adaptation)
- [ ] Contextual detection for legal/medical/financial text without a structural signature
- [ ] Centralized/team reporting (trade-off: conflicts with the local-first privacy model — needs design discussion)

## Contributing

This is an active student/MVP project. Issues and pull requests are welcome — see [GitHub Issues](https://github.com/wowkamran/lostop/issues).

## Disclaimer

Lostop is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI, Anthropic, or DeepL.
