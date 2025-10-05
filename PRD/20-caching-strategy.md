# Caching Strategy - AutomatosX v4.0

**Date**: 2025-10-04
**Priority**: 🟡 MEDIUM
**Implementation**: Sprint 2.3 or v4.1

---

## Executive Summary

This document defines caching strategies for AutomatosX v4.0 to **reduce costs and improve performance** by avoiding redundant AI provider calls. The goal is to intelligently cache responses while maintaining freshness and relevance.

**Key Principle**: Cache aggressively, invalidate intelligently.

---

## Table of Contents

1. [Response Cache Design](#response-cache-design)
2. [Prompt Deduplication](#prompt-deduplication)
3. [Cache Invalidation](#cache-invalidation)
4. [Memory Budget](#memory-budget)
5. [Cache Strategies](#cache-strategies)

---

## Response Cache Design

### Cache Entry Structure

```typescript
interface CacheEntry {
  key: string;              // hash(prompt + model + temperature + ...)
  prompt: string;           // Original prompt
  response: string;         // Cached response
  timestamp: Date;          // When cached
  hits: number;             // How many times used
  lastAccess: Date;         // Last access time
  provider: string;         // Which provider generated it
  model: string;            // Which model generated it
  temperature: number;      // Temperature setting
  tokensUsed: number;       // Tokens consumed
  cost: number;             // Cost of original request
  metadata: {
    agent: string;          // Which agent used it
    task: string;           // What task
    relevanceScore?: number; // Semantic relevance (optional)
  };
}
```

---

### Cache Configuration

```typescript
interface CacheConfig {
  enabled: boolean;               // Default: true
  ttl: number;                    // Time to live (seconds) - Default: 86400 (24h)
  maxEntries: number;             // Max cache entries - Default: 1000
  maxSize: number;                // Max cache size (bytes) - Default: 100MB
  strategy: 'memory' | 'disk' | 'hybrid';  // Storage strategy
  deduplication: boolean;         // Enable prompt deduplication
  semanticMatching: boolean;      // Enable semantic similarity matching
  similarityThreshold: number;    // Similarity threshold (0-1) - Default: 0.95
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 86400,                     // 24 hours
  maxEntries: 1000,
  maxSize: 100 * 1024 * 1024,     // 100MB
  strategy: 'hybrid',
  deduplication: true,
  semanticMatching: false,        // Disabled by default (requires embeddings)
  similarityThreshold: 0.95
};
```

---

### Cache Implementation

```typescript
class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private lruQueue: string[] = [];

  constructor(private config: CacheConfig) {}

  async get(key: string): Promise<string | null> {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeLRU(key);
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccess = new Date();
    this.updateLRU(key);

    logger.info('Cache hit', {
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp.getTime()
    });

    return entry.response;
  }

  async set(
    prompt: string,
    response: string,
    metadata: {
      provider: string;
      model: string;
      temperature: number;
      tokensUsed: number;
      cost: number;
      agent: string;
      task: string;
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const key = this.generateKey(prompt, metadata);

    const entry: CacheEntry = {
      key,
      prompt,
      response,
      timestamp: new Date(),
      hits: 0,
      lastAccess: new Date(),
      provider: metadata.provider,
      model: metadata.model,
      temperature: metadata.temperature,
      tokensUsed: metadata.tokensUsed,
      cost: metadata.cost,
      metadata: {
        agent: metadata.agent,
        task: metadata.task
      }
    };

    // Check size limits
    await this.enforceSize(entry);

    // Store entry
    this.cache.set(key, entry);
    this.lruQueue.push(key);

    // Enforce max entries
    await this.enforceMaxEntries();

    logger.info('Cache set', { key, size: this.cache.size });
  }

  private generateKey(
    prompt: string,
    metadata: {
      provider: string;
      model: string;
      temperature: number;
    }
  ): string {
    const input = `${prompt}|${metadata.provider}|${metadata.model}|${metadata.temperature}`;
    return this.hash(input);
  }

  private hash(input: string): string {
    // Simple hash function (replace with crypto.createHash in production)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private isExpired(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp.getTime();
    return age > this.config.ttl * 1000;
  }

  private updateLRU(key: string): void {
    this.removeLRU(key);
    this.lruQueue.push(key);
  }

  private removeLRU(key: string): void {
    const index = this.lruQueue.indexOf(key);
    if (index > -1) {
      this.lruQueue.splice(index, 1);
    }
  }

  private async enforceSize(newEntry: CacheEntry): Promise<void> {
    const newEntrySize = this.estimateSize(newEntry);
    let currentSize = this.getCurrentSize();

    while (currentSize + newEntrySize > this.config.maxSize && this.lruQueue.length > 0) {
      // Evict least recently used entry
      const lruKey = this.lruQueue.shift()!;
      const lruEntry = this.cache.get(lruKey);
      if (lruEntry) {
        currentSize -= this.estimateSize(lruEntry);
        this.cache.delete(lruKey);
      }
    }
  }

  private async enforceMaxEntries(): Promise<void> {
    while (this.cache.size > this.config.maxEntries && this.lruQueue.length > 0) {
      const lruKey = this.lruQueue.shift()!;
      this.cache.delete(lruKey);
    }
  }

  private getCurrentSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += this.estimateSize(entry);
    }
    return size;
  }

  private estimateSize(entry: CacheEntry): number {
    // Rough estimate: prompt + response + metadata
    return (
      Buffer.byteLength(entry.prompt, 'utf8') +
      Buffer.byteLength(entry.response, 'utf8') +
      1000  // Metadata overhead
    );
  }

  // Statistics
  getStats(): CacheStats {
    return {
      entries: this.cache.size,
      totalHits: Array.from(this.cache.values()).reduce((sum, e) => sum + e.hits, 0),
      totalSize: this.getCurrentSize(),
      hitRate: this.calculateHitRate(),
      oldestEntry: this.getOldestEntry(),
      mostUsedEntry: this.getMostUsedEntry()
    };
  }

  private calculateHitRate(): number {
    const totalRequests = Array.from(this.cache.values()).reduce(
      (sum, e) => sum + e.hits + 1,
      0
    );
    const hits = Array.from(this.cache.values()).reduce((sum, e) => sum + e.hits, 0);
    return totalRequests > 0 ? hits / totalRequests : 0;
  }

  private getOldestEntry(): CacheEntry | null {
    let oldest: CacheEntry | null = null;
    for (const entry of this.cache.values()) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = entry;
      }
    }
    return oldest;
  }

  private getMostUsedEntry(): CacheEntry | null {
    let mostUsed: CacheEntry | null = null;
    for (const entry of this.cache.values()) {
      if (!mostUsed || entry.hits > mostUsed.hits) {
        mostUsed = entry;
      }
    }
    return mostUsed;
  }
}
```

---

## Prompt Deduplication

### Exact Matching

```typescript
// Simple case: exact same prompt
const key1 = hash("write a sort function");
const key2 = hash("write a sort function");
// key1 === key2 → Cache hit!
```

---

### Semantic Matching (Optional)

For more advanced deduplication, use semantic similarity:

```typescript
class SemanticCache extends ResponseCache {
  private embeddings: Map<string, number[]> = new Map();

  async getWithSemanticMatch(prompt: string): Promise<string | null> {
    // Try exact match first
    const exactMatch = await super.get(this.generateKey(prompt, metadata));
    if (exactMatch) return exactMatch;

    if (!this.config.semanticMatching) return null;

    // Compute prompt embedding
    const embedding = await this.computeEmbedding(prompt);

    // Find most similar cached prompt
    let bestMatch: { key: string; similarity: number } | null = null;

    for (const [key, cachedEmbedding] of this.embeddings.entries()) {
      const similarity = this.cosineSimilarity(embedding, cachedEmbedding);

      if (similarity >= this.config.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { key, similarity };
        }
      }
    }

    if (bestMatch) {
      logger.info('Semantic cache hit', {
        similarity: bestMatch.similarity,
        threshold: this.config.similarityThreshold
      });

      return await super.get(bestMatch.key);
    }

    return null;
  }

  private async computeEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embeddings or local embedding model
    // Implementation depends on provider
    return [];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

---

## Cache Invalidation

### Time-Based Invalidation (TTL)

```typescript
// Default: 24 hours
const DEFAULT_TTL = 86400;

// Expire after TTL
if (Date.now() - entry.timestamp.getTime() > DEFAULT_TTL * 1000) {
  cache.delete(key);
}
```

---

### Size-Based Invalidation (LRU)

```typescript
// Evict least recently used when size limit reached
while (currentSize > maxSize) {
  const lruKey = lruQueue.shift();
  cache.delete(lruKey);
}
```

---

### Manual Invalidation

```bash
# Clear entire cache
automatosx cache clear

# Clear cache for specific agent
automatosx cache clear --agent coder

# Clear cache older than date
automatosx cache clear --before 2024-10-01

# Clear cache by pattern
automatosx cache clear --pattern "write.*function"
```

---

### Smart Invalidation

Invalidate when:

1. **Model/Provider Updated**
   ```typescript
   if (entry.model !== currentModel || entry.provider !== currentProvider) {
     cache.delete(key);
   }
   ```

2. **Temperature Changed**
   ```typescript
   if (Math.abs(entry.temperature - currentTemperature) > 0.1) {
     cache.delete(key);  // Different temperature = different response
   }
   ```

3. **Agent Profile Updated**
   ```typescript
   agentProfile.onChange(() => {
     cache.clearByAgent(agentProfile.name);
   });
   ```

4. **User Explicitly Requests**
   ```bash
   automatosx run coder "write function" --no-cache
   ```

---

## Memory Budget

### Cache Size Allocation

```typescript
const CACHE_BUDGET = {
  total: 100 * 1024 * 1024,      // 100MB total

  allocation: {
    recent: 50 * 1024 * 1024,    // 50MB for recent responses (LRU)
    popular: 30 * 1024 * 1024,   // 30MB for popular responses (LFU)
    reserved: 20 * 1024 * 1024   // 20MB buffer
  }
};
```

---

### LRU (Least Recently Used) Cache

```typescript
class LRUCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];

  get(key: string): CacheEntry | null {
    if (!this.cache.has(key)) return null;

    // Move to end (most recently used)
    this.updateAccessOrder(key);

    return this.cache.get(key)!;
  }

  set(key: string, value: CacheEntry): void {
    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift()!;
    this.cache.delete(lruKey);
  }
}
```

---

### LFU (Least Frequently Used) Cache

```typescript
class LFUCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    entry.hits++;
    return entry;
  }

  evictLFU(): void {
    if (this.cache.size === 0) return;

    let lfuKey: string | null = null;
    let minHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        lfuKey = key;
      }
    }

    if (lfuKey) {
      this.cache.delete(lfuKey);
    }
  }
}
```

---

### Hybrid Cache Strategy

```typescript
class HybridCache {
  private recentCache: LRUCache;
  private popularCache: LFUCache;

