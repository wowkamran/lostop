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

## Screenshots

**Blocking a secret in ChatGPT:**

![Lostop blocking a secret, with the API key highlighted in the input field and a toast notification explaining why](docs/screenshots/blocked-message.png)

**Dashboard:**

![Lostop dashboard showing blocked incidents, a timeline chart, and a breakdown by secret type](docs/screenshots/dashboard.png)

---

## For users (no coding required)

If you just want to use Lostop — not build it — this is the whole process:

1. **Go to the [landing page](https://wowkamran.github.io/lostop/)** and click **Download**. You'll get two things: the browser extension and the `lostop-server.exe` file.
2. **Run `lostop-server.exe` once.** No console window opens — it just starts working quietly in the background. This is the piece that actually checks your text; it needs to be running whenever you want protection active. *(Setting it to launch automatically at startup, via Windows Task Scheduler, means you only ever have to do this once — see [Packaging](#packaging-the-server-optional).)*
3. **Load the extension into Chrome:**
   - Open `chrome://extensions`
   - Turn on **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `extension` folder you downloaded
4. **Done.** Open ChatGPT, Claude, or DeepL and use it as normal — Lostop is already watching the input field. Nothing else to configure.

> **Why isn't this a one-click "Add to Chrome" install?** Chrome only allows one-click installs for extensions published on the Chrome Web Store. Lostop's listing is currently pending review — once approved, step 3 above will no longer be necessary.

---

## Quick start (for developers)

### 1. Get the code

```bash
git clone https://github.com/wowkamran/lostop.git
cd lostop
```

### 2. Run the local server

```bash
cd backend
pip install fastapi uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000
```

Keep this running in the background — it's what the extension talks to for every check.

> **Prefer not to use a terminal?** A pre-built Windows server (`lostop-server.exe`, no console window, no Python required) can be produced from this same code with PyInstaller — see [Packaging](#packaging-the-server-optional) below.

### 3. Load the extension into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo

### 4. Try it

Open [chatgpt.com](https://chatgpt.com), type something like `AKIAIOSFODNN7EXAMPLE`, and hit Enter. Lostop should block the message, highlight the key, and show a notification explaining why.

### 5. (Optional) View the dashboard

```bash
cd dashboard
pip install streamlit requests pandas plotly
streamlit run app_dashboard.py
```

Opens at `http://localhost:8501` — shows blocked incidents filterable by day/week/month, with a breakdown by secret type.

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

## Packaging the server (optional)

To distribute a Python-free server for Windows users:

```bash
cd backend
pip install pyinstaller
pyinstaller --onefile --noconsole --name lostop-server main.py
```

Produces `dist/lostop-server.exe` — a double-click launcher with no visible console window. Pair it with a Windows Task Scheduler entry (`At log on` trigger) for a fully automatic startup, so the user never has to run anything manually after the first install.

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
- [ ] Support for claude.ai and deepl.com (currently ChatGPT only)
- [ ] Chrome Web Store listing (submitted, pending review)
- [ ] Firefox support (requires manifest adaptation)
- [ ] Contextual detection for legal/medical/financial text without a structural signature
- [ ] Centralized/team reporting (trade-off: conflicts with the local-first privacy model — needs design discussion)

## Contributing

This is an active student/MVP project. Issues and pull requests are welcome — see [GitHub Issues](https://github.com/wowkamran/lostop/issues).

## Disclaimer

Lostop is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI, Anthropic, or DeepL.
