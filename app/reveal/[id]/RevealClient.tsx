'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    try {
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
      if (data.content) setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err) {
      console.error('post-reveal chat error:', err)
    } finally {
      setChatLoading(false)
    }
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, letterSpacing: '0.09em',
    textTransform: 'uppercase' as const, color: 'var(--text-muted)',
    marginBottom: '10px', display: 'block',
  }

  // Generating state
  if (reveal.status === 'pending' || reveal.status === 'generating' || !reveal.pattern_paragraph) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', fontFamily: 'var(--font)',
      }}>
        <nav style={{ padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <Link href="/intake" style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', textDecoration: 'none' }}>Ben</Link>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid var(--border)', borderTopColor: 'var(--text)',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
            }} />
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Finding the pattern…</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Honest fallback — no pattern found
  if (reveal.status === 'completed' && !reveal.pattern_paragraph) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)',
      }}>
        <nav style={{ padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <Link href="/intake" style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', textDecoration: 'none' }}>Ben</Link>
        </nav>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', color: 'var(--text)', lineHeight: 1.7, marginBottom: '16px' }}>
            I&apos;m not confident I see the pattern yet.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65 }}>
            {reveal.one_question ?? 'Tell me one more story and I can go further.'}
          </p>
          <Link href="/intake" style={{
            display: 'inline-block', marginTop: '32px',
            padding: '11px 24px', fontSize: '14px', fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            textDecoration: 'none', borderRadius: '8px',
          }}>
            Keep talking
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', fontFamily: 'var(--font)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
      }}>
        <Link href="/intake" style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', textDecoration: 'none' }}>
          Ben
        </Link>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Label */}
        <p style={{ ...sectionLabel, marginBottom: '24px' }}>Your Pattern Reveal</p>

        {/* 1. Pattern paragraph — the main event */}
        <section style={{ marginBottom: '48px' }}>
          <p style={{
            fontSize: '18px', lineHeight: 1.8,
            color: 'var(--text)', fontWeight: 400,
          }}>
            {reveal.pattern_paragraph}
          </p>
        </section>

        {/* 2. Evidence */}
        {reveal.evidence_json && reveal.evidence_json.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <span style={sectionLabel}>Evidence</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reveal.evidence_json.map((ev, i) => (
                <div key={i} style={{
                  borderLeft: '2px solid var(--border)',
                  paddingLeft: '16px',
                }}>
                  <p style={{ fontSize: '14px', color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.65, marginBottom: '4px' }}>
                    &ldquo;{ev.quote}&rdquo;
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {ev.why_it_matters}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3 + 4. Trap & Flip — side by side */}
        {(reveal.failure_prediction || reveal.thrive_conditions) && (
          <section style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
            marginBottom: '40px',
          }}>
            {reveal.failure_prediction && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <span style={sectionLabel}>The trap</span>
                <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                  {reveal.failure_prediction}
                </p>
              </div>
            )}
            {reveal.thrive_conditions && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <span style={sectionLabel}>The flip</span>
                <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                  {reveal.thrive_conditions}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 5. Ben's question */}
        {reveal.one_question && (
          <section style={{ marginBottom: '48px' }}>
            <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic' }}>
              {reveal.one_question}
            </p>
          </section>
        )}

        {/* 6. Reaction */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: '32px', marginBottom: '40px' }}>
          {!reactionSaved ? (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Does this land?
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {([
                  { value: 'resonated', label: 'Yes, exactly' },
                  { value: 'somewhat', label: 'Close but not quite' },
                  { value: 'generic', label: 'Feels like a horoscope' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReaction(opt.value)}
                    style={{
                      padding: '8px 14px', fontSize: '13px',
                      border: '1px solid',
                      borderColor: reaction === opt.value ? 'var(--accent)' : 'var(--border)',
                      background: reaction === opt.value ? 'var(--accent)' : 'var(--bg)',
                      color: reaction === opt.value ? '#fff' : 'var(--text-muted)',
                      borderRadius: '6px', cursor: 'pointer',
                      fontFamily: 'var(--font)', transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {reaction && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    value={reactionNote}
                    onChange={e => setReactionNote(e.target.value)}
                    placeholder="What did this miss? (optional)"
                    rows={2}
                    style={{
                      width: '100%', padding: '10px 14px',
                      fontSize: '14px', border: '1px solid var(--border)',
                      borderRadius: '8px', outline: 'none', resize: 'none',
                      color: 'var(--text)', background: 'var(--bg)',
                      fontFamily: 'var(--font)',
                    }}
                  />
                  <button
                    onClick={saveReaction}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '9px 18px', fontSize: '13px', fontWeight: 500,
                      background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontFamily: 'var(--font)',
                    }}
                  >
                    Save
                  </button>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Got it. Keep talking — I&apos;m here.
            </p>
          )}
        </section>

        {/* 7. Post-reveal chat */}
        {reactionSaved && (
          <section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {msg.role === 'assistant' ? (
                    <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text)', maxWidth: '88%' }}>
                      {msg.content}
                    </p>
                  ) : (
                    <div style={{
                      background: 'var(--user-bubble)', borderRadius: '18px',
                      padding: '10px 16px', maxWidth: '72%',
                    }}>
                      <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--text)' }}>{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--border-focus)',
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder="Ask anything…"
                disabled={chatLoading}
                style={{
                  flex: 1, padding: '11px 14px',
                  fontSize: '14px', border: '1px solid var(--border)',
                  borderRadius: '10px', outline: 'none',
                  color: 'var(--text)', background: 'var(--bg)',
                  fontFamily: 'var(--font)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: '11px 18px', fontSize: '14px', fontWeight: 500,
                  background: chatInput.trim() && !chatLoading ? 'var(--accent)' : 'var(--bg-hover)',
                  color: chatInput.trim() && !chatLoading ? '#fff' : 'var(--text-muted)',
                  border: 'none', borderRadius: '10px',
                  cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font)',
                }}
              >
                Send
              </button>
            </div>
          </section>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
