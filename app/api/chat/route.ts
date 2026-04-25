import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Load intake system prompt from dogfood prompts (single source of truth for now)
function getIntakeSystemPrompt(): string {
  try {
    const p = path.join(process.cwd(), '..', 'dogfood', 'prompts', '01-intake-system.md')
    return readFileSync(p, 'utf-8')
  } catch {
    return `You are Ben, a career counselor AI. Your job is to understand the user's career history through a thoughtful conversation. Ask one question at a time. Be direct, warm, and curious. Listen carefully.`
  }
}

function getPostRevealSystemPrompt(reveal: {
  pattern_paragraph?: string | null
  failure_prediction?: string | null
  thrive_conditions?: string | null
}): string {
  return `You are Ben, a career counselor AI. You just delivered a Pattern Reveal to this user. Here is what you told them:

---
${reveal.pattern_paragraph ?? '(pattern not available)'}

The trap: ${reveal.failure_prediction ?? ''}

The flip: ${reveal.thrive_conditions ?? ''}
---

Continue the conversation. The user may want to go deeper, push back, ask about specific jobs, or explore what this means practically. Follow their lead. Take positions once you have evidence. Push back when warranted. Do not flatter. Do not rush to new topics — linger on what the user brings up.`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, stage, cvUploaded, revealId, reveal } = await req.json()

  const systemPrompt = stage === 'post_reveal'
    ? getPostRevealSystemPrompt(reveal ?? {})
    : getIntakeSystemPrompt()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  // Detect "I have enough to work with" signal — simple heuristic
  const readyToSynthesize =
    stage === 'intake' &&
    cvUploaded &&
    messages.length >= 8 &&
    /have enough to work with|ready to synthesize|let me put this together/i.test(content)

  // Save to intakes table
  if (stage === 'intake' || stage === 'post_reveal') {
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg?.role === 'user') {
      await supabase.from('intakes').insert({
        user_id: user.id,
        role: 'user',
        content: lastUserMsg.content,
        stage,
        reveal_id: stage === 'post_reveal' ? revealId : null,
      })
    }
    await supabase.from('intakes').insert({
      user_id: user.id,
      role: 'assistant',
      content,
      stage,
      reveal_id: stage === 'post_reveal' ? revealId : null,
    })
  }

  return NextResponse.json({ content, readyToSynthesize })
}
