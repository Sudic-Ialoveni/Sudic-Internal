# Deploy backend on Coolify (kali-server-2)

Use this when frontend stays on Vercel and backend runs in your homelab via Coolify.

## 1) Create backend resource in Coolify

- Type: `Application`
- Source: your Git repo
- Build pack: `Dockerfile`
- Base directory: `backend`
- Dockerfile path: `Dockerfile`
- Port: `3001`
- Health check path: `/live` (always 200 when process is up)

Important:

- In Coolify "General", set exposed port to `3001` (not `3000`).
- If Coolify shows `ports_exposes: 3000` while `PORT=3001`, you will get `502 Bad Gateway`.

## 2) Set environment variables in Coolify

Copy from `backend/.env.example` and set at least:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL=https://sudic-internal.vercel.app` (or your exact frontend URL)
- `PORT=3001`
- `NODE_ENV=production`
- `TRUST_PROXY=1`

Build-time note (important for Coolify):

- Keep `NODE_ENV=production` for runtime.
- In Coolify, do **not** make `NODE_ENV` available at build time (uncheck "Available at Buildtime").
- This avoids package-manager behavior that may skip build tooling.

Optional:

- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `AMOCRM_*`, `MOIZVONKI_*`
- `WEBHOOK_SECRET_*`

## 3) Deploy

- Click `Deploy` in Coolify.
- Wait for healthy status.
- Verify from browser or terminal:
  - `https://<your-api-domain>/live` -> `ok`
  - `https://<your-api-domain>/health` -> JSON

## 4) Point Vercel frontend to Coolify backend

In Vercel project env vars:

- `VITE_BACKEND_URL=https://<your-api-domain>`

Then redeploy frontend.

## 5) Supabase migration note

Deployment does not run SQL migrations automatically.
If you have not applied the latest migration, run:

- `supabase/migrations/005_app_onboarding.sql`

This updates existing `user_preferences` rows for onboarding defaults.

## Troubleshooting

- CORS error: `FRONTEND_URL` must match browser origin exactly (no trailing slash mismatch).
- 401 auth mismatch: frontend and backend must use keys from the same Supabase project.
- Unhealthy service: use `/live` for process health and `/health` for dependency health.
