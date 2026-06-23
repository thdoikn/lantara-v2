# Lantara v2 — Deployment Guide

Covers staging and production deployments. Read all sections before starting.
Written from real deployment experience — common pitfalls are marked ⚠️.

---

## Prerequisites

On the target server:
- Docker ≥ 24 + Docker Compose v2
- A domain pointing to the server IP
- Either **CloudPanel** (nginx managed) or **PDNS** (raw nginx)
- GHCR access (GitHub PAT with `read:packages`)

---

## 1. First-time server setup

```bash
# Create deployment directory
mkdir ~/lantara-<env>    # e.g. lantara-staging or lantara-prod
cd ~/lantara-<env>

# Login to GHCR
docker login ghcr.io -u thdoikn
# paste a GitHub PAT with read:packages scope when prompted
```

---

## 2. Get the three required files

### docker-compose.prod.yml
Download from the repo or `scp` from your local machine:
```bash
scp /path/to/lantara_v2/docker-compose.prod.yml user@server:~/lantara-<env>/
```

### nginx/default.conf
```bash
mkdir -p ~/lantara-<env>/nginx
scp /path/to/lantara_v2/nginx/default.conf user@server:~/lantara-<env>/nginx/
```

### .env
```bash
scp /path/to/lantara_v2/.env.example user@server:~/lantara-<env>/.env
```

---

## 3. Configure .env

Edit `.env` and fill in every `CHANGE_ME` value:

```bash
nano ~/lantara-<env>/.env
```

**Critical values:**

```env
# Generate with: python3 -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=<50-char random string>

DEBUG=false
DJANGO_SETTINGS_MODULE=config.settings.base   # use 'base' not 'prod' unless you have SSL on origin

# Must include your actual domain AND server IP
ALLOWED_HOSTS=yourdomain.com,103.x.x.x,localhost

# Must match what the browser uses (https if behind Cloudflare/SSL)
FRONTEND_BASE_URL=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

POSTGRES_PASSWORD=<strong password>
SUPERADMIN_EMAIL=your@email.com
SUPERADMIN_PASSWORD=<strong password>

# Port for Docker's nginx — MUST differ from system nginx (usually 80)
APP_PORT=8181
```

⚠️ **ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS must match the domain the browser uses.**
If these are wrong, Django returns 400 and the frontend shows empty pages / CORS errors.

⚠️ **Use `config.settings.base` not `config.settings.prod`** unless your origin server has a real SSL cert.
`prod.py` has `SECURE_SSL_REDIRECT=True` which causes redirect loops when the origin is HTTP-only
(common when Cloudflare or CloudPanel nginx does SSL termination).

⚠️ **Leave `REDIS_PASSWORD` blank for simple setups.** Setting it requires matching the healthcheck command too.

---

## 4. Choose your APP_PORT

Docker's internal nginx binds to `APP_PORT` on the host. It must not conflict with the system nginx.

```bash
# Check what's already on port 80 and common ports
ss -tlnp | grep -E ':80|:443|:8080|:8181'
```

- CloudPanel server: port 80 is taken → use 8080, 8181, or 8282
- Raw server with no system nginx: use port 80 directly (`APP_PORT=80`)

⚠️ **CloudPanel and most managed hosting panels own port 80/443.** Always use a different port and proxy through the panel.

---

## 5. Pull images and start

```bash
cd ~/lantara-<env>

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Watch startup — backend runs migrations + seeding, takes ~60 seconds
docker compose -f docker-compose.prod.yml logs -f backend
```

Wait for this line before testing:
```
Listening on TCP address 0.0.0.0:8000
```

Check all containers are Up (not Restarting):
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 6. Point your domain to Docker

### Option A — CloudPanel (reverse proxy via custom vhost)

