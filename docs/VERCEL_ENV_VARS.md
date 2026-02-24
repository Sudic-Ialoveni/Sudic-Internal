# Environment variables for Vercel (sudic-internal.vercel.app)

Add these in **Vercel → Your Project → Settings → Environment Variables**.  
Use **Production** (and **Preview** if you use branch deploys).

**Rule:** Copy values from your `backend/.env` for every variable except the two below.  
Set these exactly:
- `VITE_BACKEND_URL` = `https://sudic-internal.vercel.app`
- `FRONTEND_URL` = `https://sudic-internal.vercel.app`

---

## Copy-paste list (name → where to get value)

| Name | Value (paste from backend/.env unless noted) |
|------|----------------------------------------------|
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` in backend/.env |
| `VITE_SUPABASE_ANON_KEY` | same as `SUPABASE_ANON_KEY` in backend/.env |
| `VITE_BACKEND_URL` | **exactly** `https://sudic-internal.vercel.app` |
| `SUPABASE_URL` | from backend/.env |
| `SUPABASE_ANON_KEY` | from backend/.env |
| `SUPABASE_SERVICE_ROLE_KEY` | from backend/.env |
| `FRONTEND_URL` | **exactly** `https://sudic-internal.vercel.app` |
| `ANTHROPIC_API_KEY` | from backend/.env |
| `CLAUDE_MODEL` | from backend/.env (e.g. `claude-sonnet-4-6`) |
| `OPENAI_API_KEY` | from backend/.env |
| `AMOCRM_BASE_URL` | from backend/.env |
| `AMOCRM_API_KEY` | from backend/.env |
| `MOIZVONKI_API_KEY` | from backend/.env |
| `MOIZVONKI_USER` | from backend/.env |
| `MOIZVONKI_BASE_URL` | from backend/.env |

**Do not add:** `PORT`, `NODE_ENV` (Vercel sets these).
