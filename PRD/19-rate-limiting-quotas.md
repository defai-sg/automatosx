# Rate Limiting & Quotas - AutomatosX v4.0

**Date**: 2025-10-04
**Priority**: 🟠 HIGH
**Implementation**: Sprint 2.3

---

## Executive Summary

This document defines rate limiting, quotas, and cost tracking for AutomatosX v4.0. The goal is to **prevent API abuse, control costs, and provide fair resource allocation** across users and projects.

**Key Principle**: Fair usage, cost awareness, graceful throttling.

---

## Table of Contents

1. [Provider Rate Limits](#provider-rate-limits)
2. [User Quotas](#user-quotas)
3. [Cost Tracking](#cost-tracking)
4. [Throttling Strategy](#throttling-strategy)
5. [Backoff Mechanisms](#backoff-mechanisms)

---

## Provider Rate Limits

### Provider-Specific Limits

#### Claude (Anthropic)
```typescript
const CLAUDE_LIMITS = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
  tokensPerRequest: 100000,
  tokensPerMinute: 100000,
  tokensPerDay: 1000000
};
```

#### Gemini (Google)
```typescript
const GEMINI_LIMITS = {
  requestsPerMinute: 60,
  requestsPerHour: 1500,
  requestsPerDay: 15000,
  tokensPerRequest: 32000,
  tokensPerMinute: 50000,
  tokensPerDay: 500000
};
```

#### OpenAI
```typescript
const OPENAI_LIMITS = {
  requestsPerMinute: 500,
  requestsPerHour: 10000,
  requestsPerDay: 100000,
  tokensPerRequest: 128000,
  tokensPerMinute: 90000,
  tokensPerDay: 2000000
};
```

---

### Rate Limiter Implementation

```typescript
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerRequest: number;
  tokensPerMinute: number;
  tokensPerDay: number;
}

class RateLimiter {
  private requestsMinute: number[] = [];
  private requestsHour: number[] = [];
  private requestsDay: number[] = [];
  private tokensMinute: number = 0;
  private tokensDay: number = 0;

  constructor(private config: RateLimitConfig) {}

  async checkLimit(tokenCount: number): Promise<void> {
    const now = Date.now();
    this.cleanupOldRequests(now);

    // Check requests per minute
    if (this.requestsMinute.length >= this.config.requestsPerMinute) {
      const waitTime = 60000 - (now - this.requestsMinute[0]);
      throw new RateLimitError(
        `Rate limit exceeded: ${this.config.requestsPerMinute} requests/minute`,
        { waitTime, period: 'minute' }
      );
    }

    // Check requests per hour
    if (this.requestsHour.length >= this.config.requestsPerHour) {
      const waitTime = 3600000 - (now - this.requestsHour[0]);
      throw new RateLimitError(
        `Rate limit exceeded: ${this.config.requestsPerHour} requests/hour`,
        { waitTime, period: 'hour' }
      );
    }

    // Check requests per day
    if (this.requestsDay.length >= this.config.requestsPerDay) {
      const waitTime = 86400000 - (now - this.requestsDay[0]);
      throw new RateLimitError(
        `Rate limit exceeded: ${this.config.requestsPerDay} requests/day`,
        { waitTime, period: 'day' }
      );
    }

    // Check tokens per request
    if (tokenCount > this.config.tokensPerRequest) {
      throw new RateLimitError(
        `Token limit exceeded: ${tokenCount} > ${this.config.tokensPerRequest} tokens/request`,
        { tokens: tokenCount, limit: this.config.tokensPerRequest }
      );
    }

    // Check tokens per minute
    if (this.tokensMinute + tokenCount > this.config.tokensPerMinute) {
      throw new RateLimitError(
        `Token rate limit exceeded: ${this.config.tokensPerMinute} tokens/minute`,
        { period: 'minute' }
      );
    }

    // Check tokens per day
    if (this.tokensDay + tokenCount > this.config.tokensPerDay) {
      throw new RateLimitError(
        `Token rate limit exceeded: ${this.config.tokensPerDay} tokens/day`,
        { period: 'day' }
      );
    }

    // Record request
    this.recordRequest(now, tokenCount);
  }

  private cleanupOldRequests(now: number): void {
    // Remove requests older than 1 minute
    this.requestsMinute = this.requestsMinute.filter(t => now - t < 60000);

    // Remove requests older than 1 hour
    this.requestsHour = this.requestsHour.filter(t => now - t < 3600000);

    // Remove requests older than 1 day
    this.requestsDay = this.requestsDay.filter(t => now - t < 86400000);

    // Reset token counters if period expired
    if (this.requestsMinute.length === 0) {
      this.tokensMinute = 0;
    }
    if (this.requestsDay.length === 0) {
      this.tokensDay = 0;
    }
  }

  private recordRequest(timestamp: number, tokens: number): void {
    this.requestsMinute.push(timestamp);
    this.requestsHour.push(timestamp);
    this.requestsDay.push(timestamp);
    this.tokensMinute += tokens;
    this.tokensDay += tokens;
  }
}
```

---

## User Quotas

### Quota Tiers

#### Free Tier
```typescript
const FREE_TIER: UserQuota = {
  tier: 'free',
  limits: {
    agentsPerProject: 5,
    requestsPerDay: 100,
    memoryEntries: 1000,
    workspaceSize: 100 * 1024 * 1024,  // 100MB
    maxTokensPerRequest: 4000
  }
};
```

#### Pro Tier
```typescript
const PRO_TIER: UserQuota = {
  tier: 'pro',
  limits: {
    agentsPerProject: 50,
    requestsPerDay: 1000,
    memoryEntries: 100000,
    workspaceSize: 1024 * 1024 * 1024,  // 1GB
    maxTokensPerRequest: 100000
  }
};
```

#### Enterprise Tier
```typescript
const ENTERPRISE_TIER: UserQuota = {
  tier: 'enterprise',
  limits: {
    agentsPerProject: -1,        // Unlimited
    requestsPerDay: -1,          // Unlimited
    memoryEntries: -1,           // Unlimited
    workspaceSize: -1,           // Unlimited
    maxTokensPerRequest: 200000
  }
};
```

---

### Quota Enforcement

```typescript
interface UserQuota {
  tier: 'free' | 'pro' | 'enterprise';
  limits: {
    agentsPerProject: number;    // -1 = unlimited
    requestsPerDay: number;
    memoryEntries: number;
    workspaceSize: number;       // bytes
    maxTokensPerRequest: number;
  };
}

class QuotaManager {
  constructor(private quota: UserQuota) {}

  async checkAgentQuota(currentAgents: number): Promise<void> {
    if (this.quota.limits.agentsPerProject === -1) return;

    if (currentAgents >= this.quota.limits.agentsPerProject) {
      throw new QuotaError(
        `Agent limit reached: ${this.quota.limits.agentsPerProject} agents allowed`,
        {
          current: currentAgents,
          limit: this.quota.limits.agentsPerProject,
          tier: this.quota.tier
        }
      );
    }
  }

  async checkRequestQuota(requestsToday: number): Promise<void> {
    if (this.quota.limits.requestsPerDay === -1) return;

    if (requestsToday >= this.quota.limits.requestsPerDay) {
      throw new QuotaError(
        `Daily request limit reached: ${this.quota.limits.requestsPerDay} requests/day`,
        {
          current: requestsToday,
          limit: this.quota.limits.requestsPerDay,
          tier: this.quota.tier,
          resetTime: this.getNextResetTime()
        }
      );
    }
  }

  async checkMemoryQuota(currentEntries: number): Promise<void> {
    if (this.quota.limits.memoryEntries === -1) return;

    if (currentEntries >= this.quota.limits.memoryEntries) {
      throw new QuotaError(
        `Memory limit reached: ${this.quota.limits.memoryEntries} entries allowed`,
        {
          current: currentEntries,
          limit: this.quota.limits.memoryEntries,
          tier: this.quota.tier
        }
      );
    }
  }

  async checkWorkspaceQuota(currentSize: number): Promise<void> {
    if (this.quota.limits.workspaceSize === -1) return;

    if (currentSize >= this.quota.limits.workspaceSize) {
      const limitMB = Math.floor(this.quota.limits.workspaceSize / (1024 * 1024));
      throw new QuotaError(
        `Workspace size limit reached: ${limitMB}MB allowed`,
        {
          current: currentSize,
          limit: this.quota.limits.workspaceSize,
          tier: this.quota.tier
        }
      );
    }
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
```

---

## Cost Tracking

### Pricing Models

#### Claude Pricing (example)
```typescript
const CLAUDE_PRICING = {
  'claude-3-opus': {
    inputTokens: 0.015 / 1000,   // $0.015 per 1K input tokens
    outputTokens: 0.075 / 1000   // $0.075 per 1K output tokens
  },
  'claude-3-sonnet': {
    inputTokens: 0.003 / 1000,
    outputTokens: 0.015 / 1000
  },
  'claude-3-haiku': {
    inputTokens: 0.00025 / 1000,
    outputTokens: 0.00125 / 1000
  }
};
```

#### OpenAI Pricing (example)
```typescript
const OPENAI_PRICING = {
  'gpt-4-turbo': {
    inputTokens: 0.01 / 1000,
    outputTokens: 0.03 / 1000
  },
  'gpt-4': {
    inputTokens: 0.03 / 1000,
    outputTokens: 0.06 / 1000
  },
  'gpt-3.5-turbo': {
    inputTokens: 0.0005 / 1000,
    outputTokens: 0.0015 / 1000
  }
};
```

---

### Cost Tracker Implementation

```typescript
interface UsageRecord {
  timestamp: Date;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  agent: string;
  task: string;
}

class CostTracker {
  private records: UsageRecord[] = [];

  trackRequest(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    agent: string,
    task: string
  ): number {
    const cost = this.calculateCost(provider, model, inputTokens, outputTokens);

    this.records.push({
      timestamp: new Date(),
      provider,
      model,
      inputTokens,
      outputTokens,
      cost,
      agent,
      task
    });

    return cost;
  }

  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = this.getPricing(provider, model);
    if (!pricing) return 0;

    const inputCost = inputTokens * pricing.inputTokens;
    const outputCost = outputTokens * pricing.outputTokens;
    return inputCost + outputCost;
  }

  estimateCost(provider: string, model: string, promptLength: number): number {
    // Estimate: 1 token ≈ 4 characters
    const estimatedInputTokens = Math.ceil(promptLength / 4);
    // Assume 2:1 output to input ratio
    const estimatedOutputTokens = estimatedInputTokens * 2;

    return this.calculateCost(
      provider,
      model,
      estimatedInputTokens,
      estimatedOutputTokens
    );
  }

  getUsageReport(period: 'day' | 'week' | 'month'): UsageReport {
    const cutoff = this.getCutoffDate(period);
    const relevantRecords = this.records.filter(r => r.timestamp >= cutoff);

    return {
      period,
      totalRequests: relevantRecords.length,
      totalCost: relevantRecords.reduce((sum, r) => sum + r.cost, 0),
      totalInputTokens: relevantRecords.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: relevantRecords.reduce((sum, r) => sum + r.outputTokens, 0),
      byProvider: this.groupByProvider(relevantRecords),
      byAgent: this.groupByAgent(relevantRecords)
    };
  }

  private getCutoffDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (period) {
      case 'day':
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
    }

    return cutoff;
  }

  private getPricing(provider: string, model: string): any {
    // Return pricing for provider/model
    // Implementation depends on provider
  }

  private groupByProvider(records: UsageRecord[]): Record<string, any> {
    // Group records by provider
  }

  private groupByAgent(records: UsageRecord[]): Record<string, any> {
    // Group records by agent
  }
}
```

---

### Cost Reports

```bash
# View cost report
automatosx cost report --period day

# Output:
📊 Cost Report (Last 24 hours)

Total Requests: 47
Total Cost: $2.34
Total Tokens: 145,230 (95,410 input + 49,820 output)

By Provider:
  • claude: $1.89 (32 requests)
  • gemini: $0.45 (15 requests)

By Agent:
  • coder: $1.12 (18 requests)
  • reviewer: $0.89 (12 requests)
  • assistant: $0.33 (17 requests)

Top Tasks:
  1. "review pull request" - $0.45 (3 requests)
  2. "write function" - $0.38 (5 requests)
  3. "debug error" - $0.29 (4 requests)
```

---

## Throttling Strategy

### Rate Limit Hit Response

```
Rate Limit Hit:
1. Return 429 error
2. Tell user to wait X seconds
3. Automatically retry after backoff
4. Log rate limit hit for monitoring
```

#### Implementation

```typescript
async function executeWithThrottling(operation: () => Promise<any>): Promise<any> {
  try {
    await rateLimiter.checkLimit(tokenCount);
    return await operation();
  } catch (error) {
    if (error instanceof RateLimitError) {
      const waitTime = error.context?.waitTime || 60000;

      logger.warn('Rate limit hit, waiting before retry', {
        waitTime,
        period: error.context?.period
      });

      console.log(
        chalk.yellow(`\n⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...\n`)
      );

      await sleep(waitTime);
      return await operation();
    }

    throw error;
  }
}
```

---

### Cost Limit Behavior

```
Cost Limit Reached:
1. Pause execution
2. Notify user
3. Require explicit confirmation to continue
4. Or wait until next period
```

#### Implementation

```typescript
interface CostLimit {
  dailyLimit: number;      // e.g., $10.00
  warningThreshold: number; // e.g., 0.8 (80%)
}

class CostController {
  async checkCostLimit(currentCost: number, limit: CostLimit): Promise<void> {
    const threshold = limit.dailyLimit * limit.warningThreshold;

    // Warning at 80%
    if (currentCost >= threshold && currentCost < limit.dailyLimit) {
      console.log(
        chalk.yellow(
          `\n⚠️  Cost warning: $${currentCost.toFixed(2)} / $${limit.dailyLimit.toFixed(2)} (${Math.floor((currentCost / limit.dailyLimit) * 100)}%)\n`
        )
      );
    }

    // Block at limit
    if (currentCost >= limit.dailyLimit) {
      console.log(
        chalk.red(
          `\n❌ Daily cost limit reached: $${limit.dailyLimit.toFixed(2)}\n`
        )
      );

      const shouldContinue = await this.promptUser(
        'Continue anyway? This will incur additional costs. (y/N)'
      );

      if (!shouldContinue) {
        throw new CostLimitError(
          `Daily cost limit reached: $${limit.dailyLimit.toFixed(2)}`,
          {
            current: currentCost,
            limit: limit.dailyLimit,
            resetTime: this.getNextResetTime()
          }
        );
      }
    }
  }

  private async promptUser(question: string): Promise<boolean> {
    // Prompt user for confirmation
    // Implementation depends on CLI framework
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
```

---

## Backoff Mechanisms

### Token Budget Strategy

```typescript
interface TokenBudget {
  available: number;
  reserved: number;
  used: number;
}

class TokenBudgetManager {
  private budget: TokenBudget = {
    available: 100000,    // 100K tokens/day
    reserved: 0,
    used: 0
  };

  reserveTokens(count: number): boolean {
    if (this.budget.available - this.budget.reserved < count) {
      return false;  // Not enough budget
    }

    this.budget.reserved += count;
    return true;
  }

  consumeTokens(count: number): void {
    this.budget.used += count;
    this.budget.reserved -= count;
  }

  releaseTokens(count: number): void {
    this.budget.reserved -= count;
  }

  getRemainingBudget(): number {
    return this.budget.available - this.budget.used - this.budget.reserved;
  }

  resetDaily(): void {
    this.budget.used = 0;
    this.budget.reserved = 0;
  }
}
```

---

### Adaptive Rate Limiting

```typescript
class AdaptiveRateLimiter {
  private successRate = 1.0;
  private currentLimit: number;

  constructor(private baseLimit: number) {
    this.currentLimit = baseLimit;
  }

  async checkLimit(): Promise<void> {
    // Adjust limit based on success rate
    this.adjustLimit();

    // Check against current limit
    if (this.requestCount >= this.currentLimit) {
      throw new RateLimitError('Rate limit exceeded');
    }
  }

  recordSuccess(): void {
    this.successRate = Math.min(1.0, this.successRate + 0.01);
  }

  recordFailure(): void {
    this.successRate = Math.max(0.0, this.successRate - 0.1);
  }

  private adjustLimit(): void {
    // Increase limit if success rate is high
    if (this.successRate > 0.95) {
      this.currentLimit = Math.min(
        this.baseLimit * 1.5,
        this.currentLimit * 1.1
      );
    }
    // Decrease limit if success rate is low
    else if (this.successRate < 0.8) {
      this.currentLimit = Math.max(
        this.baseLimit * 0.5,
        this.currentLimit * 0.9
      );
    }
  }
}
```

---

## Implementation Plan

### Sprint 2.3: Rate Limiting (Week 10-11)

**Week 10**:
- [ ] Implement rate limiter with sliding window
- [ ] Add quota manager for tier enforcement
- [ ] Create cost tracker and reporter

**Week 11**:
- [ ] Implement throttling strategy
- [ ] Add cost limit controls
- [ ] Create adaptive rate limiting
- [ ] Write rate limiting tests

**Deliverables**:
- ✅ Rate limiter (requests/minute, hour, day)
- ✅ Quota system (free, pro, enterprise tiers)
- ✅ Cost tracker (track, estimate, report)
- ✅ Throttling (auto-retry, backoff)
- ✅ Cost controls (limits, warnings, confirmations)

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rate limit accuracy | 99%+ | Actual limit / Configured limit |
| Quota enforcement | 100% | Quota violations prevented |
| Cost tracking accuracy | 95%+ | Estimated cost / Actual cost |
| Throttling effectiveness | 90%+ | Successful retries / Total throttled |

---

## User Experience

### Rate Limit Message

```
⏳ Rate limit reached: 60 requests/minute

Waiting 15 seconds before retry...

[Progress bar: ▓▓▓▓▓▓▓▓▓▓▓░░░░] 70%

Tip: Upgrade to Pro tier for higher limits
     automatosx upgrade --tier pro
```

### Cost Warning Message

```
⚠️  Cost warning: $8.45 / $10.00 (85%)

You've used 85% of your daily cost limit.

To continue without limits:
  1. Upgrade tier: automatosx upgrade --tier pro
  2. Increase limit: automatosx config set cost.dailyLimit 20

View cost report: automatosx cost report --period day
```

---

## Conclusion

Rate limiting and quotas are essential for controlling costs and preventing abuse. By implementing provider-specific rate limits, user quotas, cost tracking, and intelligent throttling, AutomatosX provides a fair and sustainable service.

**Status**: 📋 Planned for Sprint 2.3
**Implementation Date**: Week 10-11 (Month 3)

---

**Document Date**: 2025-10-04
**Next Review**: Sprint 2.3 kickoff
**Related**: PRD/03-technical-specification.md, PRD/18-error-recovery-specification.md
