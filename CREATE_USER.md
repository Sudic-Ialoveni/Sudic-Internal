# Create User Account

## Quick Method: Via Supabase Dashboard

1. **Go to Authentication → Users:**
   https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj/auth/users

2. **Click "Add User" → "Create new user"**

3. **Fill in the form:**
   - **Email:** `sudic.md@gmail.com`
   - **Password:** `Teodor@2011`
   - **Auto Confirm User:** ✅ (Check this box - important!)
   - **Send Invite Email:** ❌ (Uncheck - not needed)

4. **Click "Create User"**

5. **Done!** You can now log in with these credentials.

## Alternative: Via Supabase CLI (if installed)

```bash
supabase auth users create \
  --email sudic.md@gmail.com \
  --password "Teodor@2011" \
  --email-confirm true
```

## Verify User Created

After creating, you should see the user in the Users list. The user will be able to:
- Sign in with email/password
- Access the dashboard
- Create and manage pages
- View leads and analytics

## Test Login

1. Start frontend: `cd frontend && npm run dev`
2. Go to: http://localhost:3000/login
3. Sign in with:
   - Email: `sudic.md@gmail.com`
   - Password: `Teodor@2011`

---

**Note:** The service role key has been added to `backend/.env`. The backend is ready to run!

