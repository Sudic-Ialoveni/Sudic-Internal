# File Move Instructions

## ✅ Already Moved Correctly:
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/next.config.js`
- `frontend/tailwind.config.ts`
- `frontend/postcss.config.js`
- `frontend/middleware.ts`
- `supabase/migrations/` (in root - correct)

## ❌ Still Need to Move:

### From `components/` to `frontend/`:

1. **Move `components/app/` → `frontend/app/`**
   - This includes all Next.js pages and layouts
   - Fix imports: Change `@/components/lib/...` to `@/lib/...`

2. **Move `components/PageRenderer.tsx` → `frontend/components/PageRenderer.tsx`**
   - Fix imports: Change `@/components/lib/...` to `@/lib/...`

3. **Move `components/widgets/` → `frontend/components/widgets/`**
   - Fix imports: Change `@/components/lib/...` to `@/lib/...`

4. **Move `components/lib/` → `frontend/lib/`** (already done for types, but check server.ts)
   - `lib/supabase/server.ts` should stay in frontend (used by Next.js API routes)
   - OR move to backend if you're using Express

### From `components/app/api/` to `backend/`:

**IMPORTANT DECISION NEEDED:**

Since you're using Next.js, you have two options:

#### Option A: Keep Next.js API Routes (Recommended for now)
- Move `components/app/api/` → `frontend/app/api/`
- These are Next.js API routes and work with Next.js
- Simpler setup, same deployment

#### Option B: Create Express Backend
- Move `components/app/api/` → `backend/src/routes/`
- Convert Next.js route handlers to Express routes
- Requires separate backend server
- More complex but more flexible

**For now, I'll assume Option A** - keeping Next.js API routes in frontend.

## Files to Fix Imports In:

After moving, update these imports:

1. **All files in `frontend/app/`**:
   - Change: `@/components/lib/...` → `@/lib/...`
   - Change: `@/components/PageRenderer` → `@/components/PageRenderer`

2. **All files in `frontend/components/`**:
   - Change: `@/components/lib/...` → `@/lib/...`

3. **All widget files**:
   - Change: `@/components/lib/...` → `@/lib/...`

## Final Structure Should Be:

```
frontend/
  app/
    (dashboard)/
    api/          # Next.js API routes
    login/
    layout.tsx
    globals.css
  components/
    widgets/
    PageRenderer.tsx
  lib/
    supabase/
      client.ts
      server.ts   # For Next.js API routes
    types/
    utils/
  middleware.ts
  package.json
  tsconfig.json
  next.config.js
  ...

backend/
  (empty for now, or Express if you choose Option B)

supabase/
  migrations/
```

## Quick Fix Commands:

After manual moves, run these to fix imports:

```bash
# In frontend directory
find . -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/@\/components\/lib/@\/lib/g'
find . -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/@\/components\/PageRenderer/@\/components\/PageRenderer/g'
```

