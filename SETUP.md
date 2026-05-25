# QuantumTrade AI — Setup Guide

Complete instructions to run the project locally on Windows, macOS, or Linux.

---

## Prerequisites

Install these before starting:

| Tool | Min version | Download |
|---|---|---|
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| Git | any | https://git-scm.com |

Optional (recommended):
- **Docker Desktop** — easiest way to run PostgreSQL + Redis (https://docker.com/products/docker-desktop)

Check your versions:
```bash
python --version    # or python3 --version on macOS/Linux
node --version
npm --version
```

---

## Step 1 — Get the project

Unzip the downloaded file:
```
quantumtrade-FINAL.zip  →  extract to a folder, e.g. C:\Projects\quantumtrade
```

You should have this structure:
```
quantumtrade/
├── backend/
├── frontend/
├── data_pipeline/
├── backtesting/
├── tests/
├── alembic/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## Step 2 — Environment file

Copy the example env file and fill in your values:

**Windows (PowerShell):**
```powershell
cd C:\Projects\quantumtrade
copy .env.example .env
notepad .env
```

**macOS / Linux:**
```bash
cd ~/projects/quantumtrade
cp .env.example .env
nano .env   # or code .env, vim .env, etc.
```

Edit these two required values in `.env`:

```env
# Generate a random secret key:
#   Windows PowerShell: [System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
#   macOS/Linux:        openssl rand -hex 32
JWT_SECRET=paste-your-generated-secret-here

# Get from https://console.anthropic.com → API Keys
# Without this, the AI Copilot shows a warning but everything else still works
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

For the database, choose **one** option:

**Option A — SQLite (simplest, no Docker needed):**
```env
DATABASE_URL=sqlite+aiosqlite:///./quantumtrade.db
```

**Option B — PostgreSQL via Docker (recommended for full experience):**
```env
DATABASE_URL=postgresql+asyncpg://quantum:quantum@localhost:5432/quantumtrade
```

Leave `REDIS_URL=redis://localhost:6379/0` as-is (the app falls back to in-memory cache if Redis isn't running).

---

## Step 3 — Start PostgreSQL + Redis (Option B only)

Skip this if you chose SQLite above.

Make sure Docker Desktop is running, then:

```bash
cd quantumtrade

# Start only the database services (not the full app stack)
docker compose up postgres redis -d
```

Verify they're running:
```bash
docker compose ps
```
You should see `postgres` and `redis` with status `running`.

---

## Step 4 — Backend setup

Open a terminal and run these commands one by one:

```bash
# Navigate to the project root
cd quantumtrade

# Create a virtual environment
python -m venv venv

# Activate it:
# Windows PowerShell:
venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# macOS / Linux:
source venv/bin/activate

# You should now see (venv) at the start of your prompt

# Install all Python dependencies
pip install -r backend/requirements.txt
```

> **Windows users:** If `pip install` fails on `bcrypt` or `cryptography`,
> install the Visual C++ Build Tools first:
> https://visualstudio.microsoft.com/visual-cpp-build-tools/

---

## Step 5 — Start the backend

In the same terminal (with venv activated):

```bash
# From the quantumtrade/ root folder
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Test it:** Open http://localhost:8000/health in your browser.
You should see: `{"status":"ok","service":"quantumtrade-ai","version":"0.3.0"}`

The backend will automatically create all database tables on first startup.

> **Keep this terminal open.** The backend must stay running.

---

## Step 6 — Frontend setup

Open a **new terminal** (leave the backend terminal running):

```bash
# Navigate to the frontend folder
cd quantumtrade/frontend

# Install Node.js dependencies (~2-3 minutes on first run)
npm install

# Start the dev server
npm run dev
```

You should see:
```
▲ Next.js 15.1.6
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Starting...
✓ Ready in Xs
```

**Open http://localhost:3000 in your browser.**

---

## Step 7 — Create your account

1. You'll land on the **login page** — click **"Create one for free →"**
2. Fill in your name, email, and password (min 8 characters)
3. Complete the **4-step onboarding**:
   - Investment experience (beginner / intermediate / expert)
   - Risk tolerance (conservative / moderate / aggressive)
   - Preferred markets (NSE, NASDAQ, etc.)
   - Display currency (INR, USD, etc.)
4. You'll land on the **main dashboard** — all live!

> **Demo shortcut:** On the login page, click **"⚡ Use Demo Account"** to auto-fill demo credentials, then register that account.

---

## What's running where

| Service | URL | What it does |
|---|---|---|
| Frontend | http://localhost:3000 | Next.js app — main UI |
| Backend API | http://localhost:8000 | FastAPI — all data endpoints |
| API Docs | http://localhost:8000/docs | Auto-generated Swagger UI |
| Health check | http://localhost:8000/health | Verify backend is up |

---

## Running the test suite (optional)

```bash
# From quantumtrade/ root, with venv activated
pip install pytest pytest-asyncio httpx aiosqlite
pytest tests/ -v
```

---

## Common errors & fixes

### `npm error code ENOENT ... package.json`
You're in the wrong folder. Run `cd quantumtrade/frontend` first, then `npm install`.

### `ModuleNotFoundError: No module named 'backend'`
You're running uvicorn from the wrong folder. Always run it from `quantumtrade/` (the root), not from inside `backend/`.

### `Address already in use` (port 8000 or 3000)
Something else is using that port.
```bash
# Kill port 8000 (Windows):
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Kill port 8000 (macOS/Linux):
lsof -ti:8000 | xargs kill -9
```

### `error: CORS policy` in browser console
Your `.env` file's `ALLOWED_ORIGINS` must include `http://localhost:3000`.
Check: `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
Restart the backend after editing `.env`.

### AI Copilot shows `⚠️ Anthropic API key not configured`
Add your key to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
Restart the backend. Everything else (charts, portfolio, alerts, backtesting) works without it.

### `connection refused` on market data
The frontend fetches market data directly from Yahoo Finance via the Next.js API route — no backend needed for this. If charts show no data, Yahoo Finance may be rate-limiting. Wait 30 seconds and refresh.

### `venv\Scripts\Activate.ps1 cannot be loaded` (Windows)
PowerShell execution policy is blocking scripts. Run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try activating again.

### SQLite `no such table` error
The tables are created automatically on startup. If you see this, the backend may have crashed before startup completed. Check the terminal for earlier error messages.

---

## Stopping the servers

- **Frontend:** `Ctrl+C` in the frontend terminal
- **Backend:** `Ctrl+C` in the backend terminal
- **Docker services:** `docker compose down` (stops PostgreSQL + Redis)

---

## Quick reference card

```
Terminal 1 — Backend
─────────────────────────────────────────
cd quantumtrade
source venv/bin/activate        # macOS/Linux
venv\Scripts\Activate.ps1       # Windows PowerShell
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

Terminal 2 — Frontend
─────────────────────────────────────────
cd quantumtrade/frontend
npm run dev

Browser
─────────────────────────────────────────
http://localhost:3000    ← Main app
http://localhost:8000/docs   ← API explorer
```
