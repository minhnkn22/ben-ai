'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

type Props = {
  reveal: PatternReveal
  polling: boolean
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function RevealClient({ reveal: initialReveal, polling }: Props) {
  const [reveal, setReveal] = useState(initialReveal)
  const [reaction, setReaction] = useState<'resonated' | 'somewhat' | 'generic' | null>(null)
  const [reactionNote, setReactionNote] = useState('')
  const [reactionSaved, setReactionSaved] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Poll until synthesis completes
  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('pattern_reveals')
        .select('id, pattern_paragraph, evidence_json, failure_prediction, thrive_conditions, one_question, status')
        .eq('id', reveal.id)
        .single()
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        setReveal(data as PatternReveal)
        clearInterval(interval)
        router.refresh()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [polling, reveal.id, supabase, router])

  async function saveReaction() {
    if (!reaction) return
    await supabase.from('pattern_reveal_reactions').upsert({
      reveal_id: reveal.id,
      verdict: reaction,
      note: reactionNote || null,
    })
    setReactionSaved(true)
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        stage: 'post_reveal',
        revealId: reveal.id,
        reveal: {
          pattern_paragraph: reveal.pattern_paragraph,
          failure_prediction: reveal.failure_prediction,
          thrive_conditions: reveal.thrive_conditions,
        },
      }),
    })
    const data = await res.json()
    if (data.content) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    }
    setChatLoading(false)
  }

  // Honest fallback state
  if (reveal.status === 'completed' && !reveal.pattern_paragraph) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="max-w-lg px-6 text-center">
          <p className="text-stone-700 text-lg mb-4">
            I&apos;m not confident I see the pattern yet.
          </p>
          <p className="text-stone-500 text-sm">
            {reveal.one_question ?? 'Tell me one more story and I can go further.'}
          </p>
        </div>
      </div>
    )
  }

  if (reveal.status === 'pending' || reveal.status === 'generating' || !reveal.pattern_paragraph) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400 text-sm animate-pulse">Finding the pattern…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">

        {/* 1. Pattern paragraph */}
        <section>
          <p className="text-stone-800 text-lg leading-relaxed">{reveal.pattern_paragraph}</p>
        </section>

        {/* 2. Evidence */}
        {reveal.evidence_json && reveal.evidence_json.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Evidence</h2>
            <ul className="space-y-4">
              {reveal.evidence_json.map((ev, i) => (
                <li key={i} className="border-l-2 border-stone-200 pl-4">
                  <p className="text-stone-700 text-sm italic">&ldquo;{ev.quote}&rdquo;</p>
                  <p className="text-stone-400 text-xs mt-1">{ev.why_it_matters}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 3. Failure prediction */}
        {reveal.failure_prediction && (
          <section>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">The trap</h2>
            <p className="text-stone-700 text-sm">{reveal.failure_prediction}</p>
          </section>
        )}

        {/* 4. Thrive conditions */}
        {reveal.thrive_conditions && (
          <section>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">The flip</h2>
            <p className="text-stone-700 text-sm">{reveal.thrive_conditions}</p>
          </section>
        )}

        {/* 5. Ben's question */}
        {reveal.one_question && (
          <section>
            <p className="text-stone-600 text-base italic">{reveal.one_question}</p>
          </section>
        )}

        {/* 6. Reaction widget */}
        {!reactionSaved ? (
          <section className="border-t border-stone-100 pt-8">
            <p className="text-stone-500 text-sm mb-4">Does this land?</p>
            <div className="flex gap-3 mb-4">
              {(['resonated', 'somewhat', 'generic'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setReaction(v)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    reaction === v
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {v === 'resonated' ? 'oh' : v === 'somewhat' ? 'close but not quite' : 'meh / horoscope'}
                </button>
              ))}
            </div>
            {reaction && (
              <div className="space-y-3">
                <textarea
                  value={reactionNote}
                  onChange={e => setReactionNote(e.target.value)}
                  placeholder="What did this miss? (optional)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
                />
                <button
                  onClick={saveReaction}
                  className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800 transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="border-t border-stone-100 pt-8">
            <p className="text-stone-400 text-sm">Got it. Keep talking — I&apos;m here.</p>
          </section>
        )}

        {/* 7. Post-reveal chat */}
        {reactionSaved && (
          <section className="space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-prose px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-stone-900 text-white rounded-br-sm'
                      : 'bg-white text-stone-800 border border-stone-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <span className="text-stone-400 text-sm">…</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder="Ask anything…"
                disabled={chatLoading}
                className="flex-1 px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-50"
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
