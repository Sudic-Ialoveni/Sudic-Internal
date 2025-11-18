# Sudic Internal - Setup Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- npm or yarn package manager

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for backend operations)

Optional webhook secrets (for HMAC validation):
- `WEBHOOK_SECRET_LEAD`
- `WEBHOOK_SECRET_MOIZVONKI`
- `WEBHOOK_SECRET_AMOCRM`

## Step 3: Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`

This will create:
- `pages` table (for dynamic dashboard pages)
- `leads` table (for inbound leads)
- `amocrm_contacts` table (for AmoCRM sync)
- `calls` table (for Moizvonki telephony)
- `integrations` table (for OAuth/config storage)
- Row Level Security (RLS) policies
- Realtime subscriptions for `leads` and `pages`

## Step 4: Configure Realtime

In Supabase dashboard:
1. Go to Database → Replication
2. Ensure `leads` and `pages` tables are enabled for replication
3. This enables real-time updates in the dashboard

## Step 5: Set Up Authentication

1. In Supabase dashboard, go to Authentication → Settings
2. Configure your authentication providers (Email, OAuth, etc.)
3. Create your first user or use the Supabase Auth UI

## Step 6: Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Step 7: Configure Webhooks (Optional)

### n8n Webhook for Leads

Point your n8n workflow to:
```
POST https://your-domain.com/api/webhooks/lead
```

Payload format:
```json
{
  "source": "facebook",
  "email": "user@example.com",
  "phone": "+1234567890",
  "name": "John Doe",
  "message": "I'm interested in your service",
  "raw_payload": { /* any additional data */ }
}
```

### Moizvonki Webhook

Point Moizvonki webhook to:
```
POST https://your-domain.com/api/webhooks/moizvonki
```

### AmoCRM Webhook

Point AmoCRM webhook to:
```
POST https://your-domain.com/api/webhooks/amocrm
```

## Step 8: Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Testing

1. **Test Authentication**: Sign in at `/login`
2. **Test Lead Webhook**: Send a POST request to `/api/webhooks/lead`
3. **Test Realtime**: Create a lead via webhook, it should appear in the dashboard automatically
4. **Test Dynamic Pages**: Create a page via API and view it at `/pages/[slug]`

## Next Steps

- Integrate actual TaritiGPT API in `/app/api/tariti-gpt/route.ts`
- Implement AmoCRM OAuth flow
- Add more widgets as needed
- Configure production webhook secrets
- Set up monitoring and logging

## Troubleshooting

### Realtime not working
- Check that Realtime is enabled in Supabase
- Verify RLS policies allow reads
- Check browser console for connection errors

### Authentication issues
- Verify Supabase URL and keys are correct
- Check RLS policies on tables
- Ensure middleware is properly configured

### Webhook errors
- Check webhook secret validation (if configured)
- Verify payload format matches schema
- Check Supabase service role key is set

