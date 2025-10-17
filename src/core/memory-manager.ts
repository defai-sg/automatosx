/**
 * Memory Manager - SQLite + vec extension implementation
 *
 * This replaces the HNSW implementation with pure SQLite vector search
 * using the sqlite-vec extension for better portability and simpler deployment.
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { existsSync, mkdirSync } from 'fs';
import type {
  IMemoryManager,
  MemoryEntry,
  MemoryMetadata,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryManagerConfig,
  MemoryStats
} from '../types/memory.js';
import { MemoryError } from '../types/memory.js';
import { logger } from '../utils/logger.js';
import { dirname, normalizePath } from '../utils/path-utils.js';

// v4.11.0: VECTOR_DIMENSIONS removed (FTS5 only, no vector search)

/**
 * Memory Manager using SQLite + FTS5 for full-text search
 *
 * Features:
 * - FTS5 full-text search (keyword matching)
 * - Optional vector search support (for Plus version)
 * - No embedding provider required
 * - Simple deployment
 * - Cross-platform compatibility
 *
 * v4.11.0: Removed embedding dependency, added FTS5 support
 */
export class MemoryManager implements IMemoryManager {
  private db: Database.Database;
  private config: Required<Omit<MemoryManagerConfig, 'embeddingProvider' | 'hnsw' | 'cleanup'>> & {
    embeddingProvider?: unknown;
  };
  private embeddingProvider?: any;
  private initialized: boolean = false;
  private useFTS: boolean = true; // Use FTS5 by default

  // Phase 1: Performance optimization
  private entryCount: number = 0; // Internal counter to avoid repeated COUNT(*)
  private statements: {
    countAll?: Database.Statement;
    insert?: Database.Statement;
    deleteById?: Database.Statement;
    deleteOldest?: Database.Statement;
    deleteBeforeCutoff?: Database.Statement;
    updateAccessCount?: Database.Statement;
  } = {}

  // Phase 2: Smart cleanup configuration
  private cleanupConfig: {
    enabled: boolean;
    strategy: 'oldest' | 'least_accessed' | 'hybrid';
    triggerThreshold: number;
    targetThreshold: number;
    minCleanupCount: number;
    maxCleanupCount: number;
    retentionDays: number;
  }

