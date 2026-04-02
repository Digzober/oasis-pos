import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const MAX_BULK_ITEMS = 100
const VALID_ACTIONS = ['add', 'remove', 'set'] as const
type TagAction = (typeof VALID_ACTIONS)[number]

export async function POST(request: NextRequest) {
  try {
    await requireSession()

    const body = await request.json()
    const { product_ids, tag_ids, action } = body as {
      product_ids: unknown
      tag_ids: unknown
      action: unknown
    }

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids must be a non-empty array' },
        { status: 400 },
      )
    }

    if (product_ids.length > MAX_BULK_ITEMS) {
      return NextResponse.json(
        { error: `Cannot process more than ${MAX_BULK_ITEMS} items at once` },
        { status: 400 },
      )
    }

    if (!Array.isArray(tag_ids)) {
      return NextResponse.json(
        { error: 'tag_ids must be an array' },
        { status: 400 },
      )
    }

    if (typeof action !== 'string' || !VALID_ACTIONS.includes(action as TagAction)) {
      return NextResponse.json(
        { error: 'action must be one of: add, remove, set' },
        { status: 400 },
      )
    }

    const tagAction = action as TagAction

    // For add and set, tag_ids must not be empty
    if ((tagAction === 'add' || tagAction === 'set') && tag_ids.length === 0) {
      return NextResponse.json(
        { error: 'tag_ids must not be empty for add or set actions' },
        { status: 400 },
      )
    }

    // For remove, tag_ids must not be empty
    if (tagAction === 'remove' && tag_ids.length === 0) {
      return NextResponse.json(
        { error: 'tag_ids must not be empty for remove action' },
        { status: 400 },
      )
    }

    const sb = await createSupabaseServerClient()
    let updatedCount = 0

    if (tagAction === 'add') {
      // Build all insert rows, ignoring duplicates via onConflict
      const rows = product_ids.flatMap((productId: string) =>
        tag_ids.map((tagId: string) => ({
          product_id: productId,
          tag_id: tagId,
        })),
      )

      const { error } = await sb
        .from('product_tags')
        .upsert(rows, { onConflict: 'product_id,tag_id', ignoreDuplicates: true })

      if (error) {
        logger.error('Bulk tag add failed', { error: error.message })
        return NextResponse.json(
          { error: 'Failed to add tags to products' },
          { status: 500 },
        )
      }

      updatedCount = product_ids.length
    } else if (tagAction === 'remove') {
      const { error } = await sb
        .from('product_tags')
        .delete()
        .in('product_id', product_ids)
        .in('tag_id', tag_ids)

      if (error) {
        logger.error('Bulk tag remove failed', { error: error.message })
        return NextResponse.json(
          { error: 'Failed to remove tags from products' },
          { status: 500 },
        )
      }

      updatedCount = product_ids.length
    } else if (tagAction === 'set') {
      // Delete all existing tags for these products
      const { error: deleteError } = await sb
        .from('product_tags')
        .delete()
        .in('product_id', product_ids)

      if (deleteError) {
        logger.error('Bulk tag set - delete phase failed', {
          error: deleteError.message,
        })
        return NextResponse.json(
          { error: 'Failed to clear existing tags' },
          { status: 500 },
        )
      }

      // Insert the new tag assignments
      const rows = product_ids.flatMap((productId: string) =>
        tag_ids.map((tagId: string) => ({
          product_id: productId,
          tag_id: tagId,
        })),
      )

      const { error: insertError } = await sb
        .from('product_tags')
        .insert(rows)

      if (insertError) {
        logger.error('Bulk tag set - insert phase failed', {
          error: insertError.message,
        })
        return NextResponse.json(
          { error: 'Failed to set tags on products' },
          { status: 500 },
        )
      }

      updatedCount = product_ids.length
    }

    logger.info('Bulk tag operation completed', {
      action: tagAction,
      productCount: product_ids.length,
      tagCount: tag_ids.length,
      updatedCount,
    })

    return NextResponse.json({ updated_count: updatedCount })
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'UNAUTHORIZED'
    ) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }
    logger.error('Bulk tag operation error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
