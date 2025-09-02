# 🚀 RemoteVulscan – Beginner Docker Deployment Guide

This guide walks you through a clean, **copy‑paste friendly** deployment of RemoteVulscan using Docker and Docker Compose. No prior Docker expertise required.

---
## 0. What You Will Get
- Web UI at: http://localhost:3000
- Health endpoint: http://localhost:3000/api/health
- Persistent SQLite database stored on your host
- (Optional) Security tools container with many scanners

---
## 1. Prerequisites
| Item | Minimum | How to Check |
|------|---------|--------------|
| Linux / macOS / WSL2 | Recent version | `uname -s` |
| Docker Engine | 24+ recommended | `docker --version` |
| Docker Compose plugin | v2+ | `docker compose version` |
| Git | Any recent | `git --version` |
| OpenSSL (optional for TLS) | Any | `openssl version` |

If `docker compose version` fails, install Docker Desktop (mac/Win) or follow Linux install docs: https://docs.docker.com/engine/install/

---
## 2. Clone the Repository
```bash
git clone <repository-url> remotevulscan
cd remotevulscan
```

> Replace `<repository-url>` with the actual Git clone URL.

---
## 3. Create Your Environment File
Copy the example and edit if needed:
```bash
cp .env.example .env
```
Minimal variables you usually want to review:
```env
DATABASE_URL="file:./db/custom.db"          # Default is fine
NEXT_PUBLIC_ENABLE_SOCKET="false"          # Set to "true" to see realtime updates
TURNSTILE_SITE_KEY=""                      # Add real keys for production
TURNSTILE_SECRET_KEY=""                    # Optional locally
```
You can leave Turnstile blank locally (scans might require test keys). Test keys (LOCAL ONLY):
```env
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

---
## 4. Create Local Data Folders (Persist Containers Data)
```bash
mkdir -p data/db logs reports tools
```
(You can skip creating `tools` if you just want the app; it will still mount.)

---
## 5. First Build & Start (Default Multi‑Service Mode)
This launches: `app` (UI/API), `tools` (security tools), `db` (sqlite helper).
```bash
docker compose up -d --build
```
Check status:
```bash
docker compose ps
```

---
## 6. Verify the Deployment
1. Open the site: http://localhost:3000
2. API health check:
   ```bash
   curl -fsS http://localhost:3000/api/health
   ```
3. View app logs (tail):
   ```bash
   docker compose logs -f app
   ```
4. Confirm database file exists:
   ```bash
   ls -lh data/db/
   ```
5. Verify security tools installed:
   ```bash
   docker compose exec tools /tools/verify-tools.sh
   ```

---
## 7. Enable Realtime WebSocket Updates (Optional)
```bash
echo NEXT_PUBLIC_ENABLE_SOCKET=true >> .env
docker compose up -d app
```
Refresh the browser; scan events (when implemented) will stream live.

---
## 8. Using the Security Tools Container
Enter interactive shell:
```bash
docker compose exec tools bash
```
Examples:
```bash
# Inside tools container
nmap -Pn -F example.com
nuclei -update-templates
nuclei -u https://target --silent
```
Exit with `exit`.

---
## 9. Updating the Application
Pull latest code and rebuild only changed services.
```bash
git pull
# Rebuild app (fast)
docker compose build app && docker compose up -d app
# Rebuild tools (slower, only when tool sets change)
docker compose build tools && docker compose up -d tools
```

Full clean (keeps data volumes):
```bash
docker compose down
docker compose up -d --build
```

---
## 10. Switching to the Single (Unified) Image
The unified mode bundles app + tools into one container named `arch`.
```bash
docker compose down
docker compose --profile arch up -d --build arch
```
Return to multi-service:
```bash
docker compose down
docker compose up -d --build
```
Your `data/` content is preserved because it lives on the host.

---
## 11. Basic Maintenance
| Task | Command |
|------|---------|
| Show running containers | `docker compose ps` |
| Follow app logs | `docker compose logs -f app` |
| Restart app | `docker compose restart app` |
| Enter app shell | `docker compose exec app sh` |
| Stop everything | `docker compose down` |
| Stop & remove volumes (DATA LOSS) | `docker compose down -v` |

---
## 12. Back Up the SQLite Database
Quick manual backup:
```bash
STAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$STAMP.db"
ls -1 data/db/backup-*.db | tail -5
```
Restore one (example):
```bash
FILE=data/db/backup-20250101_120000.db
cp "$FILE" data/db/custom.db
docker compose restart app
```

---
## 13. Common Issues & Fixes
| Problem | Symptom | Fix |
|---------|---------|-----|
| Port busy | `bind: address already in use` | Stop other service on 3000 (`lsof -i :3000`) |
| App not healthy | Health endpoint fails | `docker compose logs app` then rebuild app |
| Tools missing | Command not found in tools container | Rebuild `tools` service |
| Database locked | SQLITE_BUSY in logs | Retry later / ensure only one writer |
| Env changes ignored | Old behavior after editing `.env` | `docker compose up -d app` to reload |

---
## 14. Optional: Nginx Reverse Proxy (Production Flavor)
Enable profile:
```bash
docker compose --profile production up -d --build
```
Add a self‑signed TLS cert (development only):
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=RemoteVulscan/CN=localhost"
docker compose restart nginx
```
Then browse https://localhost (accept the warning).

---
## 15. Clean Up Disk Space
(Use with care.)
```bash
# Remove dangling images, stopped containers, build cache
docker system prune -f
# Add volumes (WARNING: removes *unused* volumes)
docker volume prune -f
```

---
## 16. Safe Uninstall
```bash
docker compose down
# Remove data only if you no longer need it:
rm -rf data logs reports tools
```

---
## 17. Quick Reference (Copy Sheet)
```bash
# Start (multi-service)
docker compose up -d --build
# Status
docker compose ps
# Logs
docker compose logs -f app
# Health
curl -fsS http://localhost:3000/api/health
# Tools shell
docker compose exec tools bash
# Backup DB
STAMP=$(date +%Y%m%d_%H%M%S); docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$STAMP.db"
# Update app
git pull && docker compose build app && docker compose up -d app
```

---
## 18. Next Steps
- Add real Turnstile keys for production use
- Consider migrating SQLite → Postgres for multi-user scale
- Enable logging / metrics if deploying to a server

---
## 19. Need Help?
1. Run: `docker compose ps`
2. Check logs: `docker compose logs --tail=200 app`
3. Verify env: `cat .env`
4. Open an issue with steps + logs

---
Happy scanning! 🛡️
