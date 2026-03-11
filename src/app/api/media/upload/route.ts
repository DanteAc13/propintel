import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET_NAME = 'inspection-media'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

// POST /api/media/upload - Upload media file
export async function POST(request: NextRequest) {
  try {
    // --- Authentication & Authorization ---
    const auth = await authenticateRequest(['INSPECTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const inspectionId = formData.get('inspection_id') as string
    const propertyId = formData.get('property_id') as string
    const sectionId = formData.get('section_id') as string | null
    const observationId = formData.get('observation_id') as string | null

    // Use authenticated user's ID — never trust client-supplied inspector_id
    const inspectorId = user.id

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!inspectionId || !propertyId) {
      return NextResponse.json(
        { error: 'Missing required fields: inspection_id, property_id' },
        { status: 400 }
      )
    }

    // --- Verify inspector is assigned to this inspection ---
    if (user.role === 'INSPECTOR') {
      const inspection = await db.inspection.findUnique({
        where: { id: inspectionId },
        select: { inspector_id: true, property_id: true },
      })

      if (!inspection) {
        return NextResponse.json(
          { error: 'Inspection not found' },
          { status: 404 }
        )
      }

      if (inspection.inspector_id !== user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      if (inspection.property_id !== propertyId) {
        return NextResponse.json(
          { error: 'Property does not match inspection' },
          { status: 400 }
        )
      }
    }

    // --- File type validation ---
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // --- File size validation ---
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum: 10MB` },
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

    // Store the object path — NOT a public URL.
    // Signed URLs are minted on read to keep media private.
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    const signedUrl = signedUrlData?.signedUrl || ''
    const thumbnailSignedUrl = signedUrl ? `${signedUrl}&width=300&height=300&resize=contain` : ''

    // Create media record — storage_url holds the object path, not a public URL
    const media = await db.media.create({
      data: {
        inspector_id: inspectorId,
        observation_id: observationId || null,
        section_id: sectionId || null,
        property_id: propertyId,
        storage_url: storagePath,
        thumbnail_url: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
        hash_sha256: hashHex,
        capture_timestamp: new Date(),
      },
    })

    // Return signed URLs for immediate display, but DB stores paths only
    return NextResponse.json({
      media: {
        ...media,
        storage_url: signedUrl,
        thumbnail_url: thumbnailSignedUrl,
      },
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
