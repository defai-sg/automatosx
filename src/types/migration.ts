/**
 * Migration Tool Types
 *
 * Types for v3.x → v4.0 migration
 */

import type { MemoryMetadata } from './memory.js';

/**
 * v3.x memory entry format (from Milvus or JSON export)
 */
export interface V3MemoryEntry {
  /** Entry ID */
  id: string;

  /** Vector embedding */
  vector: number[] | Float32Array;

  /** Agent name */
  agent: string;

  /** Task description */
  task: string;

  /** Task result */
  result: string;

  /** Unix timestamp */
  timestamp: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  /** Source file path (JSON export from v3.x) */
  sourcePath: string;

  /** Destination database path */
  destPath: string;

  /** Batch size for processing */
  batchSize?: number;

  /** Validate entries before import */
  validate?: boolean;

  /** Skip duplicate entries */
  skipDuplicates?: boolean;

  /** Dry run (don't actually import) */
  dryRun?: boolean;
}

/**
 * Migration result
 */
export interface MigrationResult {
  /** Migration success */
  success: boolean;

  /** Duration in milliseconds */
  duration: number;

  /** Number of entries processed */
  entriesProcessed: number;

  /** Number of entries imported */
  entriesImported: number;

  /** Number of entries skipped */
  entriesSkipped: number;

  /** Number of entries failed */
  entriesFailed: number;

  /** Errors encountered */
  errors: Array<{ entry: V3MemoryEntry; error: string }>;

  /** Warnings */
  warnings: string[];

  /** Migration timestamp */
  migratedAt: Date;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Entry ID */
  entryId?: string;

  /** Error field */
  field?: string;

  /** Error message */
  message: string;

  /** Error details */
  details?: Record<string, unknown>;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Entry ID */
  entryId?: string;

  /** Warning field */
  field?: string;

  /** Warning message */
  message: string;
}

/**
 * Migration error class
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly code: MigrationErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export type MigrationErrorCode =
  | 'SOURCE_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'VALIDATION_FAILED'
  | 'IMPORT_FAILED'
  | 'DESTINATION_ERROR';
