# Sudic Internal - Backend

Express.js backend server for the Sudic Internal Dashboard API.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase credentials:
   ```env
   SUPABASE_URL=https://vlmqrqkvpeappoqypdzj.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:3001`

## API Endpoints

### Webhooks
- `POST /api/webhooks/lead` - Receive leads from n8n
- `POST /api/webhooks/moizvonki` - Receive call events
- `POST /api/webhooks/amocrm` - Receive AmoCRM updates

### Leads
- `GET /api/leads` - List leads (with filters)
- `PUT /api/leads/:id` - Update lead
- `POST /api/leads/:id/forward-amo` - Forward lead to AmoCRM

### Pages
- `GET /api/pages` - List all pages
- `POST /api/pages` - Create new page
- `GET /api/pages/:slug` - Get page by slug
- `PUT /api/pages/:slug` - Update page

### Analytics
- `GET /api/analytics/amo` - AmoCRM statistics
- `GET /api/analytics/moizvonki` - Call analytics
- `GET /api/analytics/leads` - Lead analytics

### TaritiGPT
- `POST /api/tariti-gpt` - Send prompt to TaritiGPT

## Authentication

All endpoints (except webhooks) require authentication. Include the Supabase access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

The frontend automatically includes this token in all API requests.

## Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for webhooks)
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `WEBHOOK_SECRET_*` - Optional webhook secrets for HMAC validation

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run type-check` - Type check without building

## Project Structure

```
src/
  index.ts           # Main server entry point
  lib/
    supabase.ts      # Supabase client utilities
    types/           # TypeScript type definitions
  middleware/
    auth.ts          # Authentication middleware
  routes/
    webhooks.ts      # Webhook endpoints
    leads.ts         # Lead management endpoints
    pages.ts         # Page management endpoints
    analytics.ts     # Analytics endpoints
    tariti-gpt.ts   # TaritiGPT endpoint
```