  async get(key: string): Promise<string | null> {
    // Try popular cache first (faster hits)
    let entry = this.popularCache.get(key);
    if (entry) return entry.response;

    // Try recent cache
    entry = this.recentCache.get(key);
    if (!entry) return null;

    // Promote to popular cache if hit count threshold reached
    if (entry.hits >= PROMOTION_THRESHOLD) {
      this.popularCache.set(key, entry);
      this.recentCache.delete(key);
    }

    return entry.response;
  }

  async set(key: string, value: CacheEntry): Promise<void> {
    // New entries start in recent cache
    this.recentCache.set(key, value);
  }
}
```

---

## Cache Strategies

### Strategy 1: Aggressive Caching

**Use case**: Cost-sensitive, repetitive tasks

```typescript
const AGGRESSIVE_CACHE: CacheConfig = {
  enabled: true,
  ttl: 604800,              // 7 days
  maxEntries: 5000,
  maxSize: 500 * 1024 * 1024, // 500MB
  strategy: 'disk',
  deduplication: true,
  semanticMatching: true,
  similarityThreshold: 0.90  // Lower threshold = more hits
};
```

---

### Strategy 2: Conservative Caching

**Use case**: Dynamic content, time-sensitive tasks

```typescript
const CONSERVATIVE_CACHE: CacheConfig = {
  enabled: true,
  ttl: 3600,                // 1 hour
  maxEntries: 500,
  maxSize: 50 * 1024 * 1024, // 50MB
  strategy: 'memory',
  deduplication: true,
  semanticMatching: false,
  similarityThreshold: 0.99  // Higher threshold = exact matches only
};
```

---

### Strategy 3: No Caching

**Use case**: Always-fresh responses, security-sensitive

```typescript
const NO_CACHE: CacheConfig = {
  enabled: false,
  ttl: 0,
  maxEntries: 0,
  maxSize: 0,
  strategy: 'memory',
  deduplication: false,
  semanticMatching: false,
  similarityThreshold: 1.0
};
```

---

## Cache Commands

```bash
# View cache stats
automatosx cache stats

