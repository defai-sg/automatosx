/**
 * Memory Manager Text Query Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { MemoryManagerVec as MemoryManager } from '../../src/core/memory-manager-vec.js';
import type { MemoryMetadata } from '../../src/types/memory.js';
import type { IEmbeddingProvider, EmbeddingResponse } from '../../src/types/embedding.js';

// Mock embedding provider
class MockEmbeddingProvider implements IEmbeddingProvider {
  private embeddings: Map<string, number[]> = new Map();

  // Set up predefined embeddings for testing
  constructor() {
    // Each text gets a unique embedding
    this.embeddings.set('python code example', new Array(1536).fill(0.9));
    this.embeddings.set('javascript tutorial', new Array(1536).fill(0.8));
    this.embeddings.set('meeting notes', new Array(1536).fill(0.7));
    this.embeddings.set('search query', new Array(1536).fill(0.85));
    this.embeddings.set('test text', new Array(1536).fill(0.5));
  }

  async embed(text: string): Promise<EmbeddingResponse> {
    const embedding = this.embeddings.get(text) ?? new Array(1536).fill(0.5);
    return {
      embedding,
      model: 'mock-model',
      dimensions: 1536,
      usage: {
        promptTokens: text.split(' ').length,
        totalTokens: text.split(' ').length
      }
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }

  getInfo() {
    return {
      provider: 'mock',
      model: 'mock-model',
      dimensions: 1536
    };
  }
}

// Mock embedding provider that fails
class FailingEmbeddingProvider implements IEmbeddingProvider {
  async embed(_text: string): Promise<EmbeddingResponse> {
    throw new Error('Embedding generation failed');
  }

  async embedBatch(_texts: string[]): Promise<EmbeddingResponse[]> {
    throw new Error('Batch embedding failed');
  }

  getInfo() {
    return {
      provider: 'failing',
      model: 'failing-model',
      dimensions: 1536
    };
  }
}

describe('MemoryManager Text Query', () => {
  let manager: MemoryManager;
  let managerWithoutProvider: MemoryManager;
  let testDbPath: string;
  let testDbPathNoProvider: string;
  let mockProvider: MockEmbeddingProvider;

  beforeEach(async () => {
    // Create unique test databases
    testDbPath = join(tmpdir(), `memory-text-test-${Date.now()}.db`);
    testDbPathNoProvider = join(tmpdir(), `memory-no-provider-${Date.now()}.db`);

    mockProvider = new MockEmbeddingProvider();

    // Manager with embedding provider
    manager = await MemoryManager.create({
      dbPath: testDbPath,
      maxEntries: 100,
      autoCleanup: false,
      trackAccess: true,
      embeddingProvider: mockProvider
    });

    // Manager without embedding provider
    managerWithoutProvider = await MemoryManager.create({
      dbPath: testDbPathNoProvider,
      maxEntries: 100,
      autoCleanup: false,
      trackAccess: false
    });

    // Add test entries
    const entries = [
      { content: 'Python code example', type: 'code' as const, tags: ['python', 'example'] },
      { content: 'JavaScript tutorial', type: 'document' as const, tags: ['javascript', 'tutorial'] },
      { content: 'Meeting notes', type: 'conversation' as const, tags: ['meeting'] }
    ];

    for (const entry of entries) {
      const response = await mockProvider.embed(entry.content.toLowerCase());
      await manager.add(entry.content, response.embedding, {
        type: entry.type,
        source: 'test',
        tags: entry.tags
      });
    }
  });

  afterEach(async () => {
    // Cleanup
    await manager.close();
    await managerWithoutProvider.close();

    try {
      if (existsSync(testDbPath)) {
        await rm(testDbPath);
      }
      if (existsSync(`${testDbPath}.index`)) {
        await rm(`${testDbPath}.index`);
      }
      if (existsSync(testDbPathNoProvider)) {
        await rm(testDbPathNoProvider);
      }
      if (existsSync(`${testDbPathNoProvider}.index`)) {
        await rm(`${testDbPathNoProvider}.index`);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Text search with provider', () => {
    it('should search by text query', async () => {
      const results = await manager.search({
        text: 'search query',
        limit: 3
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // Results should have similarity scores
      results.forEach(result => {
        expect(result).toHaveProperty('entry');
        expect(result).toHaveProperty('similarity');
        expect(result).toHaveProperty('distance');
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1.01); // Allow for floating point precision
      });
    });

    it('should search by text with filters', async () => {
      const results = await manager.search({
        text: 'test text',
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

    it('should search by text with multiple filters', async () => {
      const results = await manager.search({
        text: 'test text',
        filters: {
          type: 'code',
          tags: ['python']
        },
        limit: 10
      });

      results.forEach(result => {
        expect(result.entry.metadata.type).toBe('code');
        expect(result.entry.metadata.tags).toContain('python');
      });
    });

    it('should apply similarity threshold on text search', async () => {
      const results = await manager.search({
        text: 'test text',
        threshold: 0.9,
        limit: 10
      });

      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should filter results by threshold', async () => {
      const results = await manager.search({
        text: 'test text',
        threshold: 0.5,
        limit: 10
      });

      // All results should have similarity >= threshold
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should track access when searching by text', async () => {
      const results = await manager.search({
        text: 'python code example',
        limit: 1
      });

      expect(results.length).toBeGreaterThan(0);

      if (results[0]) {
        const entry = await manager.get(results[0].entry.id);
        expect(entry?.accessCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Text search without provider', () => {
    it('should throw error when text search without provider', async () => {
      await expect(
        managerWithoutProvider.search({
          text: 'test query',
          limit: 5
        })
      ).rejects.toThrow('Embedding provider required');
    });
  });

  describe('Text search error handling', () => {
    it('should handle embedding generation failure', async () => {
      const failingProvider = new FailingEmbeddingProvider();
      const failingManager = await MemoryManager.create({
        dbPath: join(tmpdir(), `memory-failing-${Date.now()}.db`),
        maxEntries: 100,
        embeddingProvider: failingProvider
      });

      await expect(
        failingManager.search({
          text: 'test query',
          limit: 5
        })
      ).rejects.toThrow('Failed to generate embedding');

      await failingManager.close();
    });

    it('should throw error when neither vector nor text provided', async () => {
      await expect(
        manager.search({
          limit: 5
        } as never) // Type assertion to bypass TypeScript check
      ).rejects.toThrow('Search query must provide either vector or text');
    });
  });

  describe('Text vs Vector search consistency', () => {
    it('should return similar results for text and vector search', async () => {
      const textQuery = 'python code example';
      const vectorResponse = await mockProvider.embed(textQuery);

      const textResults = await manager.search({
        text: textQuery,
        limit: 3
      });

      const vectorResults = await manager.search({
        vector: vectorResponse.embedding,
        limit: 3
      });

      // Results should be similar (same length and similar entries)
      expect(textResults.length).toBe(vectorResults.length);

      // Top results should match
      if (textResults.length > 0 && vectorResults.length > 0 && textResults[0] && vectorResults[0]) {
        expect(textResults[0].entry.id).toBe(vectorResults[0].entry.id);
      }
    });
  });
});
