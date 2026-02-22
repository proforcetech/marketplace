import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z
    .string()
    .min(LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${LIMITS.PASSWORD_MIN_LENGTH} characters`)
    .max(LIMITS.PASSWORD_MAX_LENGTH, `Password must be at most ${LIMITS.PASSWORD_MAX_LENGTH} characters`),
  displayName: z
    .string()
    .min(LIMITS.DISPLAY_NAME_MIN_LENGTH, `Display name must be at least ${LIMITS.DISPLAY_NAME_MIN_LENGTH} characters`)
    .max(LIMITS.DISPLAY_NAME_MAX_LENGTH, `Display name must be at most ${LIMITS.DISPLAY_NAME_MAX_LENGTH} characters`)
    .trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const otpSendSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format (e.g., +15551234567)'),
});

export const otpVerifySchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format'),
  code: z
    .string()
    .length(LIMITS.OTP_LENGTH, `OTP must be ${LIMITS.OTP_LENGTH} digits`)
    .regex(/^\d+$/, 'OTP must be numeric'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${LIMITS.PASSWORD_MIN_LENGTH} characters`)
    .max(LIMITS.PASSWORD_MAX_LENGTH),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpSendInput = z.infer<typeof otpSendSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
