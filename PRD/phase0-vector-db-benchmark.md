# Phase 0: SQLite + vec/vss Performance Validation Plan

**Date**: 2025-10-03
**Project**: AutomatosX v4.0 Revamp
**Phase**: 0 - Validation & Research
**Week**: 3-4 - Critical Validation
**Status**: ⚠️ **PERFORMANCE VALIDATION - DECISION ALREADY MADE**

## Executive Summary

This is the **most critical** validation in Phase 0. SQLite + vec/vss has been selected as the FINAL vector database solution, replacing Milvus. This validation will:
- Confirm performance meets acceptance criteria
- Optimize configuration parameters
- Validate migration approach
- Document implementation details

**Risk Level**: LOW-MEDIUM - 10-20% probability of needing optimization sprint

**Validation Focus**: Confirm SQLite + vec/vss meets all performance and accuracy requirements

## 1. Validation Objectives

### 1.1 Primary Objective

**Validate that SQLite + vec/vss extension meets all performance and accuracy requirements for v4.0**

### 1.2 Acceptance Criteria (Must Meet)

Must meet **ALL** of the following:

1. **Accuracy**: ≥95% of Milvus recall@10
2. **Speed**: Search <100ms for 10k vectors (p95)
3. **Memory**: Uses <50% of Milvus memory footprint
4. **Cross-platform**: Works on macOS, Linux, Windows
5. **Stability**: No crashes in 1000+ operations
6. **Data migration**: Can import existing Milvus data

**If ANY criterion fails** → Execute contingency plan (optimization sprint)

### 1.3 Contingency Plans (If Criteria Not Met)

**Option A**: Performance Optimization Sprint (1-2 weeks)
- Tune index parameters (M, efConstruction, efSearch)
- Optimize query patterns
- Profile and eliminate bottlenecks

**Option B**: Adjust Acceptance Criteria
- Re-evaluate based on real-world usage patterns
- Balance performance vs bundle size reduction
- Set more realistic targets

**Option C**: Hybrid Approach
- SQLite + vec for <10k vectors (most users)
- Fallback strategy for >10k vectors (edge cases)

## 2. Test Environment Setup

### 2.1 Hardware

**Test Machine 1** (macOS):
- Model: [To be documented]
- CPU: [To be documented]
- RAM: 16GB minimum
- SSD: Yes

**Test Machine 2** (Linux):
- Ubuntu 22.04 LTS
- CPU: [To be documented]
- RAM: 16GB minimum

**Test Machine 3** (Windows):
- Windows 11
- CPU: [To be documented]
- RAM: 16GB minimum

### 2.2 Software Versions

**Current (Milvus)**:
```json
{
  "@zilliz/milvus2-sdk-node": "2.6.0",
  "node": "18.x or 20.x"
}
```

**Candidate (SQLite + vec/vss)**:
```json
{
  "better-sqlite3": "^11.0.0",
  "sqlite-vec": "^0.1.0",
  "node": "18.x or 20.x"
}
```

### 2.3 Test Data

**Dataset Sizes**:
- Small: 100 vectors (384 dimensions)
- Medium: 1,000 vectors
- Large: 10,000 vectors
- XLarge: 100,000 vectors (optional, for power users)

**Vector Source**:
- Real embeddings from v3.x production data (if available)
- Or synthetic embeddings (random but realistic)

**Queries**:
- 100 sample queries per dataset size
- Mix of high similarity and low similarity queries

## 3. Benchmark Test Cases

### 3.1 Test 1: Installation & Setup

**Milvus Baseline**:
```bash
time npm install @zilliz/milvus2-sdk-node
du -sh node_modules/@zilliz/milvus2-sdk-node
```

**SQLite + vec/vss Test**:
```bash
time npm install better-sqlite3 sqlite-vec
du -sh node_modules/better-sqlite3
du -sh node_modules/sqlite-vec
```

**Metrics**:
- Installation time
- Package size
- Native compilation time (if any)

**Acceptance Criteria**:
- SQLite + vec/vss installs in <50% of Milvus time
- Combined size <10% of Milvus size (expected: 2-5MB vs ~150MB)

