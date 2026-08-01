# Deploying the BharatHR Admin Portal → admin.bharatherbs.in

End-to-end guide. The portal is a **static site** (Next.js `output: 'export'`) —
it produces plain HTML/JS that Apache serves. There is **no Next.js process
running** on the server; it's a browser app that calls the API at
`api.bharatherbs.in`. Deploy style mirrors TrueHR: **git pull + build on the
server**.

- **Server:** VPS `157.20.215.199` (Rocky Linux, Apache — same box as the API)
- **API it talks to:** `https://api.bharatherbs.in/api/v2`
- **Who can log in:** any account; HR/IT/Super admins get the full console,
  employees see only Dashboard + My approvals.

---

## Overview — the 5 things that must happen

1. **DNS** — point `admin.bharatherbs.in` at the server. *(domain registrar)*
2. **Code on server** — `git pull` the repo onto the VPS. *(server)*
3. **Build** — run the static export on the server. *(server)*
4. **Serve** — Apache vhost + HTTPS via certbot. *(server)*
5. **CORS** — allow the new origin on the API and restart it. *(server)*

Only step 1 is in your registrar; steps 2–5 are one SSH session on the VPS.

---

## Step 1 — DNS A-record (registrar)

Wherever `bharatherbs.in` is managed (GoDaddy / Cloudflare / Hostinger …), add:

| Type | Name / Host | Value            | TTL  |
|------|-------------|------------------|------|
| A    | `admin`     | `157.20.215.199` | Auto |

`admin` + the base domain = `admin.bharatherbs.in`. Propagation: minutes–hours.
Verify from your Mac:

```bash
dig +short admin.bharatherbs.in      # should print 157.20.215.199
```

Don't run certbot (step 4) until this resolves — certificate issuance needs it.

---

## Step 2 — get the code onto the server

One-time clone (pick a location; `/opt/bharathr` used here):

```bash
ssh root@157.20.215.199
sudo mkdir -p /opt/bharathr && cd /opt/bharathr
git clone <YOUR_REPO_URL> .        # first time only
```

Every later deploy is just:

```bash
cd /opt/bharathr && git pull
```

> Node.js is already on this box (the API runs on it). Confirm with `node -v`
> (needs ≥ 18). If missing: `sudo dnf module install nodejs:20`.

---

## Step 3 — build the static site on the server

The API URL is baked in **at build time**, so it must be set on the build command:

```bash
cd /opt/bharathr/web
npm ci                                   # install exact dependency versions
NEXT_PUBLIC_API_BASE=https://api.bharatherbs.in/api/v2 npm run build
# → produces /opt/bharathr/web/out/
```

Publish the fresh build to Apache's web root:

```bash
sudo mkdir -p /var/www/bharathr-admin
sudo rsync -a --delete out/ /var/www/bharathr-admin/
```

`out/` is gitignored — it's a build artifact, never committed. Rebuild + rsync
is the entire update loop on every future deploy.

There is a ready-made script for steps 2–3 + publish — see
[`deploy-on-server.sh`](#one-shot-deploy-script) at the bottom.

---

## Step 4 — Apache vhost + HTTPS

Create `/etc/httpd/conf.d/bharathr-admin.conf`:

```apache
<VirtualHost *:80>
    ServerName admin.bharatherbs.in
    DocumentRoot /var/www/bharathr-admin

    <Directory /var/www/bharathr-admin>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    # SPA deep links (e.g. /employees/detail) resolve to a real folder because
    # the build uses trailingSlash; this 404 fallback covers anything else.
    ErrorDocument 404 /404/index.html
</VirtualHost>
```

Enable + get the TLS certificate:

```bash
sudo apachectl configtest          # should say: Syntax OK
sudo systemctl reload httpd
sudo certbot --apache -d admin.bharatherbs.in   # adds the :443 vhost + auto-renew
```

certbot rewrites the vhost to redirect http→https and installs the cert.

---

## Step 5 — allow the portal origin on the API (REQUIRED)

The API only accepts browser requests from origins in its CORS allowlist.
Right now that's just `hr.bharatherbs.in`. On the server, edit the **backend**
`.env` (wherever the API is deployed, e.g. `/opt/bharathr-api/.env`):

```
CORS_ORIGINS=https://hr.bharatherbs.in,https://admin.bharatherbs.in
```

Then restart the API process (whatever runs it — pick one):

```bash
pm2 restart bharathr-api
#   or
sudo systemctl restart bharathr-api
#   or, if dockerised
sudo docker compose -f docker-compose.prod.yml up -d
```

**Skip this and every page in the portal fails** with a CORS error in the
browser console, even though login "looks" like it should work.

---

## Step 6 — verify

1. `https://admin.bharatherbs.in` loads the login screen (padlock shown).
2. Sign in with an HR/IT/Super admin account.
3. Dashboard shows live counts; open Employees, Payroll, Support — data loads.

If pages are blank and the browser console shows `CORS`/`blocked by CORS
policy` → step 5 wasn't applied or the API wasn't restarted.

---

## Updating later (the routine deploy)

```bash
ssh root@157.20.215.199
cd /opt/bharathr && git pull
cd web && npm ci
NEXT_PUBLIC_API_BASE=https://api.bharatherbs.in/api/v2 npm run build
sudo rsync -a --delete out/ /var/www/bharathr-admin/
```

Nothing to restart — Apache serves the new files immediately. (No Node process,
no PM2 entry for the portal.)

---

## One-shot deploy script

Save as `/opt/bharathr/web/deploy-on-server.sh`, `chmod +x`, run on the server:

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO=/opt/bharathr
WEBROOT=/var/www/bharathr-admin
API=https://api.bharatherbs.in/api/v2

cd "$REPO" && git pull
cd "$REPO/web"
npm ci
NEXT_PUBLIC_API_BASE="$API" npm run build
sudo mkdir -p "$WEBROOT"
sudo rsync -a --delete out/ "$WEBROOT/"
echo "✓ Portal deployed to $WEBROOT — live at https://admin.bharatherbs.in"
```

---

## FAQ

**Why static export instead of running `next start`?**
The portal has no server-side rendering, API routes, or image optimization —
it's a pure client SPA. Static files need no Node process, no PM2/systemd entry,
and ~0 RAM. Running `next start` would just be a process to babysit for no gain.

**Can I build on my Mac and only copy `out/`?**
Yes: `NEXT_PUBLIC_API_BASE=… npm run build` locally, then
`rsync -avz --delete out/ root@157.20.215.199:/var/www/bharathr-admin/`.
Skips needing Node on the server, but you must remember to set the API URL on
every local build. Building on the server (above) is cleaner.

**Do I need a second server / port for this?**
No. It's static files on the existing box, a new Apache vhost, no new port.

**The API URL changed — what now?**
Rebuild (it's compiled into the JS at build time). Editing files in the web
root by hand won't work.
