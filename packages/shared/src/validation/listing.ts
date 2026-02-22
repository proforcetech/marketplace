import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { ItemCondition, ListingVisibility, LocationPrecision, PriceType } from '../types/listing.js';

export const createListingSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(LIMITS.LISTING_TITLE_MAX_LENGTH, `Title must be at most ${LIMITS.LISTING_TITLE_MAX_LENGTH} characters`)
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(LIMITS.LISTING_DESCRIPTION_MAX_LENGTH, `Description must be at most ${LIMITS.LISTING_DESCRIPTION_MAX_LENGTH} characters`)
    .trim(),
  price: z.number().min(0, 'Price cannot be negative').max(999_999_999.99).nullable().optional(),
  priceType: z.nativeEnum(PriceType),
  condition: z.nativeEnum(ItemCondition),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationText: z.string().min(1).max(255).trim(),
  locationPrecision: z.nativeEnum(LocationPrecision).optional().default(LocationPrecision.AREA),
  customFields: z.record(z.unknown()).optional().default({}),
  visibility: z.nativeEnum(ListingVisibility).optional().default(ListingVisibility.PUBLIC),
});

export const updateListingSchema = createListingSchema.partial().omit({ categoryId: true });

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
