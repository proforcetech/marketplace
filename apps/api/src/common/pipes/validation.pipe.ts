/**
 * Global Validation Pipe
 *
 * Validates and transforms incoming request data using class-validator and
 * class-transformer. This is the primary defense against malformed or
 * malicious input reaching business logic.
 *
 * Configuration:
 * - whitelist: true -- strips properties not decorated with class-validator decorators.
 *   This prevents mass assignment attacks (e.g., sending { role: 'admin' } in a profile update).
 * - forbidNonWhitelisted: true -- rejects requests with unknown properties entirely.
 *   This is stricter than stripping and helps catch API misuse early.
 * - transform: true -- automatically transforms plain objects into DTO class instances
 *   and coerces primitive types (e.g., string "123" -> number 123 for @IsNumber()).
 * - stopAtFirstError: false -- returns ALL validation errors, not just the first one.
 *   This is better UX for form submissions where multiple fields may be invalid.
 *
 * Error format:
 * Returns a structured 400 response with field-level error details, avoiding internal
 * data leakage while providing actionable feedback to API consumers.
 *
 * Performance: Validation is O(n) on the number of fields. For typical DTOs (5-20 fields),
 * this adds < 1ms to request processing. The transform step is similarly lightweight.
 */

import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
  ValidationPipe as NestValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

// ─── Error Formatting ─────────────────────────────────────────

interface FormattedValidationError {
  /** The field name that failed validation */
  field: string;
  /** Human-readable error messages for this field */
  errors: string[];
  /** Nested validation errors (for @ValidateNested fields) */
  children?: FormattedValidationError[];
}

/**
 * Recursively format class-validator errors into a clean, flat structure.
 * Strips internal constraint names and class references to avoid information leakage.
 */
function formatValidationErrors(
  errors: ValidationError[],
  parentPath: string = '',
): FormattedValidationError[] {
  const formatted: FormattedValidationError[] = [];

  for (const error of errors) {
    const fieldPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    const entry: FormattedValidationError = {
      field: fieldPath,
      errors: [],
    };

    // Extract constraint messages (e.g., "title must be longer than 3 characters")
    if (error.constraints) {
      entry.errors = Object.values(error.constraints);
    }

    // Handle nested object validation errors
    if (error.children && error.children.length > 0) {
      entry.children = formatValidationErrors(error.children, fieldPath);
    }

    // Only include entries that have actual errors (or children with errors)
    if (entry.errors.length > 0 || (entry.children && entry.children.length > 0)) {
      formatted.push(entry);
    }
  }

  return formatted;
}

// ─── Custom Exception Factory ─────────────────────────────────

/**
 * Custom exception factory that produces structured, frontend-friendly error responses.
 *
 * Example response:
 * {
 *   "statusCode": 400,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "field": "title", "errors": ["title must be longer than 3 characters"] },
 *     { "field": "price", "errors": ["price must be a positive number"] }
 *   ]
 * }
 */
function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const formattedErrors = formatValidationErrors(errors);

  return new BadRequestException({
    statusCode: 400,
    message: 'Validation failed',
    errors: formattedErrors,
  });
}

// ─── Pipe Implementation ──────────────────────────────────────

/**
 * Default validation pipe options. Can be overridden per-endpoint if needed.
 */
const DEFAULT_OPTIONS: ValidationPipeOptions = {
  /**
   * Whitelist mode: strip any properties that are NOT decorated with
   * class-validator decorators. This is critical for preventing mass
   * assignment attacks.
   *
   * Example attack this prevents:
   *   POST /users/profile { "displayName": "Alice", "role": "admin" }
   *   If the User entity has a 'role' field but the UpdateProfileDto does not
   *   decorate it, the 'role' field will be stripped before reaching the handler.
   */
  whitelist: true,

  /**
   * Reject requests that contain properties not in the DTO.
   * Combined with whitelist, this provides defense in depth:
   * whitelist strips the unknown fields, forbidNonWhitelisted rejects the request.
   *
   * Set to false if you want more lenient behavior (strip unknown fields silently).
   */
  forbidNonWhitelisted: true,

  /**
   * Transform plain objects into DTO class instances.
   * Also handles type coercion (e.g., query param "123" -> number 123).
   */
  transform: true,

  /**
   * Enable implicit type conversion during transformation.
   * This allows query parameters (always strings) to be properly typed.
   */
  transformOptions: {
    enableImplicitConversion: true,
  },

  /**
   * Return ALL validation errors, not just the first one.
   */
  stopAtFirstError: false,

  /**
   * Custom exception factory for structured error responses.
   */
  exceptionFactory: validationExceptionFactory,

  /**
   * Validate custom decorators.
   */
  validateCustomDecorators: true,
};

/**
 * Global validation pipe that should be registered in the NestJS application bootstrap:
 *
 * ```typescript
 * // main.ts
 * app.useGlobalPipes(new AppValidationPipe());
 * ```
 *
 * Or via the module system:
 * ```typescript
 * // app.module.ts
 * {
 *   provide: APP_PIPE,
 *   useClass: AppValidationPipe,
 * }
 * ```
 */
@Injectable()
export class AppValidationPipe extends NestValidationPipe {
  private readonly pipeLogger = new Logger(AppValidationPipe.name);

  constructor(options?: ValidationPipeOptions) {
    super({
      ...DEFAULT_OPTIONS,
      ...options,
    });
  }

  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      if (error instanceof BadRequestException) {
        // Log validation failures at debug level for monitoring.
        // Do NOT log the actual values (may contain sensitive data).
        const response = error.getResponse() as Record<string, unknown>;
        const errors = response['errors'] as FormattedValidationError[] | undefined;
        if (errors) {
          this.pipeLogger.debug(
            `Validation failed: ${errors.map((e) => e.field).join(', ')}`,
          );
        }
        throw error;
      }
      throw error;
    }
  }
}

// ─── Custom Validators ────────────────────────────────────────

/**
 * Re-export commonly used decorators for convenience.
 * Import these from this file to maintain a single source of validation utilities.
 */
export {
  IsString,
  IsNumber,
  IsEmail,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  Length,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsIn,
  IsUrl,
} from 'class-validator';

export { Type, Transform, Exclude, Expose } from 'class-transformer';

// ─── Common DTO Patterns ──────────────────────────────────────

/**
 * Base class for paginated list requests.
 * Extend this in endpoint-specific DTOs.
 *
 * @example
 * class ListListingsDto extends PaginationDto {
 *   @IsOptional()
 *   @IsEnum(ListingCategory)
 *   category?: ListingCategory;
 * }
 */
import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  IsIn,
} from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Standard ID parameter validation.
 * Use with @Param() validation:
 *
 * @example
 * @Get(':id')
 * getUser(@Param() params: IdParamDto) { ... }
 */
import { IsUUID } from 'class-validator';

export class IdParamDto {
  @IsUUID('4')
  id!: string;
}
