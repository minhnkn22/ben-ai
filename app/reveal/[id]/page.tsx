import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import RevealClient from './RevealClient'

type Evidence = {
  quote: string
  source: 'narrative' | 'cv'
  why_it_matters: string
}

type PatternReveal = {
  id: string
  pattern_paragraph: string | null
  evidence_json: Evidence[] | null
  failure_prediction: string | null
  thrive_conditions: string | null
  one_question: string | null
  status: string
}

export default async function RevealPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reveal } = await supabase
    .from('pattern_reveals')
    .select('id, pattern_paragraph, evidence_json, failure_prediction, thrive_conditions, one_question, status')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!reveal) notFound()

  if (reveal.status === 'pending' || reveal.status === 'generating') {
    // Still synthesizing — client will poll
    return <RevealClient reveal={reveal as PatternReveal} polling={true} />
  }

  return <RevealClient reveal={reveal as PatternReveal} polling={false} />
}
