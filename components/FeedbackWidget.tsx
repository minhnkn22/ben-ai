'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [open])

  // Auto-close after showing thanks
  useEffect(() => {
    if (status === 'done') {
      const timer = setTimeout(() => {
        setOpen(false)
        setStatus('idle')
        setMessage('')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status])

  async function handleSubmit() {
    if (!message.trim() || status === 'submitting') return
    setStatus('submitting')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), page_url: pathname }),
      })

      if (!res.ok) throw new Error('Failed to submit')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <>
      {/* Floating button — subtle gray circle with chat icon */}
      <button
        onClick={() => setOpen(prev => !prev)}
        title="Send feedback"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 50,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--bg-subtle, #f7f7f8)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover, #f0f0f1)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-focus)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle, #f7f7f8)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
        }}
      >
        {/* Chat bubble SVG */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V10C14 10.5523 13.5523 11 13 11H9L6 14V11H3C2.44772 11 2 10.5523 2 10V3Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          onKeyDown={handleKeyDown}
          style={{
            position: 'fixed',
            bottom: '68px',
            right: '20px',
            zIndex: 50,
            width: '300px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font)' }}>
              Send feedback
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '16px',
                lineHeight: 1,
                padding: '0 2px',
              }}
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 16px 16px' }}>
            {status === 'done' ? (
              <p style={{
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font)',
                padding: '12px 0',
              }}>
                Thanks for the feedback!
              </p>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  disabled={status === 'submitting'}
                  style={{
                    width: '100%',
                    resize: 'none',
                    fontSize: '13px',
                    fontFamily: 'var(--font)',
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    outline: 'none',
                    lineHeight: '1.5',
                    marginBottom: '10px',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                {status === 'error' && (
                  <p style={{ fontSize: '12px', color: '#d44', marginBottom: '8px', fontFamily: 'var(--font)' }}>
                    Something went wrong. Please try again.
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === 'submitting'}
                  style={{
                    width: '100%',
                    padding: '9px 0',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'var(--font)',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: message.trim() && status !== 'submitting' ? 'pointer' : 'not-allowed',
                    opacity: !message.trim() || status === 'submitting' ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {status === 'submitting' ? 'Sending...' : 'Submit'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
