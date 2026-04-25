import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFileSync } from 'fs'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function loadPrompt(name: string): string {
  try {
    const p = path.join(process.cwd(), '..', 'dogfood', 'prompts', name)
    return readFileSync(p, 'utf-8')
  } catch {
    return ''
  }
}

async function runPass(systemPrompt: string, userContent: string): Promise<string> {
  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-pro-preview-05-06',
    systemInstruction: systemPrompt,
  })
  const result = await model.generateContent(userContent)
  return result.response.text()
}

function parseJSON(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```\s*$/m, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function formatAssessmentContext(assessment: Record<string, unknown> | null): string {
  if (!assessment) return ''

  const lines: string[] = []

  if (assessment.mbti) lines.push(`- MBTI: ${assessment.mbti}`)

  if (assessment.enneagram) {
    const enneagramLabels: Record<number, string> = {
      1: 'Perfectionist', 2: 'Helper', 3: 'Achiever', 4: 'Individualist',
      5: 'Investigator', 6: 'Loyalist', 7: 'Enthusiast', 8: 'Challenger', 9: 'Peacemaker',
    }
    const num = assessment.enneagram as number
    lines.push(`- Enneagram: ${num} (${enneagramLabels[num] ?? ''})`)
  }

  const oceanFields = [
    { key: 'ocean_openness', label: 'Openness' },
    { key: 'ocean_conscientiousness', label: 'Conscientiousness' },
    { key: 'ocean_extraversion', label: 'Extraversion' },
    { key: 'ocean_agreeableness', label: 'Agreeableness' },
    { key: 'ocean_neuroticism', label: 'Neuroticism' },
  ]
  const oceanParts = oceanFields
    .filter(f => assessment[f.key] != null)
    .map(f => `${f.label} ${assessment[f.key]}/10`)

  if (oceanParts.length > 0) lines.push(`- Big 5: ${oceanParts.join(', ')}`)

  if (lines.length === 0) return ''

  return `\n\nPERSONALITY CONTEXT (self-reported):\n${lines.join('\n')}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // revealId may be provided if coming from /assessment (resume a pending reveal)
  const incomingRevealId: string | null = body.revealId ?? null
  let messages: Array<{ role: string; content: string }> = body.messages ?? []

  // Fetch the user's latest CV
  const { data: cvDoc } = await supabase
    .from('cv_documents')
    .select('id, parsed_text')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const cvText = cvDoc?.parsed_text ?? '(no CV uploaded)'

  let revealId: string

  if (incomingRevealId) {
    // Resume a pending reveal — fetch transcript from draft_json
    const { data: existingReveal } = await supabase
      .from('pattern_reveals')
      .select('id, draft_json')
      .eq('id', incomingRevealId)
      .eq('user_id', user.id)
      .single()

    if (!existingReveal) {
      return NextResponse.json({ error: 'Reveal not found' }, { status: 404 })
    }

    revealId = existingReveal.id

    // Extract stored transcript if messages not provided
    if (messages.length === 0 && existingReveal.draft_json?.pending_transcript) {
      messages = existingReveal.draft_json.pending_transcript as Array<{ role: string; content: string }>
    }

    // Update status to generating and clear temp draft_json
    await supabase
      .from('pattern_reveals')
      .update({ status: 'generating', draft_json: null, cv_document_id: cvDoc?.id ?? null })
      .eq('id', revealId)
  } else {
    // Fresh reveal — create the row
    const { data: revealRow } = await supabase
      .from('pattern_reveals')
      .insert({
        user_id: user.id,
        cv_document_id: cvDoc?.id ?? null,
        status: 'generating',
        model_used: 'gemini-2.5-pro-preview-05-06',
      })
      .select('id')
      .single()

    if (!revealRow) {
      return NextResponse.json({ error: 'Failed to create reveal' }, { status: 500 })
    }

    revealId = revealRow.id
  }

  // Fetch the user's latest assessment (linked to this reveal or most recent)
  const { data: assessment } = await supabase
    .from('assessments')
    .select('mbti, enneagram, ocean_openness, ocean_conscientiousness, ocean_extraversion, ocean_agreeableness, ocean_neuroticism')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const transcriptText = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Ben'}: ${m.content}`)
    .join('\n\n')

  const assessmentContext = formatAssessmentContext(assessment as Record<string, unknown> | null)

  // Run the 3-pass pipeline async
  runSynthesisPipeline(supabase, revealId, transcriptText, cvText, assessmentContext).catch(console.error)

  // Return the reveal ID immediately so the client can navigate to /reveal/[id]
  return NextResponse.json({ revealId })
}

