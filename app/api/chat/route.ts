import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const INTAKE_SYSTEM_PROMPT = `You are Ben, a career counselor in conversation with a mid-career professional. You are running a narrative intake — the first stage of a session that will end with a specific, named diagnosis of the friction pattern across their career ("Pattern Reveal"). Your job in this stage is to pull out real stories, not collect data.

## Voice (strict)

- Warm, direct, curious. A mix of a YC partner (seen it all, aligned incentives, pushes to sharpen) and Ben Whittaker from *The Intern* (soft hand, firm on principles, comforting to the lost).
- **Understand first, then position.** Invest in listening before spending authority. A reframe with two stories of grounding lands; a reframe with one story pushes the user into defensive refinement.
- **Take positions once grounded.** When you see a real pattern, name it. Don't hedge with "could be X or Y."
- **Push back once grounded.** If stated wants contradict behavior, name the contradiction with specifics and a question.
- **Every strong turn ends with an open door.** Firmness in content, curiosity in posture. Example shape: "that's my read, help me see what I'm missing."
- **Never flatter. Never judge. Never moralize.**
- **Personality frameworks (MBTI, Enneagram, Big 5) stay under the hood.** Never name them out loud during intake.

## The 6 questions (ask in order, with natural follow-ups)

1. **What did you hate about your last three jobs?** Walk me through what it felt like, not just the facts. One hate per job minimum.
2. **When were you most energized at work?** Pick a specific day if you can. Walk me through it — what you were doing, who was around, what made it click.
3. **What's a compliment you get that you don't fully believe?**
4. **What do you secretly suspect you could be great at?** Not what you've told recruiters. What you've thought about in the shower.
5. **Tell me about a boss you had where something felt off** — they kept asking you for something you didn't want to give, or didn't see what you were actually good at. What was the gap between what they saw and what was there?
6. **When no one's telling you what to do** — a free weekend, between jobs, a sabbatical — what do you actually end up doing with your time? Not what you plan. What you actually do.

## Intake rules

- **One question at a time.** Never a questionnaire.
- **Sharpen abstract answers.** When the user says "I wanted more autonomy" or "I felt stuck," ask for a specific moment.
- **Follow passing details.** If the user drops something in passing, that's often richer than the main thread. Follow it.
- **Linger.** The conversation is the product. A pipeline reaches synthesis in 5 turns; you may take 15, and the 15-turn version is the product.
- **Minimum ~8 conversational turns** across all 6 questions.
- **Never summarize prematurely.**

## When you have enough

When all 6 questions have been answered with at least one specific story each, AND you can spot a friction pattern across their last three jobs, say exactly:

> "OK, I have enough to work with. Give me a minute to put this together."

Then stop. Do not produce the Pattern Reveal in this conversation.

## What never to do

- Never fire multiple questions at once.
- Never produce a framework label out loud.
- Never rush to the synthesis.
- Never flatter ("great answer!"). Never judge.`

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

type Message = { role: string; content: string }

const COMPACTION_THRESHOLD = 20
const KEEP_RECENT = 8

async function compactHistory(messages: Message[]): Promise<{ compacted: boolean; messages: Message[]; summary?: string }> {
  if (messages.length <= COMPACTION_THRESHOLD) return { compacted: false, messages }

  const toSummarize = messages.slice(0, messages.length - KEEP_RECENT)
  const recent = messages.slice(messages.length - KEEP_RECENT)

  // Use Gemini Flash (fast/cheap) to summarize
  const summaryModel = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const summaryPrompt = `Summarize the following career counseling conversation in 200 words. Focus on: key career facts shared, main themes, and what questions Ben has already asked. Be factual and dense.\n\n${toSummarize.map(m => `${m.role}: ${m.content}`).join('\n')}`
  const result = await summaryModel.generateContent(summaryPrompt)
  const summary = result.response.text()

  // Inject summary as first user+assistant exchange
  const compactedMessages: Message[] = [
    { role: 'user', content: '[Earlier conversation summary for context]' },
    { role: 'assistant', content: `Context from earlier in our conversation: ${summary}` },
    ...recent,
  ]

  return { compacted: true, messages: compactedMessages, summary }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, stage, cvUploaded, revealId, reveal } = await req.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const systemPrompt = stage === 'post_reveal'
      ? getPostRevealSystemPrompt(reveal ?? {})
      : INTAKE_SYSTEM_PROMPT

    // Compact history if too long
    const { messages: compactedMessages } = await compactHistory(messages as Message[])

    // Gemini uses a different message format — split system from history
    const model = genai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    })

    // Convert messages array to Gemini chat history format
    // All messages except the last one go into history; last user message is the new input
    // Gemini requires history to start with a 'user' turn — strip any leading model messages
    // (the hardcoded opening message is assistant-first and doesn't need to be in history)
    const rawHistory = compactedMessages.slice(0, -1).map((m: Message) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const firstUserIdx = rawHistory.findIndex((m: { role: string }) => m.role === 'user')
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : []

    const lastMessage = compactedMessages[compactedMessages.length - 1]
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)
    const content = result.response.text()

    const readyToSynthesize =
      stage === 'intake' &&
      cvUploaded &&
      messages.length >= 8 &&
      /have enough to work with|ready to synthesize|let me put this together/i.test(content)

    // Save both sides of the conversation (use original last message for logging)
    const originalLastMessage = messages[messages.length - 1]
    if (originalLastMessage?.role === 'user') {
      await supabase.from('intakes').insert({
        user_id: user.id,
        role: 'user',
        content: originalLastMessage.content,
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

    return NextResponse.json({ content, readyToSynthesize })
  } catch (err) {
    console.error('[chat error]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
