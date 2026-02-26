# Vercel deployment

## Current behavior

- **SPA**: `/`, `/tariti-gpt`, `/settings`, etc. work (direct and refresh) via rewrite to `index.html`.
- **Health**: `GET /api/health` is handled by `api/health.ts` and returns 200.
- **Other API routes** (e.g. `/api/user/preferences`, `/api/ai/chats`) may return **404** on Vercel because the catch-all serverless function (`api/[[...path]].ts`) is not invoked when using `framework: vite` and `outputDirectory: frontend/dist`.

## If you need full API on Vercel

1. **Env vars**: In Vercel → Settings → Environment Variables, add all required vars including **SUPABASE_URL**, **SUPABASE_ANON_KEY**, **SUPABASE_SERVICE_ROLE_KEY** (same values as `VITE_SUPABASE_*` for the first two). See `docs/VERCEL_ENV.md`.
2. **Alternative**: Deploy the backend separately (e.g. Railway, Render) and set **VITE_BACKEND_URL** in Vercel to that backend URL so the frontend calls it for API.

## Self-test after deploy

```bash
curl -s -o /dev/null -w "%{http_code}" https://sudic-internal.vercel.app/           # expect 200
curl -s -o /dev/null -w "%{http_code}" https://sudic-internal.vercel.app/tariti-gpt # expect 200
curl -s https://sudic-internal.vercel.app/api/health                               # expect {"status":"ok",...}
```
