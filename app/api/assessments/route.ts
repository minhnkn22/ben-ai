import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    mbti,
    enneagram,
    ocean_openness,
    ocean_conscientiousness,
    ocean_extraversion,
    ocean_agreeableness,
    ocean_neuroticism,
    reveal_id,
  } = body

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      user_id: user.id,
      reveal_id: reveal_id ?? null,
      mbti: mbti ?? null,
      enneagram: enneagram ?? null,
      ocean_openness: ocean_openness ?? null,
      ocean_conscientiousness: ocean_conscientiousness ?? null,
      ocean_extraversion: ocean_extraversion ?? null,
      ocean_agreeableness: ocean_agreeableness ?? null,
      ocean_neuroticism: ocean_neuroticism ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
