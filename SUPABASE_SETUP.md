# Supabase Setup Complete

## ✅ Database Schema
All tables have been created successfully:
- `pages` - Dynamic dashboard pages
- `leads` - Inbound leads from all sources
- `amocrm_contacts` - AmoCRM synced data
- `calls` - Moizvonki telephony events
- `integrations` - OAuth configs and API keys

All tables have Row Level Security (RLS) enabled with appropriate policies.

## ✅ Authentication Setup

### Email Authentication
Email authentication is **enabled by default** in Supabase. Users can sign up and sign in with email/password.

### User Account
To create your user account (`sudic.md@gmail.com`), you have two options:

#### Option 1: Sign up through the frontend (Recommended)
1. Start your frontend dev server: `cd frontend && npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Use the sign-up form (you may need to add one) or use the Supabase dashboard

#### Option 2: Create via Supabase Dashboard
1. Go to your Supabase project: https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create new user**
4. Enter:
   - Email: `sudic.md@gmail.com`
   - Password: `Teodor@2011`
   - Auto Confirm User: ✅ (check this to skip email verification)

### Google OAuth Setup

To enable Google OAuth authentication:

1. **Get Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: 
     ```
     https://vlmqrqkvpeappoqypdzj.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**

2. **Configure in Supabase:**
   - Go to your Supabase Dashboard: https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj
   - Navigate to **Authentication** → **Providers**
   - Find **Google** and click to enable
   - Enter:
     - **Client ID (for OAuth)**: Your Google Client ID
     - **Client Secret (for OAuth)**: Your Google Client Secret
   - Click **Save**

3. **Update Frontend:**
   The frontend already supports Google OAuth through Supabase. Users will see a "Sign in with Google" option once configured.

## 🔐 Security Notes

- All tables have RLS policies enabled
- Authenticated users can view leads, pages, calls, and contacts
- Only authenticated users can create/update pages
- Service role can insert leads, calls, and contacts (for webhooks)

## 📝 Next Steps

1. **Create your user account** (see options above)
2. **Configure Google OAuth** (see instructions above)
3. **Test the login flow** in your frontend
4. **Start the backend server** to handle webhooks and API routes

## 🔗 Useful Links

- Supabase Dashboard: https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj
- Project URL: https://vlmqrqkvpeappoqypdzj.supabase.co
- Auth Settings: https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj/auth/providers

