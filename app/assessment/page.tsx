'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

const ENNEAGRAM_TYPES = [
  { num: 1, label: 'Perfectionist' },
  { num: 2, label: 'Helper' },
  { num: 3, label: 'Achiever' },
  { num: 4, label: 'Individualist' },
  { num: 5, label: 'Investigator' },
  { num: 6, label: 'Loyalist' },
  { num: 7, label: 'Enthusiast' },
  { num: 8, label: 'Challenger' },
  { num: 9, label: 'Peacemaker' },
]

const OCEAN_TRAITS = [
  { key: 'ocean_openness', label: 'Openness to experience', low: 'Conventional', high: 'Curious' },
  { key: 'ocean_conscientiousness', label: 'Conscientiousness', low: 'Spontaneous', high: 'Disciplined' },
  { key: 'ocean_extraversion', label: 'Extraversion', low: 'Introverted', high: 'Extraverted' },
  { key: 'ocean_agreeableness', label: 'Agreeableness', low: 'Competitive', high: 'Cooperative' },
  { key: 'ocean_neuroticism', label: 'Neuroticism', low: 'Stable', high: 'Sensitive' },
]

function AssessmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const revealId = searchParams.get('reveal_id')

  const [mbti, setMbti] = useState<string | null>(null)
  const [enneagram, setEnneagram] = useState<number | null>(null)
  const [ocean, setOcean] = useState<Record<string, number | null>>({
    ocean_openness: null,
    ocean_conscientiousness: null,
    ocean_extraversion: null,
    ocean_agreeableness: null,
    ocean_neuroticism: null,
  })
  const [oceanTouched, setOceanTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  async function triggerSynthesis(messages?: unknown[]) {
    const res = await fetch('/api/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages ?? [], revealId }),
    })
    const data = await res.json()
    if (data.revealId) router.push(`/reveal/${data.revealId}`)
  }

  async function saveAndContinue() {
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        mbti,
        enneagram,
        ...ocean,
        reveal_id: revealId,
      }
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await triggerSynthesis()
    } catch (err) {
      console.error('Assessment save error:', err)
      setSubmitting(false)
    }
  }

  async function skipAndSynthesize() {
    setSubmitting(true)
    try {
      await triggerSynthesis()
    } catch (err) {
      console.error('Skip synthesis error:', err)
      setSubmitting(false)
    }
  }

  function setOceanValue(key: string, val: number) {
    setOcean(prev => ({ ...prev, [key]: val }))
    setOceanTouched(prev => ({ ...prev, [key]: true }))
  }

  if (submitting) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Building your pattern...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font)',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center',
        padding: '0 20px', height: '56px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'var(--bg)', zIndex: 10,
      }}>
        <Link href="/intake" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--text-muted)',
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>
        <span style={{
          marginLeft: 'auto', marginRight: 'auto',
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontWeight: 600, fontSize: '15px', color: 'var(--text)',
        }}>
          Ben
        </span>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '48px 20px 80px' }}>
        {/* Page header */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            One more thing
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>
            How do you see yourself?
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Optional — but the more context Ben has, the sharper the pattern.
          </p>
        </div>

        {/* MBTI Section */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>MBTI type</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>(if you know it)</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
          }}>
            {MBTI_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setMbti(mbti === type ? null : type)}
                style={{
                  padding: '10px 0',
                  fontSize: '13px', fontWeight: 500,
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                  background: mbti === type ? 'var(--accent)' : 'var(--bg)',
                  color: mbti === type ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'var(--font)',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '40px' }} />

        {/* Enneagram Section */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>Enneagram</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>(if you know it)</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
          }}>
            {ENNEAGRAM_TYPES.map(({ num, label }) => (
              <button
                key={num}
                onClick={() => setEnneagram(enneagram === num ? null : num)}
                style={{
                  padding: '12px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                  background: enneagram === num ? 'var(--accent)' : 'var(--bg)',
                  color: enneagram === num ? '#fff' : 'var(--text)',
                  fontFamily: 'var(--font)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '2px' }}>{num}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '40px' }} />

        {/* Big 5 OCEAN Section */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>Big Five</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>(rough self-estimate is fine)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {OCEAN_TRAITS.map(({ key, label, low, high }) => {
              const val = ocean[key]
              const touched = oceanTouched[key]
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                    {!touched ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-placeholder)' }}>Not set</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>{val}/10</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>{low}</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={val ?? 5}
                      onChange={e => setOceanValue(key, Number(e.target.value))}
                      style={{
                        flex: 1,
                        height: '4px',
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                        opacity: touched ? 1 : 0.4,
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '80px' }}>{high}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Footer buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={skipAndSynthesize}
            disabled={submitting}
            style={{
              background: 'none', border: 'none',
              fontSize: '14px', color: 'var(--text-muted)',
              cursor: 'pointer', padding: '10px 0',
              fontFamily: 'var(--font)',
              textDecoration: 'underline',
              textDecorationColor: 'transparent',
            }}
            onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--text-muted)')}
            onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
          >
            Skip for now
          </button>
          <button
            onClick={saveAndContinue}
            disabled={submitting}
            style={{
              padding: '11px 24px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px', fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Save and continue →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }} />
    }>
      <AssessmentContent />
    </Suspense>
  )
}