### 3.2 Test 2: Index Creation & Data Loading

**Test Script Template**:
```javascript
// milvus-benchmark.js
const { MilvusClient } = require('@zilliz/milvus2-sdk-node');
const client = new MilvusClient({ address: 'localhost:19530' });

async function benchmarkMilvus(vectors, dimension) {
  const start = Date.now();

  // Create collection
  await client.createCollection({
    collection_name: 'test_collection',
    dimension: dimension,
    metric_type: 'IP' // Inner Product or L2
  });

  // Insert vectors
  await client.insert({
    collection_name: 'test_collection',
    data: vectors
  });

  // Create index
  await client.createIndex({
    collection_name: 'test_collection',
    field_name: 'vector',
    index_type: 'IVF_FLAT',
    metric_type: 'IP'
  });

  const elapsed = Date.now() - start;
  const memory = process.memoryUsage().heapUsed;

  return { elapsed, memory };
}
```

```javascript
// sqlite-vec-benchmark.js
const Database = require('better-sqlite3');
const { vec } = require('sqlite-vec');

async function benchmarkSQLiteVec(vectors, dimension) {
  const start = Date.now();

  const db = new Database(':memory:');
  db.loadExtension(vec.getLoadablePath());

  // Create vector table
  db.exec(`
    CREATE VIRTUAL TABLE vectors USING vec0(
      id INTEGER PRIMARY KEY,
      embedding FLOAT[${dimension}]
    )
  `);

  // Insert vectors
  const stmt = db.prepare('INSERT INTO vectors (id, embedding) VALUES (?, ?)');
  vectors.forEach((vector, i) => {
    stmt.run(i, vec.serialize(new Float32Array(vector)));
  });

  const elapsed = Date.now() - start;
  const memory = process.memoryUsage().heapUsed;

  return { elapsed, memory };
}
```

**Metrics**:
- Time to create index and load data
- Memory usage after loading
- Peak memory during loading

**Acceptance Criteria**:
- SQLite + vec loading time <150% of Milvus (can be slightly slower)
- SQLite + vec memory <50% of Milvus

### 3.3 Test 3: Search Performance

**Test Script**:
```javascript
async function benchmarkSearch(db, queries, k = 10) {
  const latencies = [];

  for (const query of queries) {
    const start = Date.now();
    const results = await db.search(query, k);
    const elapsed = Date.now() - start;
    latencies.push(elapsed);
  }

  return {
    mean: latencies.reduce((a, b) => a + b) / latencies.length,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    min: Math.min(...latencies),
    max: Math.max(...latencies)
  };
}
```

**Test Scenarios**:
- 100 vectors, 100 queries, k=10
- 1k vectors, 100 queries, k=10
- 10k vectors, 100 queries, k=10
- 100k vectors, 100 queries, k=10 (optional)

**Metrics**:
- Mean latency
- P50, P95, P99 latencies
- Throughput (queries per second)

**Acceptance Criteria**:
- SQLite + vec p95 latency <100ms for 10k vectors
- SQLite + vec mean latency ≤ Milvus mean latency

### 3.4 Test 4: Search Accuracy (Recall)

**Ground Truth**:
- For each query, compute exact k-nearest neighbors (brute force)
- Store as ground truth

**Recall Calculation**:
```javascript
function calculateRecall(retrieved, groundTruth, k) {
  const retrievedSet = new Set(retrieved.slice(0, k));
  const groundTruthSet = new Set(groundTruth.slice(0, k));

  const intersection = [...retrievedSet].filter(x => groundTruthSet.has(x));
  return intersection.length / k;
}
```

**Metrics**:
- Recall@10 (what % of true top-10 are retrieved)
- Mean Average Precision (MAP)
- nDCG@10

**Acceptance Criteria**:
- SQLite + vec recall@10 ≥ 95% of Milvus recall@10
- If Milvus recall@10 = 0.95, SQLite + vec must be ≥ 0.90

### 3.5 Test 5: Concurrent Operations

