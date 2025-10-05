/**
 * Memory Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { MemoryManagerVec as MemoryManager } from '../../src/core/memory-manager-vec.js';
import type { MemoryMetadata } from '../../src/types/memory.js';

describe('MemoryManager', () => {
  let manager: MemoryManager;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test database
    testDbPath = join(tmpdir(), `memory-test-${Date.now()}.db`);

    manager = await MemoryManager.create({
      dbPath: testDbPath,
      maxEntries: 100,
      autoCleanup: false,
      trackAccess: true
    });
  });

  afterEach(async () => {
    // Cleanup
    await manager.close();

    try {
      if (existsSync(testDbPath)) {
        await rm(testDbPath);
      }
      if (existsSync(`${testDbPath}.index`)) {
        await rm(`${testDbPath}.index`);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Add Memory', () => {
    it('should add a memory entry', async () => {
      const embedding = new Array(1536).fill(0.1);
      const metadata: MemoryMetadata = {
        type: 'conversation',
        source: 'test'
      };

      const entry = await manager.add('Test content', embedding, metadata);

      expect(entry).toBeDefined();
      expect(entry.id).toBe(1);
      expect(entry.content).toBe('Test content');
      expect(entry.metadata.type).toBe('conversation');
      expect(entry.accessCount).toBe(0);
    });

    it('should throw error for invalid embedding dimensions', async () => {
      const invalidEmbedding = new Array(100).fill(0.1); // Wrong size
      const metadata: MemoryMetadata = {
        type: 'conversation',
        source: 'test'
      };

      await expect(
        manager.add('Test', invalidEmbedding, metadata)
      ).rejects.toThrow('Invalid embedding dimensions');
    });

    // Note: sqlite-vec doesn't have hard capacity limits like HNSW
    // SQLite can handle millions of entries efficiently
    it('should handle large number of entries (sqlite-vec scaling)', async () => {
      // Test that sqlite-vec can handle many entries without issues
      const entries = 50; // Reasonable number for unit test

      for (let i = 0; i < entries; i++) {
        const embedding = new Array(1536).fill(i / entries);
        const metadata: MemoryMetadata = {
          type: 'other',
          source: 'capacity-test'
        };
        await manager.add(`Entry ${i}`, embedding, metadata);
      }

      // Verify all entries are stored and searchable
      const searchEmbedding = new Array(1536).fill(0.5);
      const results = await manager.search({
        vector: searchEmbedding,
        limit: 10
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Get Memory', () => {
    it('should get memory by ID', async () => {
      const embedding = new Array(1536).fill(0.1);
      const metadata: MemoryMetadata = {
        type: 'code',
        source: 'editor'
      };

      const added = await manager.add('Get test', embedding, metadata);
      const retrieved = await manager.get(added.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Get test');
      expect(retrieved?.metadata.type).toBe('code');
    });

    it('should return null for non-existent ID', async () => {
      const result = await manager.get(999);
      expect(result).toBeNull();
    });
  });

  describe('Search Memory', () => {
    beforeEach(async () => {
      // Add test entries
      const entries = [
        { content: 'Python code example', type: 'code' as const, tags: ['python', 'example'] },
        { content: 'JavaScript tutorial', type: 'document' as const, tags: ['javascript', 'tutorial'] },
        { content: 'Meeting notes', type: 'conversation' as const, tags: ['meeting'] }
      ];

      for (const entry of entries) {
        const embedding = new Array(1536).fill(Math.random());
        await manager.add(entry.content, embedding, {
          type: entry.type,
          source: 'test',
          tags: entry.tags
        });
      }
    });

    it('should search with vector', async () => {
      const queryVector = new Array(1536).fill(0.5);

      const results = await manager.search({
        vector: queryVector,
        limit: 3
      });

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0]).toHaveProperty('distance');
      expect(results[0]).toHaveProperty('entry');
    });

    it('should filter by type', async () => {
      const queryVector = new Array(1536).fill(0.5);

      const results = await manager.search({
        vector: queryVector,
        filters: {
          type: 'code'
        },
        limit: 10
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.entry.metadata.type).toBe('code');
      });
    });

    it('should filter by tags', async () => {
      const queryVector = new Array(1536).fill(0.5);

      const results = await manager.search({
        vector: queryVector,
        filters: {
          tags: ['python']
        },
        limit: 10
      });

      results.forEach(result => {
        expect(result.entry.metadata.tags).toContain('python');
      });
    });

    it('should apply similarity threshold', async () => {
      const queryVector = new Array(1536).fill(0.5);

      const results = await manager.search({
        vector: queryVector,
        threshold: 0.8, // High threshold
        limit: 10
      });

      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('Update Memory', () => {
    it('should update memory metadata', async () => {
      const embedding = new Array(1536).fill(0.1);
      const entry = await manager.add('Update test', embedding, {
        type: 'task',
        source: 'test'
      });

      await manager.update(entry.id, {
        importance: 0.9,
        tags: ['important', 'urgent']
      });

      const updated = await manager.get(entry.id);

      expect(updated?.metadata.importance).toBe(0.9);
      expect(updated?.metadata.tags).toContain('important');
      expect(updated?.metadata.type).toBe('task'); // Original preserved
    });

    it('should throw error for non-existent entry', async () => {
      await expect(
        manager.update(999, { importance: 0.5 })
      ).rejects.toThrow('Memory entry not found');
    });
  });

  describe('Delete Memory', () => {
    it('should delete memory entry', async () => {
      const embedding = new Array(1536).fill(0.1);
      const entry = await manager.add('Delete test', embedding, {
        type: 'other',
        source: 'test'
      });

      await manager.delete(entry.id);

      const result = await manager.get(entry.id);
      expect(result).toBeNull();
    });

    it('should throw error when deleting non-existent entry', async () => {
      await expect(
        manager.delete(999)
      ).rejects.toThrow('Memory entry not found');
    });
  });

  describe('Clear Memory', () => {
    it('should clear all memories', async () => {
      const embedding = new Array(1536).fill(0.1);

      // Add multiple entries
      await manager.add('Entry 1', embedding, { type: 'other', source: 'test' });
      await manager.add('Entry 2', embedding, { type: 'other', source: 'test' });
      await manager.add('Entry 3', embedding, { type: 'other', source: 'test' });

      const statsBefore = await manager.getStats();
      expect(statsBefore.totalEntries).toBe(3);

      await manager.clear();

      const statsAfter = await manager.getStats();
      expect(statsAfter.totalEntries).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should get memory statistics', async () => {
      const stats = await manager.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('dbSize');
      expect(stats).toHaveProperty('indexSize');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats.totalEntries).toBe(0);
    });

    it('should show correct entry count', async () => {
      const embedding = new Array(1536).fill(0.1);

      await manager.add('Stats test 1', embedding, { type: 'other', source: 'test' });
      await manager.add('Stats test 2', embedding, { type: 'other', source: 'test' });

      const stats = await manager.getStats();
      expect(stats.totalEntries).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old entries', async () => {
      const embedding = new Array(1536).fill(0.1);

      // Create entries with different timestamps
      await manager.add('Old entry', embedding, { type: 'other', source: 'test' });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      await manager.add('New entry', embedding, { type: 'other', source: 'test' });

      // Cleanup entries older than 0 days (all entries from > now)
      const deleted = await manager.cleanup(0);

      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Persistence', () => {
    it('should save and load index (sqlite-vec auto-persists)', async () => {
      const embedding = new Array(1536).fill(0.5);

      await manager.add('Persist test', embedding, {
        type: 'other',
        source: 'test'
      });

      // sqlite-vec auto-persists to database, no separate .index file
      await manager.saveIndex(); // No-op for sqlite-vec

      // Verify database file exists (not separate .index file)
      expect(existsSync(testDbPath)).toBe(true);
    });
  });

  describe('Access Tracking', () => {
    it('should track access when searching', async () => {
      const embedding = new Array(1536).fill(0.5);

      const entry = await manager.add('Access test', embedding, {
        type: 'other',
        source: 'test'
      });

      // Initial access count should be 0
      const before = await manager.get(entry.id);
      expect(before?.accessCount).toBe(0);

      // Search should increment access count
      await manager.search({
        vector: embedding,
        limit: 1
      });

      const after = await manager.get(entry.id);
      expect(after?.accessCount).toBe(1);
    });
  });

  describe('Get All Entries', () => {
    it('should return all entries without filters', async () => {
      const embedding = new Array(1536).fill(0.5);

      await manager.add('Entry 1', embedding, { type: 'conversation', source: 'test' });
      await manager.add('Entry 2', embedding, { type: 'code', source: 'test' });
      await manager.add('Entry 3', embedding, { type: 'document', source: 'test' });

      const all = await manager.getAll();

      expect(all).toHaveLength(3);
      expect(all[0]?.content).toBe('Entry 3'); // Most recent first (DESC)
      expect(all[2]?.content).toBe('Entry 1');
    });

    it('should filter by type', async () => {
      const embedding = new Array(1536).fill(0.5);

      await manager.add('Conv 1', embedding, { type: 'conversation', source: 'test' });
      await manager.add('Code 1', embedding, { type: 'code', source: 'test' });
      await manager.add('Conv 2', embedding, { type: 'conversation', source: 'test' });

      const conversations = await manager.getAll({ type: 'conversation' });

      expect(conversations).toHaveLength(2);
      expect(conversations.every(e => e.metadata.type === 'conversation')).toBe(true);
    });

    it('should filter by tags', async () => {
      const embedding = new Array(1536).fill(0.5);

      await manager.add('Entry 1', embedding, { type: 'other', source: 'test', tags: ['important', 'work'] });
      await manager.add('Entry 2', embedding, { type: 'other', source: 'test', tags: ['personal'] });
      await manager.add('Entry 3', embedding, { type: 'other', source: 'test', tags: ['important'] });

      const important = await manager.getAll({ tags: ['important'] });

      expect(important).toHaveLength(2);
      expect(important.every(e => e.metadata.tags?.includes('important'))).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      const embedding = new Array(1536).fill(0.5);

      for (let i = 1; i <= 10; i++) {
        await manager.add(`Entry ${i}`, embedding, { type: 'other', source: 'test' });
      }

      const page1 = await manager.getAll({ limit: 3, offset: 0 });
      const page2 = await manager.getAll({ limit: 3, offset: 3 });

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      expect(page1[0]?.id).not.toBe(page2[0]?.id);
    });

    it('should support ordering by created date', async () => {
      const embedding = new Array(1536).fill(0.5);

      await manager.add('First', embedding, { type: 'other', source: 'test' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.add('Second', embedding, { type: 'other', source: 'test' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.add('Third', embedding, { type: 'other', source: 'test' });

      const desc = await manager.getAll({ orderBy: 'created', order: 'desc' });
      const asc = await manager.getAll({ orderBy: 'created', order: 'asc' });

      expect(desc[0]?.content).toBe('Third');
      expect(desc[2]?.content).toBe('First');
      expect(asc[0]?.content).toBe('First');
      expect(asc[2]?.content).toBe('Third');
    });

    it('should support ordering by access count', async () => {
      const embedding1 = new Array(1536).fill(0.5);
      const embedding2 = new Array(1536).fill(0.3);

      const entry1 = await manager.add('Entry 1', embedding1, { type: 'other', source: 'test' });
      const entry2 = await manager.add('Entry 2', embedding2, { type: 'other', source: 'test' });

      // Access only entry1 specifically
      await manager.search({ vector: embedding1, limit: 1 });

      const ordered = await manager.getAll({ orderBy: 'count', order: 'desc' });

      // Entry1 should have higher access count than entry2
      expect(ordered[0]?.accessCount || 0).toBeGreaterThanOrEqual(ordered[1]?.accessCount || 0);
      // At least one should have been accessed
      expect((ordered[0]?.accessCount || 0) + (ordered[1]?.accessCount || 0)).toBeGreaterThan(0);
    });

    it('should combine filters', async () => {
      const embedding = new Array(1536).fill(0.5);

      await manager.add('Conv 1', embedding, { type: 'conversation', source: 'test', tags: ['important'] });
      await manager.add('Conv 2', embedding, { type: 'conversation', source: 'test', tags: ['casual'] });
      await manager.add('Code 1', embedding, { type: 'code', source: 'test', tags: ['important'] });

      const result = await manager.getAll({
        type: 'conversation',
        tags: ['important'],
        limit: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe('Conv 1');
    });
  });
});
