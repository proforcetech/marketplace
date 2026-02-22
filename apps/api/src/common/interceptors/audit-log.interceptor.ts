/**
 * Audit Log Interceptor
 *
 * Creates an audit trail for sensitive operations. Captures WHO did WHAT to WHICH
 * resource, WHEN, and from WHERE. This is critical for:
 *
 * - Compliance (GDPR, CCPA: demonstrate lawful data processing)
 * - Security investigations (trace unauthorized access, account compromise)
 * - Moderation accountability (track moderator/admin actions)
 * - Dispute resolution (who changed what and when)
 *
 * Design decisions:
 * - Audit logs are append-only (immutable once written)
 * - Sensitive data (passwords, tokens, PII) is NEVER logged -- only resource IDs and action types
 * - Logs are written asynchronously to avoid adding latency to the request
 * - Failed operations are also logged (important for detecting attack attempts)
 *
 * Performance: Audit logging is fire-and-forget (async). The interceptor adds ~0.1ms
 * to capture metadata, then delegates writing to an async service. The request is
 * not blocked waiting for the log to be persisted.
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';

// ─── Types ────────────────────────────────────────────────────

export enum AuditAction {
  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_PASSWORD_CHANGE = 'auth.password_change',
  AUTH_PASSWORD_RESET = 'auth.password_reset',
  AUTH_OTP_REQUEST = 'auth.otp_request',
  AUTH_OTP_VERIFY = 'auth.otp_verify',
  AUTH_SESSION_REVOKE = 'auth.session_revoke',
  AUTH_TOKEN_REFRESH = 'auth.token_refresh',

  // User management
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_BAN = 'user.ban',
  USER_SUSPEND = 'user.suspend',
  USER_SHADOW_BAN = 'user.shadow_ban',
  USER_UNSUSPEND = 'user.unsuspend',
  USER_ROLE_CHANGE = 'user.role_change',
  USER_DATA_EXPORT = 'user.data_export',
  USER_PII_ACCESS = 'user.pii_access',

  // Listings
  LISTING_CREATE = 'listing.create',
  LISTING_UPDATE = 'listing.update',
  LISTING_DELETE = 'listing.delete',
  LISTING_APPROVE = 'listing.approve',
  LISTING_REJECT = 'listing.reject',
  LISTING_UNLIST = 'listing.unlist',

  // Moderation
  MOD_REVIEW = 'mod.review',
  MOD_ACTION = 'mod.action',
  MOD_ESCALATE = 'mod.escalate',
  MOD_APPEAL_REVIEW = 'mod.appeal_review',

  // Payments
  PAYMENT_CREATE = 'payment.create',
  PAYMENT_REFUND = 'payment.refund',

  // Admin
  ADMIN_CONFIG_CHANGE = 'admin.config_change',
  ADMIN_DATA_EXPORT = 'admin.data_export',
}

export interface AuditLogEntry {
  /** Unique identifier for this log entry */
  id?: string;
  /** ISO timestamp of the event */
  timestamp: string;
  /** The action that was performed */
  action: AuditAction;
  /** User ID of the actor (null for system/anonymous actions) */
  actorId: string | null;
  /** Roles of the actor at the time of the action */
  actorRoles: string[];
  /** Type of the target resource (e.g., 'user', 'listing') */
  targetType?: string;
  /** ID of the target resource */
  targetId?: string;
  /** HTTP method */
  method: string;
  /** Request path (without query parameters) */
  path: string;
  /** HTTP status code of the response */
  statusCode: number;
  /** Client IP address */
  ipAddress: string;
  /** User-Agent header (truncated) */
  userAgent: string;
  /** Additional context (non-sensitive metadata only) */
  metadata?: Record<string, unknown>;
  /** Whether the operation succeeded */
  success: boolean;
  /** Duration of the operation in milliseconds */
  durationMs: number;
}

// ─── Audit Log Storage Interface ──────────────────────────────

/**
 * Interface for persisting audit logs.
 * Implement with your preferred storage:
 * - PostgreSQL (recommended for queryability and compliance)
 * - CloudWatch Logs / ELK (for high-volume, search-oriented access)
 * - Both (write to DB for compliance, stream to ELK for monitoring)
 */
export interface AuditLogStore {
  /**
   * Persist an audit log entry. This MUST be reliable -- if it fails,
   * the error should be logged but the request should NOT be affected.
   */
  write(entry: AuditLogEntry): Promise<void>;
}

export const AUDIT_LOG_STORE = 'AUDIT_LOG_STORE';

// ─── Decorators ───────────────────────────────────────────────

export const AUDIT_ACTION_KEY = 'audit_action';

/**
 * Decorator to mark a controller method as auditable.
 *
 * @param action - The audit action type
 * @param options - Optional configuration for the audit entry
 *
 * @example
 * @Audited(AuditAction.USER_BAN, { targetType: 'user', targetIdParam: 'id' })
 * @Post('users/:id/ban')
 * banUser(@Param('id') userId: string) { ... }
 */
export const Audited = (
  action: AuditAction,
  options?: AuditedOptions,
) => SetMetadata(AUDIT_ACTION_KEY, { action, options });

