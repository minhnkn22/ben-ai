import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('cv') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const filename = file.name
  const fileType = filename.endsWith('.docx') ? 'docx' : 'pdf'
  const bytes = await file.arrayBuffer()

  let parsedText = ''
  let parseStatus: 'ok' | 'partial' | 'failed' = 'ok'
  let parseNotes: string | null = null

  if (fileType === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
      parsedText = result.value
      if (!parsedText.trim()) {
        parseStatus = 'failed'
        parseNotes = 'DOCX appears to be empty or could not be extracted.'
      }
    } catch (err) {
      parseStatus = 'failed'
      parseNotes = `DOCX extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`
    }
  } else {
    // PDF: use Claude's native PDF read
    try {
      const base64 = Buffer.from(bytes).toString('base64')
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: 'Extract all text from this CV/resume. Return the raw text content only — employer names, roles, dates, responsibilities, education, skills. No formatting, no commentary. If any sections appear incomplete or truncated, note them at the end with "PARSE NOTE: [what was missing]".',
              },
            ],
          },
        ],
      })
      parsedText = response.content[0].type === 'text' ? response.content[0].text : ''

      // Extract parse notes if Claude flagged anything
      const parseNoteMatch = parsedText.match(/PARSE NOTE:\s*(.+)$/i)
      if (parseNoteMatch) {
        parseNotes = parseNoteMatch[1]
        parseStatus = 'partial'
        parsedText = parsedText.replace(/PARSE NOTE:.+$/i, '').trim()
      }

      if (!parsedText.trim()) {
        parseStatus = 'failed'
        parseNotes = 'PDF could not be extracted — it may be a scanned image without OCR.'
      }
    } catch (err) {
      parseStatus = 'failed'
      parseNotes = `PDF extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`
    }
  }

  const { data: cvDoc, error } = await supabase
    .from('cv_documents')
    .insert({
      user_id: user.id,
      filename,
      file_type: fileType,
      parsed_text: parsedText,
      parse_status: parseStatus,
      parse_notes: parseNotes,
    })
    .select('id, parse_status, parse_notes')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save CV' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    id: cvDoc.id,
    parseStatus: cvDoc.parse_status,
    parseNotes: cvDoc.parse_notes,
  })
}
