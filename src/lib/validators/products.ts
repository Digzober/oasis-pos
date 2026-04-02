import { z } from 'zod/v4'
import { PaginationSchema, SortOrderSchema } from './common'

export const ProductQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  categoryId: z.uuid().optional(),
  brandId: z.uuid().optional(),
  strainId: z.uuid().optional(),
  vendorId: z.uuid().optional(),
  sortBy: z.enum(['name', 'rec_price', 'created_at', 'sku']).default('name'),
  sortOrder: SortOrderSchema,
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isCannabis: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  tagId: z.uuid().optional(),
  onlineAvailable: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>

export const ProductCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  sku: z.string().max(50).optional(),
  categoryId: z.uuid(),
  brandId: z.uuid().nullable().optional(),
  strainId: z.uuid().nullable().optional(),
  vendorId: z.uuid().nullable().optional(),
  recPrice: z.number().min(0),
  medPrice: z.number().min(0).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  isCannabis: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  productType: z.enum(['quantity', 'weight']).default('quantity'),
  defaultUnit: z.enum(['each', 'gram', 'eighth', 'quarter', 'half', 'ounce']).default('each'),
  strainType: z.enum(['indica', 'sativa', 'hybrid', 'cbd']).nullable().optional(),
  thcPercentage: z.number().min(0).max(100).nullable().optional(),
  cbdPercentage: z.number().min(0).max(100).nullable().optional(),
  thcContentMg: z.number().min(0).nullable().optional(),
  cbdContentMg: z.number().min(0).nullable().optional(),
  weightGrams: z.number().min(0).nullable().optional(),
  flowerEquivalent: z.number().min(0).nullable().optional(),
  description: z.string().nullable().optional(),
  onlineTitle: z.string().nullable().optional(),
  onlineDescription: z.string().max(2500).nullable().optional(),
  regulatoryCategory: z.string().nullable().optional(),
  barcode: z.string().max(20).nullable().optional(),
  externalCategory: z.string().nullable().optional(),
  isOnSale: z.boolean().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
  alternateName: z.string().nullable().optional(),
  producerId: z.string().uuid().nullable().optional(),
  size: z.string().nullable().optional(),
  flavor: z.string().nullable().optional(),
  availableFor: z.enum(['all', 'recreational', 'medical']).optional(),
  allowAutomaticDiscounts: z.boolean().optional(),
  dosage: z.string().nullable().optional(),
  netWeight: z.number().nonnegative().nullable().optional(),
  netWeightUnit: z.string().nullable().optional(),
  grossWeightGrams: z.number().nonnegative().nullable().optional(),
  unitThcDose: z.number().nonnegative().nullable().optional(),
  unitCbdDose: z.number().nonnegative().nullable().optional(),
  administrationMethod: z.string().nullable().optional(),
  packageSize: z.number().int().nonnegative().nullable().optional(),
  externalSubCategory: z.string().nullable().optional(),
  allergens: z.string().nullable().optional(),
  ingredients: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
})

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>

export const ProductUpdateSchema = ProductCreateSchema.partial()

export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>
