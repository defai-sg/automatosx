# Caching Strategy

## Overview
Design and implement multi-layer caching strategies to optimize application performance, reduce database load, and improve user experience.

## Caching Layers

### 1. Client-Side Caching
- Browser cache (Cache-Control, ETag)
- Service Worker caching
- Local Storage / IndexedDB
- CDN edge caching

### 2. Application-Level Caching
- In-memory cache (Redis, Memcached)
- Application process cache
- Query result caching
- Computed value caching

### 3. Database Caching
- Query result cache
- Prepared statement cache
- Connection pool
- Buffer pool (InnoDB)

## Cache Patterns

### Cache-Aside (Lazy Loading)
```
1. Check cache
2. If miss → Query database
3. Store in cache
4. Return data
```
**Use when**: Read-heavy, acceptable stale data

### Write-Through
```
1. Write to cache
2. Write to database (synchronous)
3. Return success
```
**Use when**: Data consistency critical

### Write-Behind (Write-Back)
```
1. Write to cache
2. Queue database write (async)
3. Return success
```
**Use when**: High write throughput needed

### Read-Through
```
Cache handles database reads automatically
```
**Use when**: Simplify application logic

### Refresh-Ahead
```
Proactively refresh before expiration
```
**Use when**: Predictable access patterns

## Cache Invalidation

### Time-Based (TTL)
```
SET key value EX 3600  # 1 hour TTL
```
**Pros**: Simple, predictable
**Cons**: May serve stale data

### Event-Based
```
On data update → Invalidate related cache keys
```
**Pros**: Always fresh
**Cons**: Complex invalidation logic

### Tag-Based
```
Tag keys → Invalidate by tag
user:123 → tags: [user, profile, settings]
```
**Pros**: Flexible, bulk invalidation
**Cons**: Overhead in management

## Redis Strategies

### Data Structures
```redis
# String: Simple values
SET user:123:name "Alice"

# Hash: Objects
HSET user:123 name "Alice" email "alice@example.com"

# List: Ordered collections
LPUSH user:123:notifications "New message"

# Set: Unique collections
SADD user:123:tags "premium" "verified"

# Sorted Set: Ranked data
ZADD leaderboard 1000 "user:123"

# HyperLogLog: Cardinality estimation
PFADD unique_visitors "user:123"
```

### Expiration Patterns
```redis
# Sliding window expiration
SETEX key 3600 value

# Expire on next access
EXPIRE key 3600

# Absolute expiration
EXPIREAT key 1735689600
```

### Lua Scripts for Atomicity
```lua
-- Atomic check-and-set
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  return 1
end
return 0
```

## Cache Key Design

### Naming Conventions
```
<namespace>:<entity>:<id>:<attribute>
user:123:profile
product:456:inventory
session:abc123:cart
```

### Hierarchical Keys
```
app:v1:user:123:settings
    └─ version ─┘ └─ entity ─┘ └─ specific ─┘
```

### Composite Keys
```
search:query:<hash>:page:1
filter:category:electronics:brand:apple
```

## Performance Optimization

### Connection Pooling
- Min/max pool size tuning
- Connection timeout configuration
- Health checks for stale connections

### Compression
- Compress large values (>1KB)
- Trade CPU for memory savings
- Use MessagePack or Snappy

### Batch Operations
```redis
# Pipeline multiple commands
PIPELINE
GET user:1:name
GET user:2:name
GET user:3:name
EXEC
```

### Read Replicas
- Separate read/write connections
- Route heavy reads to replicas
- Monitor replication lag

## Monitoring & Metrics

### Key Metrics
- Hit rate (hits / (hits + misses))
- Miss rate
- Eviction rate
- Memory usage
- Latency (p50, p95, p99)

### Alerts
- Hit rate < 80%
- Memory usage > 85%
- Eviction rate spike
- Replication lag > 1s

### Tools
- Redis INFO command
- RedisInsight
- Datadog Redis integration
- Prometheus redis_exporter

## Cache Sizing

### Memory Estimation
```
Total Memory = (Avg Key Size + Avg Value Size) × Number of Keys × Overhead (1.5×)
```

### Eviction Policies
- **noeviction**: Return error when full
- **allkeys-lru**: Evict least recently used
- **volatile-lru**: Evict LRU with TTL set
- **allkeys-random**: Random eviction
- **volatile-ttl**: Evict soonest expiring

## Security

### Access Control
- Password authentication
- TLS encryption in transit
- IP whitelisting
- Redis ACL (v6+)

### Data Protection
- Avoid caching sensitive data
- Encrypt sensitive cached data
- Set short TTL for PII
- Audit cache access

## Common Pitfalls

### Cache Stampede
**Problem**: Many requests hit DB on cache miss
**Solution**:
```
1. Probabilistic early expiration
2. Lock-based refresh (single writer)
3. Always return stale data while refreshing
```

### Cache Penetration
**Problem**: Queries for non-existent data bypass cache
**Solution**: Cache null results with short TTL

### Hot Key Problem
**Problem**: Single key gets massive traffic
**Solution**: Key sharding, local cache, load balancing

### Cache Avalanche
**Problem**: Many keys expire simultaneously
**Solution**: Add jitter to TTL (TTL ± random)

## Testing Strategies

### Cache Hit Testing
```javascript
// Verify cache hit on second call
await service.getData(123);        // Cache miss
const result = await service.getData(123); // Cache hit
expect(cacheHitCount).toBe(1);
```

### Invalidation Testing
```javascript
await service.updateData(123, newValue);
const cached = await cache.get('data:123');
expect(cached).toBeNull(); // Invalidated
```

### Performance Testing
- Measure response time with/without cache
- Test cache under load
- Verify eviction behavior
- Benchmark different cache sizes

## Design Checklist

- [ ] Cache layers identified (client, app, DB)
- [ ] Cache pattern selected (cache-aside, write-through, etc.)
- [ ] Invalidation strategy defined
- [ ] Key naming convention established
- [ ] TTL values justified
- [ ] Eviction policy configured
- [ ] Connection pooling set up
- [ ] Monitoring/alerting configured
- [ ] Security measures implemented
- [ ] Cache stampede prevention
- [ ] Performance testing completed
- [ ] Documentation updated
