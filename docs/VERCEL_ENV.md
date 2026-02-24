# Environment variables for Vercel (sudic-internal.vercel.app)

Add these in **Vercel → Project → Settings → Environment Variables**.  
Set each for **Production** (and **Preview** if you use branch deploys).  
Replace placeholder values with your real ones.

---

## Required (paste these, then fill in your values)

| Name | Value | Notes |
|------|--------|------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | Same as in backend .env |
| `VITE_SUPABASE_ANON_KEY` | your anon key | Same as in backend .env |
| `VITE_BACKEND_URL` | `https://sudic-internal.vercel.app` | Must be this for same-origin API |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | Same as above |
| `SUPABASE_ANON_KEY` | your anon key | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key | From Supabase Dashboard → Settings → API |
| `FRONTEND_URL` | `https://sudic-internal.vercel.app` | CORS / redirects |

---

## Optional (only if you use these features)

| Name | Value |
|------|--------|
| `ANTHROPIC_API_KEY` | (TaritiGPT / AI) |
| `OPENAI_API_KEY` | (TaritiGPT / AI) |
| `AMOCRM_BASE_URL` | e.g. `https://your-subdomain.amocrm.com` |
| `AMOCRM_API_KEY` | |
| `MOIZVONKI_API_KEY` | |
| `MOIZVONKI_USER` | |
| `MOIZVONKI_BASE_URL` | e.g. `https://app.moizvonki.ru/api/v1` |
| `WEBHOOK_SECRET_AMOCRM` | |
| `WEBHOOK_SECRET_MOIZVONKI` | |

---

## Copy-paste block (required only)

Use this as a checklist. In Vercel, add each variable and paste your value.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BACKEND_URL=https://sudic-internal.vercel.app
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=https://sudic-internal.vercel.app
```

Fill in the empty values from your `backend/.env` (Supabase URL, anon key, service role key).
