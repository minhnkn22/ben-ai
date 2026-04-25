'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Message = { role: 'user' | 'assistant'; content: string }

const WAIT_MESSAGES = [
  'Reading your story…',
  'Finding the pattern…',
  'Checking the details…',
  'Almost there…',
]

const OPENING_MESSAGE = "Tell me what you hated about your last three jobs. Start wherever feels most alive — not the polished version, the real one."

export default function IntakePage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cvUploaded, setCvUploaded] = useState(false)
  const [cvName, setCvName] = useState<string | null>(null)
  const [synthesizing, setSynthesizing] = useState(false)
  const [waitMsg, setWaitMsg] = useState(WAIT_MESSAGES[0])
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, stage: 'intake', cvUploaded }),
      })

      if (!res.ok) { console.error('Chat API error:', res.status); return }

      const data = await res.json()
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
      }
      if (data.readyToSynthesize && cvUploaded) {
        await routeToAssessment(newMessages)
        return
      }
    } catch (err) {
      console.error('sendMessage error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvName(file.name)
    const formData = new FormData()
    formData.append('cv', file)
    try {
      const res = await fetch('/api/cv-upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ok) {
        setCvUploaded(true)
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Got it — I can see your CV (${file.name}). Before I go further: is there anything important that isn't on here? A role you left for reasons that aren't captured, a project that didn't make it, something about how you left a job that matters?`,
          },
        ])
      }
    } catch (err) {
      console.error('CV upload error:', err)
    }
  }

  async function routeToAssessment(transcriptMessages: Message[]) {
    setSynthesizing(true)
    let idx = 0
    waitTimerRef.current = setInterval(() => {
      idx = (idx + 1) % WAIT_MESSAGES.length
      setWaitMsg(WAIT_MESSAGES[idx])
    }, 8000)

    try {
      const res = await fetch('/api/reveal/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: transcriptMessages }),
      })
      const data = await res.json()
      if (data.revealId) {
        sessionStorage.setItem(`transcript_${data.revealId}`, JSON.stringify(transcriptMessages))
        router.push(`/assessment?reveal_id=${data.revealId}`)
      } else {
        sessionStorage.setItem('pending_transcript', JSON.stringify(transcriptMessages))
        router.push('/assessment')
      }
    } catch (err) {
      console.error('routeToAssessment error:', err)
      sessionStorage.setItem('pending_transcript', JSON.stringify(transcriptMessages))
      router.push('/assessment')
    } finally {
      if (waitTimerRef.current) clearInterval(waitTimerRef.current)
      setSynthesizing(false)
    }
  }

  if (synthesizing) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', fontFamily: 'var(--font)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--text)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 20px',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{waitMsg}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', fontFamily: 'var(--font)',
    }}>
      {/* Header — CV upload only, no wordmark */}
      <header style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 20px', height: '56px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* CV upload */}
        {!cvUploaded ? (
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '6px 12px',
            border: '1px solid var(--border)', borderRadius: '6px',
            transition: 'border-color 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Upload CV
            <input type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleCvUpload} />
          </label>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', color: 'var(--text-muted)',
            padding: '6px 12px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {cvName}
          </div>
        )}
      </header>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '0',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '20px',
              }}
            >
              {msg.role === 'assistant' ? (
                <div style={{ maxWidth: '88%' }}>
                  <p style={{
                    fontSize: '15px', lineHeight: 1.75,
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </p>
                </div>
              ) : (
                <div style={{
                  maxWidth: '72%',
                  background: 'var(--user-bubble)',
                  borderRadius: '18px',
                  padding: '10px 16px',
                }}>
                  <p style={{
                    fontSize: '15px', lineHeight: 1.65,
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </p>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '4px', padding: '12px 4px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--border-focus)',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        padding: '12px 20px 16px',
        background: 'var(--bg)',
      }}>
        <div style={{
          maxWidth: '680px', margin: '0 auto',
          display: 'flex', gap: '10px', alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(e.target) }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Reply…"
            disabled={loading}
            rows={1}
            style={{
              flex: 1, padding: '11px 14px',
              fontSize: '15px', lineHeight: 1.5,
              border: '1px solid var(--border)',
              borderRadius: '12px', outline: 'none',
              resize: 'none', overflow: 'hidden',
              color: 'var(--text)', background: 'var(--bg)',
              fontFamily: 'var(--font)',
              transition: 'border-color 0.15s',
              opacity: loading ? 0.5 : 1,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              flexShrink: 0,
              width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-hover)',
              color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
              border: 'none', borderRadius: '10px',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
        <p style={{
          maxWidth: '680px', margin: '8px auto 0',
          fontSize: '11px', color: 'var(--text-placeholder)', textAlign: 'center',
        }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