**Test Script**:
```javascript
async function benchmarkConcurrent(db, queries, concurrency = 10) {
  const chunks = [];
  for (let i = 0; i < queries.length; i += concurrency) {
    chunks.push(queries.slice(i, i + concurrency));
  }

  const start = Date.now();
  for (const chunk of chunks) {
    await Promise.all(chunk.map(q => db.search(q, 10)));
  }
  const elapsed = Date.now() - start;

  return {
    totalTime: elapsed,
    throughput: queries.length / (elapsed / 1000)
  };
}
```

**Test Scenarios**:
- 1, 5, 10, 20 concurrent searches

**Acceptance Criteria**:
- No crashes or errors
- Throughput scales reasonably with concurrency

### 3.6 Test 6: Memory Footprint Over Time

**Test Script**:
```javascript
async function benchmarkMemoryOverTime(db, operations, durationMs) {
  const memorySnapshots = [];
  const interval = setInterval(() => {
    memorySnapshots.push({
      time: Date.now(),
      heap: process.memoryUsage().heapUsed,
      rss: process.memoryUsage().rss
    });
  }, 1000);

  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await operations();
  }

  clearInterval(interval);
  return memorySnapshots;
}
```

**Metrics**:
- Memory at t=0, t=1min, t=5min, t=10min
- Memory growth rate
- Memory leaks detected?

**Acceptance Criteria**:
- SQLite + vec stable memory footprint
- No memory leaks (heap should stabilize)

### 3.7 Test 7: Data Migration

**Test Script**:
```javascript
async function testMigration() {
  // 1. Export from Milvus
  const milvusData = await exportFromMilvus();

  // 2. Import to SQLite + vec
  const db = new Database(':memory:');
  db.loadExtension(vec.getLoadablePath());
  await importToSQLiteVec(db, milvusData);

  // 3. Verify data integrity
  const sampleQueries = milvusData.slice(0, 10);
  for (const query of sampleQueries) {
    const milvusResults = await milvus.search(query, 10);
    const sqliteResults = await searchSQLiteVec(db, query, 10);

    // Results should be similar (allowing for algorithm differences)
    const similarity = calculateSimilarity(milvusResults, sqliteResults);
    assert(similarity > 0.8, 'Migration data mismatch');
  }
}
```

**Acceptance Criteria**:
- Can export all Milvus data
- Can import into SQLite + vec without errors
- Search results after migration match ≥80%

### 3.8 Test 8: Cross-Platform Compatibility

**Test on Each Platform** (macOS, Linux, Windows):
```bash
npm install better-sqlite3 sqlite-vec
node sqlite-vec-benchmark.js
```

**Acceptance Criteria**:
- Installs without errors on all platforms
- Native compilation succeeds (if needed)
- All benchmarks pass on all platforms

## 4. Benchmark Execution Plan

### Week 3: Setup & Initial Tests

**Day 1 (Monday)**:
- [ ] Set up test environment (3 machines)
- [ ] Install Milvus and get baseline
- [ ] Install better-sqlite3 + sqlite-vec extension
- [ ] Generate test datasets

**Day 2 (Tuesday)**:
- [ ] Run Test 1: Installation & Setup
- [ ] Run Test 2: Index Creation & Data Loading
- [ ] Document initial results

**Day 3 (Wednesday)**:
- [ ] Run Test 3: Search Performance (all dataset sizes)
- [ ] Run Test 4: Search Accuracy
- [ ] Analyze results, identify issues

**Day 4 (Thursday)**:
- [ ] Run Test 5: Concurrent Operations
- [ ] Run Test 6: Memory Footprint
- [ ] Document findings

**Day 5 (Friday)**:
- [ ] Run Test 7: Data Migration
- [ ] Run Test 8: Cross-Platform Tests
- [ ] Compile Week 3 results
- [ ] **Preliminary performance assessment**

### Week 4: Validation & Decision

**Day 1 (Monday)**:
- [ ] Re-run critical tests for validation
- [ ] Test edge cases identified in Week 3
- [ ] Tune SQLite + vec configuration for optimal performance

**Day 2 (Tuesday)**:
- [ ] Test different index parameters (M, efConstruction, efSearch)
- [ ] Optimize query patterns and caching
- [ ] Prepare performance optimization report

