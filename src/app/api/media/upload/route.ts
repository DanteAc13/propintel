import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client for storage operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET_NAME = 'inspection-media'

// POST /api/media/upload - Upload media file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const inspectorId = formData.get('inspector_id') as string
    const inspectionId = formData.get('inspection_id') as string
    const propertyId = formData.get('property_id') as string
    const sectionId = formData.get('section_id') as string | null
    const observationId = formData.get('observation_id') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!inspectorId || !inspectionId || !propertyId) {
      return NextResponse.json(
        { error: 'Missing required fields: inspector_id, inspection_id, property_id' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `${timestamp}-${randomId}.${extension}`

    // Build storage path: {property_id}/{inspection_id}/{filename}
    const storagePath = observationId
      ? `${propertyId}/${inspectionId}/${observationId}/${filename}`
      : sectionId
        ? `${propertyId}/${inspectionId}/section/${sectionId}/${filename}`
        : `${propertyId}/${inspectionId}/${filename}`

    // Read file as ArrayBuffer for hashing
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    // Create thumbnail URL using Supabase transforms
    const thumbnailUrl = `${urlData.publicUrl}?width=300&height=300&resize=contain`

    // Create media record in database
    const media = await db.media.create({
      data: {
        inspector_id: inspectorId,
        observation_id: observationId || null,
        section_id: sectionId || null,
        property_id: propertyId,
        storage_url: urlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        mime_type: file.type,
        file_size_bytes: file.size,
        hash_sha256: hashHex,
        capture_timestamp: new Date(),
      },
    })

    return NextResponse.json({
      media,
      storagePath,
    })
  } catch (error) {
    console.error('Error uploading media:', error)
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    )
  }
}
