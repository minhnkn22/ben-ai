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
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  })
  const result = await model.generateContent(userContent)
  return result.response.text()
}

function parseJSON(raw: string): Record<string, unknown> | null {
  // Strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```\s*$/m, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  // Fetch the user's latest CV
  const { data: cvDoc } = await supabase
    .from('cv_documents')
    .select('id, parsed_text')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const cvText = cvDoc?.parsed_text ?? '(no CV uploaded)'
  const transcriptText = messages
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Ben'}: ${m.content}`)
    .join('\n\n')

  // Create the reveal row in pending state
  const { data: revealRow } = await supabase
    .from('pattern_reveals')
    .insert({
      user_id: user.id,
      cv_document_id: cvDoc?.id ?? null,
      status: 'generating',
      model_used: 'gemini-2.0-flash',
    })
    .select('id')
    .single()

  if (!revealRow) {
    return NextResponse.json({ error: 'Failed to create reveal' }, { status: 500 })
  }

  const revealId = revealRow.id

  // Run the 3-pass pipeline async
  runSynthesisPipeline(supabase, revealId, user.id, transcriptText, cvText).catch(console.error)

  // Return the reveal ID immediately so the client can navigate to /reveal/[id]
  return NextResponse.json({ revealId })
}

async function runSynthesisPipeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  revealId: string,
  userId: string,
  transcriptText: string,
  cvText: string
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
${cvText}

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
${cvText}

Now run the 4-criterion gate check. Return only the JSON object.`

    const critiqueRaw = await runPass(critiquePrompt, critiqueInput)
    const critiqueJSON = parseJSON(critiqueRaw)

    if (!critiqueJSON) {
      // Critique failed to return JSON — promote draft anyway, flag it
      await saveFinalReveal(supabase, revealId, draftJSON, null, null, 'draft')
      return
    }

    const allPass = critiqueJSON.overall_pass === true && critiqueJSON.horoscope_drift_detected === false

    if (allPass) {
      // Draft cleared the gate — no revise pass needed
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
${cvText}

Now produce the revised Pattern Reveal per the schema. Return only the JSON object.`

    const reviseRaw = await runPass(revisePrompt, reviseInput)
    const reviseJSON = parseJSON(reviseRaw)

    if (!reviseJSON) {
      // Revise failed to return JSON — promote draft
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
