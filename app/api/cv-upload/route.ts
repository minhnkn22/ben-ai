import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface ExtractionReport {
  extracted: string[]
  missing: string[]
  quality: 'good' | 'partial' | 'poor'
  notes: string
}

async function buildExtractionReport(text: string): Promise<ExtractionReport | null> {
  try {
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `Given the following CV text, produce a JSON object describing what was successfully extracted and what was missing. Return ONLY valid JSON with no markdown fences.

Schema:
{
  "extracted": ["list of categories successfully found, e.g. Job titles, Company names, Employment dates, Education, Skills"],
  "missing": ["list of categories not found, e.g. Salary history, Specific achievements/metrics, Contact information"],
  "quality": "good" | "partial" | "poor",
  "notes": "One sentence about what was successfully captured and what was missing."
}

CV text:
${text.slice(0, 8000)}`

    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()
    // Strip markdown fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(jsonStr) as ExtractionReport
  } catch {
    return null
  }
}

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
    // PDF: use Gemini's native PDF read via inline data
    try {
      const base64 = Buffer.from(bytes).toString('base64')
      const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64,
          },
        },
        'Extract all text from this CV/resume. Return the raw text content only — employer names, roles, dates, responsibilities, education, skills. No formatting, no commentary. If any sections appear incomplete or truncated, note them at the end with "PARSE NOTE: [what was missing]".',
      ])
      parsedText = result.response.text()

      // Extract parse notes if Gemini flagged anything
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

  // Build extraction report from parsed text (if we have any)
  let extractionReport: ExtractionReport | null = null
  if (parsedText.trim() && parseStatus !== 'failed') {
    extractionReport = await buildExtractionReport(parsedText)
    if (extractionReport) {
      // Override status from report quality
      if (parseStatus === 'ok') {
        parseStatus = extractionReport.quality === 'good' ? 'ok'
          : extractionReport.quality === 'partial' ? 'partial'
          : 'failed'
      }
      // Compose parse_notes: notes string + JSON of missing
      parseNotes = extractionReport.notes
        + (extractionReport.missing.length > 0
          ? ' Missing: ' + JSON.stringify(extractionReport.missing)
          : '')
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
    extractionReport,
  })
}