export interface AuditedOptions {
  /** The resource type being acted upon */
  targetType?: string;
  /** The route parameter name containing the target resource ID */
  targetIdParam?: string;
  /** The body field name containing the target resource ID (for POST requests) */
  targetIdBody?: string;
  /** Additional fields to extract from the request body for metadata (non-sensitive only) */
  metadataFields?: string[];
}

interface AuditMetadata {
  action: AuditAction;
  options?: AuditedOptions;
}

export const AUDIT_SKIP_KEY = 'audit_skip';

/** Skip audit logging for a specific endpoint */
export const SkipAudit = () => SetMetadata(AUDIT_SKIP_KEY, true);

// ─── PII Safelist ─────────────────────────────────────────────

/**
 * Fields that must NEVER appear in audit log metadata.
 * This is a safeguard in case someone adds a sensitive field to metadataFields.
 */
const PII_BLOCKLIST = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'apiKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'socialSecurityNumber',
  'phone',
  'email',
  'address',
  'dateOfBirth',
  'dob',
]);

// ─── Interceptor ──────────────────────────────────────────────

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(AUDIT_LOG_STORE)
    private readonly auditStore: AuditLogStore,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Check if audit logging should be skipped
    const skipAudit = this.reflector.getAllAndOverride<boolean>(AUDIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAudit) {
      return next.handle();
    }

    // Get audit configuration from decorator
    const auditMetadata = this.reflector.getAllAndOverride<
      AuditMetadata | undefined
    >(AUDIT_ACTION_KEY, [context.getHandler(), context.getClass()]);

    // If no @Audited decorator, skip audit logging for this endpoint
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // Pre-extract information that might not be available after the handler runs
    const auditContext = this.buildAuditContext(request, auditMetadata);

    return next.handle().pipe(
      tap(() => {
        // Successful operation
        const response = context.switchToHttp().getResponse<Response>();
        const entry: AuditLogEntry = {
          ...auditContext,
          statusCode: response.statusCode,
          success: true,
          durationMs: Date.now() - startTime,
        };
        this.persistAuditLog(entry);
      }),
      catchError((error) => {
        // Failed operation -- still log it (important for security monitoring)
        const statusCode =
          error?.status || error?.getStatus?.() || 500;
        const entry: AuditLogEntry = {
          ...auditContext,
          statusCode,
          success: false,
          durationMs: Date.now() - startTime,
          metadata: {
            ...auditContext.metadata,
            errorType: error?.constructor?.name,
          },
        };
        this.persistAuditLog(entry);

        // Re-throw the error so it propagates to the client normally
        throw error;
      }),
    );
  }

  private buildAuditContext(
    request: Request,
    auditMetadata: AuditMetadata,
  ): Omit<AuditLogEntry, 'statusCode' | 'success' | 'durationMs'> {
    const { action, options } = auditMetadata;
    const user = request.user;

    // Extract target resource ID
    let targetId: string | undefined;
    if (options?.targetIdParam && request.params[options.targetIdParam]) {
      targetId = request.params[options.targetIdParam];
    } else if (
      options?.targetIdBody &&
      request.body &&
      typeof request.body === 'object'
    ) {
      const bodyValue = (request.body as Record<string, unknown>)[
        options.targetIdBody
      ];
      if (typeof bodyValue === 'string') {
        targetId = bodyValue;
      }
    }

    // Extract safe metadata fields from request body
    let metadata: Record<string, unknown> | undefined;
    if (
      options?.metadataFields?.length &&
      request.body &&
      typeof request.body === 'object'
    ) {
      metadata = {};
      for (const field of options.metadataFields) {
        if (PII_BLOCKLIST.has(field)) {
          // Silently skip PII fields -- do not log a warning (which could itself leak info)
          continue;
        }
        const value = (request.body as Record<string, unknown>)[field];
        if (value !== undefined) {
          // Only log scalar values and short strings in metadata
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            metadata[field] =
              typeof value === 'string' && value.length > 200
                ? value.substring(0, 200) + '...'
                : value;
          }
        }
      }
    }

    // Truncate user-agent to prevent log bloat
    const rawUserAgent = request.headers['user-agent'] || '';
    const userAgent =
      rawUserAgent.length > 256
        ? rawUserAgent.substring(0, 256) + '...'
        : rawUserAgent;

    return {
      timestamp: new Date().toISOString(),
      action,
      actorId: user?.userId || null,
      actorRoles: user?.roles || [],
      targetType: options?.targetType,
      targetId,
      method: request.method,
      path: request.path,
      ipAddress: this.getClientIp(request),
      userAgent,
      metadata,
    };
  }

  /**
   * Persist the audit log entry asynchronously.
   * Errors in audit logging must NEVER affect the request outcome.
   */
  private persistAuditLog(entry: AuditLogEntry): void {
    // Fire and forget -- do not await
    this.auditStore.write(entry).catch((error) => {
      // If audit logging itself fails, log to stderr as a fallback.
      // This is a critical failure that should trigger an alert.
      this.logger.error(
        `Failed to persist audit log: action=${entry.action}, ` +
          `actor=${entry.actorId}, target=${entry.targetId}, ` +
          `error=${(error as Error).message}`,
      );
    });
  }

  private getClientIp(request: Request): string {
    const ip = request.ip || request.socket.remoteAddress || '0.0.0.0';
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }
}
