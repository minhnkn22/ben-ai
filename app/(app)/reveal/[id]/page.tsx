import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RevealClient from './RevealClient'

type Evidence = {
  quote: string
  source: 'narrative' | 'cv'
  why_it_matters: string
}

type CareerPath = {
  role: string
  why_it_fits: string
  what_the_pivot_looks_like: string
  watch_out_for: string
}

type PatternReveal = {
  id: string
  headline?: string
  pattern_paragraph: string | null
  evidence_json: Evidence[] | null
  failure_prediction: string | null
  thrive_conditions: string | null
  one_question: string | null
  career_paths: CareerPath[] | null
  status: string
}

export default async function RevealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: reveal } = await supabase
    .from('pattern_reveals')
    .select('id, headline, pattern_paragraph, evidence_json, failure_prediction, thrive_conditions, one_question, career_paths, status')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!reveal) notFound()

  if (reveal.status === 'pending' || reveal.status === 'generating') {
    return <RevealClient reveal={reveal as PatternReveal} polling={true} />
  }

  return <RevealClient reveal={reveal as PatternReveal} polling={false} />
}
