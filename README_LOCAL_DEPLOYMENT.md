# SSTM Chariot — Local Production Deployment

**Server IP:** `192.168.1.11`  
**No internet required. No cloud. No HTTPS.**

---

## Architecture

```
Browser (port 80)
    ↓ Nginx
Angular dist/  ←  built once, static files
    ↓ /api proxy
Node API (port 3000)  ←  node api.js
    ↓
PostgreSQL (port 5432)  ←  auto-starts with Windows

Invoice Server (port 5000)  ←  py invoice_server.py  (separate)
```

---

## One-time Setup

### 1. Install prerequisites
- [Node.js 20+](https://nodejs.org)
- [Python 3.11+](https://python.org) with `pip install pywin32 xlrd xlwt xlutils`
- [PostgreSQL 18](https://postgresql.org) — set password `00256` for user `postgres`
- [Nginx for Windows](https://nginx.org/en/download.html) — extract to `C:\nginx`

### 2. Create the database
```cmd
psql -U postgres -f "backend\sstm_setup.sql"
psql -U postgres -d sstm_chariot_db -f "backend\sstm_tables.sql"
```

### 3. Configure Nginx
Copy `nginx.conf` to `C:\nginx\conf\nginx.conf`  
*(or edit the path inside nginx.conf to match your dist folder)*

### 4. Open Windows Firewall ports (run as Administrator)
```powershell
powershell -ExecutionPolicy Bypass -File setup_firewall.ps1
```

### 5. Add to Windows Startup (auto-start on boot)
1. Press `Win+R` → type `shell:startup` → Enter
2. Create a shortcut to `start_all.bat` in that folder

---

## Starting the App Manually

Double-click **`start_all.bat`** — it starts:
1. PostgreSQL service
2. Node API on port 3000
3. Python invoice server on port 5000

Then start Nginx:
```cmd
C:\nginx\nginx.exe -c "C:\Users\user\OneDrive\Desktop\Nouveau dossier\chariot-elevateur\nginx.conf"
```

---

## Access URLs

| Who | URL |
|-----|-----|
| Same PC | http://localhost |
| Phone / other PC on Wi-Fi | http://192.168.1.11 |
| API health check | http://192.168.1.11:3000/api/health |
| Invoice server | http://192.168.1.11:5000 |

---

## Rebuild Angular (after code changes)

```cmd
cd "C:\Users\user\OneDrive\Desktop\Nouveau dossier\chariot-elevateur"
node_modules\.bin\ng build --configuration production
```
Output goes to `dist/chariot-elevateur/browser/` — Nginx serves it automatically.

---

## Change Server IP

If your server IP changes, update **two files**:

1. `src/environments/environment.prod.ts` — change `192.168.1.11` to new IP
2. `backend/.env` — update `ALLOWED_ORIGINS`
3. Rebuild Angular: `ng build --configuration production`

---

## Stopping Services

```cmd
:: Stop Nginx
C:\nginx\nginx.exe -s stop

:: Stop Node API (find PID)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

:: Stop Invoice server
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## Logs

- API logs: `logs\api.log`
- Invoice server logs: `logs\invoice.log`

---

## File Structure

```
chariot-elevateur/
├── dist/chariot-elevateur/browser/   ← Angular production build (served by Nginx)
├── src/environments/
│   ├── environment.ts                ← dev (localhost)
│   └── environment.prod.ts           ← production (192.168.1.11)
├── backend/
│   ├── api.js                        ← Node/Express API (port 3000)
│   ├── invoice_server.py             ← Python invoice server (port 5000)
│   ├── .env                          ← DB credentials & config
│   ├── start_api.bat                 ← Start API only
│   └── start_invoice_server.bat      ← Start invoice server only
├── nginx.conf                        ← Nginx config (port 80)
├── start_all.bat                     ← Start everything
├── setup_firewall.ps1                ← Open firewall ports (run once as Admin)
└── logs/                             ← Runtime logs
```
