/**
 * Migration Tool Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { MigrationTool } from '../../src/migration/migration-tool.js';
import { DataTransformer } from '../../src/migration/data-transformer.js';
import { MemoryManagerVec as MemoryManager } from '../../src/core/memory-manager-vec.js';
import type { V3MemoryEntry } from '../../src/types/migration.js';

describe('Migration Tool', () => {
  let migrationTool: MigrationTool;
  let transformer: DataTransformer;
  let testSourcePath: string;
  let testDestPath: string;

  beforeEach(async () => {
    migrationTool = new MigrationTool();
    transformer = new DataTransformer();

    const timestamp = Date.now();
    testSourcePath = join(tmpdir(), `v3-export-${timestamp}.json`);
    testDestPath = join(tmpdir(), `v4-memory-${timestamp}.db`);
  });

  afterEach(async () => {
    try {
      if (existsSync(testSourcePath)) await rm(testSourcePath);
      if (existsSync(testDestPath)) await rm(testDestPath);
      if (existsSync(`${testDestPath}.index`)) await rm(`${testDestPath}.index`);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Data Transformer', () => {
    it('should transform v3 entry to v4 format', () => {
      const v3Entry: V3MemoryEntry = {
        id: 'mem_123',
        vector: new Array(1536).fill(0.5),
        agent: 'backend',
        task: 'Design API',
        result: 'API designed successfully',
        timestamp: Date.now(),
        metadata: {
          tags: ['api', 'design']
        }
      };

      const transformed = transformer.transformEntry(v3Entry);

      expect(transformed.content).toContain('Design API');
      expect(transformed.content).toContain('API designed successfully');
      expect(transformed.embedding).toHaveLength(1536);
      expect(transformed.metadata.type).toBeDefined();
      expect(transformed.metadata.source).toBe('backend');
      expect(transformed.metadata.tags).toContain('agent:backend');
      expect(transformed.metadata.tags).toContain('migrated:v3');
    });

    it('should detect code type correctly', () => {
      const v3Entry: V3MemoryEntry = {
        id: 'mem_123',
        vector: new Array(1536).fill(0.5),
        agent: 'backend',
        task: 'Implement user authentication function',
        result: 'Code implemented',
        timestamp: Date.now()
      };

      const transformed = transformer.transformEntry(v3Entry);

      expect(transformed.metadata.type).toBe('code');
    });

    it('should detect document type correctly', () => {
      const v3Entry: V3MemoryEntry = {
        id: 'mem_123',
        vector: new Array(1536).fill(0.5),
        agent: 'backend',
        task: 'Write API documentation',
        result: 'Documentation completed',
        timestamp: Date.now()
      };

      const transformed = transformer.transformEntry(v3Entry);

      expect(transformed.metadata.type).toBe('document');
    });

    it('should validate v3 entry', () => {
      const validEntry: V3MemoryEntry = {
        id: 'mem_123',
        vector: new Array(1536).fill(0.5),
        agent: 'backend',
        task: 'Test task',
        result: 'Test result',
        timestamp: Date.now()
      };

      const result = transformer.validateEntry(validEntry);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidEntry: V3MemoryEntry = {
        id: '',
        vector: [],
        agent: 'backend',
        task: '',
        result: '',
        timestamp: Date.now()
      };

      const result = transformer.validateEntry(invalidEntry);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid vector values', () => {
      const invalidEntry: V3MemoryEntry = {
        id: 'mem_123',
        vector: [NaN, Infinity, 0.5],
        agent: 'backend',
        task: 'Test',
        result: 'Test',
        timestamp: Date.now()
      };

      const result = transformer.validateEntry(invalidEntry);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'vector')).toBe(true);
    });

    it('should warn about unexpected vector dimensions', () => {
      const entry: V3MemoryEntry = {
        id: 'mem_123',
        vector: new Array(768).fill(0.5), // Wrong dimensions
        agent: 'backend',
        task: 'Test',
        result: 'Test',
        timestamp: Date.now()
      };

      const result = transformer.validateEntry(entry);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'vector')).toBe(true);
    });
  });

  describe('Migration Tool', () => {
    it('should migrate v3 data to v4', async () => {
      // Create v3 export file
      const v3Entries: V3MemoryEntry[] = [
        {
          id: 'mem_1',
          vector: new Array(1536).fill(0.5),
          agent: 'backend',
          task: 'Task 1',
          result: 'Result 1',
          timestamp: Date.now()
        },
        {
          id: 'mem_2',
          vector: new Array(1536).fill(0.6),
          agent: 'frontend',
          task: 'Task 2',
          result: 'Result 2',
          timestamp: Date.now()
        }
      ];

      await writeFile(testSourcePath, JSON.stringify({
        version: '3.0',
        metadata: {
          exportedAt: new Date().toISOString(),
          totalEntries: v3Entries.length
        },
        entries: v3Entries
      }));

      // Migrate
      const result = await migrationTool.migrate({
        sourcePath: testSourcePath,
        destPath: testDestPath,
        validate: true
      });

      expect(result.success).toBe(true);
      expect(result.entriesProcessed).toBe(2);
      expect(result.entriesImported).toBe(2);
      expect(result.entriesFailed).toBe(0);

      // Verify migration
      const memoryManager = await MemoryManager.create({
        dbPath: testDestPath,
        autoCleanup: false
      });

      const stats = await memoryManager.getStats();
      expect(stats.totalEntries).toBe(2);

      await memoryManager.close();
    });

    it('should validate source file without importing (dry run)', async () => {
      const v3Entries: V3MemoryEntry[] = [
        {
          id: 'mem_1',
          vector: new Array(1536).fill(0.5),
          agent: 'backend',
          task: 'Task 1',
          result: 'Result 1',
          timestamp: Date.now()
        }
      ];

      await writeFile(testSourcePath, JSON.stringify({ entries: v3Entries }));

      const result = await migrationTool.migrate({
        sourcePath: testSourcePath,
        destPath: testDestPath,
        dryRun: true
      });

      expect(result.entriesProcessed).toBe(1);
      expect(result.entriesImported).toBe(0);
      expect(result.warnings).toContain('Dry run: Would import 1 entries');
      expect(existsSync(testDestPath)).toBe(false);
    });

    it('should validate source file', async () => {
      const v3Entries: V3MemoryEntry[] = [
        {
          id: 'mem_1',
          vector: new Array(1536).fill(0.5),
          agent: 'backend',
          task: 'Task 1',
          result: 'Result 1',
          timestamp: Date.now()
        }
      ];

      await writeFile(testSourcePath, JSON.stringify({ entries: v3Entries }));

      const validation = await migrationTool.validate(testSourcePath);

      expect(validation.valid).toBe(true);
      expect(validation.totalEntries).toBe(1);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle empty source file', async () => {
      await writeFile(testSourcePath, JSON.stringify({ entries: [] }));

      const result = await migrationTool.migrate({
        sourcePath: testSourcePath,
        destPath: testDestPath
      });

      expect(result.success).toBe(true);
      expect(result.entriesProcessed).toBe(0);
      expect(result.warnings).toContain('No entries found in source file');
    });

    it('should handle invalid source file', async () => {
      await writeFile(testSourcePath, 'invalid json');

      await expect(
        migrationTool.migrate({
          sourcePath: testSourcePath,
          destPath: testDestPath
        })
      ).rejects.toThrow('Failed to read source file');
    });

    it('should handle missing source file', async () => {
      const nonExistentPath = join(tmpdir(), 'non-existent.json');

      await expect(
        migrationTool.migrate({
          sourcePath: nonExistentPath,
          destPath: testDestPath
        })
      ).rejects.toThrow('Source file not found');
    });

    it('should handle validation errors', async () => {
      const invalidEntries: V3MemoryEntry[] = [
        {
          id: '', // Missing ID
          vector: [],
          agent: 'backend',
          task: '',
          result: '',
          timestamp: Date.now()
        }
      ];

      await writeFile(testSourcePath, JSON.stringify({ entries: invalidEntries }));

      await expect(
        migrationTool.migrate({
          sourcePath: testSourcePath,
          destPath: testDestPath,
          validate: true
        })
      ).rejects.toThrow('Validation failed');
    });

    it('should support array format (v3 direct export)', async () => {
      const v3Entries: V3MemoryEntry[] = [
        {
          id: 'mem_1',
          vector: new Array(1536).fill(0.5),
          agent: 'backend',
          task: 'Task 1',
          result: 'Result 1',
          timestamp: Date.now()
        }
      ];

      // Write as direct array
      await writeFile(testSourcePath, JSON.stringify(v3Entries));

      const result = await migrationTool.migrate({
        sourcePath: testSourcePath,
        destPath: testDestPath
      });

      expect(result.success).toBe(true);
      expect(result.entriesProcessed).toBe(1);
    });

    it('should report migration duration', async () => {
      const v3Entries: V3MemoryEntry[] = [
        {
          id: 'mem_1',
          vector: new Array(1536).fill(0.5),
          agent: 'backend',
          task: 'Task 1',
          result: 'Result 1',
          timestamp: Date.now()
        }
      ];

      await writeFile(testSourcePath, JSON.stringify({ entries: v3Entries }));

      const result = await migrationTool.migrate({
        sourcePath: testSourcePath,
        destPath: testDestPath
      });

      expect(result.duration).toBeGreaterThan(0);
      expect(result.migratedAt).toBeInstanceOf(Date);
    });
  });
});
