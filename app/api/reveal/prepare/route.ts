import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Creates a pending reveal row and returns the ID so the intake page
// can pass it to /assessment before triggering synthesis.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  // Fetch the user's latest CV
  const { data: cvDoc } = await supabase
    .from('cv_documents')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Create a pending reveal row
  const { data: revealRow, error } = await supabase
    .from('pattern_reveals')
    .insert({
      user_id: user.id,
      cv_document_id: cvDoc?.id ?? null,
      status: 'pending',
      model_used: 'gemini-2.0-flash',
    })
    .select('id')
    .single()

  if (error || !revealRow) {
    return NextResponse.json({ error: 'Failed to create reveal' }, { status: 500 })
  }

  // Store the transcript in a temp table or metadata field
  // For now, we update a metadata field on the reveal row
  await supabase
    .from('pattern_reveals')
    .update({ draft_json: { pending_transcript: messages } })
    .eq('id', revealRow.id)

  return NextResponse.json({ revealId: revealRow.id })
}
