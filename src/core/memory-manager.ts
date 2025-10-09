/**
 * Memory Manager - SQLite + vec extension implementation
 *
 * This replaces the HNSW implementation with pure SQLite vector search
 * using the sqlite-vec extension for better portability and simpler deployment.
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
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
  private config: Required<Omit<MemoryManagerConfig, 'embeddingProvider' | 'hnsw'>> & {
    embeddingProvider?: unknown;
  };
  private embeddingProvider?: any;
  private initialized: boolean = false;
  private useFTS: boolean = true; // Use FTS5 by default

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

    // Ensure directory exists
    const dir = dirname(this.config.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.config.dbPath);
    this.db.pragma('journal_mode = WAL');
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

      this.initialized = true;
      logger.info('MemoryManager initialized successfully', {
        dbPath: this.config.dbPath,
        searchMethod: 'FTS5',
        hasEmbeddingProvider: !!this.embeddingProvider
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
   */
  async add(content: string, embedding: number[] | null, metadata: MemoryMetadata): Promise<MemoryEntry> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    // v4.11.0: Embedding validation removed (FTS5 only, no vector search)
    // Note: embedding parameter deprecated but kept for backward compatibility

    try {
      const now = Date.now();

      // Insert entry (FTS5 index is automatically updated via trigger)
      const result = this.db.prepare(`
        INSERT INTO memory_entries (content, metadata, created_at, access_count)
        VALUES (?, ?, ?, 0)
      `).run(content, JSON.stringify(metadata), now);

      const id = Number(result.lastInsertRowid);

      // v4.11.0: No vector storage (FTS5 only)

      logger.debug('Memory entry added', {
        id,
        contentLength: content.length,
        searchMethod: 'FTS5'
      });

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
          fts.rank as relevance
        FROM memory_fts fts
        JOIN memory_entries e ON fts.rowid = e.id
        WHERE memory_fts MATCH ?${metadataWhere}
        ORDER BY fts.rank
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

      // Update access tracking if enabled
      if (this.config.trackAccess && results.length > 0) {
        const ids = results.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');
        this.db.prepare(`
          UPDATE memory_entries
          SET last_accessed_at = ?, access_count = access_count + 1
          WHERE id IN (${placeholders})
        `).run(Date.now(), ...ids);
      }

      return results.map(row => {
        // FTS5 rank is negative (higher rank = more relevant)
        // Convert to similarity score (0-1, higher is better)
        const similarity = Math.max(0, Math.min(1, 1 + (row.relevance / 10)));

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

      this.db.prepare('DELETE FROM memory_entries WHERE id = ?').run(id);
      logger.debug('Memory entry deleted', { id });
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
  async cleanup(olderThanDays?: number): Promise<number> {
    if (!this.initialized) {
      throw new MemoryError('Memory manager not initialized', 'DATABASE_ERROR');
    }

    const days = olderThanDays || this.config.cleanupDays;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    try {
      const result = this.db.prepare(`
        DELETE FROM memory_entries
        WHERE created_at < ?
      `).run(cutoffTime);

      const deleted = result.changes;
      if (deleted > 0) {
        this.db.prepare('VACUUM').run();
        logger.info('Cleanup completed', { deleted, olderThanDays: days });
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
      const { dirname } = await import('path');
      const { mkdir } = await import('fs/promises');
      const destDir = dirname(destPath);
      await mkdir(destDir, { recursive: true });

      // Use better-sqlite3 backup API (async in v12+)
      // backup() copies FROM source TO destination path
      await this.db.backup(destPath);

      logger.info('Database backup created', { destPath });
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

      // Close current database
      this.db.close();

      // Copy backup to current location using better-sqlite3's backup method
      const srcDb = new Database(srcPath, { readonly: true });
      const destDb = new Database(this.config.dbPath);
      await srcDb.backup(this.config.dbPath);
      srcDb.close();
      destDb.close();

      // Reopen database
      this.db = new Database(this.config.dbPath);
      this.db.pragma('journal_mode = WAL');

      // Reload sqlite-vec extension
      sqliteVec.load(this.db);

      this.initialized = true;
      logger.info('Database restored successfully', { srcPath });
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
        filePath,
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
        filePath,
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
