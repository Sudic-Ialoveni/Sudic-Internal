# 🔧 Workaround: Supabase Dashboard CORS Issue

## The Problem

The Supabase Dashboard is experiencing CORS errors and cannot load. This is a **Supabase platform issue**, not your code.

## ✅ Solution: Use Our Scripts Instead

We've created scripts to manage users directly via the API, bypassing the broken dashboard.

### Check User Status
```bash
cd backend
npx tsx src/scripts/manage-user.ts check
```

This will show:
- ✅ If user exists
- ✅ If email is confirmed
- ✅ Last sign-in date
- ⚠️ What needs to be fixed

### Confirm Email (If Not Confirmed)
```bash
npx tsx src/scripts/manage-user.ts confirm
```

### Reset Password
```bash
npx tsx src/scripts/manage-user.ts reset-password
```

### List All Users
```bash
npx tsx src/scripts/manage-user.ts list
```

## 🎯 Quick Fix for Login Issue

Most likely, the email is not confirmed. Run:

```bash
cd backend
npx tsx src/scripts/manage-user.ts check
```

If email is not confirmed, run:

```bash
npx tsx src/scripts/manage-user.ts confirm
```

Then try logging in again at http://localhost:3000/login

## 📝 Alternative: Use MCP Supabase Tools

If you have MCP Supabase configured, you can also use:
- `mcp_supabase_execute_sql` to query users
- Direct SQL access to check user status

## 🔍 What the Scripts Do

These scripts use the **Supabase Admin API** with your service role key, which has full permissions to:
- List users
- Update user properties
- Confirm emails
- Reset passwords
- Create users

**This bypasses the broken dashboard completely!** ✅

