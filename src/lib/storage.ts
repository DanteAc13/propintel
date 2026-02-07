// src/lib/storage.ts
// Supabase Storage helpers for media management
//
// Storage Structure:
// inspection-media/
//   ├── {property_id}/
//   │   ├── {inspection_id}/
//   │   │   ├── {observation_id}/
//   │   │   │   ├── original/{media_id}.webp
//   │   │   │   └── thumb/{media_id}.webp
//   │   │   └── section/{section_id}/{media_id}.webp
//   │   └── property/{media_id}.webp

import { createClient } from './auth'

const BUCKET_NAME = 'inspection-media'

export type MediaUploadPath = {
  propertyId: string
  inspectionId?: string
  observationId?: string
  sectionId?: string
  mediaId: string
  type: 'original' | 'thumb'
}

// Generate storage path for media
export function getMediaPath(path: MediaUploadPath): string {
  const { propertyId, inspectionId, observationId, sectionId, mediaId, type } = path

  if (observationId && inspectionId) {
    return `${propertyId}/${inspectionId}/${observationId}/${type}/${mediaId}.webp`
  }

  if (sectionId && inspectionId) {
    return `${propertyId}/${inspectionId}/section/${sectionId}/${mediaId}.webp`
  }

  return `${propertyId}/property/${mediaId}.webp`
}

// Upload media to Supabase Storage
export async function uploadMedia(
  file: File | Blob,
  path: MediaUploadPath
): Promise<{ url: string; error: Error | null }> {
  const supabase = await createClient()
  const filePath = getMediaPath(path)

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (error) {
    return { url: '', error: new Error(error.message) }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl, error: null }
}

// Get signed URL for private media access
export async function getSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<{ url: string; error: Error | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn)

  if (error) {
    return { url: '', error: new Error(error.message) }
  }

  return { url: data.signedUrl, error: null }
}

// Delete media from storage
export async function deleteMedia(path: string): Promise<{ error: Error | null }> {
  const supabase = await createClient()

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    return { error: new Error(error.message) }
  }

  return { error: null }
}
