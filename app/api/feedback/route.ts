import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, page_url } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Try to get authenticated user — nullable
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('feedback').insert({
      message: message.trim(),
      page_url: page_url ?? null,
      user_id: user?.id ?? null,
    })

    if (error) {
      console.error('[feedback] Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[feedback] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
