import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { ItemCondition } from '../types/listing.js';

export const searchListingsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce
    .number()
    .min(1)
    .max(LIMITS.SEARCH_RADIUS_MAX_MILES)
    .optional()
    .default(LIMITS.SEARCH_RADIUS_DEFAULT_MILES),
  category: z.string().optional(),
  q: z.string().max(200).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  condition: z
    .union([z.nativeEnum(ItemCondition), z.array(z.nativeEnum(ItemCondition))])
    .optional()
    .transform((val: ItemCondition | ItemCondition[] | undefined) => (val && !Array.isArray(val) ? [val] : val)),
  customFields: z.record(z.unknown()).optional(),
  sort: z.enum(['distance', 'newest', 'price_asc', 'price_desc']).optional().default('distance'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIMITS.SEARCH_PAGE_SIZE_MAX)
    .optional()
    .default(LIMITS.SEARCH_PAGE_SIZE_DEFAULT),
});

export const saveSearchSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMiles: z.number().min(1).max(LIMITS.SEARCH_RADIUS_MAX_MILES),
  categoryId: z.string().uuid().optional(),
  filters: z.record(z.unknown()).optional().default({}),
  sortBy: z.enum(['distance', 'newest', 'price_asc', 'price_desc']).optional(),
  notifyEnabled: z.boolean().optional().default(true),
});

export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
export type SaveSearchInput = z.infer<typeof saveSearchSchema>;
