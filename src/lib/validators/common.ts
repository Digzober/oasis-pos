import { z } from 'zod/v4'

export const UuidSchema = z.uuid()

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export const SortOrderSchema = z.enum(['asc', 'desc']).default('asc')
