-- Ben migration 001 — Ben-specific tables only
-- Runs against the shared Moon Supabase project (xsmopvqicrktazhchyux)
-- Uses existing public.profiles (auth.users FK already set up by Moon)
-- No changes to Moon's tables.

-- ============================================================
-- 1. CV DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS cv_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  parsed_text TEXT NOT NULL,
  parse_status TEXT DEFAULT 'ok' CHECK (parse_status IN ('ok', 'partial', 'failed')),
  parse_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own cv" ON cv_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cv" ON cv_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages cv" ON cv_documents FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_cv_documents_user ON cv_documents(user_id, created_at DESC);

-- ============================================================
-- 2. PATTERN REVEALS
-- ============================================================

CREATE TABLE IF NOT EXISTS pattern_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cv_document_id UUID REFERENCES cv_documents(id),

  pattern_paragraph TEXT,
  evidence_json JSONB,
  failure_prediction TEXT,
  thrive_conditions TEXT,
  one_question TEXT,

  draft_json JSONB,
  critique_json JSONB,
  revise_json JSONB,
  final_pass TEXT DEFAULT 'draft' CHECK (final_pass IN ('draft', 'revise', 'fallback')),

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  model_used TEXT DEFAULT 'claude-sonnet-4-5',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE pattern_reveals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reveals" ON pattern_reveals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reveals" ON pattern_reveals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages reveals" ON pattern_reveals FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_reveals_user ON pattern_reveals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reveals_status ON pattern_reveals(status) WHERE status IN ('pending', 'generating');

-- ============================================================
-- 3. INTAKES (intake chat + post-reveal chat)
-- ============================================================

CREATE TABLE IF NOT EXISTS intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'intake' CHECK (stage IN ('intake', 'post_reveal')),
  reveal_id UUID REFERENCES pattern_reveals(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own intakes" ON intakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own intakes" ON intakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages intakes" ON intakes FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_intakes_user_stage ON intakes(user_id, stage, created_at ASC);

-- ============================================================
-- 4. PATTERN REVEAL REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS pattern_reveal_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reveal_id UUID NOT NULL REFERENCES pattern_reveals(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('resonated', 'somewhat', 'generic')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reveal_id)
);

ALTER TABLE pattern_reveal_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reactions" ON pattern_reveal_reactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own reactions" ON pattern_reveal_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reactions" ON pattern_reveal_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages reactions" ON pattern_reveal_reactions FOR ALL USING (auth.role() = 'service_role');