**Day 3 (Wednesday)**:
- [ ] Team review of benchmark results
- [ ] Validate against acceptance criteria
- [ ] **Confirm SQLite + vec/vss implementation**

**Day 4 (Thursday)**:
- [ ] Document final validation results
- [ ] Design detailed Milvus → SQLite migration plan
- [ ] Update 03-technical-specification.md with optimal configs

**Day 5 (Friday)**:
- [ ] Create SQLite + vec/vss Performance Validation Report
- [ ] Present findings to stakeholders
- [ ] Update PRD with validated approach

## 5. Results & Decision Template

**Status**: 🚧 TO BE COMPLETED AFTER BENCHMARK

### 5.1 Results Summary

**Milvus Baseline**:
| Metric | 100 vectors | 1k vectors | 10k vectors | 100k vectors |
|--------|------------|-----------|------------|--------------|
| Load time | TBD | TBD | TBD | TBD |
| Memory (MB) | TBD | TBD | TBD | TBD |
| Search p95 (ms) | TBD | TBD | TBD | TBD |
| Recall@10 | TBD | TBD | TBD | TBD |

**SQLite + vec/vss Results**:
| Metric | 100 vectors | 1k vectors | 10k vectors | 100k vectors |
|--------|------------|-----------|------------|--------------|
| Load time | TBD | TBD | TBD | TBD |
| Memory (MB) | TBD | TBD | TBD | TBD |
| Search p95 (ms) | TBD | TBD | TBD | TBD |
| Recall@10 | TBD | TBD | TBD | TBD |

### 5.2 Acceptance Criteria Checklist

- [ ] Accuracy: ≥95% of Milvus recall@10
- [ ] Speed: Search <100ms for 10k vectors (p95)
- [ ] Memory: Uses <50% of Milvus memory
- [ ] Cross-platform: Works on macOS, Linux, Windows
- [ ] Stability: No crashes in 1000+ operations
- [ ] Data migration: Can import Milvus data

**Checks Passed**: __ / 6

### 5.3 Validation Result

**Result**: ⚠️ TO BE COMPLETED AFTER VALIDATION

**Performance Analysis**:
- ...

**Optimization Applied**:
- ...

**Implementation Plan**:
- ...

**Impact on v4.0**:
- ...

## 6. Deliverables

- [ ] Benchmark test scripts (Milvus, SQLite + vec/vss)
- [ ] Test datasets (100, 1k, 10k, 100k vectors)
- [ ] Benchmark results (all tests, all platforms)
- [ ] SQLite + vec/vss Performance Validation Report (20+ pages)
- [ ] Performance validation document with optimal configs
- [ ] Updated 03-technical-specification.md
- [ ] Detailed Milvus → SQLite migration implementation plan

## Appendix A: Benchmark Scripts

(Scripts will be created in /tmp during testing)

```bash
/tmp/vector-db-benchmark/
├── milvus-benchmark.js
├── sqlite-vec-benchmark.js
├── generate-test-data.js
├── run-all-tests.sh
└── results/
    ├── milvus-results.json
    ├── sqlite-vec-results.json
    └── comparison.json
```

## Appendix B: Configuration Tuning

**Milvus Optimal Config**:
```javascript
{
  index_type: 'IVF_FLAT', // or HNSW, IVF_SQ8
  metric_type: 'IP',      // or L2
  nlist: 128,
  m: 16,
  efConstruction: 200
}
```

**SQLite + vec/vss Optimal Config**:
```javascript
{
  // Vector table configuration
  dimension: 384,
  metric: 'cosine',  // or 'l2', 'ip'

  // HNSW index parameters (via sqlite-vec)
  M: 16,                  // tune this (neighbors per node)
  efConstruction: 200,    // tune this (index build quality)
  efSearch: 50            // tune this at query time (search quality)
}
```

**Tuning Strategy**:
- Start with defaults (M=16, efConstruction=200, efSearch=50)
- If accuracy low: increase M, efConstruction
- If speed slow: decrease efSearch
- Find optimal balance between accuracy and performance

---

**Document Status**: 🚧 Ready to Execute - Week 3
**Owner**: Phase 0 Lead Engineer
**Priority**: HIGH - Critical validation for v4.0 implementation
