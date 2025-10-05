/**
 * Data Transformer - v3.x → v4.0
 *
 * Transforms v3.x Milvus entries to v4.0 MemoryManager format
 */

import type { V3MemoryEntry, ValidationResult, ValidationError, ValidationWarning } from '../types/migration.js';
import type { MemoryMetadata } from '../types/memory.js';

const EXPECTED_VECTOR_DIMENSIONS = 1536; // v4.0 uses 1536-dim embeddings
const LEGACY_VECTOR_DIMENSIONS = 384; // v3.x used 384-dim embeddings

/**
 * Transformed entry for v4.0
 */
export interface TransformedEntry {
  content: string;
  embedding: number[];
  metadata: MemoryMetadata;
}

/**
 * Data transformer for v3.x → v4.0 migration
 */
export class DataTransformer {
  /**
   * Transform v3.x entry to v4.0 format
   */
  transformEntry(v3Entry: V3MemoryEntry): TransformedEntry {
    // Convert vector to number array if needed
    const embedding = Array.isArray(v3Entry.vector)
      ? v3Entry.vector
      : Array.from(v3Entry.vector);

    // Build content from task and result
    const content = this.buildContent(v3Entry);

    // Build v4.0 metadata
    const extractedTags = this.extractTags(v3Entry);
    const metadata: MemoryMetadata = {
      type: this.mapEntryType(v3Entry),
      source: v3Entry.agent || 'migration',
      agentId: v3Entry.agent,
      tags: extractedTags,
      importance: this.calculateImportance(v3Entry),
      // Preserve original metadata (but don't override tags)
      ...(v3Entry.metadata ? Object.fromEntries(
        Object.entries(v3Entry.metadata).filter(([key]) => key !== 'tags')
      ) : {})
    };

    return {
      content,
      embedding,
      metadata
    };
  }

  /**
   * Build content string from v3.x entry
   */
  private buildContent(v3Entry: V3MemoryEntry): string {
    const parts: string[] = [];

    if (v3Entry.task) {
      parts.push(`Task: ${v3Entry.task}`);
    }

    if (v3Entry.result) {
      parts.push(`Result: ${v3Entry.result}`);
    }

    if (parts.length === 0) {
      // Fallback: use any available text
      parts.push(v3Entry.task || v3Entry.result || `Entry ${v3Entry.id}`);
    }

    return parts.join('\n');
  }

  /**
   * Map v3.x entry to v4.0 type
   */
  private mapEntryType(v3Entry: V3MemoryEntry): MemoryMetadata['type'] {
    const task = v3Entry.task?.toLowerCase() || '';
    const result = v3Entry.result?.toLowerCase() || '';
    const combined = `${task} ${result}`;

    // Heuristic type detection
    if (combined.includes('code') || combined.includes('implement') || combined.includes('function')) {
      return 'code';
    }

    if (combined.includes('document') || combined.includes('write') || combined.includes('spec')) {
      return 'document';
    }

    if (combined.includes('task') || combined.includes('todo') || combined.includes('action')) {
      return 'task';
    }

    if (combined.includes('conversation') || combined.includes('discuss') || combined.includes('ask')) {
      return 'conversation';
    }

    return 'other';
  }

  /**
   * Extract tags from v3.x entry
   */
  private extractTags(v3Entry: V3MemoryEntry): string[] {
    const tags: string[] = [];

    // Add agent as tag
    if (v3Entry.agent) {
      tags.push(`agent:${v3Entry.agent}`);
    }

    // Extract tags from metadata
    if (v3Entry.metadata?.tags && Array.isArray(v3Entry.metadata.tags)) {
      tags.push(...(v3Entry.metadata.tags as string[]));
    }

    // Add migration tag
    tags.push('migrated:v3');

    return tags;
  }

  /**
   * Calculate importance score
   */
  private calculateImportance(v3Entry: V3MemoryEntry): number {
    // Check metadata for importance
    if (v3Entry.metadata?.importance !== undefined) {
      return Number(v3Entry.metadata.importance);
    }

    // Calculate based on content length
    const contentLength = (v3Entry.task?.length || 0) + (v3Entry.result?.length || 0);

    if (contentLength > 1000) return 0.8;
    if (contentLength > 500) return 0.6;
    if (contentLength > 100) return 0.4;
    return 0.2;
  }

  /**
   * Validate v3.x entry
   */
  validateEntry(v3Entry: V3MemoryEntry): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    if (!v3Entry.id) {
      errors.push({
        entryId: v3Entry.id,
        field: 'id',
        message: 'Missing required field: id'
      });
    }

    if (!v3Entry.vector || v3Entry.vector.length === 0) {
      errors.push({
        entryId: v3Entry.id,
        field: 'vector',
        message: 'Missing or empty vector embedding'
      });
    }

    if (!v3Entry.task && !v3Entry.result) {
      errors.push({
        entryId: v3Entry.id,
        field: 'content',
        message: 'Missing both task and result fields'
      });
    }

    // Validate vector if present
    if (v3Entry.vector && v3Entry.vector.length > 0) {
      const vectorLength = v3Entry.vector.length;

      // Check dimensions
      if (vectorLength !== EXPECTED_VECTOR_DIMENSIONS && vectorLength !== LEGACY_VECTOR_DIMENSIONS) {
        warnings.push({
          entryId: v3Entry.id,
          field: 'vector',
          message: `Unexpected vector dimensions: ${vectorLength} (expected ${EXPECTED_VECTOR_DIMENSIONS} or ${LEGACY_VECTOR_DIMENSIONS})`
        });
      }

      // Check for invalid values
      const embedding = Array.isArray(v3Entry.vector) ? v3Entry.vector : Array.from(v3Entry.vector);

      if (embedding.some(v => !Number.isFinite(v))) {
        errors.push({
          entryId: v3Entry.id,
          field: 'vector',
          message: 'Vector contains invalid values (NaN or Infinity)'
        });
      }

      // Check for zero vectors
      if (embedding.every(v => v === 0)) {
        warnings.push({
          entryId: v3Entry.id,
          field: 'vector',
          message: 'Vector is all zeros (may indicate missing embedding)'
        });
      }
    }

    // Validate timestamp
    if (!v3Entry.timestamp) {
      warnings.push({
        entryId: v3Entry.id,
        field: 'timestamp',
        message: 'Missing timestamp, will use current time'
      });
    } else {
      const timestamp = Number(v3Entry.timestamp);
      const now = Date.now();
      const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
      const oneYearFuture = now + (365 * 24 * 60 * 60 * 1000);

      if (timestamp < oneYearAgo || timestamp > oneYearFuture) {
        warnings.push({
          entryId: v3Entry.id,
          field: 'timestamp',
          message: `Timestamp seems invalid: ${new Date(timestamp).toISOString()}`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate batch of entries
   */
  validateBatch(entries: V3MemoryEntry[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    for (const entry of entries) {
      const result = this.validateEntry(entry);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}

/**
 * Create data transformer instance
 */
export function createDataTransformer(): DataTransformer {
  return new DataTransformer();
}
