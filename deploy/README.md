# Deploying to AWS

Two pieces, deployed separately: the React frontend on **Amplify Hosting**,
the BoxLang backend on a plain **EC2** (or Lightsail) instance. Amplify can't
run the backend — it's a persistent JVM process that shells out to
`bxAgents build` and writes real files to disk per request, which doesn't
fit Amplify's static + Lambda model.

Deploy the backend first — the frontend's Amplify config needs its URL.

## 1. Backend (EC2)

1. **Launch an instance.** Ubuntu 22.04 LTS, `t3.small` (the coder step
   spawns real `bxAgents build` subprocesses — `t3.micro`'s 1GB RAM will
   swap). Security group: 22 (SSH, your IP only), 80 + 443 (anywhere).
2. **Point a subdomain at it** (e.g. `api.yourdomain.com` — an A record to
   the instance's public IP). Needed for step 5's TLS cert.
3. **Get the repo onto the box** — `git clone` it, or `scp` it over if the
   repo's private and the instance has no GitHub access configured.
4. **Bootstrap:**
   ```bash
   cd BlueHats/deploy
   ./setup.sh
   ```
   Installs BoxLang + the `bx-ai`/`bx-agents` modules (with the version
   pins that dodge a known `install-bx-module` bug on caret-range
   transitive deps — see the script's comments), then runs the repo's own
   no-key smoke test to confirm it actually works before moving on.
5. **Run it as a service:**
   ```bash
   sudo cp agent-factory.service /etc/systemd/system/
   # edit User=, WorkingDirectory=, and the PATH's home directory first if
   # your deploy user isn't "ubuntu"
   sudo systemctl daemon-reload
   sudo systemctl enable --now agent-factory
   sudo systemctl status agent-factory   # should be "active (running)"
   ```
6. **Put nginx + TLS in front** (MiniServer itself only binds
   `127.0.0.1:8080` — never exposed directly):
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   sudo cp nginx.conf.example /etc/nginx/sites-available/agent-factory
   sudo ln -s /etc/nginx/sites-available/agent-factory /etc/nginx/sites-enabled/
   # edit server_name in that file to your actual subdomain first
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d api.yourdomain.com   # fills in the TLS block, auto-renews
   ```
7. **Verify:** `curl https://api.yourdomain.com/api/health.bxs` should
   return `{"ok":true,...}`.

No API key goes on this box — every visitor supplies their own (see
`BuildResult`'s key field), so there's nothing secret to protect here beyond
the box itself.

### Ongoing hygiene (do this before real traffic hits it)

- **Disk cleanup.** Every build writes a real project under `generated/`.
  Nothing deletes those automatically. Add a cron job:
  ```bash
  # crontab -e
  0 * * * * find /home/ubuntu/BlueHats/generated -maxdepth 1 -mtime +1 -exec rm -rf {} +
  ```
- **Rate limiting.** `nginx.conf.example` already caps requests per IP
  (6/min, burst 3) — tune `limit_req_zone`'s `rate=` if that's too tight
  or too loose for how this gets used.
- **Public + unauthenticated + spawns subprocesses is a real abuse
  surface.** The above two are the minimum. If this gets any real
  traffic, consider fronting it with AWS WAF or CloudFront for stronger
  bot/rate protection.

## 2. Frontend (Amplify Hosting)

1. **AWS Console → Amplify → Create app → Host web app → GitHub**, connect
   this repo, branch `main`.
2. **Monorepo settings:** when Amplify asks for the app root, set it to
   `frontend`. That puts Amplify in monorepo mode, which reads
   `amplify.yml` **at the repo root** — the one with the `applications:`
   key, whose `appRoot` has to match what you typed in the console. A
   single-app spec (or one under `frontend/`) fails the build one second
   in with `CustomerError: Monorepo spec provided without "applications"
   key`, before npm ever runs.
3. **Rewrites and redirects** (**Hosting** → Rewrites and redirects — it
   is not under App settings) — this is what makes `/api/build.bxs` etc.
   from the browser transparently reach the EC2 backend without any CORS
   setup, same idea as the Vite dev proxy this app already uses locally:
   | Source address | Target address | Type |
   |---|---|---|
   | `/api/<*>` | `https://api.yourdomain.com/api/<*>` | 200 (Rewrite) |

   The target **must be HTTPS** — Amplify rejects a plain-`http://` custom
   rule outright ("HTTP URLs cannot be used in custom rules"), and won't
   take a bare IP either, since certbot can only issue for a hostname. So
   step 1's backend TLS is a hard prerequisite for this step, not the
   optional polish it looks like.
4. **Deploy.** Amplify builds and gives you a `*.amplifyapp.com` URL (or
   attach a custom domain under Domain management).
5. **Verify end to end:** open the Amplify URL, type a prompt, paste a key
   in the small field, confirm the real progress bar moves and a result
   card appears.

## What's already handled in the app itself

- **No shared secret to leak.** The app was changed to require a
  per-request key (frontend's "AI api key…" field → threaded through
  `ArchitectAgent`/`CoderBuilderAgent` via `bx-ai`'s native `apiKey`
  option) — verified to fail cleanly with no key and succeed with one,
  no server-side `.env` fallback.
- **Progress is real backend data, not a fake animation.** The loading bar
  is driven by `GET /api/progress.bxs`, polled from the frontend, and
  reports actual pipeline phase data. Caveat: since the Coder step was
  parallelized (one agent per tool, all firing at once) its turn-level
  ticks no longer track a meaningful sequence — the bar is honest about
  phases, but coarse through the longest one. See the note in
  `backend/agents/CoderBuilderAgent.bx`.
