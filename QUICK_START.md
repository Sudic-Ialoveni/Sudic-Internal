# 🚀 Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Supabase project created (already done ✅)
- Google OAuth credentials (optional, for Google sign-in)

## 1. Backend Setup (5 minutes)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:
```env
SUPABASE_URL=https://vlmqrqkvpeappoqypdzj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Get Service Role Key:**
1. Go to: https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj/settings/api
2. Copy "service_role" key (keep it secret!)
3. Paste into `backend/.env`

Start backend:
```bash
npm run dev
```

✅ Backend running on http://localhost:3001

## 2. Frontend Setup (2 minutes)

```bash
cd frontend
npm install
```

`.env` already created with your credentials ✅

Start frontend:
```bash
npm run dev
```

✅ Frontend running on http://localhost:3000

## 3. Create Your User Account (2 minutes)

**Via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj/auth/users
2. Click "Add User" → "Create new user"
3. Enter:
   - Email: `sudic.md@gmail.com`
   - Password: `Teodor@2011`
   - ✅ Check "Auto Confirm User"
4. Click "Create User"

## 4. Test Login

1. Open http://localhost:3000/login
2. Sign in with:
   - Email: `sudic.md@gmail.com`
   - Password: `Teodor@2011`
3. You should be redirected to the dashboard!

## 5. Configure Google OAuth (Optional)

1. **Get Google Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `https://vlmqrqkvpeappoqypdzj.supabase.co/auth/v1/callback`

2. **Enable in Supabase:**
   - Dashboard → Authentication → Providers → Google
   - Enter Client ID and Client Secret
   - Save

3. **Test:**
   - Go to login page
   - Click "Sign in with Google"
   - Complete OAuth flow

## ✅ You're Done!

- ✅ Database schema created
- ✅ Backend API running
- ✅ Frontend running
- ✅ Authentication ready
- ✅ All widgets working
- ✅ Dynamic pages system ready

## 🎯 Next Steps

- Configure n8n webhooks to point to `http://localhost:3001/api/webhooks/lead`
- Start creating dynamic dashboard pages
- Integrate actual AmoCRM API
- Integrate TaritiGPT API

## 📚 Documentation

- `SETUP_COMPLETE.md` - Full setup guide
- `SUPABASE_SETUP.md` - Supabase configuration
- `backend/README.md` - Backend API docs
- `frontend/README.md` - Frontend setup

---

**Everything is ready! Just add your service role key and create your user! 🎉**

