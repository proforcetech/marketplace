import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(LIMITS.MESSAGE_MAX_LENGTH, `Message must be at most ${LIMITS.MESSAGE_MAX_LENGTH} characters`)
    .trim(),
  type: z.enum(['text', 'image']).optional().default('text'),
});

export const startConversationSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID'),
  initialMessage: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(LIMITS.MESSAGE_MAX_LENGTH, `Message must be at most ${LIMITS.MESSAGE_MAX_LENGTH} characters`)
    .trim(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
