import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

/**
 * Structured JSON logger implementing NestJS LoggerService.
 *
 * Production: Emits single-line JSON objects for log aggregation (ELK, CloudWatch, Datadog).
 * Development: Emits colorized human-readable format for local debugging.
 *
 * Each log entry includes: timestamp, level, context, message, and optional metadata.
 */

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  [key: string]: unknown;
}

// ANSI color codes for dev output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

const LEVEL_COLORS: Record<string, string> = {
  error: COLORS.red,
  warn: COLORS.yellow,
  log: COLORS.green,
  debug: COLORS.blue,
  verbose: COLORS.cyan,
};

@Injectable()
export class AppLogger implements LoggerService {
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env['NODE_ENV'] === 'production';
  }

  log(message: string, ...optionalParams: unknown[]): void {
    this.writeLog('log', message, optionalParams);
  }

  error(message: string, ...optionalParams: unknown[]): void {
    this.writeLog('error', message, optionalParams);
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    this.writeLog('warn', message, optionalParams);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    this.writeLog('debug', message, optionalParams);
  }

  verbose(message: string, ...optionalParams: unknown[]): void {
    this.writeLog('verbose', message, optionalParams);
  }

  fatal(message: string, ...optionalParams: unknown[]): void {
    this.writeLog('fatal', message, optionalParams);
  }

  /**
   * Called by NestJS to set which log levels are enabled.
   * We accept all levels and handle filtering via LOG_LEVEL env var if needed.
   */
  setLogLevels(_levels: LogLevel[]): void {
    // Intentionally empty -- we emit all levels and let external
    // log aggregation handle filtering when needed.
  }

  private writeLog(
    level: string,
    message: string,
    optionalParams: unknown[],
  ): void {
    const { context, meta, stack } = this.extractParams(optionalParams);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...meta,
    };

    if (stack) {
      entry['stack'] = stack;
    }

    if (this.isProduction) {
      this.writeJson(entry, level);
    } else {
      this.writeHumanReadable(entry, level, stack);
    }
  }

  /**
   * Extract context string and metadata from NestJS optional params.
   *
   * NestJS passes params in various shapes:
   * - logger.log('msg', 'ContextName')
   * - logger.error('msg', stackTrace, 'ContextName')
   * - logger.log('msg', { key: 'value' })
   */
  private extractParams(params: unknown[]): {
    context: string;
    meta: Record<string, unknown>;
    stack: string | undefined;
  } {
    let context = 'Application';
    let stack: string | undefined;
    const meta: Record<string, unknown> = {};

    if (params.length === 0) {
      return { context, meta, stack };
    }

    // Last param is typically the context string in NestJS
    const lastParam = params[params.length - 1];
    if (typeof lastParam === 'string') {
      context = lastParam;

      // For error logs: logger.error('msg', stackTrace, 'Context')
      if (params.length >= 2) {
        const secondToLast = params[params.length - 2];
        if (typeof secondToLast === 'string' && secondToLast.includes('\n')) {
          stack = secondToLast;
        } else if (
          typeof secondToLast === 'object' &&
          secondToLast !== null
        ) {
          Object.assign(meta, secondToLast);
        }
      }
    } else if (typeof lastParam === 'object' && lastParam !== null) {
      // logger.log('msg', { key: 'value' })
      Object.assign(meta, lastParam);
    }

    return { context, meta, stack };
  }

  private writeJson(entry: LogEntry, level: string): void {
    const output = JSON.stringify(entry);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  private writeHumanReadable(
    entry: LogEntry,
    level: string,
    stack: string | undefined,
  ): void {
    const color = LEVEL_COLORS[level] ?? COLORS.gray;
    const timestamp = COLORS.gray + entry.timestamp + COLORS.reset;
    const levelTag =
      color + COLORS.bold + level.toUpperCase().padEnd(7) + COLORS.reset;
    const contextTag =
      COLORS.magenta + `[${entry.context}]` + COLORS.reset;

    // Extract extra metadata keys (beyond timestamp, level, context, message)
    const metaKeys = Object.keys(entry).filter(
      (k) => !['timestamp', 'level', 'context', 'message', 'stack'].includes(k),
    );
    const metaStr =
      metaKeys.length > 0
        ? COLORS.gray +
          ' ' +
          JSON.stringify(
            Object.fromEntries(metaKeys.map((k) => [k, entry[k]])),
          ) +
          COLORS.reset
        : '';

    const line = `${timestamp} ${levelTag} ${contextTag} ${entry.message}${metaStr}`;

    if (level === 'error' || level === 'fatal') {
      process.stderr.write(line + '\n');
      if (stack) {
        process.stderr.write(COLORS.red + stack + COLORS.reset + '\n');
      }
    } else {
      process.stdout.write(line + '\n');
    }
  }
}
