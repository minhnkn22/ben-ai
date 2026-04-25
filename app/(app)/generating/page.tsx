'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SynthesisProgress from '@/components/SynthesisProgress'

function GeneratingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const revealId = searchParams.get('reveal_id')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const failedRef = useRef(false)

  useEffect(() => {
    if (!revealId) {
      router.push('/intake')
      return
    }

    let attempts = 0
    const maxAttempts = 60 // 2 min max polling

    intervalRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/reveal/${revealId}/status`)
        if (!res.ok) return
        const data = await res.json()

        if (data.status === 'completed') {
          clearInterval(intervalRef.current!)
          router.push(`/reveal/${revealId}`)
        } else if (data.status === 'failed') {
          clearInterval(intervalRef.current!)
          failedRef.current = true
          router.push(`/reveal/${revealId}?error=failed`)
        } else if (attempts >= maxAttempts) {
          clearInterval(intervalRef.current!)
          router.push(`/reveal/${revealId}?error=timeout`)
        }
      } catch {
        // network error — keep polling
      }
    }, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [revealId, router])

  return <SynthesisProgress active={true} />
}

export default function GeneratingPage() {
  return (
    <Suspense fallback={<SynthesisProgress active={true} />}>
      <GeneratingContent />
    </Suspense>
  )
}
