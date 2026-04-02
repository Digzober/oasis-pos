import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// Allow up to 25MB image uploads and prevent static generation
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data } = await sb
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('sort_order')

    return NextResponse.json({ images: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product images error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id: productId } = await params
    const sb = await createSupabaseServerClient()

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Failed to parse upload. File may exceed the 25MB limit.' }, { status: 413 })
    }
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const MAX_SIZE = 25 * 1024 * 1024 // 25MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 25MB.` }, { status: 413 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP, GIF.` }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filePath = `product-images/${productId}/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await sb.storage
      .from('product-assets')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logger.error('Image upload error', { error: uploadError.message })
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: urlData } = sb.storage
      .from('product-assets')
      .getPublicUrl(filePath)

    // Get current max sort order
    const { data: existing } = await sb
      .from('product_images')
      .select('sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
    const isPrimary = nextOrder === 0

    const { data: image, error } = await sb
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: urlData.publicUrl,
        sort_order: nextOrder,
        is_primary: isPrimary,
      })
      .select()
      .single()

    if (error) {
      logger.error('Image record error', { error: error.message })
      return NextResponse.json({ error: 'Failed to save image record' }, { status: 500 })
    }

    return NextResponse.json({ image }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product image upload error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id: productId } = await params
    const sb = await createSupabaseServerClient()

    const body = await request.json()
    const { imageId, alt_text } = body as { imageId?: string; alt_text?: string }

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 })
    }

    if (typeof alt_text !== 'string') {
      return NextResponse.json({ error: 'alt_text must be a string' }, { status: 400 })
    }

    // alt_text column exists in DB but may not yet be in generated types
    const { data: image, error } = await sb
      .from('product_images')
      .update({ alt_text } as Record<string, unknown>)
      .eq('id', imageId)
      .eq('product_id', productId)
      .select()
      .single()

    if (error) {
      logger.error('Image alt_text update error', { error: error.message })
      return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
    }

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    return NextResponse.json({ image })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product image patch error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id: productId } = await params
    const sb = await createSupabaseServerClient()

    const body = await request.json()
    const { image_ids } = body as { image_ids?: string[] }

    if (!Array.isArray(image_ids) || image_ids.length === 0) {
      return NextResponse.json({ error: 'image_ids must be a non-empty array' }, { status: 400 })
    }

    // Update sort_order and is_primary for each image
    const updates = image_ids.map((imageId, index) =>
      sb
        .from('product_images')
        .update({
          sort_order: index,
          is_primary: index === 0,
        })
        .eq('id', imageId)
        .eq('product_id', productId)
    )

    const results = await Promise.all(updates)
    const failedUpdate = results.find((r) => r.error)

    if (failedUpdate?.error) {
      logger.error('Image reorder error', { error: failedUpdate.error.message })
      return NextResponse.json({ error: 'Failed to reorder images' }, { status: 500 })
    }

    // Return the reordered images
    const { data: images } = await sb
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order')

    return NextResponse.json({ images: images ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product image reorder error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id: productId } = await params
    const sb = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json({ error: 'imageId required' }, { status: 400 })
    }

    // Get image to find storage path
    const { data: img } = await sb
      .from('product_images')
      .select('image_url')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single()

    if (img?.image_url) {
      const pathMatch = img.image_url.match(/product-assets\/(.+)$/)
      if (pathMatch?.[1]) {
        await sb.storage.from('product-assets').remove([pathMatch[1]])
      }
    }

    await sb.from('product_images').delete().eq('id', imageId).eq('product_id', productId)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product image delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
