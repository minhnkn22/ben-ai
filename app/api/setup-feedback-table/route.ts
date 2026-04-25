import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if table already exists
  const { error: checkError } = await supabase.from('feedback').select('id').limit(1)
  if (!checkError) {
    return NextResponse.json({ ok: true, message: 'Table already exists' })
  }

  // Table does not exist — return the SQL to run manually in Supabase dashboard
  const sql = `
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
`.trim()

  return NextResponse.json({
    ok: false,
    error: checkError.message,
    hint: 'Run the SQL below in the Supabase SQL Editor: https://supabase.com/dashboard/project/jvogcdhcaknhkdusrpca/sql/new',
    sql,
  })
}
