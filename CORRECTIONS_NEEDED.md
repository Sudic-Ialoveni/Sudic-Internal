# Corrections Needed After File Move

## Summary

I've identified the issues with your file structure. Here's what needs to be fixed:

## Current Problem

All files are in `components/` directory with incorrect import paths like:
- `@/components/lib/...` (should be `@/lib/...`)
- `@/components/PageRenderer` (should be `@/components/PageRenderer` - this one is OK)

## What I've Already Fixed

✅ Created these files in correct locations with fixed imports:
- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/lib/supabase/client.ts`
- `frontend/lib/types/database.ts`
- `frontend/lib/types/widgets.ts`
- `frontend/lib/types/leads.ts`
- `frontend/lib/utils/page-creation.ts`

## What You Need to Do

### Option 1: Manual Move (Recommended)

1. **Move `components/app/` → `frontend/app/`**
   - Then fix all imports: `@/components/lib/...` → `@/lib/...`

2. **Move `components/PageRenderer.tsx` → `frontend/components/PageRenderer.tsx`**
   - Fix import: `@/components/lib/types/widgets` → `@/lib/types/widgets`

3. **Move `components/widgets/` → `frontend/components/widgets/`**
   - Fix all imports: `@/components/lib/...` → `@/lib/...`

4. **Move `components/app/api/` → `frontend/app/api/`**
   - These are Next.js API routes, they belong in frontend
   - Fix imports: `@/lib/...` (remove `/components` from path)

5. **Move `components/lib/supabase/server.ts` → `frontend/lib/supabase/server.ts`**
   - Fix import: `@/components/lib/types/database` → `@/lib/types/database`

### Option 2: I Can Do It For You

I can write all the files to the correct locations with fixed imports. Just say "yes" and I'll complete the move.

## Import Path Changes Needed

**Find and Replace:**
- `@/components/lib/` → `@/lib/`
- `@/components/PageRenderer` → `@/components/PageRenderer` (no change needed, but verify path)

**Files that need import fixes:**
- All files in `components/app/`
- All files in `components/widgets/`
- `components/PageRenderer.tsx`
- `components/lib/supabase/server.ts`

## Final Structure

```
frontend/
  app/
    (dashboard)/
      layout.tsx
      page.tsx
      pages/
        page.tsx
        [slug]/page.tsx
    api/              # Next.js API routes
      webhooks/
      leads/
      pages/
      analytics/
      tariti-gpt/
    login/
      page.tsx
    layout.tsx
    globals.css
  components/
    widgets/
      *.tsx
    PageRenderer.tsx
  lib/
    supabase/
      client.ts
      server.ts
    types/
      *.ts
    utils/
      *.ts
  middleware.ts
  package.json
  tsconfig.json
  ...

backend/
  (empty - API routes are in frontend/app/api for Next.js)

supabase/
  migrations/
    001_initial_schema.sql
```

## Quick Fix Script (After Manual Move)

If you're on Windows PowerShell, you can use this to fix imports:

```powershell
# Navigate to frontend directory
cd frontend

# Fix imports (PowerShell)
Get-ChildItem -Recurse -Include *.ts,*.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace '@/components/lib/', '@/lib/' | Set-Content $_.FullName
}
```

Let me know if you want me to complete the file moves automatically!