# Clear cache
automatosx cache clear

# Clear old entries
automatosx cache clear --before 2024-10-01

# Export cache
automatosx cache export cache-backup.json

# Import cache
automatosx cache import cache-backup.json

# Optimize cache
automatosx cache optimize
```

---

### Cache Stats Output

```
📊 Cache Statistics

Size: 45.3 MB / 100 MB (45%)
Entries: 347 / 1000 (35%)
Hit Rate: 73.2%
Total Hits: 1,542
Total Requests: 2,106

Most Popular:
  1. "review code" - 89 hits
  2. "write function" - 67 hits
  3. "debug error" - 53 hits

Oldest Entry: 18 hours ago
Newest Entry: 2 minutes ago

Cost Saved: $12.45 (from cache hits)
```

---

## Implementation Plan

### Sprint 2.3 or v4.1

**Option A: Sprint 2.3** (If time permits)
- Basic memory cache
- Exact prompt matching
- TTL-based invalidation
- LRU eviction

**Option B: v4.1** (Enhancement release)
- Full hybrid cache (memory + disk)
- Semantic matching
- Smart invalidation
- Cache optimization

**Recommended**: **Option B (v4.1)** - Focus Sprint 2.3 on error recovery and rate limiting.

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cache hit rate | 60%+ | Cache hits / Total requests |
| Cost reduction | 40%+ | Cached cost / Total cost |
| Response time improvement | 90%+ | Cached response time / Normal response time |
| Cache accuracy | 95%+ | Correct responses / Cached responses |

---

## User Experience

### Cache Hit Message (Verbose Mode)

```
🚀 Running coder: "write a sort function"

✅ Cache hit! (saved $0.08, 2.3s faster)
   Last used: 3 hours ago
   Hit count: 12

[Cached response here]
```

### Cache Miss Message (Verbose Mode)

```
🚀 Running coder: "write a sort function"

🔄 Calling provider: claude
   (No cache hit, this will take ~3s)

[Provider response here]

💾 Response cached for future use
```

---

## Conclusion

Intelligent caching can significantly reduce costs and improve performance for AutomatosX. By implementing LRU/LFU caches, semantic matching, and smart invalidation, we provide users with fast, cost-effective AI agent interactions.

**Status**: 📋 Planned for v4.1 (Optional for Sprint 2.3)
**Implementation Date**: Month 4 (or late Month 3 if time permits)

---

**Document Date**: 2025-10-04
**Next Review**: Sprint 2.3 planning or v4.1 kickoff
**Related**: PRD/03-technical-specification.md, PRD/19-rate-limiting-quotas.md
