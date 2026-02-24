# Hosting Sudic Internal

## Can it fit on Vercel free tier?

**Yes**, with one important caveat.

### Frontend (React + Vite)
- Fits **perfectly** on Vercel. Static build, 100 GB bandwidth, and generous limits are more than enough for an internal dashboard.

### Backend (Express API)
You have two options:

| Option | Where backend runs | Best for |
|--------|--------------------|----------|
| **A – All on Vercel** | Same project as serverless functions (Express wrapped) | Simplest ops, single deployment. |
| **B – Split** | Frontend on Vercel, backend on Railway / Render / Fly.io / your server | If you hit limits or need long-running processes. |

**Vercel Hobby (free) limits** (as of 2024–2025):
- **Serverless**: ~1M invocations/month, 360 GB-hours memory, 300s max duration per request.
- **Bandwidth**: 100 GB/month.
- **Restriction**: Hobby is for **non-commercial personal use**. Internal company use may require a **Pro** plan or self-hosting.

So:
- **Personal / side project**: You can fit **frontend + backend** on Vercel free (Option A below).
- **Company internal tool**: Prefer **Vercel Pro** for the backend, or **self-host the backend** on your server and keep the frontend on Vercel (or self-host both).

---

## Option A – All on Vercel (free tier if personal use)

1. **Single Vercel project** (repo root):
   - Frontend is built from `frontend/` and served at `/`.
   - All `/api/*` requests are handled by a serverless function that runs your Express app.

2. **Environment variables**  
   Set in Vercel dashboard (Project → Settings → Environment Variables):
   - **Frontend (build + runtime):**  
     `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL` (e.g. `https://your-domain.vercel.app` so API calls use same origin).
   - **Backend (serverless):**  
     Same as local: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, and any of: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, AmoCRM/Moizvonki vars, webhook secrets.

3. **Deploy**  
   Push to Git and connect the repo to Vercel (or run `vercel` from the repo root). Use the root `vercel.json` and `api/` handler included in this repo.

---

## Option B – Frontend on Vercel, backend elsewhere

1. **Frontend on Vercel**
   - Set **Root Directory** to `frontend` in the Vercel project.
   - Build command: `npm run build` (or `pnpm build`).
   - Output: default Vite `dist` (Vercel will detect it).
   - Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL` = your backend URL (e.g. `https://your-backend.railway.app` or `https://api.yourdomain.com`).

2. **Backend on your server (or Railway / Render / Fly.io)**
   - Run the Node server as usual: `cd backend && npm run build && npm start`.
   - Set `PORT` (e.g. 3001) and `FRONTEND_URL` to your Vercel frontend URL (e.g. `https://sudic-internal.vercel.app`).
   - Configure CORS and env (Supabase, AI keys, etc.) as in local development.

3. **Self-hosting both**
   - Serve the frontend static files (e.g. from `frontend/dist`) with nginx or the same Node app, and run the backend on the same or another port. No Vercel needed.

---

## Summary

| Use case | Recommendation |
|----------|-----------------|
| Personal / non-commercial | **Option A** – frontend + backend on Vercel free tier. |
| Company internal | **Option B** with backend on your server (or Vercel Pro if you want backend on Vercel). |
| Full control / no vendor | Self-host frontend + backend on your server. |

The repo includes a Vercel-ready setup (root `vercel.json` and `api/` handler) so you can try Option A with a single `vercel` deploy.
