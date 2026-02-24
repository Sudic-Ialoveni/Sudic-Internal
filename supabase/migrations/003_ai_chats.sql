-- AI chat conversations (ChatGPT-style)
CREATE TABLE ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  messages jsonb NOT NULL DEFAULT '[]',
  share_token text UNIQUE,
  share_created_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX idx_ai_chats_updated_at ON ai_chats(updated_at DESC);
CREATE INDEX idx_ai_chats_share_token ON ai_chats(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

-- Users can manage their own chats
CREATE POLICY "Users can view own chats" ON ai_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON ai_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON ai_chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON ai_chats
  FOR DELETE USING (auth.uid() = user_id);

-- Shared chats are readable by anyone with the token (handled in API via service role)