async function runSynthesisPipeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  revealId: string,
  transcriptText: string,
  cvText: string,
  assessmentContext: string
) {
  const draftPrompt = loadPrompt('02-draft.md')
  const critiquePrompt = loadPrompt('03-critique.md')
  const revisePrompt = loadPrompt('04-revise.md')

  try {
    // === PASS 1: DRAFT ===
    const draftInput = `${draftPrompt}

---

## Intake transcript
${transcriptText}

## CV text
${cvText}${assessmentContext}

## Goals (optional)
none

Now produce the draft Pattern Reveal per the schema above. Return only the JSON object.`

    const draftRaw = await runPass(draftPrompt, draftInput)
    const draftJSON = parseJSON(draftRaw)

    if (!draftJSON) {
      await supabase.from('pattern_reveals').update({
        status: 'failed',
        draft_json: { raw: draftRaw, error: 'non-json output' },
      }).eq('id', revealId)
      return
    }

    // === PASS 2: CRITIQUE ===
    const critiqueInput = `${critiquePrompt}

---

## Original draft
${JSON.stringify(draftJSON, null, 2)}

## Intake transcript
${transcriptText}

## CV text
${cvText}${assessmentContext}

Now run the 4-criterion gate check. Return only the JSON object.`

    const critiqueRaw = await runPass(critiquePrompt, critiqueInput)
    const critiqueJSON = parseJSON(critiqueRaw)

    if (!critiqueJSON) {
      await saveFinalReveal(supabase, revealId, draftJSON, null, null, 'draft')
      return
    }

    const allPass = critiqueJSON.overall_pass === true && critiqueJSON.horoscope_drift_detected === false

    if (allPass) {
      await saveFinalReveal(supabase, revealId, draftJSON, critiqueJSON, null, 'draft')
      return
    }

    // === PASS 3: REVISE ===
    const reviseInput = `${revisePrompt}

---

## Original draft
${JSON.stringify(draftJSON, null, 2)}

## Critique
${JSON.stringify(critiqueJSON, null, 2)}

## Intake transcript
${transcriptText}

## CV text
${cvText}${assessmentContext}

Now produce the revised Pattern Reveal per the schema. Return only the JSON object.`

    const reviseRaw = await runPass(revisePrompt, reviseInput)
    const reviseJSON = parseJSON(reviseRaw)

    if (!reviseJSON) {
      await saveFinalReveal(supabase, revealId, draftJSON, critiqueJSON, { raw: reviseRaw, error: 'non-json output' }, 'draft')
      return
    }

    const isFallback = reviseJSON.pattern_paragraph === null
    await saveFinalReveal(supabase, revealId, draftJSON, critiqueJSON, reviseJSON, isFallback ? 'fallback' : 'revise')
  } catch (err) {
    await supabase.from('pattern_reveals').update({ status: 'failed' }).eq('id', revealId)
    console.error('[reveal pipeline error]', err)
  }
}

async function saveFinalReveal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  revealId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draftJSON: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  critiqueJSON: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviseJSON: any,
  finalPass: 'draft' | 'revise' | 'fallback'
) {
  const final = finalPass === 'revise' ? reviseJSON : draftJSON
  await supabase.from('pattern_reveals').update({
    pattern_paragraph: final.pattern_paragraph ?? null,
    evidence_json: final.evidence ?? null,
    failure_prediction: final.failure_prediction ?? null,
    thrive_conditions: final.thrive_conditions ?? null,
    one_question: final.one_question ?? null,
    draft_json: draftJSON,
    critique_json: critiqueJSON,
    revise_json: reviseJSON,
    final_pass: finalPass,
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', revealId)
}