  private constructor(config: MemoryManagerConfig) {
    // Set default config
    this.config = {
      dbPath: config.dbPath,
      maxEntries: config.maxEntries ?? 10000,
      autoCleanup: config.autoCleanup ?? true,
      cleanupDays: config.cleanupDays ?? 30,
      trackAccess: config.trackAccess ?? true,
      embeddingProvider: config.embeddingProvider
    };

    this.embeddingProvider = config.embeddingProvider;

    // Phase 2: Initialize smart cleanup configuration with defaults
    const cleanupCfg = config.cleanup || {};

    // Handle backward compatibility: autoCleanup → cleanup.enabled
    const enabled = cleanupCfg.enabled ?? config.autoCleanup ?? true;

    // Handle backward compatibility: cleanupDays → cleanup.retentionDays
    const retentionDays = cleanupCfg.retentionDays ?? config.cleanupDays ?? 30;

    this.cleanupConfig = {
      enabled,
      strategy: cleanupCfg.strategy ?? 'oldest',
      triggerThreshold: cleanupCfg.triggerThreshold ?? 0.9,
      targetThreshold: cleanupCfg.targetThreshold ?? 0.7,
      minCleanupCount: cleanupCfg.minCleanupCount ?? 10,
      maxCleanupCount: cleanupCfg.maxCleanupCount ?? 1000,
      retentionDays
    };

    // Validate cleanup configuration
    this.validateCleanupConfig();

    // Ensure directory exists
    const dir = dirname(this.config.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.config.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');  // Wait up to 5 seconds for locks
  }

  /**
   * Create MemoryManager instance (async factory)
   */
  static async create(config: MemoryManagerConfig): Promise<MemoryManager> {
    const manager = new MemoryManager(config);
    await manager.initialize();
    return manager;
  }

  /**
   * Initialize database and load FTS5 extension
   *
   * v4.11.0: Added FTS5 full-text search support
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load sqlite-vec extension (for Plus version compatibility)
      try {
        sqliteVec.load(this.db);
      } catch (error) {
        // vec extension is optional (only needed for Plus version)
        logger.debug('sqlite-vec extension not loaded (not required for FTS5)', {
          error: (error as Error).message
        });
      }

      // Create tables
      // v4.11.0: Removed memory_vectors table (FTS5 only, no vector search)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memory_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          last_accessed_at INTEGER,
          access_count INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_created_at ON memory_entries(created_at);
        CREATE INDEX IF NOT EXISTS idx_access_count ON memory_entries(access_count);
      `);

      // Create FTS5 virtual table for full-text search
      // v4.11.0: Removed external content to avoid trigger issues
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
          content,
          metadata
        );

        -- Triggers to keep FTS index in sync
        CREATE TRIGGER IF NOT EXISTS memory_fts_insert AFTER INSERT ON memory_entries BEGIN
          INSERT INTO memory_fts(rowid, content, metadata)
          VALUES (new.id, new.content, new.metadata);
        END;

        CREATE TRIGGER IF NOT EXISTS memory_fts_delete AFTER DELETE ON memory_entries BEGIN
          DELETE FROM memory_fts WHERE rowid = old.id;
        END;

        CREATE TRIGGER IF NOT EXISTS memory_fts_update AFTER UPDATE ON memory_entries BEGIN
          UPDATE memory_fts
          SET content = new.content, metadata = new.metadata
          WHERE rowid = old.id;
        END;
      `);

      // Phase 1: Prepare frequently-used statements for better performance
      this.statements.countAll = this.db.prepare('SELECT COUNT(*) as count FROM memory_entries');
      this.statements.insert = this.db.prepare(`
        INSERT INTO memory_entries (content, metadata, created_at, last_accessed_at, access_count)
        VALUES (?, ?, ?, ?, 0)
      `);
      this.statements.deleteById = this.db.prepare('DELETE FROM memory_entries WHERE id = ?');
      this.statements.deleteOldest = this.db.prepare(`
        DELETE FROM memory_entries
        WHERE id IN (
          SELECT id FROM memory_entries
          ORDER BY created_at ASC
          LIMIT ?
        )
      `);
      this.statements.deleteBeforeCutoff = this.db.prepare(`
        DELETE FROM memory_entries
        WHERE created_at < ?
      `);
      this.statements.updateAccessCount = this.db.prepare(`
        UPDATE memory_entries
        SET access_count = access_count + 1, last_accessed_at = ?
        WHERE id = ?
      `);

      // Initialize internal entry counter
      const countResult = this.statements.countAll.get() as { count: number };
      this.entryCount = countResult.count;

      this.initialized = true;
      logger.info('MemoryManager initialized successfully', {
        dbPath: normalizePath(this.config.dbPath),
        searchMethod: 'FTS5',
        hasEmbeddingProvider: !!this.embeddingProvider,
        entryCount: this.entryCount
      });
    } catch (error) {
      logger.error('Failed to initialize MemoryManager', { error: (error as Error).message });
      throw new MemoryError(
        `Failed to initialize memory system: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Add a new memory entry
   *
   * v4.11.0: Embedding is now optional (only needed for Plus version)
   * v5.0.9: Phase 1 - Transaction atomicity with prepared statements
   */
  async add(content: string, embedding: number[] | null, metadata: MemoryMetadata): Promise<MemoryEntry> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    // v4.11.0: Embedding validation removed (FTS5 only, no vector search)
    // Note: embedding parameter deprecated but kept for backward compatibility

    // Phase 2: Smart cleanup - check threshold before add
    if (this.shouldTriggerCleanup()) {
      try {
        const removed = await this.executeSmartCleanup();
        logger.info('Smart cleanup triggered', {
          removed,
          currentCount: this.entryCount,
          usage: (this.entryCount / this.config.maxEntries * 100).toFixed(1) + '%',
          threshold: (this.cleanupConfig.triggerThreshold * 100).toFixed(0) + '%',
          strategy: this.cleanupConfig.strategy
        });
      } catch (error) {
        logger.warn('Smart cleanup failed', {
          error: (error as Error).message
        });
      }
    }

    try {
      const now = Date.now();
      const metadataStr = JSON.stringify(metadata);

      // Phase 1.1: Transaction with proper counter synchronization
      // Return deletion count and ID, update counter AFTER transaction succeeds
      const insertTxn = this.db.transaction(() => {
        let deletedCount = 0;

        // v5.0.8: Enforce maxEntries limit inside transaction
        if (this.entryCount >= this.config.maxEntries) {
          // Auto-cleanup oldest entries to make room
          const entriesToRemove = Math.min(100, Math.floor(this.config.maxEntries * 0.1));
          const deleteInfo = this.statements.deleteOldest!.run(entriesToRemove);
          deletedCount = deleteInfo.changes;

          logger.warn('Memory limit approaching, auto-cleanup triggered', {
            currentCount: this.entryCount,
            maxEntries: this.config.maxEntries,
            removed: deletedCount
          });

          // Check if cleanup freed enough space
          if (this.entryCount - deletedCount >= this.config.maxEntries) {
            throw new MemoryError(
              `Memory limit reached (${this.config.maxEntries} entries). Run 'ax memory clear' or increase maxEntries in config.`,
              'MEMORY_LIMIT'
            );
          }
        }

        // Insert entry using prepared statement (FTS5 index is automatically updated via trigger)
        const insertResult = this.statements.insert!.run(content, metadataStr, now, now);

        logger.debug('Memory entry added', {
          id: insertResult.lastInsertRowid,
          contentLength: content.length,
          searchMethod: 'FTS5',
          deletedCount
        });

        return { id: Number(insertResult.lastInsertRowid), deletedCount };
      });

      // Execute transaction and update counter ONLY on success
      const { id, deletedCount } = insertTxn();
      this.entryCount = this.entryCount - deletedCount + 1;

      // v4.11.0: No vector storage (FTS5 only)

      return {
        id,
        content,
        embedding: [],  // v4.11.0: Always empty (FTS5 only)
        metadata,
        createdAt: new Date(now),
        accessCount: 0
      };
    } catch (error) {
      throw new MemoryError(
        `Failed to add memory entry: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Search for memories using FTS5 full-text search
   *
   * v4.11.0: Changed from vector search to FTS5 keyword search
   */
  async search(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    // Use FTS5 for text search (no embedding needed)
    if (!query.text) {
      throw new MemoryError(
        'Search query must provide text for FTS5 search',
        'QUERY_ERROR'
      );
    }

    try {
      const limit = query.limit || 10;

      // Build metadata filter conditions
      const conditions: string[] = [];
      const params: unknown[] = [];

      // Apply metadata filters
      if (query.filters) {
        if (query.filters.type) {
          const types = Array.isArray(query.filters.type) ? query.filters.type : [query.filters.type];
          conditions.push(`json_extract(e.metadata, '$.type') IN (${types.map(() => '?').join(',')})`);
          params.push(...types);
        }

        if (query.filters.source) {
          const sources = Array.isArray(query.filters.source) ? query.filters.source : [query.filters.source];
          conditions.push(`json_extract(e.metadata, '$.source') IN (${sources.map(() => '?').join(',')})`);
          params.push(...sources);
        }

        if (query.filters.agentId) {
          conditions.push(`json_extract(e.metadata, '$.agentId') = ?`);
          params.push(query.filters.agentId);
        }

        if (query.filters.sessionId) {
          conditions.push(`json_extract(e.metadata, '$.sessionId') = ?`);
          params.push(query.filters.sessionId);
        }

        if (query.filters.tags && query.filters.tags.length > 0) {
          // Check if all required tags are present (AND logic)
          query.filters.tags.forEach(tag => {
            conditions.push(`EXISTS (SELECT 1 FROM json_each(e.metadata, '$.tags') WHERE value = ?)`);
            params.push(tag);
          });
        }

        if (query.filters.dateRange?.from) {
          conditions.push('e.created_at >= ?');
          params.push(query.filters.dateRange.from.getTime());
        }

        if (query.filters.dateRange?.to) {
          conditions.push('e.created_at <= ?');
          params.push(query.filters.dateRange.to.getTime());
        }

        if (query.filters.minImportance !== undefined) {
          conditions.push(`CAST(json_extract(e.metadata, '$.importance') AS REAL) >= ?`);
          params.push(query.filters.minImportance);
        }
      }

      // Build WHERE clause for metadata filters
      const metadataWhere = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

      // Use FTS5 MATCH for full-text search
      // FTS5 returns results sorted by relevance (rank)
      const sql = `
        SELECT
          e.id,
          e.content,
          e.metadata,
          e.created_at,
          e.last_accessed_at,
          e.access_count,
          bm25(memory_fts) as relevance
        FROM memory_fts
        JOIN memory_entries e ON memory_fts.rowid = e.id
        WHERE memory_fts MATCH ?${metadataWhere}
        ORDER BY bm25(memory_fts)
        LIMIT ?
      `;

      // FTS5 query syntax: escape special characters and use simple query
      // Remove FTS5 special characters that can cause syntax errors
      // Special chars: . : " * ( ) [ ] { } ^ $ + | \ - % < > ~ / @ # & = ? ! ; ' ` , AND OR NOT
      const ftsQuery = query.text
        .replace(/[.:"*()[\]{}^$+|\\%<>~\-/@#&=?!;'`,]/g, ' ')  // Replace special chars with spaces
        .replace(/\b(AND|OR|NOT)\b/gi, ' ')                      // Remove boolean operators
        .replace(/\s+/g, ' ')                                     // Normalize whitespace
        .trim();

      // If query becomes empty after sanitization, return empty results
      if (!ftsQuery) {
        logger.debug('FTS5 query empty after sanitization', { originalQuery: query.text });
        return [];
      }

      const finalParams = [ftsQuery, ...params, limit];

      const results = this.db.prepare(sql).all(...finalParams) as any[];

      // Phase 1.1: Update access tracking with batch UPDATE for atomicity and performance
      // Note: Cannot use prepared statement here due to dynamic IN (?) clause
      if (this.config.trackAccess && results.length > 0) {
        const now = Date.now();
        const ids = results.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');

        // Batch update: all succeed or all fail (atomic), much faster than N individual updates
        this.db.prepare(`
          UPDATE memory_entries
          SET last_accessed_at = ?, access_count = access_count + 1
          WHERE id IN (${placeholders})
        `).run(now, ...ids);
      }

      return results.map(row => {
        // FTS5 bm25() returns non-negative scores where lower is more relevant
        // Convert to similarity score (0-1, higher is better)
        // Use inverse function: as bm25 score increases, similarity decreases
        const similarity = Math.max(0, Math.min(1, 1 / (1 + Math.abs(row.relevance))));

        return {
          entry: {
            id: row.id,
            content: row.content,
            embedding: [], // No embedding in FTS5 mode
            metadata: JSON.parse(row.metadata),
            createdAt: new Date(row.created_at),
            lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
            accessCount: row.access_count
          },
          similarity,
          distance: 1 - similarity
        };
      }).filter(result => {
        // Apply threshold filter if specified
        const threshold = query.threshold ?? 0;
        return result.similarity >= threshold;
      });
    } catch (error) {
      throw new MemoryError(
        `Search failed: ${(error as Error).message}`,
        'QUERY_ERROR'
      );
    }
  }

  /**
   * Get memory by ID
   *
   * v4.11.0: No vector loading (FTS5 only)
   */
  async get(id: number): Promise<MemoryEntry | null> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      // v4.11.0: No JOIN with memory_vectors (FTS5 only)
      const row = this.db.prepare(`
        SELECT *
        FROM memory_entries
        WHERE id = ?
      `).get(id) as any;

      if (!row) return null;

      return {
        id: row.id,
        content: row.content,
        embedding: [], // No embedding in FTS5 mode
        metadata: JSON.parse(row.metadata),
        createdAt: new Date(row.created_at),
        lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
        accessCount: row.access_count
      };
    } catch (error) {
      throw new MemoryError(
        `Failed to get entry: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Update memory metadata
   */
  async update(id: number, metadata: Partial<MemoryMetadata>): Promise<void> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      // Get existing entry
      const existing = await this.get(id);
      if (!existing) {
        throw new MemoryError(`Memory entry not found: ${id}`, 'ENTRY_NOT_FOUND');
      }

      // Merge metadata
      const newMetadata = { ...existing.metadata, ...metadata };

      this.db.prepare(`
        UPDATE memory_entries
        SET metadata = ?
        WHERE id = ?
      `).run(JSON.stringify(newMetadata), id);

      logger.debug('Memory entry updated', { id });
    } catch (error) {
      if (error instanceof MemoryError) throw error;
      throw new MemoryError(
        `Failed to update entry: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Delete memory by ID
   */
  async delete(id: number): Promise<void> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      // Check if entry exists
      const existing = await this.get(id);
      if (!existing) {
        throw new MemoryError(`Memory entry not found: ${id}`, 'ENTRY_NOT_FOUND');
      }

      // Phase 1: Use prepared statement and maintain entryCount
      const deleteInfo = this.statements.deleteById!.run(id);
      if (deleteInfo.changes > 0) {
        this.entryCount -= deleteInfo.changes;
      }

      logger.debug('Memory entry deleted', { id, newCount: this.entryCount });
    } catch (error) {
      if (error instanceof MemoryError) throw error;
      throw new MemoryError(
        `Failed to delete entry: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Get all memory entries with optional filtering and pagination
   */
  async getAll(options?: {
    type?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    orderBy?: 'created' | 'accessed' | 'count';
    order?: 'asc' | 'desc';
  }): Promise<MemoryEntry[]> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      const conditions: string[] = [];
      const params: any[] = [];

      // Build WHERE clause with filters
      if (options?.type) {
        conditions.push("json_extract(e.metadata, '$.type') = ?");
        params.push(options.type);
      }

      if (options?.tags && options.tags.length > 0) {
        // Check if any of the provided tags exist in the entry's tags array
        const tagConditions = options.tags.map(() =>
          "EXISTS (SELECT 1 FROM json_each(json_extract(e.metadata, '$.tags')) WHERE value = ?)"
        );
        conditions.push(`(${tagConditions.join(' OR ')})`);
        params.push(...options.tags);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY e.created_at DESC';
      if (options?.orderBy) {
        const column = options.orderBy === 'created' ? 'e.created_at' :
                      options.orderBy === 'accessed' ? 'e.last_accessed_at' :
                      'e.access_count';
        const direction = options.order || 'desc';
        orderByClause = `ORDER BY ${column} ${direction.toUpperCase()}`;
      }

      // Build LIMIT clause
      const limitClause = options?.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options?.offset ? `OFFSET ${options.offset}` : '';

      // v4.11.0: No JOIN with memory_vectors (FTS5 only)
      const sql = `
        SELECT e.*
        FROM memory_entries e
        ${whereClause}
        ${orderByClause}
        ${limitClause}
        ${offsetClause}
      `;

      const rows = this.db.prepare(sql).all(...params) as any[];

      return rows.map(row => {
        return {
          id: row.id,
          content: row.content,
          embedding: [], // No embedding in FTS5 mode
          metadata: JSON.parse(row.metadata),
          createdAt: new Date(row.created_at),
          lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
          accessCount: row.access_count
        };
      });
    } catch (error) {
      throw new MemoryError(
        `Failed to retrieve entries: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      this.db.prepare('DELETE FROM memory_entries').run();
      // Phase 1: Reset internal counter
      this.entryCount = 0;

      this.db.prepare('VACUUM').run();
      logger.info('All memory entries cleared');
    } catch (error) {
      throw new MemoryError(
        `Failed to clear entries: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      const count = this.db.prepare('SELECT COUNT(*) as count FROM memory_entries').get() as { count: number };
      const size = this.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };

      return {
        totalEntries: count.count,
        dbSize: size.size,
        indexSize: 0, // vec extension handles indexing internally
        memoryUsage: process.memoryUsage().heapUsed
      };
    } catch (error) {
      throw new MemoryError(
        `Failed to get stats: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Cleanup old entries
   */
  /**
   * Get total count of memory entries
   * v5.0.8: Added for maxEntries enforcement
   */
  /**
   * Get current entry count
   * Phase 1: Use internal counter instead of COUNT(*) for better performance
   */
  private getCount(): number {
    if (!this.initialized) {
      return 0;
    }

    // Return internal counter (maintained by transactions)
    return this.entryCount;
  }

  /**
   * Phase 2: Validate cleanup configuration
   * v5.0.10 Phase 2.1: Added validation for maxCleanupCount and retentionDays
   * @throws {MemoryError} if configuration is invalid
   */
  private validateCleanupConfig(): void {
    const cfg = this.cleanupConfig;

    if (cfg.triggerThreshold < 0.5 || cfg.triggerThreshold > 1.0) {
      throw new MemoryError(
        'cleanup.triggerThreshold must be between 0.5 and 1.0',
        'CONFIG_ERROR'
      );
    }

    if (cfg.targetThreshold < 0.1 || cfg.targetThreshold > 0.9) {
      throw new MemoryError(
        'cleanup.targetThreshold must be between 0.1 and 0.9',
        'CONFIG_ERROR'
      );
    }

    if (cfg.targetThreshold >= cfg.triggerThreshold) {
      throw new MemoryError(
        'cleanup.targetThreshold must be less than triggerThreshold',
        'CONFIG_ERROR'
      );
    }

    if (cfg.minCleanupCount < 1) {
      throw new MemoryError(
        'cleanup.minCleanupCount must be at least 1',
        'CONFIG_ERROR'
      );
    }

    // Phase 2.1: Validate maxCleanupCount is positive
    if (cfg.maxCleanupCount < 1) {
      throw new MemoryError(
        'cleanup.maxCleanupCount must be at least 1',
        'CONFIG_ERROR'
      );
    }

    if (cfg.maxCleanupCount < cfg.minCleanupCount) {
      throw new MemoryError(
        'cleanup.maxCleanupCount must be >= minCleanupCount',
        'CONFIG_ERROR'
      );
    }

    // Phase 2.1: Validate retentionDays is positive
    if (cfg.retentionDays < 1) {
      throw new MemoryError(
        'cleanup.retentionDays must be at least 1',
        'CONFIG_ERROR'
      );
    }
  }

  /**
   * Phase 2: Check if cleanup should be triggered based on usage threshold
   */
  private shouldTriggerCleanup(): boolean {
    if (!this.cleanupConfig.enabled) {
      return false;
    }

    const currentUsage = this.entryCount / this.config.maxEntries;
    return currentUsage >= this.cleanupConfig.triggerThreshold;
  }

  /**
   * Phase 2: Calculate how many entries to remove to reach target threshold
   */
  private calculateCleanupCount(): number {
    const targetCount = Math.floor(
      this.config.maxEntries * this.cleanupConfig.targetThreshold
    );
    const toRemove = this.entryCount - targetCount;

    // Phase 2.1: If already below target, don't cleanup
    if (toRemove <= 0) {
      return 0;
    }

    // Enforce min/max bounds
    return Math.max(
      this.cleanupConfig.minCleanupCount,
      Math.min(this.cleanupConfig.maxCleanupCount, toRemove)
    );
  }

  /**
   * Phase 2: Execute cleanup with configured strategy
   * @returns Number of entries removed
   */
  private async executeSmartCleanup(): Promise<number> {
    const count = this.calculateCleanupCount();

    logger.debug('Executing smart cleanup', {
      strategy: this.cleanupConfig.strategy,
      count,
      currentCount: this.entryCount,
      threshold: this.cleanupConfig.triggerThreshold
    });

    // Phase 2.1: All cleanup methods now return actual deleted count
    switch (this.cleanupConfig.strategy) {
      case 'oldest':
        return await this.cleanupOldest(count);

      case 'least_accessed':
        return await this.cleanupLeastAccessed(count);

      case 'hybrid':
        return await this.cleanupHybrid(count);

      default:
        throw new MemoryError(
          `Unknown cleanup strategy: ${this.cleanupConfig.strategy}`,
          'CONFIG_ERROR'
        );
    }
  }

  /**
   * Remove oldest entries
   * v5.0.8: Added for automatic cleanup when approaching maxEntries
   * v5.0.10 Phase 2: Enhanced logging with strategy info
   * v5.0.10 Phase 2.1: Now returns actual deleted count
   */
  private async cleanupOldest(count: number): Promise<number> {
    if (!this.initialized || count <= 0) {
      return 0;
    }

    try {
      // Phase 1: Use prepared statement and maintain entryCount
      const deleteInfo = this.statements.deleteOldest!.run(count);
      if (deleteInfo.changes > 0) {
        this.entryCount -= deleteInfo.changes;
      }

      logger.info('Cleaned up oldest entries', {
        requested: count,
        deleted: deleteInfo.changes,
        newCount: this.entryCount,
        strategy: 'oldest'  // Phase 2: Add strategy info
      });

      return deleteInfo.changes;
    } catch (error) {
      logger.error('Failed to cleanup oldest entries', {
        count,
        error: (error as Error).message
      });
      return 0;
    }
  }

  /**
   * Phase 2: Remove least accessed entries
   * v5.0.10 Phase 2.1: Now async to support fallback to cleanupOldest
   * @param count Number of entries to remove
   * @returns Number of entries actually removed
   */
  private async cleanupLeastAccessed(count: number): Promise<number> {
    if (!this.initialized || count <= 0) {
      return 0;
    }

    if (!this.config.trackAccess) {
      logger.warn('least_accessed strategy requires trackAccess=true, falling back to oldest');
      return await this.cleanupOldest(count);  // Phase 2.1: Properly await fallback
    }

    try {
      const deleteInfo = this.db.prepare(`
        DELETE FROM memory_entries
        WHERE id IN (
          SELECT id FROM memory_entries
          ORDER BY access_count ASC, last_accessed_at ASC
          LIMIT ?
        )
      `).run(count);

      if (deleteInfo.changes > 0) {
        this.entryCount -= deleteInfo.changes;
      }

      logger.info('Cleaned up least accessed entries', {
        requested: count,
        deleted: deleteInfo.changes,
        newCount: this.entryCount,
        strategy: 'least_accessed'
      });

      return deleteInfo.changes;
    } catch (error) {
      logger.error('Failed to cleanup least accessed entries', {
        count,
        error: (error as Error).message
      });
      return 0;
    }
  }

  /**
   * Phase 2: Remove entries using hybrid strategy (access count + age)
   * v5.0.10 Phase 2.1: Now async for consistency with other cleanup methods
   * @param count Number of entries to remove
   * @returns Number of entries actually removed
   */
  private async cleanupHybrid(count: number): Promise<number> {
    if (!this.initialized || count <= 0) {
      return 0;
    }

    try {
      const deleteInfo = this.db.prepare(`
        DELETE FROM memory_entries
        WHERE id IN (
          SELECT id FROM memory_entries
          ORDER BY
            access_count ASC,
            created_at ASC
          LIMIT ?
        )
      `).run(count);

      if (deleteInfo.changes > 0) {
        this.entryCount -= deleteInfo.changes;
      }

      logger.info('Cleaned up entries using hybrid strategy', {
        requested: count,
        deleted: deleteInfo.changes,
        newCount: this.entryCount,
        strategy: 'hybrid'
      });

      return deleteInfo.changes;
    } catch (error) {
      logger.error('Failed to cleanup with hybrid strategy', {
        count,
        error: (error as Error).message
      });
      return 0;
    }
  }

  async cleanup(olderThanDays?: number): Promise<number> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    const days = olderThanDays || this.config.cleanupDays;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    try {
      // Phase 1: Use prepared statement and maintain entryCount
      const deleteInfo = this.statements.deleteBeforeCutoff!.run(cutoffTime);
      const deleted = deleteInfo.changes;

      if (deleted > 0) {
        this.entryCount -= deleted;
        this.db.prepare('VACUUM').run();
        logger.info('Cleanup completed', {
          deleted,
          olderThanDays: days,
          newCount: this.entryCount
        });
      }

      return deleted;
    } catch (error) {
      throw new MemoryError(
        `Cleanup failed: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Close database
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.initialized = false;
      logger.info('MemoryManager closed');
    }
  }

  // Stub implementations for interface compliance
  async saveIndex(): Promise<void> {
    // sqlite-vec handles indexing automatically
  }

  async loadIndex(): Promise<void> {
    // sqlite-vec handles indexing automatically
  }

  async backup(destPath: string): Promise<void> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      // Ensure destination directory exists
      const { mkdir } = await import('fs/promises');
      const destDir = dirname(destPath);
      await mkdir(destDir, { recursive: true });

      // Use better-sqlite3 backup API (async in v12+)
      // backup() copies FROM source TO destination path
      await this.db.backup(destPath);

      logger.info('Database backup created', { destPath: normalizePath(destPath) });
    } catch (error) {
      throw new MemoryError(
        `Failed to create backup: ${(error as Error).message}`,
        'DATABASE_ERROR',
        { destPath, error }
      );
    }
  }

  async restore(srcPath: string): Promise<void> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    try {
      // Validate source exists
      if (!existsSync(srcPath)) {
        throw new MemoryError(
          `Backup file not found: ${srcPath}`,
          'DATABASE_ERROR',
          { srcPath }
        );
      }

      // Close current database and reset state
      // Phase 2.1 Fix: Must reset all state before reinitializing
      this.db.close();
      this.initialized = false;
      this.entryCount = 0;
      this.statements = {};

      // Copy backup to current location using better-sqlite3's backup method
      const srcDb = new Database(srcPath, { readonly: true });
      const destDb = new Database(this.config.dbPath);
      await srcDb.backup(this.config.dbPath);
      srcDb.close();
      destDb.close();

      // Reopen database
      this.db = new Database(this.config.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('busy_timeout = 5000');  // Wait up to 5 seconds for locks

      // Phase 2.1 Fix: Reinitialize completely (rebuild statements, recount entries)
      // This ensures prepared statements are bound to the new connection
      await this.initialize();

      logger.info('Database restored successfully', { srcPath: normalizePath(srcPath) });
    } catch (error) {
      throw new MemoryError(
        `Failed to restore database: ${(error as Error).message}`,
        'DATABASE_ERROR',
        { srcPath, error }
      );
    }
  }

  async exportToJSON(
    filePath: string,
    options?: import('../types/memory.js').ExportOptions
  ): Promise<import('../types/memory.js').ExportResult> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    const {
      includeEmbeddings = false,
      filters = {},
      batchSize = 1000,
      pretty = false
    } = options || {};

    try {
      // Ensure destination directory exists
      const destDir = dirname(filePath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Build query with filters
      // v4.11.0: No JOIN with memory_vectors (FTS5 only, no embeddings)
      let query = 'SELECT e.* FROM memory_entries e';
      const conditions: string[] = [];
      const params: unknown[] = [];

      // Apply filters
      if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        conditions.push(`json_extract(e.metadata, '$.type') IN (${types.map(() => '?').join(',')})`);
        params.push(...types);
      }

      if (filters.source) {
        const sources = Array.isArray(filters.source) ? filters.source : [filters.source];
        conditions.push(`json_extract(e.metadata, '$.source') IN (${sources.map(() => '?').join(',')})`);
        params.push(...sources);
      }

      if (filters.agentId) {
        conditions.push(`json_extract(e.metadata, '$.agentId') = ?`);
        params.push(filters.agentId);
      }

      if (filters.sessionId) {
        conditions.push(`json_extract(e.metadata, '$.sessionId') = ?`);
        params.push(filters.sessionId);
      }

      if (filters.dateRange?.from) {
        conditions.push('e.created_at >= ?');
        params.push(filters.dateRange.from.getTime());
      }

      if (filters.dateRange?.to) {
        conditions.push('e.created_at <= ?');
        params.push(filters.dateRange.to.getTime());
      }

      if (filters.minImportance !== undefined) {
        conditions.push(`CAST(json_extract(e.metadata, '$.importance') AS REAL) >= ?`);
        params.push(filters.minImportance);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Execute query
      const rows = this.db.prepare(query).all(...params) as Array<{
        id: number;
        content: string;
        metadata: string;
        created_at: number;
        last_accessed_at: number | null;
        access_count: number;
        embedding: Buffer | null;
      }>;

      // Build export data
      const entries = rows.map(row => {
        const entry: {
          id: number;
          content: string;
          embedding?: number[];
          metadata: MemoryMetadata;
          createdAt: string;
          lastAccessedAt?: string;
          accessCount: number;
        } = {
          id: row.id,
          content: row.content,
          metadata: JSON.parse(row.metadata),
          createdAt: new Date(row.created_at).toISOString(),
          accessCount: row.access_count
        };

        if (row.last_accessed_at) {
          entry.lastAccessedAt = new Date(row.last_accessed_at).toISOString();
        }

        // v4.11.0: No embeddings in FTS5 mode

        return entry;
      });

      // Create export object
      const exportData: import('../types/memory.js').MemoryExport = {
        version: '4.11.0',  // v4.11.0: Updated version
        metadata: {
          exportedAt: new Date().toISOString(),
          totalEntries: entries.length,
          includesEmbeddings: false  // v4.11.0: Always false (FTS5 only)
        },
        entries
      };

      // Write to file
      const { writeFile } = await import('fs/promises');
      const json = pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
      await writeFile(filePath, json, 'utf-8');

      const sizeBytes = Buffer.byteLength(json, 'utf-8');

      logger.info('Memory exported to JSON', {
        filePath: normalizePath(filePath),
        entriesExported: entries.length,
        sizeBytes
      });

      return {
        entriesExported: entries.length,
        sizeBytes,
        filePath,
        exportedAt: new Date()
      };
    } catch (error) {
      throw new MemoryError(
        `Export failed: ${(error as Error).message}`,
        'DATABASE_ERROR',
        { filePath, error }
      );
    }
  }

  async importFromJSON(
    filePath: string,
    options?: import('../types/memory.js').ImportOptions
  ): Promise<import('../types/memory.js').ImportResult> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    const {
      skipDuplicates = true,
      batchSize = 100,
      validate = true,
      clearExisting = false
    } = options || {};

    try {
      // Validate import file exists
      if (!existsSync(filePath)) {
        throw new MemoryError(
          `Import file not found: ${filePath}`,
          'DATABASE_ERROR',
          { filePath }
        );
      }

      // Read import file
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf-8');
      const importData = JSON.parse(content) as import('../types/memory.js').MemoryExport;

      // Validate format version
      const SUPPORTED_VERSIONS = ['1.0', '4.0.0', '4.11.0'];
      if (!importData.version || !SUPPORTED_VERSIONS.includes(importData.version)) {
        throw new MemoryError(
          `Unsupported export format version: ${importData.version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
          'DATABASE_ERROR',
          { version: importData.version, supportedVersions: SUPPORTED_VERSIONS }
        );
      }

      // Validate format
      if (!importData.entries || !Array.isArray(importData.entries)) {
        throw new MemoryError(
          'Invalid import format: missing entries array',
          'DATABASE_ERROR'
        );
      }

      // Clear existing data if requested
      if (clearExisting) {
        await this.clear();
      }

      let entriesImported = 0;
      let entriesSkipped = 0;
      let entriesFailed = 0;
      const errors: Array<{ entry: unknown; error: string }> = [];

      // Track existing content hashes for duplicate detection
      const existingHashes = new Set<string>();
      if (skipDuplicates) {
        const existing = this.db.prepare('SELECT content FROM memory_entries').all() as Array<{ content: string }>;
        existing.forEach(row => {
          existingHashes.add(this.hashContent(row.content));
        });
      }

      // Process entries in batches
      for (let i = 0; i < importData.entries.length; i += batchSize) {
        const batch = importData.entries.slice(i, i + batchSize);

        for (const entry of batch) {
          try {
            // Validate entry if requested
            if (validate) {
              if (!entry.content || !entry.metadata) {
                throw new Error('Missing required fields: content or metadata');
              }
              // v4.11.0: Embedding validation removed (FTS5 only, no vector search)
            }

            // Check for duplicates
            if (skipDuplicates) {
              const hash = this.hashContent(entry.content);
              if (existingHashes.has(hash)) {
                entriesSkipped++;
                continue;
              }
              existingHashes.add(hash);
            }

            // Import entry
            // v4.11.0: No embedding generation (FTS5 only)
            await this.add(
              entry.content,
              null,  // No embedding needed for FTS5
              entry.metadata
            );

            entriesImported++;
          } catch (error) {
            entriesFailed++;
            errors.push({
              entry,
              error: (error as Error).message
            });
          }
        }
      }

      logger.info('Memory imported from JSON', {
        filePath: normalizePath(filePath),
        entriesImported,
        entriesSkipped,
        entriesFailed
      });

      return {
        entriesImported,
        entriesSkipped,
        entriesFailed,
        errors,
        importedAt: new Date()
      };
    } catch (error) {
      throw new MemoryError(
        `Import failed: ${(error as Error).message}`,
        'DATABASE_ERROR',
        { filePath, error }
      );
    }
  }

  /**
   * Hash content for duplicate detection
   */
  private hashContent(content: string): string {
    // Simple hash using content length + first/last 100 chars
    // For production, consider using crypto.createHash('sha256')
    const len = content.length;
    const start = content.substring(0, 100);
    const end = content.substring(Math.max(0, len - 100));
    return `${len}:${start}:${end}`;
  }
}
