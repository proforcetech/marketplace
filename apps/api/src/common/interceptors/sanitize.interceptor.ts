/**
 * Input Sanitization Interceptor
 *
 * Sanitizes incoming request bodies to prevent XSS, injection, and data pollution attacks.
 * Runs before validation (pipes) to ensure validators see clean data.
 *
 * What this does:
 * - Strips HTML tags from string fields (prevents stored XSS)
 * - Normalizes Unicode to NFKC form (prevents homoglyph-based evasion)
 * - Removes null bytes and other control characters
 * - Trims excessive whitespace
 * - Recursively processes nested objects and arrays
 *
 * What this does NOT do:
 * - URL encoding/decoding (handled by Express)
 * - SQL parameter binding (handled by ORM)
 * - Output encoding (handled at the rendering layer)
 *
 * Performance: Negligible for typical request sizes. String operations are O(n) on input
 * length. Recursive depth is bounded to prevent prototype pollution via deeply nested objects.
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Request } from 'express';

// ─── Configuration ────────────────────────────────────────────

/** Maximum recursion depth for nested object sanitization */
const MAX_DEPTH = 10;

/** Maximum string length to process (prevents DoS via extremely long strings) */
const MAX_STRING_LENGTH = 50_000;

/**
 * Fields that should NOT be sanitized (e.g., password fields where HTML characters
 * are legitimate parts of a password).
 */
const SKIP_FIELDS = new Set(['password', 'newPassword', 'currentPassword']);

// ─── Decorator ────────────────────────────────────────────────

export const SKIP_SANITIZE_KEY = 'skip_sanitize';

/**
 * Decorator to skip sanitization on a specific endpoint.
 * Use for endpoints that accept intentional HTML (e.g., admin CMS, if ever needed).
 */
export const SkipSanitize = () => SetMetadata(SKIP_SANITIZE_KEY, true);

// ─── Sanitization Functions ───────────────────────────────────

/**
 * Strip HTML tags from a string.
 *
 * This uses a regex-based approach which is sufficient for INPUT sanitization
 * (preventing storage of HTML). For OUTPUT rendering, a proper HTML parser
 * (DOMPurify) must be used instead.
 *
 * The regex handles:
 * - Standard tags: <script>, <img>, etc.
 * - Self-closing tags: <br/>, <img/>
 * - Tags with attributes: <a href="...">
 * - Malformed tags that browsers would still parse
 */
function stripHtmlTags(input: string): string {
  // Remove HTML tags. This is intentionally aggressive for input sanitization.
  // The regex matches anything that looks like an HTML tag, including malformed ones.
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Remove dangerous control characters while preserving legitimate whitespace.
 * Removes: null bytes, backspace, escape, delete, and other C0/C1 control chars.
 * Preserves: tab (\t), newline (\n), carriage return (\r).
 */
function removeControlCharacters(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}

/**
 * Collapse multiple consecutive whitespace characters into a single space.
 * Preserves intentional line breaks (single \n).
 */
function normalizeWhitespace(input: string): string {
  // Replace runs of spaces/tabs (not newlines) with a single space
  let result = input.replace(/[^\S\n]+/g, ' ');
  // Collapse 3+ consecutive newlines into 2 (preserve intentional paragraphs)
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

/**
 * Remove zero-width characters that can be used to evade keyword filters.
 * These are invisible Unicode characters that break up visible text.
 */
function removeZeroWidthCharacters(input: string): string {
  return input.replace(
    /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u2060\u2061\u2062\u2063\u2064]/g,
    '',
  );
}

/**
 * Main sanitization function for a single string value.
 */
function sanitizeString(input: string): string {
  if (input.length > MAX_STRING_LENGTH) {
    input = input.substring(0, MAX_STRING_LENGTH);
  }

  // Order matters:
  // 1. Normalize Unicode first (resolves homoglyphs before other checks)
  let result = input.normalize('NFKC');
  // 2. Remove zero-width characters (prevents keyword filter evasion)
  result = removeZeroWidthCharacters(result);
  // 3. Remove control characters
  result = removeControlCharacters(result);
  // 4. Strip HTML tags
  result = stripHtmlTags(result);
  // 5. Normalize whitespace
  result = normalizeWhitespace(result);

  return result;
}

/**
 * Recursively sanitize an object's string values.
 * Handles nested objects, arrays, and mixed types.
 *
 * @param obj - The value to sanitize
 * @param depth - Current recursion depth (bounded to prevent stack overflow)
 * @returns Sanitized copy of the input (does not mutate original)
 */
function sanitizeValue(obj: unknown, depth: number = 0): unknown {
  if (depth > MAX_DEPTH) {
    // Truncate deeply nested structures rather than processing them.
    // This prevents prototype pollution attacks using deeply nested objects
    // and DoS via recursive structures.
    return undefined;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof obj === 'object') {
    // Reject objects with __proto__ or constructor pollution attempts
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      // Non-plain objects (class instances, etc.) -- return as-is
      // The validation pipe will handle type checking
      return obj;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip __proto__ and constructor keys (prototype pollution prevention)
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      // Skip designated fields (passwords, etc.)
      if (SKIP_FIELDS.has(key)) {
        sanitized[key] = value;
        continue;
      }

      sanitized[key] = sanitizeValue(value, depth + 1);
    }
    return sanitized;
  }

  // For any other types (functions, symbols, etc.), strip them
  return undefined;
}

// ─── Interceptor ──────────────────────────────────────────────

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SanitizeInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Check if sanitization is skipped for this endpoint
    const skipSanitize = this.reflector.getAllAndOverride<boolean>(
      SKIP_SANITIZE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipSanitize) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeValue(request.body) as Record<string, unknown>;
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      const sanitizedQuery: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(request.query)) {
        if (typeof value === 'string') {
          sanitizedQuery[key] = sanitizeString(value);
        } else {
          sanitizedQuery[key] = value;
        }
      }
      request.query = sanitizedQuery as typeof request.query;
    }

    // Sanitize URL parameters
    if (request.params && typeof request.params === 'object') {
      const sanitizedParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.params)) {
        if (typeof value === 'string') {
          sanitizedParams[key] = sanitizeString(value);
        } else {
          sanitizedParams[key] = value;
        }
      }
      request.params = sanitizedParams;
    }

    return next.handle();
  }
}

// ─── Exported Utilities ───────────────────────────────────────

/**
 * Exported for use in services that need to sanitize individual values
 * outside the HTTP request context (e.g., WebSocket messages, queue jobs).
 */
export { sanitizeString, sanitizeValue };
