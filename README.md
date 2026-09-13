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

Full product page with a live demo, the complete signature catalog, and an FAQ:

**[wowkamran.github.io/lostop →](https://wowkamran.github.io/lostop/)**

---

## Install

**1. Add the extension to Chrome** — one click, live on the Chrome Web Store:

**[Add to Chrome →](https://chromewebstore.google.com/detail/kefdbjnfahfoakbcfjiahmhobceoiikf)**

> The listing can take a few days to appear in the Web Store's on-site search after approval — the direct link above always works in the meantime.

**2. Get the local server running** — pick one:

### Option A — Windows binary (recommended, no Python needed)

1. Download `lostop-server.exe` from the [latest release](https://github.com/wowkamran/lostop/releases/latest) (or the direct link below):
   ```
   https://github.com/wowkamran/lostop/releases/download/v1.0.0/lostop-server.exe
   ```
2. Run it once. No console window opens — it starts working quietly in the background. It needs to be running whenever you want protection active.
   > To skip this step in the future, register it with **Windows Task Scheduler** using an `At log on` trigger — then it starts automatically every time you sign in.

### Option B — run from source (for developers, or non-Windows)

```bash
git clone https://github.com/wowkamran/lostop.git
cd lostop/backend
pip install fastapi uvicorn
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Keep this terminal window open — it's what the extension talks to for every check. Add `--reload` during development to pick up code changes automatically.

**3. Done.** Open ChatGPT, Claude, or DeepL and use it as normal.

### Try it

Type something like `AKIAIOSFODNN7EXAMPLE`, and hit Enter. Lostop should block the message, highlight the key, and show a notification explaining why.

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

## FAQ

**Why do I need Lostop at all?**
Once you paste something into a GenAI chat and hit send, it's gone — no service will delete it from its logs on request. Lostop catches API keys, credentials, and other secrets before that happens.

**Why does it need a separate server?**
Browsers don't let an extension run detection logic that touches a local database directly — for good security reasons. The local server is a small companion program that does the actual checking, entirely on your own machine, talking to the extension over `localhost` only.

**What exactly does it block?**
18 signature types: cloud and source-control credentials, AI provider API keys, private encryption keys, database connection strings, payment keys, team-tool webhooks/tokens, JWTs, and checksum-validated card numbers — see [What it catches](#what-it-catches) above or the source in [`backend/main.py`](backend/main.py).

**How can I be sure my data doesn't go anywhere?**
The server only listens on `localhost` — unreachable from the internet — and the project doesn't operate any cloud backend to send data to. The code is open source, so you can verify this yourself. See the [Privacy Policy](docs/privacy.html).

## Roadmap

- [x] Real blocking (both Enter and the Send button), race-condition-free
- [x] 18 secret signatures + Luhn-validated card detection
- [x] Multi-secret detection (not just the first match per message)
- [x] SQLite incident logging
- [x] Streamlit dashboard with date filtering
- [x] Styled toast notifications + in-field secret highlighting
- [x] Windows `.exe` packaging + Task Scheduler autostart
- [x] Prebuilt binary published via GitHub Releases
- [x] Chrome Web Store listing (approved and live)
- [ ] Support for claude.ai and deepl.com (currently ChatGPT only)
- [ ] Firefox support (requires manifest adaptation)
- [ ] Contextual detection for legal/medical/financial text without a structural signature
- [ ] Centralized/team reporting (trade-off: conflicts with the local-first privacy model — needs design discussion)

## Contributing

This is an active student/MVP project. Issues and pull requests are welcome — see [GitHub Issues](https://github.com/wowkamran/lostop/issues).

## Disclaimer

Lostop is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI, Anthropic, or DeepL.