1. In CloudPanel → Sites → the domain → **Vhost** tab
2. Replace the entire config with:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 50M;

    # Required for Let's Encrypt (if not using Cloudflare)
    location /.well-known/acme-challenge/ {
        root /home/<site-user>/htdocs/<domain>/public;
        try_files $uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:<APP_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

3. Save → go to **SSL/TLS** tab

**If domain is behind Cloudflare (orange cloud):** skip Let's Encrypt entirely.
Cloudflare provides SSL automatically. Just make sure SSL mode in Cloudflare is **Flexible** or **Full** (not Full Strict).

**If domain is NOT behind Cloudflare:** issue Let's Encrypt via CloudPanel SSL/TLS tab.

⚠️ **Let's Encrypt ACME challenge common problems:**
- The `/.well-known/acme-challenge/` block must serve from local filesystem, not proxy to Docker
- The challenge directory must exist: `sudo mkdir -p /home/<user>/htdocs/<domain>/public/.well-known/acme-challenge`
- Ownership: `sudo chown -R <site-user>:<site-user> /home/<user>/htdocs/<domain>/public/.well-known`
- DNS must already point to THIS server IP before clicking "Create and Install"
- Verify DNS with: `dig yourdomain.com +short` — must match server IP exactly

### Option B — PDNS / raw nginx

Create `/etc/nginx/sites-available/lantara`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:<APP_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/lantara /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 7. Verify the deployment

```bash
# Internal check — must return JSON with permit types
wget -qO- http://localhost:<APP_PORT>/api/v1/permit-types/ | head -100

# Check container health
docker compose -f docker-compose.prod.yml ps

# Check backend logs for errors
docker compose -f docker-compose.prod.yml logs backend --tail=30
```

In the browser, open DevTools → Network tab → look for `/api/v1/sektors/` and `/api/v1/permit-types/`. Both must return 200.

---

## 8. Updating (after a push to main)

CI builds and pushes new images to GHCR automatically on every push to `main`.

To update the server:

```bash
cd ~/lantara-<env>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

⚠️ After `up -d`, the backend takes ~60 seconds to restart (runs migrations etc.).
The site will return 502 during this window — this is normal.

---

## 9. Common problems and fixes

### 502 Bad Gateway
The backend is still starting. Wait 60 seconds, then:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

### 400 Bad Request on all API calls
`ALLOWED_HOSTS` doesn't include the domain. Fix `.env` then:
```bash
docker compose -f docker-compose.prod.yml up -d   # NOT restart — restart doesn't re-read .env
```

⚠️ Always use `up -d` (not `restart`) after editing `.env`. `restart` keeps the old env vars.

### Frontend shows empty catalog / CORS errors in console
`CORS_ALLOWED_ORIGINS` doesn't match the browser origin. Fix `.env` then `up -d`.

### Redis unhealthy on startup
Empty `REDIS_PASSWORD` with `--requirepass` flag confuses some Redis versions.
Fix: remove `--requirepass` from the redis command in docker-compose.prod.yml if not using a password.

### Let's Encrypt: "Invalid response 404"
Challenge directory doesn't exist. Run:
```bash
sudo mkdir -p /home/<site-user>/htdocs/<domain>/public/.well-known/acme-challenge
sudo chown -R <site-user>:<site-user> /home/<site-user>/htdocs/<domain>/public/.well-known
```
Then retry in CloudPanel SSL/TLS.

### Let's Encrypt: "Timeout during connect"
DNS doesn't point to this server. Check: `dig yourdomain.com +short`
If behind Cloudflare, don't use Let's Encrypt — Cloudflare handles SSL automatically.

### Fixtures not loaded (empty layanan catalog)
If deploying from an old image (before fixtures were baked in), run manually:
```bash
docker cp /local/path/to/fixtures/. lantara-<env>-backend-1:/fixtures/
docker exec lantara-<env>-backend-1 python manage.py load_kbli
docker exec lantara-<env>-backend-1 python manage.py load_fixtures
```
New images (built after commit `351315a`) include fixtures automatically.

### Port already in use (nginx container fails)
```bash
ss -tlnp | grep :<APP_PORT>
```
Change `APP_PORT` in `.env` to a free port, then `up -d`.

### `restart` command hangs
Docker Compose v2.x sometimes hangs on restart. Use `down && up -d` instead:
```bash
docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d
```

---

## 10. Production checklist

Before going live on production:

- [ ] `SECRET_KEY` is a real random value (not the placeholder)
- [ ] `DEBUG=false`
- [ ] `ALLOWED_HOSTS` includes the production domain
- [ ] `CORS_ALLOWED_ORIGINS` includes `https://` production domain
- [ ] `POSTGRES_PASSWORD` and `SUPERADMIN_PASSWORD` are strong
- [ ] `DJANGO_SETTINGS_MODULE` is correct for your SSL setup
- [ ] SSL certificate is installed and working
- [ ] `APP_PORT` doesn't conflict with system nginx
- [ ] Cloudflare SSL mode is **Full** or **Flexible** (not Full Strict, unless origin has a cert)
- [ ] `docker compose ps` shows all containers `Up (healthy)` or `Up`
- [ ] `/api/v1/permit-types/` returns 46 entries
- [ ] Browser console shows no red errors on the catalog page
- [ ] Superadmin can log in at `/django-admin/`

---

## Network topology reference

```
Browser
  └─▶ Cloudflare (SSL termination, if used)
        └─▶ Server port 80 (system nginx / CloudPanel nginx)
              └─▶ 127.0.0.1:<APP_PORT> (Docker nginx container)
                    ├─▶ backend:8000 (Django/Daphne)  ← /api/ /oidc/ /ws/
                    └─▶ frontend:80  (nginx static)   ← everything else
```

Docker internal services (not exposed externally):
- `db:5432` — PostgreSQL
- `redis:6379` — Redis / Celery broker
- `minio:9000` — Object storage
- `worker` / `beat` — Celery workers (no port)
