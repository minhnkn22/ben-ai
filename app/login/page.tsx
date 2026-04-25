'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setMode('signup')
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
        setLoading(false)
        return
      }
    }

    const redirect = searchParams.get('redirect') || '/intake'
    router.push(redirect)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    fontSize: '14px', border: '1px solid var(--border)',
    borderRadius: '8px', outline: 'none',
    color: 'var(--text)', background: 'var(--bg)',
    fontFamily: 'var(--font)',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', fontFamily: 'var(--font)',
    }}>
      <nav style={{
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', textDecoration: 'none' }}>
          Ben
        </Link>
      </nav>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h1 style={{
            fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            {mode === 'signin' ? 'Sign in to continue.' : 'Start your Pattern Reveal session.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />

            {error && (
              <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                padding: '12px', fontSize: '14px', fontWeight: 500,
                background: loading ? 'var(--bg-hover)' : 'var(--accent)',
                color: loading ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              {loading ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null) }}
                  style={{
                    color: 'var(--text)', fontWeight: 500, background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: '13px',
                    fontFamily: 'var(--font)', textDecoration: 'underline', textUnderlineOffset: '2px',
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null) }}
                  style={{
                    color: 'var(--text)', fontWeight: 500, background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: '13px',
                    fontFamily: 'var(--font)', textDecoration: 'underline', textUnderlineOffset: '2px',
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
