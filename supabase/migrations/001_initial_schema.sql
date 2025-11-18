-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pages table: Stores dynamically generated dashboard pages
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  creator uuid REFERENCES auth.users(id),
  config jsonb NOT NULL,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leads table: All inbound leads from n8n, FB, Telegram, WhatsApp, website, etc.
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  raw_payload jsonb,
  email text,
  phone text,
  name text,
  message text,
  status text DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- AmoCRM contacts: Basic synced data from amoCRM
CREATE TABLE amocrm_contacts (
  id text PRIMARY KEY,
  data jsonb,
  synced_at timestamptz DEFAULT now()
);

-- Calls table: Stores telephony events from Moizvonki
CREATE TABLE calls (
  id text PRIMARY KEY,
  lead_id uuid REFERENCES leads(id),
  caller text,
  callee text,
  duration int,
  status text,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);

-- Integrations table: Stores OAuth configs, API keys, etc.
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_published ON pages(published);

-- Enable Row Level Security
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE amocrm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - adjust based on your auth requirements)
-- Pages: authenticated users can read published pages, creators can manage their own
CREATE POLICY "Pages are viewable by authenticated users" ON pages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create pages" ON pages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own pages" ON pages
  FOR UPDATE USING (auth.uid() = creator);

-- Leads: authenticated users can view and update
CREATE POLICY "Leads are viewable by authenticated users" ON leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Leads can be inserted by service role" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Leads can be updated by authenticated users" ON leads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- AmoCRM contacts: authenticated users can view
CREATE POLICY "AmoCRM contacts are viewable by authenticated users" ON amocrm_contacts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "AmoCRM contacts can be inserted by service role" ON amocrm_contacts
  FOR INSERT WITH CHECK (true);

-- Calls: authenticated users can view
CREATE POLICY "Calls are viewable by authenticated users" ON calls
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Calls can be inserted by service role" ON calls
  FOR INSERT WITH CHECK (true);

-- Integrations: authenticated users can view, admins can manage
CREATE POLICY "Integrations are viewable by authenticated users" ON integrations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Enable Realtime for leads table
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE pages;

