-- Ben — Database Schema
-- Run in Supabase SQL Editor

-- ============================================================
-- 1. PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  preferred_name TEXT,
  telegram_user_id TEXT UNIQUE,       -- for Telegram mini-app (week 2)
  telegram_username TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  first_session TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role manages profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 2. CV DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS cv_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  parsed_text TEXT NOT NULL,           -- extracted text content
  parse_status TEXT DEFAULT 'ok' CHECK (parse_status IN ('ok', 'partial', 'failed')),
  parse_notes TEXT,                    -- what could not be extracted (fail-loud UX)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own cv" ON cv_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cv" ON cv_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages cv" ON cv_documents FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_cv_documents_user ON cv_documents(user_id, created_at DESC);

-- ============================================================
-- 3. INTAKES (intake chat + post-reveal chat, same table)
-- ============================================================

CREATE TABLE IF NOT EXISTS intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'intake' CHECK (stage IN ('intake', 'post_reveal')),
  reveal_id UUID,                      -- set on post_reveal messages (FK added below)
  metadata JSONB,                      -- optional: token counts, model version
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own intakes" ON intakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own intakes" ON intakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages intakes" ON intakes FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_intakes_user_stage ON intakes(user_id, stage, created_at ASC);

-- ============================================================
-- 4. PATTERN REVEALS
-- ============================================================

CREATE TABLE IF NOT EXISTS pattern_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cv_document_id UUID REFERENCES cv_documents(id),

  -- Final reveal fields (from the revise or draft pass, whichever was final)
  pattern_paragraph TEXT,              -- null = honest fallback (no grounded pattern found)
  evidence_json JSONB,                 -- array of {quote, source, why_it_matters}
  failure_prediction TEXT,             -- one sentence: 3 role properties that will keep failing
  thrive_conditions TEXT,              -- structural inverse of failure_prediction
  one_question TEXT,                   -- sharpening/pushback question

  -- Multi-pass audit trail
  draft_json JSONB,                    -- raw output of draft pass
  critique_json JSONB,                 -- raw output of critique pass (gate results + notes)
  revise_json JSONB,                   -- raw output of revise pass (if ran)
  final_pass TEXT DEFAULT 'draft' CHECK (final_pass IN ('draft', 'revise', 'fallback')),

  -- Synthesis status
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

-- Add FK from intakes back to reveals
ALTER TABLE intakes ADD CONSTRAINT fk_intakes_reveal FOREIGN KEY (reveal_id) REFERENCES pattern_reveals(id);

-- ============================================================
-- 5. PATTERN REVEAL REACTIONS (primary Phase 1 resonance signal)
-- ============================================================

CREATE TABLE IF NOT EXISTS pattern_reveal_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reveal_id UUID NOT NULL REFERENCES pattern_reveals(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('resonated', 'somewhat', 'generic')),
  note TEXT,                           -- optional free text "what did this miss?"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reveal_id)           -- one reaction per user per reveal
);

ALTER TABLE pattern_reveal_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reactions" ON pattern_reveal_reactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own reactions" ON pattern_reveal_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reactions" ON pattern_reveal_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages reactions" ON pattern_reveal_reactions FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 6. LAST-ACTIVE TRIGGER (update profiles.last_active on intake insert)
-- ============================================================

CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_active = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS intakes_update_last_active ON intakes;
CREATE TRIGGER intakes_update_last_active
  AFTER INSERT ON intakes
  FOR EACH ROW EXECUTE FUNCTION update_last_active();
