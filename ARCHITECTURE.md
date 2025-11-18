# Sudic Internal - Architecture Overview

## System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   n8n       │────▶│  Webhooks     │────▶│  Supabase   │
│  Workflows  │     │  API Routes   │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                      │
                           │                      │
                    ┌──────▼──────────────────────▼──────┐
                    │                                     │
                    │      Next.js Application           │
                    │                                     │
                    │  ┌─────────────┐  ┌─────────────┐ │
                    │  │   API       │  │  Frontend   │ │
                    │  │   Routes    │  │  Components │ │
                    │  └─────────────┘  └─────────────┘ │
                    │                                     │
                    └─────────────────────────────────────┘
                           │
                           │ Realtime
                           │
                    ┌──────▼──────────┐
                    │   Dashboard UI  │
                    │  (React/Next)   │
                    └─────────────────┘
```

## Core Components

### 1. Database Layer (Supabase)

**Tables:**
- `pages`: Dynamic dashboard page configurations
- `leads`: Inbound leads from all sources
- `amocrm_contacts`: Synced AmoCRM contact data
- `calls`: Moizvonki telephony events
- `integrations`: OAuth and API configurations

**Features:**
- Row Level Security (RLS) for data protection
- Realtime subscriptions for live updates
- PostgreSQL with JSONB for flexible schemas

### 2. API Layer (Next.js API Routes)

**Webhook Endpoints:**
- `POST /api/webhooks/lead` - Receives leads from n8n
- `POST /api/webhooks/moizvonki` - Receives call events
- `POST /api/webhooks/amocrm` - Receives AmoCRM updates

**Data Endpoints:**
- `GET /api/leads` - List leads with filtering
- `PUT /api/leads/:id` - Update lead status
- `POST /api/leads/:id/forward-amo` - Forward lead to AmoCRM

**Page Management:**
- `GET /api/pages` - List all pages
- `POST /api/pages` - Create new page (TaritiGPT can use this)
- `GET /api/pages/:slug` - Get page by slug
- `PUT /api/pages/:slug` - Update page

**Analytics:**
- `GET /api/analytics/amo` - AmoCRM statistics
- `GET /api/analytics/moizvonki` - Call analytics
- `GET /api/analytics/leads` - Lead analytics

### 3. Frontend Layer (React + Next.js)

**Dynamic Page System:**
- Pages stored as JSON configurations in database
- Widget-based architecture
- No frontend redeploy needed for new pages

**Widget Types:**
- `LiveLeadPreview` - Real-time lead monitoring with actions
- `AmoCRMAnalytics` - AmoCRM statistics and metrics
- `MoizvonkiAnalytics` - Call analytics and reporting
- `TaritiGPTPrompt` - AI assistant interface
- `CustomHTML` - Custom HTML content (sanitized)
- `MessageLog` - Message history viewer
- `LeadTimeline` - Lead event timeline

**Key Components:**
- `PageRenderer` - Renders dynamic pages from config
- `WidgetRegistry` - Maps widget types to components
- Dashboard layout with navigation
- Authentication flow

### 4. Realtime System

**Implementation:**
- Supabase Realtime subscriptions
- Automatic UI updates when data changes
- Used primarily for live lead updates

**Example:**
```typescript
const channel = supabase
  .channel('leads-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'leads',
  }, (payload) => {
    // Update UI automatically
  })
  .subscribe()
```

## Data Flow

### Lead Capture Flow

1. **Lead arrives** (Facebook, Telegram, WhatsApp, website, etc.)
2. **n8n workflow** processes the lead
3. **Webhook** sends to `/api/webhooks/lead`
4. **Backend** validates and inserts into `leads` table
5. **Supabase Realtime** broadcasts the change
6. **Dashboard UI** automatically updates via subscription
7. **User** can accept/reject/forward the lead
8. **Actions** update the lead status in database

### Dynamic Page Creation Flow

1. **TaritiGPT** (or any service) calls `POST /api/pages`
2. **Backend** validates page configuration
3. **Page** stored in `pages` table
4. **User** navigates to `/pages/[slug]`
5. **Frontend** fetches page config
6. **PageRenderer** renders widgets based on config
7. **No redeploy** needed!

## Security

### Authentication
- Supabase Auth with email/password
- Session management via cookies
- Middleware protects dashboard routes

### Authorization
- Row Level Security (RLS) policies
- Users can only see their own unpublished pages
- Service role key for webhooks (backend only)

### Webhook Security
- HMAC signature validation (optional, configurable)
- Service role key for database writes
- Input validation with Zod schemas

## Extensibility

### Adding New Widgets

1. Create widget component in `components/widgets/`
2. Register in `WidgetRegistry.tsx`
3. Add to `WidgetType` enum in `lib/types/widgets.ts`
4. Widget is immediately available for use in pages

### Adding New Integrations

1. Create webhook endpoint in `app/api/webhooks/`
2. Add corresponding table if needed
3. Create analytics widget if needed
4. Update documentation

### TaritiGPT Integration

TaritiGPT can create pages by calling:
```typescript
POST /api/pages
{
  "slug": "ai-generated-analytics",
  "title": "AI Generated Analytics",
  "config": {
    "layout": { "cols": 12 },
    "widgets": [
      {
        "id": "w1",
        "type": "AmoCRMAnalytics",
        "colSpan": 6
      }
    ]
  }
}
```

## Performance Considerations

- **Realtime subscriptions** are scoped to specific tables
- **Pagination** on lead lists (limit 100)
- **Indexes** on frequently queried columns
- **Client-side caching** for page configurations
- **Lazy loading** for heavy widgets

## Deployment

- **Frontend**: Vercel (automatic deployments)
- **Backend**: Next.js API routes (same as frontend)
- **Database**: Supabase (hosted PostgreSQL)
- **Domain**: internal.tariti.com

## Future Enhancements

- [ ] AmoCRM OAuth integration
- [ ] Advanced analytics widgets
- [ ] Custom widget builder UI
- [ ] Page templates library
- [ ] Export/import page configurations
- [ ] Multi-user collaboration
- [ ] Activity logging
- [ ] Notification system

