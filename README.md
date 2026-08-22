# Study Lab

Local home hub: Angular modules + Node/Express API + SQLite.

## Modules

| Route | Module |
|-------|--------|
| `/` | Home hub (module picker) |
| `/study` | Focus session start/stop |
| `/study/analytics` | Study analytics |
| `/tv` | TV power + Hotstar / Lapandav |

## Prerequisites

- Node.js 20+
- Phone/PC on the same home Wi‑Fi as the machine running these apps

## 1. Start the API

```bash
cd server
npm install
npm start
```

Listens on `0.0.0.0:3000` so other devices on your network can reach it.

## 2. Start the dashboard (home-network accessible)

```bash
cd client
npm start
```

This runs Angular with `--host 0.0.0.0` and proxies `/api` to the Node server.

- On this PC: http://localhost:4200
- On your phone (same Wi‑Fi): http://\<your-pc-lan-ip\>:4200

Find your LAN IP on Windows:

```powershell
ipconfig
```

Look for IPv4 under your Wi‑Fi adapter (e.g. `192.168.1.42`).

If the phone cannot connect, allow Node/Angular through Windows Firewall for private networks (ports `4200` and `3000`).

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `client` | `npm start` | Dev server on all interfaces + API proxy |
| `server` | `npm start` | SQLite-backed REST API |
| `server` | `npm run dev` | API with `--watch` |
| `server` | `node scripts/tv-trigger.js` | Prompt for TV flow 1 or 2 |
| `server` | `node scripts/tv-trigger.js 1` | Toggle TV power via ADB |
| `server` | `node scripts/tv-trigger.js 2` | Wake TV, open Hotstar (+ Lapandav deep link) |

## ESP32

- Study button: `POST /esp32/event` with `{ "device":"ESP32", "event":"button_pressed" }` toggles a focus session.
- TV button (later): `POST /esp32/tv` with `{ "event":"tv_command", "action": 1|2 }`.

## TV control (ADB)

Requires Android platform-tools (`adb`). This project resolves `adb.exe` from:

1. `TV_ADB_PATH` / `ADB_PATH`
2. `%\USERPROFILE%\Downloads\platform-tools-latest-windows\platform-tools\adb.exe`
3. Android SDK `platform-tools`
4. Otherwise `adb` on PATH (only if the Node process was started after PATH was updated)

Your current tools live under Downloads — restarting the API after this change should pick that up automatically.

One-time connect check:

```bash
adb connect 192.168.0.2:5555
adb devices
```

Flows:

1. Toggle TV power (`KEYCODE_POWER`)
2. Wake TV → open Jio Hotstar (`in.startv.hotstar`) → open Lapandav deep link if configured

Set the Lapandav link in [`server/src/tv/config.js`](server/src/tv/config.js) (`lapandavDeepLink`) or env `TV_LAPANDAV_DEEPLINK` (paste a Hotstar share/show URL). Until that is set, flow 2 still opens Hotstar and returns a warning.

With the API running:

```bash
cd server
node scripts/tv-trigger.js 1
node scripts/tv-trigger.js 2
```

Optional env overrides: `TV_ADB_HOST`, `TV_ADB_PORT`, `TV_HOTSTAR_PACKAGE`, `TV_LAPANDAV_DEEPLINK`, `TV_API_URL`.

## DSA sheet + focus mode

Study sessions can open LeetCode + your Google Prep Progress sheet, and log solved problems into the **Problems** and **Log** tabs (Topics formulas are never written).

### One-time Google setup

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project (or pick one).
2. Enable **Google Sheets API**.
3. Create a **Service account** → create a JSON key → save it as:

`server/secrets/google-service-account.json`

4. Open the JSON and copy `client_email`.
5. Share your spreadsheet with that email as **Editor**:

https://docs.google.com/spreadsheets/d/1dKUxdCUVqzHvyv0Yk9x_uA8nPNSbnqpi0UFNaW3f6VY/edit

Optional env: `GOOGLE_SERVICE_ACCOUNT_FILE`, `GOOGLE_SHEETS_ID`.

### Usage

1. Restart the Node server after adding the JSON key.
2. On `/study`, **Start session** → closes selected distractors and opens LeetCode + the sheet.
3. **Mark problem solved** → paste a LeetCode URL (or title), pick XP, optional Approach/Trick/Comments/Speed Demon → appends rows to Problems + Log.

API: `POST /api/dsa/complete` with `{ problemUrl?, problemTitle?, approach?, trick?, xp, comments?, speedDemon? }`.
