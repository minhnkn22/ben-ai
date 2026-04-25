'use client'

import { useState, useEffect, useRef } from 'react'

const STEPS = [
  { text: 'Reading your story...', delay: 0 },
  { text: 'Finding the pattern...', delay: 3000 },
  { text: 'Pressure-testing it...', delay: 8000 },
  { text: 'Sharpening the diagnosis...', delay: 14000 },
  { text: 'Almost there...', delay: 22000 },
]

interface SynthesisProgressProps {
  active: boolean
}

export default function SynthesisProgress({ active }: SynthesisProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(true)
  const timersRef = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    if (!active) {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      setCurrentStep(0)
      setVisible(true)
      return
    }

    // Schedule each step transition
    STEPS.forEach((step, idx) => {
      if (idx === 0) return
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(() => {
          setCurrentStep(idx)
          setVisible(true)
        }, 300)
      }, step.delay)
      timersRef.current.push(t)
    })

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [active])

  if (!active) return null

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i <= currentStep ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>

        {/* Step text */}
        <p style={{
          fontSize: '20px',
          fontWeight: 500,
          color: 'var(--text)',
          marginBottom: '16px',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          letterSpacing: '-0.02em',
        }}>
          {STEPS[currentStep].text}
        </p>

        {/* Animated dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '32px' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--border-focus)',
                animation: `synthBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        <p style={{
          fontSize: '12px',
          color: 'var(--text-placeholder)',
          lineHeight: 1.6,
        }}>
          This takes about 30–45 seconds — we&apos;re being thorough.
        </p>
      </div>

      <style>{`
        @keyframes synthBounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-8px) }
        }
      `}</style>
    </div>
  )
}
