import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are a certified home inspector with 20 years of experience. Analyze this photo of a building component or defect. Return ONLY valid JSON with no markdown formatting: { "component": string, "condition": string, "severity": "SAFETY" | "MAJOR" | "MINOR" | "COSMETIC", "description": string (homeowner-friendly, 2-3 sentences), "recommended_action": string }`

type AIAnalysisResult = {
  component: string
  condition: string
  severity: 'SAFETY' | 'MAJOR' | 'MINOR' | 'COSMETIC'
  description: string
  recommended_action: string
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Determine media type
    const mediaType = file.type || 'image/jpeg'
    if (!mediaType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Call Anthropic API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: 'Analyze this photo from a home inspection. Identify the component, its condition, severity, and provide a homeowner-friendly description with recommended action. Return ONLY valid JSON.',
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Anthropic API error:', response.status, errorBody)
      return NextResponse.json(
        { error: `AI analysis failed (${response.status})` },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Extract text content from Claude's response
    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === 'text'
    )
    if (!textBlock?.text) {
      return NextResponse.json(
        { error: 'AI returned empty response' },
        { status: 500 }
      )
    }

    // Parse JSON from response — handle possible markdown wrapping
    let jsonText = textBlock.text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const analysis: AIAnalysisResult = JSON.parse(jsonText)

    // Validate required fields
    if (!analysis.component || !analysis.condition || !analysis.severity) {
      return NextResponse.json(
        { error: 'AI returned incomplete analysis' },
        { status: 500 }
      )
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('AI analyze-photo error:', error)
    const message = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
