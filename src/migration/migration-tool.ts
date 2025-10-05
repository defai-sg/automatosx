/**
 * Migration Tool - v3.x → v4.0
 *
 * Orchestrates the migration process from v3.x to v4.0
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { MemoryManagerVec } from '../core/memory-manager-vec.js';
import { DataTransformer } from './data-transformer.js';
import {
  MigrationError,
  type V3MemoryEntry,
  type MigrationOptions,
  type MigrationResult
} from '../types/migration.js';

/**
 * v3.x export format
 */
interface V3Export {
  version?: string;
  metadata?: {
    exportedAt: string;
    totalEntries: number;
  };
  entries: V3MemoryEntry[];
}

/**
 * Migration tool for v3.x → v4.0
 */
export class MigrationTool {
  private transformer: DataTransformer;

  constructor() {
    this.transformer = new DataTransformer();
  }

  /**
   * Migrate v3.x data to v4.0
   */
  async migrate(options: MigrationOptions): Promise<MigrationResult> {
    const {
      sourcePath,
      destPath,
      batchSize = 100,
      validate = true,
      skipDuplicates = true,
      dryRun = false
    } = options;

    const startTime = Date.now();
    let entriesProcessed = 0;
    let entriesImported = 0;
    let entriesSkipped = 0;
    let entriesFailed = 0;
    const errors: Array<{ entry: V3MemoryEntry; error: string }> = [];
    const warnings: string[] = [];

    try {
      // 1. Validate source file
      if (!existsSync(sourcePath)) {
        throw new MigrationError(
          `Source file not found: ${sourcePath}`,
          'SOURCE_NOT_FOUND',
          { sourcePath }
        );
      }

      // 2. Read and parse v3.x export
      const v3Data = await this.readV3Export(sourcePath);

      if (!v3Data.entries || v3Data.entries.length === 0) {
        warnings.push('No entries found in source file');

        return {
          success: true,
          duration: Date.now() - startTime,
          entriesProcessed: 0,
          entriesImported: 0,
          entriesSkipped: 0,
          entriesFailed: 0,
          errors: [],
          warnings,
          migratedAt: new Date()
        };
      }

      // 3. Validate entries if requested
      if (validate) {
        const validationResult = this.transformer.validateBatch(v3Data.entries);

        if (!validationResult.valid) {
          throw new MigrationError(
            `Validation failed: ${validationResult.errors.length} errors found`,
            'VALIDATION_FAILED',
            {
              errors: validationResult.errors.slice(0, 5), // First 5 errors
              totalErrors: validationResult.errors.length
            }
          );
        }

        if (validationResult.warnings.length > 0) {
          warnings.push(
            `Validation warnings: ${validationResult.warnings.length} issues found (proceeding anyway)`
          );
        }
      }

      // 4. Stop here if dry run
      if (dryRun) {
        return {
          success: true,
          duration: Date.now() - startTime,
          entriesProcessed: v3Data.entries.length,
          entriesImported: 0,
          entriesSkipped: 0,
          entriesFailed: 0,
          errors: [],
          warnings: [`Dry run: Would import ${v3Data.entries.length} entries`],
          migratedAt: new Date()
        };
      }

      // 5. Create memory manager
      const memoryManager = await MemoryManagerVec.create({
        dbPath: destPath,
        maxEntries: 100000,
        autoCleanup: false,
        trackAccess: false
      });

      // 6. Track existing content for duplicate detection
      const existingHashes = new Set<string>();
      if (skipDuplicates) {
        // This would require a method to get all content hashes
        // For now, we'll rely on MemoryManager's duplicate detection
      }

      // 7. Process entries in batches
      for (let i = 0; i < v3Data.entries.length; i += batchSize) {
        const batch = v3Data.entries.slice(i, i + batchSize);

        for (const v3Entry of batch) {
          entriesProcessed++;

          try {
            // Transform entry
            const transformed = this.transformer.transformEntry(v3Entry);

            // Import to v4.0
            await memoryManager.add(
              transformed.content,
              transformed.embedding,
              transformed.metadata
            );

            entriesImported++;
          } catch (error) {
            entriesFailed++;
            errors.push({
              entry: v3Entry,
              error: (error as Error).message
            });
          }
        }
      }

      // 8. Save and close
      await memoryManager.saveIndex();
      await memoryManager.close();

      return {
        success: entriesFailed === 0,
        duration: Date.now() - startTime,
        entriesProcessed,
        entriesImported,
        entriesSkipped,
        entriesFailed,
        errors,
        warnings,
        migratedAt: new Date()
      };
    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }

      throw new MigrationError(
        `Migration failed: ${(error as Error).message}`,
        'IMPORT_FAILED',
        { error }
      );
    }
  }

  /**
   * Read v3.x export file
   */
  private async readV3Export(filePath: string): Promise<V3Export> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as V3Export;

      // Support both v3 export format and direct entries array
      if (Array.isArray(data)) {
        return {
          entries: data as V3MemoryEntry[]
        };
      }

      return data;
    } catch (error) {
      throw new MigrationError(
        `Failed to read source file: ${(error as Error).message}`,
        'INVALID_FORMAT',
        { filePath, error }
      );
    }
  }

  /**
   * Validate source file without importing
   */
  async validate(sourcePath: string): Promise<{
    valid: boolean;
    totalEntries: number;
    errors: string[];
    warnings: string[];
  }> {
    try {
      // Read v3 export
      const v3Data = await this.readV3Export(sourcePath);

      if (!v3Data.entries || v3Data.entries.length === 0) {
        return {
          valid: true,
          totalEntries: 0,
          errors: [],
          warnings: ['No entries found in source file']
        };
      }

      // Validate entries
      const validationResult = this.transformer.validateBatch(v3Data.entries);

      return {
        valid: validationResult.valid,
        totalEntries: v3Data.entries.length,
        errors: validationResult.errors.map(e => e.message),
        warnings: validationResult.warnings.map(w => w.message)
      };
    } catch (error) {
      return {
        valid: false,
        totalEntries: 0,
        errors: [(error as Error).message],
        warnings: []
      };
    }
  }
}

/**
 * Create migration tool instance
 */
export function createMigrationTool(): MigrationTool {
  return new MigrationTool();
}
