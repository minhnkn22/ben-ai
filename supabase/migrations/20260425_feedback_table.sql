CREATE TABLE IF NOT EXISTS feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  message text NOT NULL,
  page_url text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
  ON feedback FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own feedback"
  ON feedback FOR SELECT USING (auth.uid() = user_id);
