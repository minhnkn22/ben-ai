'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Message = { role: 'user' | 'assistant'; content: string }

const WAIT_MESSAGES = [
  'Reading your CV…',
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
  const router = useRouter()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, stage: 'intake', cvUploaded }),
      })

      if (!res.ok) {
        console.error('Chat API error:', res.status)
        setLoading(false)
        return
      }

      const data = await res.json()

      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
      }

      if (data.readyToSynthesize && cvUploaded) {
        setLoading(false)
        await startSynthesis(newMessages)
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

  async function startSynthesis(transcriptMessages: Message[]) {
    setSynthesizing(true)
    let idx = 0
    waitTimerRef.current = setInterval(() => {
      idx = (idx + 1) % WAIT_MESSAGES.length
      setWaitMsg(WAIT_MESSAGES[idx])
    }, 8000)

    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: transcriptMessages }),
      })
      const data = await res.json()
      if (data.revealId) {
        router.push(`/reveal/${data.revealId}`)
      }
    } catch (err) {
      console.error('Synthesis error:', err)
    } finally {
      if (waitTimerRef.current) clearInterval(waitTimerRef.current)
      setSynthesizing(false)
    }
  }

  if (synthesizing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div key={waitMsg} className="text-stone-600 text-lg animate-pulse transition-opacity duration-700">
            {waitMsg}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-2xl mx-auto px-4">
      <div className="py-6 border-b border-stone-100">
        <h1 className="text-stone-900 font-semibold">Ben</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((msg, i) => (
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
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <span className="text-stone-400 text-sm">…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!cvUploaded && messages.length >= 3 && (
        <div className="py-3 border-t border-stone-100">
          <label className="flex items-center gap-2 text-sm text-stone-500 cursor-pointer hover:text-stone-700">
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCvUpload} />
            <span>+ Upload your CV</span>
            {cvName && <span className="text-stone-400">({cvName})</span>}
          </label>
        </div>
      )}

      <div className="py-4 border-t border-stone-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your answer…"
            disabled={loading}
            className="flex-1 px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
