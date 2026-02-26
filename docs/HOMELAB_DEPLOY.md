# Backend on homelab (Docker + Cloudflare Tunnel)

Run the API in Docker on your homelab and expose it with a Cloudflare Tunnel. The frontend stays on Vercel and calls your backend via the tunnel URL.

## 1. Prepare env file

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at least:

- **SUPABASE_URL**, **SUPABASE_ANON_KEY**, **SUPABASE_SERVICE_ROLE_KEY** – same as in Vercel
- **FRONTEND_URL** – `https://sudic-internal.vercel.app` (so CORS allows the Vercel frontend)
- **PORT** – `3001` (default; must match the port exposed in Docker)

Optionally set: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `AMOCRM_*`, `MOIZVONKI_*`, etc.

## 2. Build and run with Docker Compose

From the repo root:

```bash
docker compose up -d --build
```

Check logs:

```bash
docker compose logs -f backend
```

Health check:

```bash
curl http://localhost:3001/health
```

## 3. Expose with Cloudflare Tunnel

1. Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) on the homelab host (or in a container).
2. Create a tunnel and point a (sub)domain to `localhost:3001` (or the host IP and port the container uses).

Example (HTTP service, no TLS on the backend; Cloudflare terminates TLS):

```bash
cloudflared tunnel --url http://localhost:3001
```

Or with a named tunnel and a hostname (e.g. `api.yourdomain.com`):

- In Cloudflare Zero Trust: create a tunnel, add a public hostname `api.yourdomain.com` → Type **HTTP** → URL `localhost:3001`.
- Run the tunnel (e.g. as a service): `cloudflared tunnel run <TUNNEL_ID>`.

Your API will be at `https://api.yourdomain.com` (or whatever hostname you chose).

## 4. Point the frontend to your backend

In **Vercel** → Project → **Settings** → **Environment Variables**:

- Set **VITE_BACKEND_URL** to your tunnel URL, e.g. `https://api.yourdomain.com`.
- Redeploy the frontend so the new value is baked in.

The app will then call your homelab backend for all `/api/*` requests.

## 5. Optional: run without Docker Compose

Build:

```bash
docker build -t sudic-internal-backend -f backend/Dockerfile backend/
```

Run:

```bash
docker run -d --name sudic-internal-backend -p 3001:3001 --env-file backend/.env --restart unless-stopped sudic-internal-backend
```

## Ports

- Backend listens on **3001** inside the container and is mapped to host `3001` by default. Change the compose `ports` or the run `-p` if you need another host port.
- Cloudflare Tunnel should target the host port (e.g. `http://localhost:3001` or `http://host-ip:3001`).

## Webhooks

If you use AmoCRM or Moizvonki webhooks, set the webhook URLs to your tunnel host, e.g.:

- `https://api.yourdomain.com/api/webhooks/amocrm`
- `https://api.yourdomain.com/api/webhooks/moizvonki`
- `https://api.yourdomain.com/api/webhooks/lead`

Use the same secrets (e.g. `WEBHOOK_SECRET_AMOCRM`) in `backend/.env` as configured in the provider.

## Troubleshooting

- **CORS errors** – Ensure `FRONTEND_URL` in `backend/.env` is exactly the Vercel URL (e.g. `https://sudic-internal.vercel.app`) with no trailing slash.
- **401 / auth** – Supabase keys in `.env` must match the project the Vercel frontend uses.
- **Health check** – `curl http://localhost:3001/health` should return JSON with `"status":"ok"`; if not, check `docker compose logs backend`.
