import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

const feedbackSchema = z.object({
  page: z.string().max(200),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000),
  category: z.enum(['bug', 'ux', 'feature', 'other']).default('other'),
})

// POST /api/feedback — Collect pilot feedback (stores to JSONL file)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = feedbackSchema.parse(body)

    const entry = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      ...data,
    }

    // Store to data directory as JSONL
    const dataDir = join(process.cwd(), 'data')
    await mkdir(dataDir, { recursive: true })
    await appendFile(
      join(dataDir, 'pilot-feedback.jsonl'),
      JSON.stringify(entry) + '\n',
      'utf-8'
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error saving feedback:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
